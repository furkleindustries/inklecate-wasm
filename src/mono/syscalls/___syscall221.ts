import {
  ___setErrNo,
} from '../errors/___setErrNo';
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

export const ___syscall221 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const stream = SYSCALLS.getStreamFromFD();
    const cmd = SYSCALLS.get();
    if (cmd === 0) {
      const arg = SYSCALLS.get();
      if (arg < 0) {
        return -ErrorNumberCodes.EINVAL;
      }

      return FS.open(stream.path, stream.flags, 0, arg).fd;
    } else if (cmd === 1 || cmd === 2 || cmd === 13 || cmd === 14) {
      return 0;
    } else if (cmd === 3) {
      return stream.flags;
    } else if (cmd === 4) {
      const arg = SYSCALLS.get();
      stream.flags |= arg;
      return 0;
    }  else if (cmd === 8 || cmd === 16) {
      return -ErrorNumberCodes.EINVAL;
    } else if (cmd === 9) {
      ___setErrNo(ErrorNumberCodes.EINVAL);
      return -1;
    } else if (cmd === 12) {
      const arg = SYSCALLS.get();
      const offset = 0;
      getHeap('HEAP16')[arg + offset >> 1] = 2;
      return 0;
    }

    return -ErrorNumberCodes.EINVAL;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
