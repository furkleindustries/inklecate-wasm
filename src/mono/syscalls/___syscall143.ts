import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall144 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const addr = SYSCALLS.get();
    const len = SYSCALLS.get();
    const flags = SYSCALLS.get();
    const info = SYSCALLS.mappings[addr];
    if (!info) {
      return 0;
    }

    SYSCALLS.doMsync(addr, FS.getStream(info.fd), len, info.flags);
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
