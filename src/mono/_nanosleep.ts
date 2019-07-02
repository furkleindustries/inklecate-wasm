import {
  getHeap,
} from './heaps/heaps';
import {
  Module,
} from './Module';

const HEAP32 = getHeap('HEAP32');

export function _nanosleep(rqtp: number, rmtp: number) {
  const seconds = HEAP32[rqtp >> 2];
  const nanoseconds = HEAP32[rqtp + 4 >> 2];
  if (rmtp !== 0) {
    HEAP32[rmtp >> 2] = 0;
    HEAP32[rmtp + 4 >> 2] = 0;
  }

  return Module._usleep(seconds * 1e6 + nanoseconds / 1e3);
}
