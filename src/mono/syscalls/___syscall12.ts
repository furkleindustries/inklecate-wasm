import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall12 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr();
    FS.chdir(path);
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError as )) {
      abort(e);
    }

    return -e.errno;
  }
};
