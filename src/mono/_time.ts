import {
  getHeap,
} from './heaps/heaps';

const HEAP32 = getHeap('HEAP32');

export function _time(ptr: number) {
  const ret = Date.now() / 1e3 | 0;
  if (ptr) {
    HEAP32[ptr >> 2] = ret
  }

  return ret;
}
