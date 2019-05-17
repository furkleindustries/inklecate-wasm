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
  stringToUtf8,
} from '../emscripten/stringToUtf8";
import {
  SYSCALLS,
} from './SYSCALLS';

export const ___syscall220 = (which: never, varargs: unknown) => {
  SYSCALLS.varargs = varargs;

  try {
    const stream = SYSCALLS.getStreamFromFD()
    const dirp = SYSCALLS.get();
    const count = SYSCALLS.get();
    if (!stream.getdents) {
      stream.getdents = FS.readdir(stream.path);
    }

    let pos = 0;
    while (stream.getdents.length > 0 && pos + 268 <= count) {
      let id;
      let type;
      const name = stream.getdents.pop();
      if (name[0] === ".") {
        id = 1;
        type = 4
      } else {
        const child = FS.lookupNode(stream.node, name);
        id = child.id;
        type = FS.isChrdev(child.mode) ?
          2 :
          (
            FS.isDir(child.mode) ?
              4 :
              (
                FS.isLink(child.mode) ?
                  10 :
                  8
              )
          );
      }

      getHeap('HEAP32')[dirp + pos >> 2] = id;
      getHeap('HEAP32')[dirp + pos + 4 >> 2] = stream.position;
      getHeap('HEAP16')[dirp + pos + 8 >> 1] = 268;
      getHeap('HEAP8')[dirp + pos + 10 >> 0] = type;
      stringToUtf8(name, dirp + pos + 11, 256);
      pos += 268;
    }

    return pos;
  } catch (e) {
    if (FS === undefined || !(e instanceof FS.ErrnoError)) {
      abort(e);
    }

    return -e.errno;
  }
};
