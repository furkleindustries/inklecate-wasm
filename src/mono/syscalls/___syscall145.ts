import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall145 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const stream = SYSCALLS.getStreamFromFD()
    const iov = SYSCALLS.get()
    const iovcnt = SYSCALLS.get();
    return SYSCALLS.doReadv(stream, iov, iovcnt);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
