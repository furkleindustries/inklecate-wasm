import {
  abort,
} from '../abort';
import {
  FS,
} from '../filesystems/FS/FS';
import {
  getHeap,
} from '../heaps/heaps/';
import {
  SYSCALLS,
} from './SYSCALLS';
import {
  assertValid,
} from 'ts-assertions';

export const ___syscall268 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const path = SYSCALLS.getStr();

    const size = assertValid(
      SYSCALLS.get(),
      'The size returned by SYSCALLS.get in ___syscall268 was not 64.',
      (value) => value === 64,
    );

    const buf = SYSCALLS.get();

    getHeap('HEAP32')[buf + 4 >> 2] = 4096;
    getHeap('HEAP32')[buf + 40 >> 2] = 4096;
    getHeap('HEAP32')[buf + 8 >> 2] = 1e6;
    getHeap('HEAP32')[buf + 12 >> 2] = 5e5;
    getHeap('HEAP32')[buf + 16 >> 2] = 5e5;
    getHeap('HEAP32')[buf + 20 >> 2] = FS.nextInode;
    getHeap('HEAP32')[buf + 24 >> 2] = 1e6;
    getHeap('HEAP32')[buf + 28 >> 2] = 42;
    getHeap('HEAP32')[buf + 44 >> 2] = 2;
    getHeap('HEAP32')[buf + 36 >> 2] = 255;

    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
