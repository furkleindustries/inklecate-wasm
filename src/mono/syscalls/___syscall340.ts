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

export const ___syscall340 = (which: unknown, varargs: number) => {
  SYSCALLS.varargs = varargs;

  try {
    const pid = SYSCALLS.get();
    const resource = SYSCALLS.get();
    const new_limit = SYSCALLS.get();
    const old_limit = SYSCALLS.get();

    if (old_limit) {
      getHeap('HEAP32')[old_limit >> 2] = -1;
      getHeap('HEAP32')[old_limit + 4 >> 2] = -1;
      getHeap('HEAP32')[old_limit + 8 >> 2] = -1;
      getHeap('HEAP32')[old_limit + 12 >> 2] = -1
    }

    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
