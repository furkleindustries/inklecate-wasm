import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall91 = (which: never, constargs: unknown) => {
  SYSCALLS.constargs = constargs;

  try {
    const addr = SYSCALLS.get()
    const len = SYSCALLS.get();
    const info = SYSCALLS.mappings[addr];
    if (!info) {
      return 0;
    }

    if (len === info.len) {
      const stream = FS.getStream(info.fd);
      SYSCALLS.doMsync(addr, stream, len, info.flags);
      FS.munmap(stream);
      SYSCALLS.mappings[addr] = null;
      if (info.allocated) {
        _free(info.malloc);
      }
    }

    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
