import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall5 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const pathname = SYSCALLS.getStr()
    const flags = SYSCALLS.get()
    const mode = SYSCALLS.get();
    const stream = FS.open(pathname, flags, mode);
    return stream.fd
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
