import {
  __read_sockaddr,
} from '../filesystems/SOCKFS/__read_sockaddr';
import {
  __write_sockaddr,
} from '../filesystems/SOCKFS/__write_sockaddr';
import {
  abort,
} from '../abort';
import {
  DNS,
} from '../filesystems/SOCKFS/DNS';
import {
  ErrorNumberCodes,
} from '../errors/ErrorNumberCodes';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  getHeap,
} from '../heaps/heaps';
import {
  SOCKFS,
} from '../filesystems/SOCKFS/SOCKFS';
import {
  SYSCALLS,
} from './SYSCALLS';
import {
  assert,
} from 'ts-assertions';

export const ___syscall102 = (which, varargs) => {
  SYSCALLS.varargs = varargs;

  try {
    const call = SYSCALLS.get();
    const socketvararg = SYSCALLS.get();
    SYSCALLS.varargs = socketvararg;

    if (call === 1) {
      const domain = SYSCALLS.get()
      const type = SYSCALLS.get()
      const protocol = SYSCALLS.get();
      const sock = SOCKFS.createSocket(domain, type, protocol);
      assert(sock.stream.fd < 64);
      return sock.stream.fd;
    } else if (call === 2) {
      const sock = SYSCALLS.getSocketFromFD()
      const info = SYSCALLS.getSocketAddress();
      sock.sock_ops.bind(sock, info.addr, info.port);
      return 0;
    } else if (call === 3) {
      const sock = SYSCALLS.getSocketFromFD()
      const info = SYSCALLS.getSocketAddress();
      sock.sock_ops.connect(sock, info.addr, info.port);
      return 0;
    } else if (call === 4) {
      const sock = SYSCALLS.getSocketFromFD()
      const backlog = SYSCALLS.get();
      sock.sock_ops.listen(sock, backlog);
      return 0
    } else if (call === 5) {
      const sock = SYSCALLS.getSocketFromFD()
      const addr = SYSCALLS.get()
      const addrlen = SYSCALLS.get();
      const newsock = sock.sock_ops.accept(sock);
      if (addr) {
        const res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport);
        assert(!res.errno);
      }

      return newsock.stream.fd;
    } else if (call === 6) {
      const sock = SYSCALLS.getSocketFromFD()
      const addr = SYSCALLS.get()
      const addrlen = SYSCALLS.get();
      const res = __write_sockaddr(
        addr,
        sock.family,
        DNS.lookup_name(sock.saddr || '0.0.0.0'),
        sock.sport,
      );

      assert(!res.errno);
      return 0;
    } else if (call === 7) {
      const sock = SYSCALLS.getSocketFromFD()
      const addr = SYSCALLS.get()
      const addrlen = SYSCALLS.get();
      if (!sock.daddr) {
        return -ErrorNumberCodes.ENOTCONN
      }

      const res = __write_sockaddr(
        addr,
        sock.family,
        DNS.lookup_name(sock.daddr),
        sock.dport,
      );

      assert(!res.errno);
      return 0;
    } else if (call === 11) {
      const sock = SYSCALLS.getSocketFromFD();
      const message = SYSCALLS.get();
      const length = SYSCALLS.get();
      const flags = SYSCALLS.get();
      const dest = SYSCALLS.getSocketAddress(true);
      if (!dest) {
        return FS.write(sock.stream, getHeap('HEAP8'), message, length);
      } else {
        return sock.sock_ops.sendmsg(
          sock,
          getHeap('HEAP8'),
          message,
          length,
          dest.addr,
          dest.port,
        );
      }
    } else if (call === 12) {
      const sock = SYSCALLS.getSocketFromFD();
      const buf = SYSCALLS.get();
      const len = SYSCALLS.get();
      const flags = SYSCALLS.get();
      const addr = SYSCALLS.get();
      const addrlen = SYSCALLS.get();

      const msg = sock.sock_ops.recvmsg(sock, len);
      if (!msg) {
        return 0;
      }

      if (addr) {
        const res = __write_sockaddr(
          addr,
          sock.family,
          DNS.lookup_name(msg.addr),
          msg.port,
        );

        assert(!res.errno)
      }

      getHeap('HEAPU8').set(msg.buffer, buf);
      return msg.buffer.byteLength;
    } if (call === 14) {
      return -ErrorNumberCodes.ENOPROTOOPT;
    } else if (call === 15) {
      const sock = SYSCALLS.getSocketFromFD()
      const level = SYSCALLS.get()
      const optname = SYSCALLS.get()
      const optval = SYSCALLS.get()
      const optlen = SYSCALLS.get();
      if (level === 1) {
        if (optname === 4) {
          getHeap('HEAP32')[optval >> 2] = sock.error;
          getHeap('HEAP32')[optlen >> 2] = 4;
          sock.error = null;
          return 0
        }
      }
      return -ErrorNumberCodes.ENOPROTOOPT;
    } else if (call === 16) {
      const sock = SYSCALLS.getSocketFromFD()
      const message = SYSCALLS.get()
      const flags = SYSCALLS.get();
      const iov = getHeap('HEAP32')[message + 8 >> 2];
      const num = getHeap('HEAP32')[message + 12 >> 2];
      let addr;
      let port;
      const name = getHeap('HEAP32')[message >> 2];
      const namelen = getHeap('HEAP32')[message + 4 >> 2];
      if (name) {
        const info = __read_sockaddr(name, namelen);
        if (info.errno) {
          return -info.errno;
        }

        port = info.port;
        addr = DNS.lookup_addr(info.addr) || info.addr;
      }

      let total = 0;
      for (let ii = 0; ii < num; ii += 1) {
        total += getHeap('HEAP32')[iov + (8 * ii + 4) >> 2];
      }

      const view = new Uint8Array(total);
      let offset = 0;
      for (let ii = 0; ii < num; ii += 1) {
        var iovbase = getHeap('HEAP32')[iov + (8 * ii + 0) >> 2];
        var iovlen = getHeap('HEAP32')[iov + (8 * ii + 4) >> 2];
        for (let jj = 0; jj < iovlen; jj += 1) {
          view[offset++] = getHeap('HEAP8')[iovbase + jj >> 0];
        }
      }

      return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port);
    } else if (call === 17) {
      const sock = SYSCALLS.getSocketFromFD()
      const message = SYSCALLS.get();
      const iov = getHeap('HEAP32')[message + 8 >> 2];
      const num = getHeap('HEAP32')[message + 12 >> 2];
      let total = 0;
      for (let ii = 0; ii < num; ii += 1) {
        total += getHeap('HEAP32')[iov + (8 * ii + 4) >> 2];
      }

      let msg = sock.sock_ops.recvmsg(sock, total);
      if (!msg) {
        return 0;
      }

      let name = getHeap('HEAP32')[message >> 2];
      if (name) {
        const res = __write_sockaddr(
          name,
          sock.family,
          DNS.lookup_name(msg.addr),
          msg.port,
        );

        assert(!res.errno);
      }

      let bytesRead = 0;
      let bytesRemaining = msg.buffer.byteLength;
      for (let ii = 0; bytesRemaining > 0 && ii < num; ii += 1) {
        const iovbase = getHeap('HEAP32')[iov + (8 * ii + 0) >> 2];
        const iovlen = getHeap('HEAP32')[iov + (8 * ii + 4) >> 2];
        if (!iovlen) {
          continue;
        }

        const length = Math.min(iovlen, bytesRemaining);
        const buf = msg.buffer.subarray(bytesRead, bytesRead + length);
        getHeap('HEAPU8').set(buf, iovbase + bytesRead);
        bytesRead += length;
        bytesRemaining -= length;
      }

      return bytesRead;
    } else {
      abort(`Unsupported socketcall syscall ${call}`);
    }
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
