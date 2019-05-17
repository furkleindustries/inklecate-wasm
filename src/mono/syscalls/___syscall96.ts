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

export const ___syscall96 = (which: never, constargs: unknown) => {
  SYSCALLS.constargs = constargs;

  try {
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
