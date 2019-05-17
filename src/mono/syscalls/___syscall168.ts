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

export const ___syscall168 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;
  try {
    const fds = SYSCALLS.get();
    const nfds = SYSCALLS.get();
    const timeout = SYSCALLS.get();
    let nonzero = 0;
    for (let ii = 0; ii < nfds; ii += 1) {
      const pollfd = fds + 8 * ii;
      const fd = getHeap('HEAP32')[pollfd >> 2];
      const events = getHeap('HEAP16')[pollfd + 4 >> 1];
      let mask = 32;
      const stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          mask = stream.stream_ops.poll(stream);
        }
      }

      mask &= events | 8 | 16;
      if (mask) {
        nonzero += 1;
      }

      getHeap('HEAP16')[pollfd + 6 >> 1] = mask;
    }

    return nonzero;
  } catch (e) {
    if (typeof FS === undefined || !(e instanceof (FS.ErrnoError as any))) {
      abort(e);
    }

    return -e.errno;
  }
};
