import DEBUG from '../DEBUG';

import {
  ASM_CONSTS,
} from './ASM_CONSTS';
import {
  assertLittleEndian,
} from './assertions/assertLittleEndian';
import {
  error,
  log,
  warn,
} from 'colorful-logging';
import {
  WASM_PAGE_SIZE,
} from './constants';
import {
  demangleAll,
} from './logging/demangleAll';
import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  FS,
} from './filesystems/FS/FS';
import {
  writeFileSync,
} from 'fs-extra';
import {
  getAtInit,
} from './run/getAtInit';
import {
  getEnvType,
} from './getEnvVars';
import {
  getBuffer,
  getHeap,
  setBuffer,
  updateGlobalBufferViews,
} from './heaps/heaps';
import {
  Module,
} from './Module';
import {
  getTotalMemory,
} from './totalMemory';
import {
  getTotalStack,
} from './totalStack';
import {
  ModuleClass,
} from './ModuleClass';
import {
  MonoRuntime,
} from './MonoRuntime';
import path from 'path';
import {
  getPointer,
  setPointer,
} from './pointers/pointers';
import slash from 'slash';
import {
  assert,
  assertValid,
} from 'ts-assertions';

const envType = getEnvType(Module.ENVIRONMENT);

if (envType === EnvironmentTypes.Shell) {
  // @ts-ignore
  if (typeof scriptArgs !== 'undefined') {
    // @ts-ignore
    Module.arguments = scriptArgs;
  // @ts-ignore
  } else if (typeof arguments !== 'undefined') {
    // @ts-ignore
    Module.arguments = arguments;
  }
} else if ((envType === EnvironmentTypes.Web ||
            envType === EnvironmentTypes.Worker) &&
           // @ts-ignore
           typeof arguments !== 'undefined')
{
  // @ts-ignore
  Module.arguments = arguments;
}

let byteLength;
try {
  byteLength = Function.prototype.call.bind(
    // @ts-ignore
    Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'byteLength',
    ).get,
  );

  byteLength(new ArrayBuffer(4))
} catch (e) {
  byteLength = ({ byteLength }: Buffer) => byteLength;
}

const totalStack = getTotalStack();
const totalMemory = getTotalMemory();
if (totalMemory < totalStack)
  Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + totalMemory + '! (TOTAL_STACK=' + totalStack + ')');
if (Module.buffer) {
  setBuffer(Module.buffer);
} else {
  // @ts-ignore
  if (typeof WebAssembly === 'object' &&
      // @ts-ignore
      typeof WebAssembly.Memory === 'function')
  {
    const initial = totalMemory / WASM_PAGE_SIZE;
    // @ts-ignore
    Module.wasmMemory = new WebAssembly.Memory({ initial });
    setBuffer(Module.wasmMemory.buffer);
  } else {
    // @ts-ignore
    setBuffer(new ArrayBuffer(totalMemory));
  }

  Module.buffer = getBuffer();
}

updateGlobalBufferViews();
assertLittleEndian();

setPointer('STATIC_BASE', getPointer('GLOBAL_BASE'));
setPointer('STATICTOP', getPointer('STATIC_BASE') + 635680);

getAtInit().push();

/*setPointer('STATICTOP', getPointer('STATICTOP') + 16);
setPointer('STATICTOP', getPointer('STATICTOP') + 16);
setPointer('STATICTOP', getPointer('STATICTOP') + 16);
setPointer('STATICTOP', getPointer('STATICTOP') + 16);*/




function ___syscall102(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var call = SYSCALLS.get()
      , socketvararg = SYSCALLS.get();
    SYSCALLS.varargs = socketvararg;
    switch (call) {
    case 1:
      {
        var domain = SYSCALLS.get()
          , type = SYSCALLS.get()
          , protocol = SYSCALLS.get();
        var sock = SOCKFS.createSocket(domain, type, protocol);
        assert(sock.stream.fd < 64);
        return sock.stream.fd
      }
      ;
    case 2:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , info = SYSCALLS.getSocketAddress();
        sock.sock_ops.bind(sock, info.addr, info.port);
        return 0
      }
      ;
    case 3:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , info = SYSCALLS.getSocketAddress();
        sock.sock_ops.connect(sock, info.addr, info.port);
        return 0
      }
      ;
    case 4:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , backlog = SYSCALLS.get();
        sock.sock_ops.listen(sock, backlog);
        return 0
      }
      ;
    case 5:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , addr = SYSCALLS.get()
          , addrlen = SYSCALLS.get();
        var newsock = sock.sock_ops.accept(sock);
        if (addr) {
          var res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport);
          assert(!res.errno)
        }
        return newsock.stream.fd
      }
      ;
    case 6:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , addr = SYSCALLS.get()
          , addrlen = SYSCALLS.get();
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport);
        assert(!res.errno);
        return 0
      }
      ;
    case 7:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , addr = SYSCALLS.get()
          , addrlen = SYSCALLS.get();
        if (!sock.daddr) {
          return -ERRNO_CODES.ENOTCONN
        }
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport);
        assert(!res.errno);
        return 0
      }
      ;
    case 11:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , message = SYSCALLS.get()
          , length = SYSCALLS.get()
          , flags = SYSCALLS.get()
          , dest = SYSCALLS.getSocketAddress(true);
        if (!dest) {
          return FS.write(sock.stream, HEAP8, message, length)
        } else {
          return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port)
        }
      }
      ;
    case 12:
      {
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
        HEAPU8.set(msg.buffer, buf);
        return msg.buffer.byteLength
      }
      ;
    case 14:
      {
        return -ERRNO_CODES.ENOPROTOOPT
      }
      ;
    case 15:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , level = SYSCALLS.get()
          , optname = SYSCALLS.get()
          , optval = SYSCALLS.get()
          , optlen = SYSCALLS.get();
        if (level === 1) {
          if (optname === 4) {
            HEAP32[optval >> 2] = sock.error;
            HEAP32[optlen >> 2] = 4;
            sock.error = null;
            return 0
          }
        }
        return -ERRNO_CODES.ENOPROTOOPT
      }
      ;
    case 16:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , message = SYSCALLS.get()
          , flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var addr, port;
        var name = HEAP32[message >> 2];
        var namelen = HEAP32[message + 4 >> 2];
        if (name) {
          var info = __read_sockaddr(name, namelen);
          if (info.errno)
            return -info.errno;
          port = info.port;
          addr = DNS.lookup_addr(info.addr) || info.addr
        }
        var total = 0;
        for (var i = 0; i < num; i++) {
          total += HEAP32[iov + (8 * i + 4) >> 2]
        }
        var view = new Uint8Array(total);
        var offset = 0;
        for (var i = 0; i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          for (var j = 0; j < iovlen; j++) {
            view[offset++] = HEAP8[iovbase + j >> 0]
          }
        }
        return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port)
      }
      ;
    case 17:
      {
        var sock = SYSCALLS.getSocketFromFD()
          , message = SYSCALLS.get()
          , flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var total = 0;
        for (var i = 0; i < num; i++) {
          total += HEAP32[iov + (8 * i + 4) >> 2]
        }
        var msg = sock.sock_ops.recvmsg(sock, total);
        if (!msg)
          return 0;
        var name = HEAP32[message >> 2];
        if (name) {
          var res = __write_sockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port);
          assert(!res.errno)
        }
        var bytesRead = 0;
        var bytesRemaining = msg.buffer.byteLength;
        for (var i = 0; bytesRemaining > 0 && i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          if (!iovlen) {
            continue
          }
          var length = Math.min(iovlen, bytesRemaining);
          var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
          HEAPU8.set(buf, iovbase + bytesRead);
          bytesRead += length;
          bytesRemaining -= length
        }
        return bytesRead
      }
      ;
    default:
      abort("unsupported socketcall syscall " + call)
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall118(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD();
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall12(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr();
    FS.chdir(path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall122(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var buf = SYSCALLS.get();
    if (!buf)
      return -ERRNO_CODES.EFAULT;
    var layout = {
      "sysname": 0,
      "nodename": 65,
      "domainname": 325,
      "machine": 260,
      "version": 195,
      "release": 130,
      "__size__": 390
    };
    function copyString(element, value) {
      var offset = layout[element];
      writeAsciiToMemory(value, buf + offset)
    }
    copyString("sysname", "Emscripten");
    copyString("nodename", "emscripten");
    copyString("release", "1.0");
    copyString("version", "#1");
    copyString("machine", "x86-JS");
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall125(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall140(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , offset_high = SYSCALLS.get()
      , offset_low = SYSCALLS.get()
      , result = SYSCALLS.get()
      , whence = SYSCALLS.get();
    var offset = offset_low;
    FS.llseek(stream, offset, whence);
    HEAP32[result >> 2] = stream.position;
    if (stream.getdents && offset === 0 && whence === 0)
      stream.getdents = null;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall142(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var nfds = SYSCALLS.get()
      , readfds = SYSCALLS.get()
      , writefds = SYSCALLS.get()
      , exceptfds = SYSCALLS.get()
      , timeout = SYSCALLS.get();
    assert(nfds <= 64, "nfds must be less than or equal to 64");
    assert(!exceptfds, "exceptfds not supported");
    var total = 0;
    var srcReadLow = readfds ? HEAP32[readfds >> 2] : 0
      , srcReadHigh = readfds ? HEAP32[readfds + 4 >> 2] : 0;
    var srcWriteLow = writefds ? HEAP32[writefds >> 2] : 0
      , srcWriteHigh = writefds ? HEAP32[writefds + 4 >> 2] : 0;
    var srcExceptLow = exceptfds ? HEAP32[exceptfds >> 2] : 0
      , srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0;
    var dstReadLow = 0
      , dstReadHigh = 0;
    var dstWriteLow = 0
      , dstWriteHigh = 0;
    var dstExceptLow = 0
      , dstExceptHigh = 0;
    var allLow = (readfds ? HEAP32[readfds >> 2] : 0) | (writefds ? HEAP32[writefds >> 2] : 0) | (exceptfds ? HEAP32[exceptfds >> 2] : 0);
    var allHigh = (readfds ? HEAP32[readfds + 4 >> 2] : 0) | (writefds ? HEAP32[writefds + 4 >> 2] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0);
    function check(fd, low, high, val) {
      return fd < 32 ? low & val : high & val
    }
    for (var fd = 0; fd < nfds; fd++) {
      var mask = 1 << fd % 32;
      if (!check(fd, allLow, allHigh, mask)) {
        continue
      }
      var stream = FS.getStream(fd);
      if (!stream)
        throw new FS.ErrnoError(ERRNO_CODES.EBADF);
      var flags = SYSCALLS.DEFAULT_POLLMASK;
      if (stream.stream_ops.poll) {
        flags = stream.stream_ops.poll(stream)
      }
      if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
        fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
        total++
      }
      if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
        fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
        total++
      }
      if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
        fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
        total++
      }
    }
    if (readfds) {
      HEAP32[readfds >> 2] = dstReadLow;
      HEAP32[readfds + 4 >> 2] = dstReadHigh
    }
    if (writefds) {
      HEAP32[writefds >> 2] = dstWriteLow;
      HEAP32[writefds + 4 >> 2] = dstWriteHigh
    }
    if (exceptfds) {
      HEAP32[exceptfds >> 2] = dstExceptLow;
      HEAP32[exceptfds + 4 >> 2] = dstExceptHigh
    }
    return total
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall144(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var addr = SYSCALLS.get()
      , len = SYSCALLS.get()
      , flags = SYSCALLS.get();
    var info = SYSCALLS.mappings[addr];
    if (!info)
      return 0;
    SYSCALLS.doMsync(addr, FS.getStream(info.fd), len, info.flags);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall145(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , iov = SYSCALLS.get()
      , iovcnt = SYSCALLS.get();
    return SYSCALLS.doReadv(stream, iov, iovcnt)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall146(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , iov = SYSCALLS.get()
      , iovcnt = SYSCALLS.get();
    return SYSCALLS.doWritev(stream, iov, iovcnt)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall15(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , mode = SYSCALLS.get();
    FS.chmod(path, mode);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall168(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fds = SYSCALLS.get()
      , nfds = SYSCALLS.get()
      , timeout = SYSCALLS.get();
    var nonzero = 0;
    for (var i = 0; i < nfds; i++) {
      var pollfd = fds + 8 * i;
      var fd = HEAP32[pollfd >> 2];
      var events = HEAP16[pollfd + 4 >> 1];
      var mask = 32;
      var stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          mask = stream.stream_ops.poll(stream)
        }
      }
      mask &= events | 8 | 16;
      if (mask)
        nonzero++;
      HEAP16[pollfd + 6 >> 1] = mask
    }
    return nonzero
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall183(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var buf = SYSCALLS.get()
      , size = SYSCALLS.get();
    if (size === 0)
      return -ERRNO_CODES.EINVAL;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd);
    if (size < cwdLengthInBytes + 1)
      return -ERRNO_CODES.ERANGE;
    stringToUTF8(cwd, buf, size);
    return buf
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall191(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var resource = SYSCALLS.get()
      , rlim = SYSCALLS.get();
    HEAP32[rlim >> 2] = -1;
    HEAP32[rlim + 4 >> 2] = -1;
    HEAP32[rlim + 8 >> 2] = -1;
    HEAP32[rlim + 12 >> 2] = -1;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall192(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var addr = SYSCALLS.get()
      , len = SYSCALLS.get()
      , prot = SYSCALLS.get()
      , flags = SYSCALLS.get()
      , fd = SYSCALLS.get()
      , off = SYSCALLS.get();
    off <<= 12;
    var ptr;
    var allocated = false;
    if (fd === -1) {
      ptr = _memalign(PAGE_SIZE, len);
      if (!ptr)
        return -ERRNO_CODES.ENOMEM;
      _memset(ptr, 0, len);
      allocated = true
    } else {
      var info = FS.getStream(fd);
      if (!info)
        return -ERRNO_CODES.EBADF;
      var res = FS.mmap(info, HEAPU8, addr, len, off, prot, flags);
      ptr = res.ptr;
      allocated = res.allocated
    }
    SYSCALLS.mappings[ptr] = {
      malloc: ptr,
      len: len,
      allocated: allocated,
      fd: fd,
      flags: flags
    };
    return ptr
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall194(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fd = SYSCALLS.get()
      , zero = SYSCALLS.getZero()
      , length = SYSCALLS.get64();
    FS.ftruncate(fd, length);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall195(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.stat, path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall196(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.lstat, path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall197(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.stat, stream.path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall202(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall199() {
  return ___syscall202.apply(null, arguments)
}
var PROCINFO = {
  ppid: 1,
  pid: 42,
  sid: 42,
  pgid: 42
};
function ___syscall20(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return PROCINFO.pid
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall201() {
  return ___syscall202.apply(null, arguments)
}
function ___syscall211(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var ruid = SYSCALLS.get()
      , euid = SYSCALLS.get()
      , suid = SYSCALLS.get();
    HEAP32[ruid >> 2] = 0;
    HEAP32[euid >> 2] = 0;
    HEAP32[suid >> 2] = 0;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall209() {
  return ___syscall211.apply(null, arguments)
}
function ___syscall219(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall220(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , dirp = SYSCALLS.get()
      , count = SYSCALLS.get();
    if (!stream.getdents) {
      stream.getdents = FS.readdir(stream.path)
    }
    var pos = 0;
    while (stream.getdents.length > 0 && pos + 268 <= count) {
      var id;
      var type;
      var name = stream.getdents.pop();
      if (name[0] === ".") {
        id = 1;
        type = 4
      } else {
        var child = FS.lookupNode(stream.node, name);
        id = child.id;
        type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8
      }
      HEAP32[dirp + pos >> 2] = id;
      HEAP32[dirp + pos + 4 >> 2] = stream.position;
      HEAP16[dirp + pos + 8 >> 1] = 268;
      HEAP8[dirp + pos + 10 >> 0] = type;
      stringToUTF8(name, dirp + pos + 11, 256);
      pos += 268
    }
    return pos
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall221(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , cmd = SYSCALLS.get();
    switch (cmd) {
    case 0:
      {
        var arg = SYSCALLS.get();
        if (arg < 0) {
          return -ERRNO_CODES.EINVAL
        }
        var newStream;
        newStream = FS.open(stream.path, stream.flags, 0, arg);
        return newStream.fd
      }
      ;
    case 1:
    case 2:
      return 0;
    case 3:
      return stream.flags;
    case 4:
      {
        var arg = SYSCALLS.get();
        stream.flags |= arg;
        return 0
      }
      ;
    case 12:
    case 12:
      {
        var arg = SYSCALLS.get();
        var offset = 0;
        HEAP16[arg + offset >> 1] = 2;
        return 0
      }
      ;
    case 13:
    case 14:
    case 13:
    case 14:
      return 0;
    case 16:
    case 8:
      return -ERRNO_CODES.EINVAL;
    case 9:
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    default:
      {
        return -ERRNO_CODES.EINVAL
      }
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall268(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , size = SYSCALLS.get()
      , buf = SYSCALLS.get();
    assert(size === 64);
    HEAP32[buf + 4 >> 2] = 4096;
    HEAP32[buf + 40 >> 2] = 4096;
    HEAP32[buf + 8 >> 2] = 1e6;
    HEAP32[buf + 12 >> 2] = 5e5;
    HEAP32[buf + 16 >> 2] = 5e5;
    HEAP32[buf + 20 >> 2] = FS.nextInode;
    HEAP32[buf + 24 >> 2] = 1e6;
    HEAP32[buf + 28 >> 2] = 42;
    HEAP32[buf + 44 >> 2] = 2;
    HEAP32[buf + 36 >> 2] = 255;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall272(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall3(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , buf = SYSCALLS.get()
      , count = SYSCALLS.get();
    return FS.read(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall33(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , amode = SYSCALLS.get();
    return SYSCALLS.doAccess(path, amode)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall340(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var pid = SYSCALLS.get()
      , resource = SYSCALLS.get()
      , new_limit = SYSCALLS.get()
      , old_limit = SYSCALLS.get();
    if (old_limit) {
      HEAP32[old_limit >> 2] = -1;
      HEAP32[old_limit + 4 >> 2] = -1;
      HEAP32[old_limit + 8 >> 2] = -1;
      HEAP32[old_limit + 12 >> 2] = -1
    }
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall38(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var old_path = SYSCALLS.getStr()
      , new_path = SYSCALLS.getStr();
    FS.rename(old_path, new_path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall39(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , mode = SYSCALLS.get();
    return SYSCALLS.doMkdir(path, mode)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall4(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , buf = SYSCALLS.get()
      , count = SYSCALLS.get();
    return FS.write(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall40(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr();
    FS.rmdir(path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall41(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var old = SYSCALLS.getStreamFromFD();
    return FS.open(old.path, old.flags, 0).fd
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
var PIPEFS = {
  BUCKET_BUFFER_SIZE: 8192,
  mount: (function(mount) {
    return FS.createNode(null, "/", 16384 | 511, 0)
  }
  ),
  createPipe: (function() {
    var pipe = {
      buckets: []
    };
    pipe.buckets.push({
      buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
      offset: 0,
      roffset: 0
    });
    var rName = PIPEFS.nextname();
    var wName = PIPEFS.nextname();
    var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
    var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
    rNode.pipe = pipe;
    wNode.pipe = pipe;
    var readableStream = FS.createStream({
      path: rName,
      node: rNode,
      flags: FS.modeStringToFlags("r"),
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    rNode.stream = readableStream;
    var writableStream = FS.createStream({
      path: wName,
      node: wNode,
      flags: FS.modeStringToFlags("w"),
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    wNode.stream = writableStream;
    return {
      readable_fd: readableStream.fd,
      writable_fd: writableStream.fd
    }
  }
  ),
  stream_ops: {
    poll: (function(stream) {
      var pipe = stream.node.pipe;
      if ((stream.flags & 2097155) === 1) {
        return 256 | 4
      } else {
        if (pipe.buckets.length > 0) {
          for (var i = 0; i < pipe.buckets.length; i++) {
            var bucket = pipe.buckets[i];
            if (bucket.offset - bucket.roffset > 0) {
              return 64 | 1
            }
          }
        }
      }
      return 0
    }
    ),
    ioctl: (function(stream, request, varargs) {
      return ERRNO_CODES.EINVAL
    }
    ),
    read: (function(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var currentLength = 0;
      for (var i = 0; i < pipe.buckets.length; i++) {
        var bucket = pipe.buckets[i];
        currentLength += bucket.offset - bucket.roffset
      }
      assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
      var data = buffer.subarray(offset, offset + length);
      if (length <= 0) {
        return 0
      }
      if (currentLength == 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
      }
      var toRead = Math.min(currentLength, length);
      var totalRead = toRead;
      var toRemove = 0;
      for (var i = 0; i < pipe.buckets.length; i++) {
        var currBucket = pipe.buckets[i];
        var bucketSize = currBucket.offset - currBucket.roffset;
        if (toRead <= bucketSize) {
          var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
          if (toRead < bucketSize) {
            tmpSlice = tmpSlice.subarray(0, toRead);
            currBucket.roffset += toRead
          } else {
            toRemove++
          }
          data.set(tmpSlice);
          break
        } else {
          var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
          data.set(tmpSlice);
          data = data.subarray(tmpSlice.byteLength);
          toRead -= tmpSlice.byteLength;
          toRemove++
        }
      }
      if (toRemove && toRemove == pipe.buckets.length) {
        toRemove--;
        pipe.buckets[toRemove].offset = 0;
        pipe.buckets[toRemove].roffset = 0
      }
      pipe.buckets.splice(0, toRemove);
      return totalRead
    }
    ),
    write: (function(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
      var data = buffer.subarray(offset, offset + length);
      var dataLen = data.byteLength;
      if (dataLen <= 0) {
        return 0
      }
      var currBucket = null;
      if (pipe.buckets.length == 0) {
        currBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0
        };
        pipe.buckets.push(currBucket)
      } else {
        currBucket = pipe.buckets[pipe.buckets.length - 1]
      }
      assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
      var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
      if (freeBytesInCurrBuffer >= dataLen) {
        currBucket.buffer.set(data, currBucket.offset);
        currBucket.offset += dataLen;
        return dataLen
      } else if (freeBytesInCurrBuffer > 0) {
        currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
        currBucket.offset += freeBytesInCurrBuffer;
        data = data.subarray(freeBytesInCurrBuffer, data.byteLength)
      }
      var numBuckets = data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE | 0;
      var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
      for (var i = 0; i < numBuckets; i++) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: PIPEFS.BUCKET_BUFFER_SIZE,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
        data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength)
      }
      if (remElements > 0) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: data.byteLength,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data)
      }
      return dataLen
    }
    ),
    close: (function(stream) {
      var pipe = stream.node.pipe;
      pipe.buckets = null
    }
    )
  },
  nextname: (function() {
    if (!PIPEFS.nextname.current) {
      PIPEFS.nextname.current = 0
    }
    return "pipe[" + PIPEFS.nextname.current++ + "]"
  }
  )
};
function ___syscall42(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fdPtr = SYSCALLS.get();
    if (fdPtr == 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EFAULT)
    }
    var res = PIPEFS.createPipe();
    HEAP32[fdPtr >> 2] = res.readable_fd;
    HEAP32[fdPtr + 4 >> 2] = res.writable_fd;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall5(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var pathname = SYSCALLS.getStr()
      , flags = SYSCALLS.get()
      , mode = SYSCALLS.get();
    var stream = FS.open(pathname, flags, mode);
    return stream.fd
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall54(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD()
      , op = SYSCALLS.get();
    switch (op) {
    case 21509:
    case 21505:
      {
        if (!stream.tty)
          return -ERRNO_CODES.ENOTTY;
        return 0
      }
      ;
    case 21510:
    case 21511:
    case 21512:
    case 21506:
    case 21507:
    case 21508:
      {
        if (!stream.tty)
          return -ERRNO_CODES.ENOTTY;
        return 0
      }
      ;
    case 21519:
      {
        if (!stream.tty)
          return -ERRNO_CODES.ENOTTY;
        var argp = SYSCALLS.get();
        HEAP32[argp >> 2] = 0;
        return 0
      }
      ;
    case 21520:
      {
        if (!stream.tty)
          return -ERRNO_CODES.ENOTTY;
        return -ERRNO_CODES.EINVAL
      }
      ;
    case 21531:
      {
        var argp = SYSCALLS.get();
        return FS.ioctl(stream, op, argp)
      }
      ;
    case 21523:
      {
        if (!stream.tty)
          return -ERRNO_CODES.ENOTTY;
        return 0
      }
      ;
    default:
      abort("bad ioctl syscall " + op)
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall6(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD();
    FS.close(stream);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall63(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var old = SYSCALLS.getStreamFromFD()
      , suggestFD = SYSCALLS.get();
    if (old.fd === suggestFD)
      return suggestFD;
    return SYSCALLS.doDup(old.path, old.flags, suggestFD)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall77(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var who = SYSCALLS.get()
      , usage = SYSCALLS.get();
    _memset(usage, 0, 136);
    HEAP32[usage >> 2] = 1;
    HEAP32[usage + 4 >> 2] = 2;
    HEAP32[usage + 8 >> 2] = 3;
    HEAP32[usage + 12 >> 2] = 4;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall85(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr()
      , buf = SYSCALLS.get()
      , bufsize = SYSCALLS.get();
    return SYSCALLS.doReadlink(path, buf, bufsize)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall91(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var addr = SYSCALLS.get()
      , len = SYSCALLS.get();
    var info = SYSCALLS.mappings[addr];
    if (!info)
      return 0;
    if (len === info.len) {
      var stream = FS.getStream(info.fd);
      SYSCALLS.doMsync(addr, stream, len, info.flags);
      FS.munmap(stream);
      SYSCALLS.mappings[addr] = null;
      if (info.allocated) {
        _free(info.malloc)
      }
    }
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall96(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___syscall97(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return -ERRNO_CODES.EPERM
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
      abort(e);
    return -e.errno
  }
}
function ___unlock() {}
function __exit(status) {
  ModuleClass["exit"](status)
}
function _abort() {
  ModuleClass["abort"]()
}
function _atexit(func, arg) {
  __ATEXIT__.unshift({
    func: func,
    arg: arg
  })
}
function _emscripten_get_now_res() {
  if (ENVIRONMENT_IS_NODE) {
    return 1
  } else if (typeof dateNow !== "undefined" || (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]) {
    return 1e3
  } else {
    return 1e3 * 1e3
  }
}
function _clock_getres(clk_id, res) {
  var nsec;
  if (clk_id === 0) {
    nsec = 1e3 * 1e3
  } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
    nsec = _emscripten_get_now_res()
  } else {
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }
  HEAP32[res >> 2] = nsec / 1e9 | 0;
  HEAP32[res + 4 >> 2] = nsec;
  return 0
}
function _execl() {
  ___setErrNo(ERRNO_CODES.ENOEXEC);
  return -1
}
function _execve() {
  return _execl.apply(null, arguments)
}
function _exit(status) {
  __exit(status)
}
function _fork() {
  ___setErrNo(ERRNO_CODES.EAGAIN);
  return -1
}
function _getaddrinfo(node, service, hint, out) {
  var addr = 0;
  var port = 0;
  var flags = 0;
  var family = 0;
  var type = 0;
  var proto = 0;
  var ai;
  function allocaddrinfo(family, type, proto, canon, addr, port) {
    var sa, salen, ai;
    var res;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? __inet_ntop6_raw(addr) : __inet_ntop4_raw(addr);
    sa = _malloc(salen);
    res = __write_sockaddr(sa, family, addr, port);
    assert(!res.errno);
    ai = _malloc(32);
    HEAP32[ai + 4 >> 2] = family;
    HEAP32[ai + 8 >> 2] = type;
    HEAP32[ai + 12 >> 2] = proto;
    HEAP32[ai + 24 >> 2] = canon;
    HEAP32[ai + 20 >> 2] = sa;
    if (family === 10) {
      HEAP32[ai + 16 >> 2] = 28
    } else {
      HEAP32[ai + 16 >> 2] = 16
    }
    HEAP32[ai + 28 >> 2] = 0;
    return ai
  }
  if (hint) {
    flags = HEAP32[hint >> 2];
    family = HEAP32[hint + 4 >> 2];
    type = HEAP32[hint + 8 >> 2];
    proto = HEAP32[hint + 12 >> 2]
  }
  if (type && !proto) {
    proto = type === 2 ? 17 : 6
  }
  if (!type && proto) {
    type = proto === 17 ? 2 : 1
  }
  if (proto === 0) {
    proto = 6
  }
  if (type === 0) {
    type = 1
  }
  if (!node && !service) {
    return -2
  }
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
    return -1
  }
  if (hint !== 0 && HEAP32[hint >> 2] & 2 && !node) {
    return -1
  }
  if (flags & 32) {
    return -2
  }
  if (type !== 0 && type !== 1 && type !== 2) {
    return -7
  }
  if (family !== 0 && family !== 2 && family !== 10) {
    return -6
  }
  if (service) {
    service = pointerStringify(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {
        return -2
      }
      return -8
    }
  }
  if (!node) {
    if (family === 0) {
      family = 2
    }
    if ((flags & 1) === 0) {
      if (family === 2) {
        addr = _htonl(2130706433)
      } else {
        addr = [0, 0, 0, 1]
      }
    }
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }
  node = pointerStringify(node);
  addr = __inet_pton4_raw(node);
  if (addr !== null) {
    if (family === 0 || family === 2) {
      family = 2
    } else if (family === 10 && flags & 8) {
      addr = [0, 0, _htonl(65535), addr];
      family = 10
    } else {
      return -2
    }
  } else {
    addr = __inet_pton6_raw(node);
    if (addr !== null) {
      if (family === 0 || family === 10) {
        family = 10
      } else {
        return -2
      }
    }
  }
  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }
  if (flags & 4) {
    return -2
  }
  node = DNS.lookup_name(node);
  addr = __inet_pton4_raw(node);
  if (family === 0) {
    family = 2
  } else if (family === 10) {
    addr = [0, 0, _htonl(65535), addr]
  }
  ai = allocaddrinfo(family, type, proto, null, addr, port);
  HEAP32[out >> 2] = ai;
  return 0
}
var _environ = STATICTOP;
STATICTOP += 16;
function ___buildEnvironment(env) {
  var MAX_ENV_VALUES = 64;
  var TOTAL_ENV_SIZE = 1024;
  var poolPtr;
  var envPtr;
  if (!___buildEnvironment.called) {
    ___buildEnvironment.called = true;
    ENV["USER"] = ENV["LOGNAME"] = "web_user";
    ENV["PATH"] = "/";
    ENV["PWD"] = "/";
    ENV["HOME"] = "/home/web_user";
    ENV["LANG"] = "C.UTF-8";
    ENV["_"] = ModuleClass["thisProgram"];
    poolPtr = staticAlloc(TOTAL_ENV_SIZE);
    envPtr = staticAlloc(MAX_ENV_VALUES * 4);
    HEAP32[envPtr >> 2] = poolPtr;
    HEAP32[_environ >> 2] = envPtr
  } else {
    envPtr = HEAP32[_environ >> 2];
    poolPtr = HEAP32[envPtr >> 2]
  }
  var strings = [];
  var totalSize = 0;
  for (var key in env) {
    if (typeof env[key] === "string") {
      var line = key + "=" + env[key];
      strings.push(line);
      totalSize += line.length
    }
  }
  if (totalSize > TOTAL_ENV_SIZE) {
    throw new Error("Environment size exceeded TOTAL_ENV_SIZE!")
  }
  var ptrSize = 4;
  for (var i = 0; i < strings.length; i++) {
    var line = strings[i];
    writeAsciiToMemory(line, poolPtr);
    HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
    poolPtr += line.length + 1
  }
  HEAP32[envPtr + strings.length * ptrSize >> 2] = 0
}
var ENV = {};
function _getenv(name) {
  if (name === 0)
    return 0;
  name = pointerStringify(name);
  if (!ENV.hasOwnProperty(name))
    return 0;
  if (_getenv.ret)
    _free(_getenv.ret);
  _getenv.ret = allocateUTF8(ENV[name]);
  return _getenv.ret
}
function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
  var info = __read_sockaddr(sa, salen);
  if (info.errno) {
    return -6
  }
  var port = info.port;
  var addr = info.addr;
  var overflowed = false;
  if (node && nodelen) {
    var lookup;
    if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
      if (flags & 8) {
        return -2
      }
    } else {
      addr = lookup
    }
    var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
    if (numBytesWrittenExclNull + 1 >= nodelen) {
      overflowed = true
    }
  }
  if (serv && servlen) {
    port = "" + port;
    var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
    if (numBytesWrittenExclNull + 1 >= servlen) {
      overflowed = true
    }
  }
  if (overflowed) {
    return -12
  }
  return 0
}
var Protocols = {
  list: [],
  map: {}
};
function _setprotoent(stayopen) {
  function allocprotoent(name, proto, aliases) {
    var nameBuf = _malloc(name.length + 1);
    writeAsciiToMemory(name, nameBuf);
    var j = 0;
    var length = aliases.length;
    var aliasListBuf = _malloc((length + 1) * 4);
    for (var i = 0; i < length; i++,
    j += 4) {
      var alias = aliases[i];
      var aliasBuf = _malloc(alias.length + 1);
      writeAsciiToMemory(alias, aliasBuf);
      HEAP32[aliasListBuf + j >> 2] = aliasBuf
    }
    HEAP32[aliasListBuf + j >> 2] = 0;
    var pe = _malloc(12);
    HEAP32[pe >> 2] = nameBuf;
    HEAP32[pe + 4 >> 2] = aliasListBuf;
    HEAP32[pe + 8 >> 2] = proto;
    return pe
  }
  var list = Protocols.list;
  var map = Protocols.map;
  if (list.length === 0) {
    var entry = allocprotoent("tcp", 6, ["TCP"]);
    list.push(entry);
    map["tcp"] = map["6"] = entry;
    entry = allocprotoent("udp", 17, ["UDP"]);
    list.push(entry);
    map["udp"] = map["17"] = entry
  }
  _setprotoent.index = 0
}
function _getprotobyname(name) {
  name = pointerStringify(name);
  _setprotoent(true);
  var result = Protocols.map[name];
  return result
}
function _getpwuid(uid) {
  return 0
}
function _gettimeofday(ptr) {
  var now = Date.now();
  HEAP32[ptr >> 2] = now / 1e3 | 0;
  HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
  return 0
}
var ___tm_timezone = allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);
function _gmtime_r(time, tmPtr) {
  var date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getUTCSeconds();
  HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
  HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
  HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
  HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
  HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
  HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
  HEAP32[tmPtr + 36 >> 2] = 0;
  HEAP32[tmPtr + 32 >> 2] = 0;
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
  return tmPtr
}
function _kill(pid, sig) {
  ___setErrNo(ERRNO_CODES.EPERM);
  return -1
}
var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_STATIC);
function _llvm_trap() {
  abort("trap!")
}
var _tzname = STATICTOP;
STATICTOP += 16;
var _daylight = STATICTOP;
STATICTOP += 16;
var _timezone = STATICTOP;
STATICTOP += 16;
function _tzset() {
  if (_tzset.called)
    return;
  _tzset.called = true;
  HEAP32[_timezone >> 2] = (new Date).getTimezoneOffset() * 60;
  var winter = new Date(2e3,0,1);
  var summer = new Date(2e3,6,1);
  HEAP32[_daylight >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
  function extractZone(date) {
    var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
    return match ? match[1] : "GMT"
  }
  var winterName = extractZone(winter);
  var summerName = extractZone(summer);
  var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
  var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
  if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
    HEAP32[_tzname >> 2] = winterNamePtr;
    HEAP32[_tzname + 4 >> 2] = summerNamePtr
  } else {
    HEAP32[_tzname >> 2] = summerNamePtr;
    HEAP32[_tzname + 4 >> 2] = winterNamePtr
  }
}
function _localtime_r(time, tmPtr) {
  _tzset();
  var date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getSeconds();
  HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
  HEAP32[tmPtr + 8 >> 2] = date.getHours();
  HEAP32[tmPtr + 12 >> 2] = date.getDate();
  HEAP32[tmPtr + 16 >> 2] = date.getMonth();
  HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
  HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var start = new Date(date.getFullYear(),0,1);
  var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
  var summerOffset = (new Date(2e3,6,1)).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[tmPtr + 32 >> 2] = dst;
  var zonePtr = HEAP32[_tzname + (dst ? 4 : 0) >> 2];
  HEAP32[tmPtr + 40 >> 2] = zonePtr;
  return tmPtr
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
  return dest
}
var MONO = {
  pump_count: 0,
  timeout_queue: [],
  pump_message: (function() {
    if (!this.mono_background_exec)
      this.mono_background_exec = ModuleClass.cwrap("mono_background_exec", "void", []);
    while (MONO.timeout_queue.length > 0) {
      --MONO.pump_count;
      MONO.timeout_queue.shift()()
    }
    while (MONO.pump_count > 0) {
      --MONO.pump_count;
      this.mono_background_exec()
    }
  }
  ),
  mono_wasm_get_call_stack: (function() {
    if (!this.mono_wasm_current_bp_id)
      this.mono_wasm_current_bp_id = ModuleClass.cwrap("mono_wasm_current_bp_id", "number", []);
    if (!this.mono_wasm_enum_frames)
      this.mono_wasm_enum_frames = ModuleClass.cwrap("mono_wasm_enum_frames", "void", []);
    var bp_id = this.mono_wasm_current_bp_id();
    this.active_frames = [];
    this.mono_wasm_enum_frames();
    var the_frames = this.active_frames;
    this.active_frames = [];
    return {
      "breakpoint_id": bp_id,
      "frames": the_frames
    }
  }
  ),
  mono_wasm_get_variables: (function(scope, var_list) {
    if (!this.mono_wasm_get_var_info)
      this.mono_wasm_get_var_info = ModuleClass.cwrap("mono_wasm_get_var_info", "void", ["number", "number"]);
    this.var_info = [];
    for (var i = 0; i < var_list.length; ++i)
      this.mono_wasm_get_var_info(scope, var_list[i]);
    var res = this.var_info;
    this.var_info = [];
    return res
  }
  )
};
function _mono_set_timeout(timeout, id) {
  if (!this.mono_set_timeout_exec)
    this.mono_set_timeout_exec = ModuleClass.cwrap("mono_set_timeout_exec", "void", ["number"]);
  if (ENVIRONMENT_IS_WEB) {
    window.setTimeout((function() {
      this.mono_set_timeout_exec(id)
    }
    ), timeout)
  } else {
    ++MONO.pump_count;
    MONO.timeout_queue.push((function() {
      this.mono_set_timeout_exec(id)
    }
    ))
  }
}
function _mono_wasm_add_bool_var(var_value) {
  MONO.var_info.push({
    value: {
      type: "boolean",
      value: var_value != 0
    }
  })
}
function _mono_wasm_add_float_var(var_value) {
  MONO.var_info.push({
    value: {
      type: "number",
      value: var_value
    }
  })
}
function _mono_wasm_add_frame(il, method, name) {
  MONO.active_frames.push({
    il_pos: il,
    method_token: method,
    assembly_name: ModuleClass.UTF8ToString(name)
  })
}
function _mono_wasm_add_int_var(var_value) {
  MONO.var_info.push({
    value: {
      type: "number",
      value: var_value
    }
  })
}
function _mono_wasm_add_long_var(var_value) {
  MONO.var_info.push({
    value: {
      type: "number",
      value: var_value
    }
  })
}
function _mono_wasm_add_string_var(var_value) {
  if (var_value == 0) {
    MONO.var_info.push({
      value: {
        type: "object",
        subtype: "null"
      }
    })
  } else {
    MONO.var_info.push({
      value: {
        type: "string",
        value: ModuleClass.UTF8ToString(var_value)
      }
    })
  }
}
function _mono_wasm_fire_bp() {
  console.log("mono_wasm_fire_bp");
  debugger
}
function _usleep(useconds) {
  var msec = useconds / 1e3;
  if ((ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]) {
    var start = self["performance"]["now"]();
    while (self["performance"]["now"]() - start < msec) {}
  } else {
    var start = Date.now();
    while (Date.now() - start < msec) {}
  }
  return 0
}
ModuleClass["_usleep"] = _usleep;
function _nanosleep(rqtp, rmtp) {
  var seconds = HEAP32[rqtp >> 2];
  var nanoseconds = HEAP32[rqtp + 4 >> 2];
  if (rmtp !== 0) {
    HEAP32[rmtp >> 2] = 0;
    HEAP32[rmtp + 4 >> 2] = 0
  }
  return _usleep(seconds * 1e6 + nanoseconds / 1e3)
}
function _pthread_cleanup_pop() {
  assert(_pthread_cleanup_push.level == __ATEXIT__.length, "cannot pop if something else added meanwhile!");
  __ATEXIT__.pop();
  _pthread_cleanup_push.level = __ATEXIT__.length
}
function _pthread_cleanup_push(routine, arg) {
  __ATEXIT__.push((function() {
    ModuleClass["dynCall_vi"](routine, arg)
  }
  ));
  _pthread_cleanup_push.level = __ATEXIT__.length
}
function _pthread_cond_destroy() {
  return 0
}
function _pthread_cond_init() {
  return 0
}
function _pthread_cond_signal() {
  return 0
}
function _pthread_cond_timedwait() {
  return 0
}
function _pthread_cond_wait() {
  return 0
}
var PTHREAD_SPECIFIC = {};
function _pthread_getspecific(key) {
  return PTHREAD_SPECIFIC[key] || 0
}
var PTHREAD_SPECIFIC_NEXT_KEY = 1;
function _pthread_key_create(key, destructor) {
  if (key == 0) {
    return ERRNO_CODES.EINVAL
  }
  HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
  PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
  PTHREAD_SPECIFIC_NEXT_KEY++;
  return 0
}
function _pthread_key_delete(key) {
  if (key in PTHREAD_SPECIFIC) {
    delete PTHREAD_SPECIFIC[key];
    return 0
  }
  return ERRNO_CODES.EINVAL
}
function _pthread_mutex_destroy() {}
function _pthread_mutex_init() {}
function _pthread_mutexattr_destroy() {}
function _pthread_mutexattr_init() {}
function _pthread_mutexattr_settype() {}
function _pthread_setcancelstate() {
  return 0
}
function _pthread_setspecific(key, value) {
  if (!(key in PTHREAD_SPECIFIC)) {
    return ERRNO_CODES.EINVAL
  }
  PTHREAD_SPECIFIC[key] = value;
  return 0
}
function _putchar() {
  ModuleClass["printErr"]("missing function: putchar");
  abort(-1)
}
function _puts(s) {
  var result = pointerStringify(s);
  var string = result.substr(0);
  if (string[string.length - 1] === "\n")
    string = string.substr(0, string.length - 1);
  ModuleClass.print(string);
  return result.length
}
function _schedule_background_exec() {
  ++MONO.pump_count;
  if (ENVIRONMENT_IS_WEB) {
    window.setTimeout(MONO.pump_message, 0)
  }
}
function _sem_destroy() {}
function _sem_init() {}
function _sem_post() {}
function _sem_trywait() {}
function _sem_wait() {}
function _setenv(envname, envval, overwrite) {
  if (envname === 0) {
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }
  var name = pointerStringify(envname);
  var val = pointerStringify(envval);
  if (name === "" || name.indexOf("=") !== -1) {
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }
  if (ENV.hasOwnProperty(name) && !overwrite)
    return 0;
  ENV[name] = val;
  ___buildEnvironment(ENV);
  return 0
}
function _sigaction(signum, act, oldact) {
  return 0
}
function _sigemptyset(set) {
  HEAP32[set >> 2] = 0;
  return 0
}
function __isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
function __arraySum(array, index) {
  var sum = 0;
  for (var i = 0; i <= index; sum += array[i++])
    ;
  return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function __addDays(date, days) {
  var newDate = new Date(date.getTime());
  while (days > 0) {
    var leap = __isLeapYear(newDate.getFullYear());
    var currentMonth = newDate.getMonth();
    var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
    if (days > daysInCurrentMonth - newDate.getDate()) {
      days -= daysInCurrentMonth - newDate.getDate() + 1;
      newDate.setDate(1);
      if (currentMonth < 11) {
        newDate.setMonth(currentMonth + 1)
      } else {
        newDate.setMonth(0);
        newDate.setFullYear(newDate.getFullYear() + 1)
      }
    } else {
      newDate.setDate(newDate.getDate() + days);
      return newDate
    }
  }
  return newDate
}
function _strftime(s, maxsize, format, tm) {
  var tm_zone = HEAP32[tm + 40 >> 2];
  var date = {
    tm_sec: HEAP32[tm >> 2],
    tm_min: HEAP32[tm + 4 >> 2],
    tm_hour: HEAP32[tm + 8 >> 2],
    tm_mday: HEAP32[tm + 12 >> 2],
    tm_mon: HEAP32[tm + 16 >> 2],
    tm_year: HEAP32[tm + 20 >> 2],
    tm_wday: HEAP32[tm + 24 >> 2],
    tm_yday: HEAP32[tm + 28 >> 2],
    tm_isdst: HEAP32[tm + 32 >> 2],
    tm_gmtoff: HEAP32[tm + 36 >> 2],
    tm_zone: tm_zone ? pointerStringify(tm_zone) : ""
  };
  var pattern = pointerStringify(format);
  var EXPANSION_RULES_1 = {
    "%c": "%a %b %d %H:%M:%S %Y",
    "%D": "%m/%d/%y",
    "%F": "%Y-%m-%d",
    "%h": "%b",
    "%r": "%I:%M:%S %p",
    "%R": "%H:%M",
    "%T": "%H:%M:%S",
    "%x": "%m/%d/%y",
    "%X": "%H:%M:%S"
  };
  for (var rule in EXPANSION_RULES_1) {
    pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_1[rule])
  }
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function leadingSomething(value, digits, character) {
    var str = typeof value === "number" ? value.toString() : value || "";
    while (str.length < digits) {
      str = character[0] + str
    }
    return str
  }
  function leadingNulls(value, digits) {
    return leadingSomething(value, digits, "0")
  }
  function compareByDay(date1, date2) {
    function sgn(value) {
      return value < 0 ? -1 : value > 0 ? 1 : 0
    }
    var compare;
    if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
      if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
        compare = sgn(date1.getDate() - date2.getDate())
      }
    }
    return compare
  }
  function getFirstWeekStartDate(janFourth) {
    switch (janFourth.getDay()) {
    case 0:
      return new Date(janFourth.getFullYear() - 1,11,29);
    case 1:
      return janFourth;
    case 2:
      return new Date(janFourth.getFullYear(),0,3);
    case 3:
      return new Date(janFourth.getFullYear(),0,2);
    case 4:
      return new Date(janFourth.getFullYear(),0,1);
    case 5:
      return new Date(janFourth.getFullYear() - 1,11,31);
    case 6:
      return new Date(janFourth.getFullYear() - 1,11,30)
    }
  }
  function getWeekBasedYear(date) {
    var thisDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
    var janFourthThisYear = new Date(thisDate.getFullYear(),0,4);
    var janFourthNextYear = new Date(thisDate.getFullYear() + 1,0,4);
    var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
    var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
    if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
      if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
        return thisDate.getFullYear() + 1
      } else {
        return thisDate.getFullYear()
      }
    } else {
      return thisDate.getFullYear() - 1
    }
  }
  var EXPANSION_RULES_2 = {
    "%a": (function(date) {
      return WEEKDAYS[date.tm_wday].substring(0, 3)
    }
    ),
    "%A": (function(date) {
      return WEEKDAYS[date.tm_wday]
    }
    ),
    "%b": (function(date) {
      return MONTHS[date.tm_mon].substring(0, 3)
    }
    ),
    "%B": (function(date) {
      return MONTHS[date.tm_mon]
    }
    ),
    "%C": (function(date) {
      var year = date.tm_year + 1900;
      return leadingNulls(year / 100 | 0, 2)
    }
    ),
    "%d": (function(date) {
      return leadingNulls(date.tm_mday, 2)
    }
    ),
    "%e": (function(date) {
      return leadingSomething(date.tm_mday, 2, " ")
    }
    ),
    "%g": (function(date) {
      return getWeekBasedYear(date).toString().substring(2)
    }
    ),
    "%G": (function(date) {
      return getWeekBasedYear(date)
    }
    ),
    "%H": (function(date) {
      return leadingNulls(date.tm_hour, 2)
    }
    ),
    "%I": (function(date) {
      var twelveHour = date.tm_hour;
      if (twelveHour == 0)
        twelveHour = 12;
      else if (twelveHour > 12)
        twelveHour -= 12;
      return leadingNulls(twelveHour, 2)
    }
    ),
    "%j": (function(date) {
      return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
    }
    ),
    "%m": (function(date) {
      return leadingNulls(date.tm_mon + 1, 2)
    }
    ),
    "%M": (function(date) {
      return leadingNulls(date.tm_min, 2)
    }
    ),
    "%n": (function() {
      return "\n"
    }
    ),
    "%p": (function(date) {
      if (date.tm_hour >= 0 && date.tm_hour < 12) {
        return "AM"
      } else {
        return "PM"
      }
    }
    ),
    "%S": (function(date) {
      return leadingNulls(date.tm_sec, 2)
    }
    ),
    "%t": (function() {
      return "\t"
    }
    ),
    "%u": (function(date) {
      var day = new Date(date.tm_year + 1900,date.tm_mon + 1,date.tm_mday,0,0,0,0);
      return day.getDay() || 7
    }
    ),
    "%U": (function(date) {
      var janFirst = new Date(date.tm_year + 1900,0,1);
      var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
      var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
      if (compareByDay(firstSunday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
        var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
    }
    ),
    "%V": (function(date) {
      var janFourthThisYear = new Date(date.tm_year + 1900,0,4);
      var janFourthNextYear = new Date(date.tm_year + 1901,0,4);
      var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
      var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
      var endDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
      if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
        return "53"
      }
      if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
        return "01"
      }
      var daysDifference;
      if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
        daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
      } else {
        daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
      }
      return leadingNulls(Math.ceil(daysDifference / 7), 2)
    }
    ),
    "%w": (function(date) {
      var day = new Date(date.tm_year + 1900,date.tm_mon + 1,date.tm_mday,0,0,0,0);
      return day.getDay()
    }
    ),
    "%W": (function(date) {
      var janFirst = new Date(date.tm_year,0,1);
      var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
      var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
      if (compareByDay(firstMonday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
        var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
    }
    ),
    "%y": (function(date) {
      return (date.tm_year + 1900).toString().substring(2)
    }
    ),
    "%Y": (function(date) {
      return date.tm_year + 1900
    }
    ),
    "%z": (function(date) {
      var off = date.tm_gmtoff;
      var ahead = off >= 0;
      off = Math.abs(off) / 60;
      off = off / 60 * 100 + off % 60;
      return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
    }
    ),
    "%Z": (function(date) {
      return date.tm_zone
    }
    ),
    "%%": (function() {
      return "%"
    }
    )
  };
  for (var rule in EXPANSION_RULES_2) {
    if (pattern.indexOf(rule) >= 0) {
      pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_2[rule](date))
    }
  }
  var bytes = intArrayFromString(pattern, false);
  if (bytes.length > maxsize) {
    return 0
  }
  writeArrayToMemory(bytes, s);
  return bytes.length - 1
  if (!ModuleClass["calledRun"])
}

function _time(ptr) {
  var ret = Date.now() / 1e3 | 0;
  if (ptr) {
    HEAP32[ptr >> 2] = ret
  }
  return ret
}
function _unsetenv(name) {
  if (name === 0) {
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }
  name = pointerStringify(name);
  if (name === "" || name.indexOf("=") !== -1) {
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }
  if (ENV.hasOwnProperty(name)) {
    delete ENV[name];
    ___buildEnvironment(ENV)
  }
  return 0
}
function _utime(path, times) {
  var time;
  if (times) {
    var offset = 4;
    time = HEAP32[times + offset >> 2];
    time *= 1e3
  } else {
    time = Date.now()
  }
  path = pointerStringify(path);
  try {
    FS.utime(path, time, time);
    return 0
  } catch (e) {
    FS.handleFSError(e);
    return -1
  }
}
function _utimes(path, times) {
  var time;
  if (times) {
    var offset = 8 + 0;
    time = HEAP32[times + offset >> 2] * 1e3;
    offset = 8 + 4;
    time += HEAP32[times + offset >> 2] / 1e3
  } else {
    time = Date.now()
  }
  path = pointerStringify(path);
  try {
    FS.utime(path, time, time);
    return 0
  } catch (e) {
    FS.handleFSError(e);
    return -1
  }
}
function _wait(stat_loc) {
  ___setErrNo(ERRNO_CODES.ECHILD);
  return -1
}
function _waitpid() {
  return _wait.apply(null, arguments)
}
if (ENVIRONMENT_IS_NODE) {
  _emscripten_get_now = function _emscripten_get_now_actual() {
    var t = process["hrtime"]();
    return t[0] * 1e3 + t[1] / 1e6
  }
} else if (typeof dateNow !== "undefined") {
  _emscripten_get_now = dateNow
} else if (typeof self === "object" && self["performance"] && typeof self["performance"]["now"] === "function") {
  _emscripten_get_now = (function() {
    return self["performance"]["now"]()
  }
  )
} else if (typeof performance === "object" && typeof performance["now"] === "function") {
  _emscripten_get_now = (function() {
    return performance["now"]()
  }
  )
} else {
  _emscripten_get_now = Date.now
}
FS.staticInit();
__ATINIT__.unshift((function() {
  if (!ModuleClass["noFSInit"] && !FS.init.initialized)
    FS.init()
}
));
__ATMAIN__.push((function() {
  FS.ignorePermissions = false
}
));
__ATEXIT__.push((function() {
  FS.quit()
}
));
ModuleClass["FS_createPath"] = FS.createPath;
ModuleClass["FS_createDataFile"] = FS.createDataFile;
__ATINIT__.unshift((function() {
  TTY.init()
}
));
__ATEXIT__.push((function() {
  TTY.shutdown()
}
));
__ATINIT__.push((function() {
  SOCKFS.root = FS.mount(SOCKFS, {}, null)
}
));
__ATINIT__.push((function() {
  PIPEFS.root = FS.mount(PIPEFS, {}, null)
}
));
___buildEnvironment(ENV);
ModuleClass["pump_message"] = MONO.pump_message;
DYNAMICTOP_PTR = staticAlloc(4);
STACK_BASE = STACKTOP = alignMemory(STATICTOP);
STACK_MAX = STACK_BASE + totalStack;
DYNAMIC_BASE = alignMemory(STACK_MAX);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
staticSealed = true;

ModuleClass["wasmTableSize"] = 69448;
ModuleClass["wasmMaxTableSize"] = 69448;
ModuleClass.asmGlobalArg = {};
ModuleClass.asmLibraryArg = {
  "abort": abort,
  "enlargeMemory": enlargeMemory,
  "getTotalMemory": getTotalMemory,
  "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
  "___clock_gettime": ___clock_gettime,
  "___lock": ___lock,
  "___setErrNo": ___setErrNo,
  "___syscall10": ___syscall10,
  "___syscall102": ___syscall102,
  "___syscall118": ___syscall118,
  "___syscall12": ___syscall12,
  "___syscall122": ___syscall122,
  "___syscall125": ___syscall125,
  "___syscall140": ___syscall140,
  "___syscall142": ___syscall142,
  "___syscall144": ___syscall144,
  "___syscall145": ___syscall145,
  "___syscall146": ___syscall146,
  "___syscall15": ___syscall15,
  "___syscall168": ___syscall168,
  "___syscall183": ___syscall183,
  "___syscall191": ___syscall191,
  "___syscall192": ___syscall192,
  "___syscall194": ___syscall194,
  "___syscall195": ___syscall195,
  "___syscall196": ___syscall196,
  "___syscall197": ___syscall197,
  "___syscall199": ___syscall199,
  "___syscall20": ___syscall20,
  "___syscall201": ___syscall201,
  "___syscall202": ___syscall202,
  "___syscall209": ___syscall209,
  "___syscall219": ___syscall219,
  "___syscall220": ___syscall220,
  "___syscall221": ___syscall221,
  "___syscall268": ___syscall268,
  "___syscall272": ___syscall272,
  "___syscall3": ___syscall3,
  "___syscall33": ___syscall33,
  "___syscall340": ___syscall340,
  "___syscall38": ___syscall38,
  "___syscall39": ___syscall39,
  "___syscall4": ___syscall4,
  "___syscall40": ___syscall40,
  "___syscall41": ___syscall41,
  "___syscall42": ___syscall42,
  "___syscall5": ___syscall5,
  "___syscall54": ___syscall54,
  "___syscall6": ___syscall6,
  "___syscall63": ___syscall63,
  "___syscall77": ___syscall77,
  "___syscall85": ___syscall85,
  "___syscall91": ___syscall91,
  "___syscall96": ___syscall96,
  "___syscall97": ___syscall97,
  "___unlock": ___unlock,
  "__exit": __exit,
  "_abort": _abort,
  "_atexit": _atexit,
  "_clock_getres": _clock_getres,
  "_clock_gettime": _clock_gettime,
  "_emscripten_asm_const_i": _emscripten_asm_const_i,
  "_emscripten_asm_const_iii": _emscripten_asm_const_iii,
  "_emscripten_memcpy_big": _emscripten_memcpy_big,
  "_execve": _execve,
  "_exit": _exit,
  "_fork": _fork,
  "_getaddrinfo": _getaddrinfo,
  "_getenv": _getenv,
  "_getnameinfo": _getnameinfo,
  "_getprotobyname": _getprotobyname,
  "_getpwuid": _getpwuid,
  "_gettimeofday": _gettimeofday,
  "_gmtime_r": _gmtime_r,
  "_kill": _kill,
  "_llvm_trap": _llvm_trap,
  "_localtime_r": _localtime_r,
  "_mono_set_timeout": _mono_set_timeout,
  "_mono_wasm_add_bool_var": _mono_wasm_add_bool_var,
  "_mono_wasm_add_float_var": _mono_wasm_add_float_var,
  "_mono_wasm_add_frame": _mono_wasm_add_frame,
  "_mono_wasm_add_int_var": _mono_wasm_add_int_var,
  "_mono_wasm_add_long_var": _mono_wasm_add_long_var,
  "_mono_wasm_add_string_var": _mono_wasm_add_string_var,
  "_mono_wasm_fire_bp": _mono_wasm_fire_bp,
  "_nanosleep": _nanosleep,
  "_pthread_cleanup_pop": _pthread_cleanup_pop,
  "_pthread_cleanup_push": _pthread_cleanup_push,
  "_pthread_cond_destroy": _pthread_cond_destroy,
  "_pthread_cond_init": _pthread_cond_init,
  "_pthread_cond_signal": _pthread_cond_signal,
  "_pthread_cond_timedwait": _pthread_cond_timedwait,
  "_pthread_cond_wait": _pthread_cond_wait,
  "_pthread_getspecific": _pthread_getspecific,
  "_pthread_key_create": _pthread_key_create,
  "_pthread_key_delete": _pthread_key_delete,
  "_pthread_mutex_destroy": _pthread_mutex_destroy,
  "_pthread_mutex_init": _pthread_mutex_init,
  "_pthread_mutexattr_destroy": _pthread_mutexattr_destroy,
  "_pthread_mutexattr_init": _pthread_mutexattr_init,
  "_pthread_mutexattr_settype": _pthread_mutexattr_settype,
  "_pthread_setcancelstate": _pthread_setcancelstate,
  "_pthread_setspecific": _pthread_setspecific,
  "_putchar": _putchar,
  "_puts": _puts,
  "_schedule_background_exec": _schedule_background_exec,
  "_sem_destroy": _sem_destroy,
  "_sem_init": _sem_init,
  "_sem_post": _sem_post,
  "_sem_trywait": _sem_trywait,
  "_sem_wait": _sem_wait,
  "_setenv": _setenv,
  "_sigaction": _sigaction,
  "_sigemptyset": _sigemptyset,
  "_strftime": _strftime,
  "_sysconf": _sysconf,
  "_time": _time,
  "_unsetenv": _unsetenv,
  "_utime": _utime,
  "_utimes": _utimes,
  "_waitpid": _waitpid,
  "DYNAMICTOP_PTR": DYNAMICTOP_PTR,
  "STACKTOP": STACKTOP,
  "_environ": _environ
};

if (DEBUG) {
  debugger;
}

let asm = Module.asm = Module.asm(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

let initialStackTop;
dependenciesFulfilled = function runCaller() {
  if (!ModuleClass.calledRun) {
    run();
    dependenciesFulfilled = runCaller;
  }
};

run();
