import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall118 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const stream = SYSCALLS.getStreamFromFD();
    return 0;
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
