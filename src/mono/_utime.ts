import {
  FS,
} from './filesystems/FS/FS';
import {
  getHeap,
} from './heaps/heaps';
import {
  pointerStringify,
} from './pointers/pointerStringify';

const HEAP32 = getHeap('HEAP32');

export function _utime(path: any, times: number) {
  var time;
  if (times) {
    const offset = 4;
    time = HEAP32[times + offset >> 2];
    time *= 1e3;
  } else {
    time = Date.now();
  }

  path = pointerStringify(path);
  try {
    FS.utime(path, time, time);
    return 0;
  } catch (e) {
    FS.handleFSError(e);
    return -1;
  }
}
