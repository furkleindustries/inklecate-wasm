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
  lengthBytesUtf8,
} from '../emscripten/lengthyBytesUtf8';
import {
  stringToUtf8,
} from '../emscripten/stringToUtf8';
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall183 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const buf = SYSCALLS.get();
    const size = SYSCALLS.get();
    if (size === 0) {
      return -ErrorNumberCodes.EINVAL;
    }

    const cwd = FS.cwd();
    const cwdLengthInBytes = lengthBytesUtf8(cwd);
    if (size < cwdLengthInBytes + 1) {
      return -ErrorNumberCodes.ERANGE;
    }

    stringToUtf8(cwd, buf, size);
    return buf;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError as any)) {
      abort(e);
    }

    return -e.errno;
  }
};
