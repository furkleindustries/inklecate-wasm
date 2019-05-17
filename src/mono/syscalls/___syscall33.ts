import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall33 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr()
    const amode = SYSCALLS.get();
    return SYSCALLS.doAccess(path, amode);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
