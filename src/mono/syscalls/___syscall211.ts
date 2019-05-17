import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  getHeap,
} from '../heaps/heaps';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall211 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const ruid = SYSCALLS.get();
    const euid = SYSCALLS.get();
    const suid = SYSCALLS.get();
    getHeap('HEAP32')[ruid >> 2] = 0;
    getHeap('HEAP32')[euid >> 2] = 0;
    getHeap('HEAP32')[suid >> 2] = 0;
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
