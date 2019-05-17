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
import { __read_sockaddr } from '../filesystems/SOCKFS/__read_sockaddr';

export const ___syscall102 = (which, varargs) => {
  SYSCALLS.varargs = varargs;
  try {
    var call = SYSCALLS.get()
    let socketvararg = SYSCALLS.get();
    SYSCALLS.varargs = socketvararg;
    if (call === 1) {
      var domain = SYSCALLS.get()
        , type = SYSCALLS.get()
        , protocol = SYSCALLS.get();
      var sock = SOCKFS.createSocket(domain, type, protocol);
      assert(sock.stream.fd < 64);
      return sock.stream.fd;
    } else if (call === 2) {
        var sock = SYSCALLS.getSocketFromFD()
          , info = SYSCALLS.getSocketAddress();
        sock.sock_ops.bind(sock, info.addr, info.port);
        return 0;
    } else if (call === 3) {
        var sock = SYSCALLS.getSocketFromFD()
          , info = SYSCALLS.getSocketAddress();
        sock.sock_ops.connect(sock, info.addr, info.port);
        return 0;
    } else if (call === 4) {
      var sock = SYSCALLS.getSocketFromFD()
        , backlog = SYSCALLS.get();
      sock.sock_ops.listen(sock, backlog);
      return 0
    } else if (call === 5) {
      var sock = SYSCALLS.getSocketFromFD()
        , addr = SYSCALLS.get()
        , addrlen = SYSCALLS.get();
      var newsock = sock.sock_ops.accept(sock);
      if (addr) {
        var res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport);
        assert(!res.errno)
      }
      return newsock.stream.fd;
    } else if (call === 6) {
      var sock = SYSCALLS.getSocketFromFD()
        , addr = SYSCALLS.get()
        , addrlen = SYSCALLS.get();
      var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport);
      assert(!res.errno);
      return 0
    } else if (call === 7) {
      var sock = SYSCALLS.getSocketFromFD()
        , addr = SYSCALLS.get()
        , addrlen = SYSCALLS.get();
      if (!sock.daddr) {
        return -ErrorNumberCodes.ENOTCONN
      }
      var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport);
      assert(!res.errno);
      return 0;
    } else if (call === 11) {
      var sock = SYSCALLS.getSocketFromFD()
        , message = SYSCALLS.get()
        , length = SYSCALLS.get()
        , flags = SYSCALLS.get()
        , dest = SYSCALLS.getSocketAddress(true);
      if (!dest) {
        return FS.write(sock.stream, getHeap('HEAP8'), message, length)
      } else {
        return sock.sock_ops.sendmsg(sock, getHeap('HEAP8'), message, length, dest.addr, dest.port)
      }
    } else if (call === 12) {
      var sock = SYSCALLS.getSocketFromFD()
        , buf = SYSCALLS.get()
        , len = SYSCALLS.get()
        , flags = SYSCALLS.get()
        , addr = SYSCALLS.get()
        , addrlen = SYSCALLS.get();
      var msg = sock.sock_ops.recvmsg(sock, len);
      if (!msg)
        return 0;
      if (addr) {
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port);
        assert(!res.errno)
      }
      getHeap('HEAPU8').set(msg.buffer, buf);
      return msg.buffer.byteLength
    } if (call === 14) {
      return -ErrorNumberCodes.ENOPROTOOPT;
    } else if (call === 15) {
      var sock = SYSCALLS.getSocketFromFD()
        , level = SYSCALLS.get()
        , optname = SYSCALLS.get()
        , optval = SYSCALLS.get()
        , optlen = SYSCALLS.get();
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
      var sock = SYSCALLS.getSocketFromFD()
        , message = SYSCALLS.get()
        , flags = SYSCALLS.get();
      var iov = getHeap('HEAP32')[message + 8 >> 2];
      var num = getHeap('HEAP32')[message + 12 >> 2];
      var addr, port;
      var name = getHeap('HEAP32')[message >> 2];
      var namelen = getHeap('HEAP32')[message + 4 >> 2];
      if (name) {
        var info = __read_sockaddr(name, namelen);
        if (info.errno)
          return -info.errno;
        port = info.port;
        addr = DNS.lookup_addr(info.addr) || info.addr
      }
      var total = 0;
      for (var i = 0; i < num; i++) {
        total += getHeap('HEAP32')[iov + (8 * i + 4) >> 2]
      }
      var view = new Uint8Array(total);
      var offset = 0;
      for (var i = 0; i < num; i++) {
        var iovbase = getHeap('HEAP32')[iov + (8 * i + 0) >> 2];
        var iovlen = getHeap('HEAP32')[iov + (8 * i + 4) >> 2];
        for (var j = 0; j < iovlen; j++) {
          view[offset++] = getHeap('HEAP8')[iovbase + j >> 0]
        }
      }
      return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port)
    } else if (call === 17) {
      let sock = SYSCALLS.getSocketFromFD()
      let message = SYSCALLS.get();
      let iov = getHeap('HEAP32')[message + 8 >> 2];
      let num = getHeap('HEAP32')[message + 12 >> 2];
      let total = 0;
      for (var i = 0; i < num; i++) {
        total += getHeap('HEAP32')[iov + (8 * i + 4) >> 2]
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

      var bytesRead = 0;
      var bytesRemaining = msg.buffer.byteLength;
      for (var i = 0; bytesRemaining > 0 && i < num; i++) {
        var iovbase = getHeap('HEAP32')[iov + (8 * i + 0) >> 2];
        var iovlen = getHeap('HEAP32')[iov + (8 * i + 4) >> 2];
        if (!iovlen) {
          continue
        }
        var length = Math.min(iovlen, bytesRemaining);
        var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
        getHeap('HEAPU8').set(buf, iovbase + bytesRead);
        bytesRead += length;
        bytesRemaining -= length
      }

      return bytesRead;
    } else {
      abort(`Unsupported socketcall syscall ${call}`);
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
