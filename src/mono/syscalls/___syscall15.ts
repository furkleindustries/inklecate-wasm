import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall15 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const path = SYSCALLS.getStr();
    const mode = SYSCALLS.get();
    FS.chmod(path, mode);
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
