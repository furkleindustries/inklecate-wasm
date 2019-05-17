import {
  abort,
} from '../abort';
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
  SYSCALLS,
} from './SYSCALLS';
import {
  assert,
} from 'ts-assertions';
import {
  throwFromErrorNumber,
} from '../TTY';

export const ___syscall142 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const nfds = SYSCALLS.get();
    const readfds = SYSCALLS.get();
    const writefds = SYSCALLS.get();
    const exceptfds = SYSCALLS.get();
    const timeout = SYSCALLS.get();

    assert(nfds <= 64, 'nfds must be less than or equal to 64.');
    assert(!exceptfds, 'exceptfds is not supported.');

    let total = 0;
    const srcReadLow = readfds ? getHeap('HEAP32')[readfds >> 2] : 0
    const srcReadHigh = readfds ? getHeap('HEAP32')[readfds + 4 >> 2] : 0;
    const srcWriteLow = writefds ? getHeap('HEAP32')[writefds >> 2] : 0
    const srcWriteHigh = writefds ? getHeap('HEAP32')[writefds + 4 >> 2] : 0;
    const srcExceptLow = exceptfds ? getHeap('HEAP32')[exceptfds >> 2] : 0
    const srcExceptHigh = exceptfds ? getHeap('HEAP32')[exceptfds + 4 >> 2] : 0;
    let dstReadLow = 0
    let dstReadHigh = 0;
    let dstWriteLow = 0
    let dstWriteHigh = 0;
    let dstExceptLow = 0
    let dstExceptHigh = 0;
    const allLow = (readfds ? getHeap('HEAP32')[readfds >> 2] : 0) |
      (writefds ? getHeap('HEAP32')[writefds >> 2] : 0) |
      (exceptfds ? getHeap('HEAP32')[exceptfds >> 2] : 0);

    const allHigh = (readfds ? getHeap('HEAP32')[readfds + 4 >> 2] : 0) |
      (writefds ? getHeap('HEAP32')[writefds + 4 >> 2] : 0) |
      (exceptfds ? getHeap('HEAP32')[exceptfds + 4 >> 2] : 0);

    const check = (fd: number, low: number, high: number, val: number) => (
      fd < 32 ? low & val : high & val
    );

    for (let fd = 0; fd < nfds; fd += 1) {
      const mask = 1 << fd % 32;
      if (!check(fd, allLow, allHigh, mask)) {
        continue
      }

      const stream = FS.getStream(fd);
      if (!stream) {
        throw throwFromErrorNumber(ErrorNumberCodes.EBADF);
      }

      const flags = stream.stream_ops.poll ?
        stream.stream_ops.poll(stream) :
        SYSCALLS.DEFAULT_POLLMASK;

      if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
        if (fd < 32) {
          dstReadLow = dstReadLow | mask;
        } else {
          dstReadHigh = dstReadHigh | mask;
        }

        total += 1;
      }

      if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
        if (fd < 32) {
          dstWriteLow = dstWriteLow | mask;
        } else {
          dstWriteHigh = dstWriteHigh | mask;
        }

        total += 1;
      }

      if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
        if (fd < 32) {
          dstExceptLow = dstExceptLow | mask;
        } else {
          dstExceptHigh = dstExceptHigh | mask;
        }

        total += 1;
      }
    }

    if (readfds) {
      getHeap('HEAP32')[readfds >> 2] = dstReadLow;
      getHeap('HEAP32')[readfds + 4 >> 2] = dstReadHigh;
    }

    if (writefds) {
      getHeap('HEAP32')[writefds >> 2] = dstWriteLow;
      getHeap('HEAP32')[writefds + 4 >> 2] = dstWriteHigh;
    }

    if (exceptfds) {
      getHeap('HEAP32')[exceptfds >> 2] = dstExceptLow;
      getHeap('HEAP32')[exceptfds + 4 >> 2] = dstExceptHigh;
    }

    return total;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
