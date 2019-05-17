import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall196 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr();
    const buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.lstat, path, buf);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
