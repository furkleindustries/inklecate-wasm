import {
  _memset,
} from '../_memset';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  getHeap,
} from '../heaps/heaps';

export const ___syscall77 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const who = SYSCALLS.get();
    const usage = SYSCALLS.get();
    _memset(usage, 0, 136);
    getHeap('HEAP32')[usage >> 2] = 1;
    getHeap('HEAP32')[usage + 4 >> 2] = 2;
    getHeap('HEAP32')[usage + 8 >> 2] = 3;
    getHeap('HEAP32')[usage + 12 >> 2] = 4;
    return 0
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
