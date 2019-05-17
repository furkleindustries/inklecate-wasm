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

export const ___syscall140 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const stream = SYSCALLS.getStreamFromFD();
    const offset_high = SYSCALLS.get();
    const offset_low = SYSCALLS.get();
    const result = SYSCALLS.get();
    const whence = SYSCALLS.get();
    const offset = offset_low;

    FS.llseek(stream, offset, whence);

    getHeap('HEAP32')[result >> 2] = stream.position;

    if (stream.getdents && offset === 0 && whence === 0) {
      stream.getdents = null;
    }

    return 0;
  } catch (e) {
    if (FS === undefined || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
