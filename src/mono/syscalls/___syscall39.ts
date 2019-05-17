import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall39 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr()
    const mode = SYSCALLS.get();
    return SYSCALLS.doMkdir(path, mode);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
