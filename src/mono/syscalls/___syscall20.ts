import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  PROCINFO,
} from './PROCINFO';
import {
  SYSCALLS,
} from './SYSCALLS';

export function ___syscall20(which: never, varargs: unknown) {
  SYSCALLS.varargs = varargs;

  try {
    return PROCINFO.pid;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
