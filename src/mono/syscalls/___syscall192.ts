import {
  _memalign,
} from '../_memalign';
import {
  _memset,
} from '../_memset';
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
  getHeap,
} from '../heaps/heaps';
import {
  PAGE_SIZE,
} from '../constants';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall192 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const addr = SYSCALLS.get();
    const len = SYSCALLS.get();
    const prot = SYSCALLS.get();
    const flags = SYSCALLS.get();
    const fd = SYSCALLS.get();

    let off = SYSCALLS.get();
    off <<= 12;

    let ptr;
    let allocated = false;

    if (fd === -1) {
      ptr = _memalign(PAGE_SIZE, len);
      if (!ptr) {
        return -ErrorNumberCodes.ENOMEM;
      }

      _memset(ptr, 0, len);
      allocated = true;
    } else {
      const info = FS.getStream(fd);
      if (!info) {
        return -ErrorNumberCodes.EBADF;
      }

      const res = FS.mmap(
        info,
        getHeap('HEAPU8'),
        addr,
        len,
        off,
        prot,
        flags,
      );

      ptr = res.ptr;
      allocated = res.allocated;
    }

    SYSCALLS.mappings[ptr] = {
      allocated: allocated,
      fd: fd,
      flags: flags,
      malloc: ptr,
      len: len,
    };

    return ptr;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError as any)) {
      abort(e);
    }

    return -e.errno;
  }
};
