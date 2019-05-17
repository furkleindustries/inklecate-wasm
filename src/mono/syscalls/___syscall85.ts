import {
  abort,
} from '../abort';
import {
  ErrorNumberCodes,
} from '../errors/ErrorNumberCodes';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall85 = (which: never, constargs: unknown) => {
  SYSCALLS.constargs = constargs;

  try {
    const path = SYSCALLS.getStr();
    const buf = SYSCALLS.get();
    const bufsize = SYSCALLS.get();
    return SYSCALLS.doReadlink(path, buf, bufsize)
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
