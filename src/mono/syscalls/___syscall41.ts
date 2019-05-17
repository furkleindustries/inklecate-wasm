import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall41 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    var old = SYSCALLS.getStreamFromFD();
    return FS.open(old.path, old.flags, 0).fd
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
