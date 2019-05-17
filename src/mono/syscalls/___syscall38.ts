import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall38 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const old_path = SYSCALLS.getStr()
    const new_path = SYSCALLS.getStr();
    FS.rename(old_path, new_path);
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
}
