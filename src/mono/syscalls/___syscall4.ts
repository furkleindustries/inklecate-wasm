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

export const ___syscall4 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const stream = SYSCALLS.getStreamFromFD()
    const buf = SYSCALLS.get()
    const count = SYSCALLS.get();
    return FS.write(stream, getHeap('HEAP8'), buf, count);
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
