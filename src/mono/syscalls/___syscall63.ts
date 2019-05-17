import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall63 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const old = SYSCALLS.getStreamFromFD()
    const suggestFD = SYSCALLS.get();
    if (old.fd === suggestFD) {
      return suggestFD;
    }

    return SYSCALLS.doDup(old.path, old.flags, suggestFD);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
