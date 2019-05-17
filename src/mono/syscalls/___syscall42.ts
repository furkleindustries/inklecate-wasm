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
  PIPEFS,
} from '../filesystems/PIPEFS/PIPEFS';
import {
  SYSCALLS,
} from './SYSCALLS'
import {
  throwFromErrorNumber,
} from '../TTY';

export const ___syscall42 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const fdPtr = SYSCALLS.get();
    if (fdPtr === 0) {
      throwFromErrorNumber(ErrorNumberCodes.EFAULT);
      return;
    }

    const res = PIPEFS.createPipe();
    getHeap('HEAP32')[fdPtr >> 2] = res.readable_fd;
    getHeap('HEAP32')[fdPtr + 4 >> 2] = res.writable_fd;
    return 0
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
