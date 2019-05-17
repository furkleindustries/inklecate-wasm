import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall40 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr();
    FS.rmdir(path);
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
