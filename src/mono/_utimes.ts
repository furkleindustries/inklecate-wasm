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

export function _utimes(path: any, times: number) {
  let time;
  if (times) {
    let offset = 8;
    time = HEAP32[times + offset >> 2] * 1e3;
    offset = 8 + 4;
    time += HEAP32[times + offset >> 2] / 1e3
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
