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

export const ___syscall54 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const stream = SYSCALLS.getStreamFromFD();
    const op = SYSCALLS.get();
    if (op === 21509 || op === 21505) {
      if (!stream.tty) {
        return -ErrorNumberCodes.ENOTTY;
      }

      return 0;
    } else if (op === 21510 ||
               op === 21511 ||
               op === 21512 ||
               op === 21506 ||
               op === 21507 ||
               op === 21508)
    {
      if (!stream.tty) {
        return -ErrorNumberCodes.ENOTTY;
      }

      return 0;
    } else if (op === 21519) {
      if (!stream.tty) {
        return -ErrorNumberCodes.ENOTTY;
      }

      const argp = SYSCALLS.get();
      getHeap('HEAP32')[argp >> 2] = 0;
      return 0;
    } else if (op === 21520) {
      if (!stream.tty) {
        return -ErrorNumberCodes.ENOTTY;
      }

      return -ErrorNumberCodes.EINVAL
    } else if (op === 21531) {
      const argp = SYSCALLS.get();
      return FS.ioctl(stream, op, argp);
    } else if (op === 21523) {
      if (!stream.tty) {
        return -ErrorNumberCodes.ENOTTY;
      }

      return 0;
    } else {
      abort(`Bad ioctl syscall: ${op}`);
    }
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
