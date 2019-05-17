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

export const ___syscall191 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const resource = SYSCALLS.get();
    const rlim = SYSCALLS.get();
    getHeap('HEAP32')[rlim >> 2] = -1;
    getHeap('HEAP32')[rlim + 4 >> 2] = -1;
    getHeap('HEAP32')[rlim + 8 >> 2] = -1;
    getHeap('HEAP32')[rlim + 12 >> 2] = -1;
    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError as any)) {
      abort(e);
    }

    return -e.errno;
  }
}