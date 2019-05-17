import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall194 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const fd = SYSCALLS.get();
    const zero = SYSCALLS.getZero();
    const length = SYSCALLS.get64();
    FS.ftruncate(fd, length);
    return 0;
  } catch (e) {
    if (typeof FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
