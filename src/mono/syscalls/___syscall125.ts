import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall125 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    return 0;
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
