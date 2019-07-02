import {
  getHeap,
} from './heaps/heaps';

const HEAP32 = getHeap('HEAP32');

export function _gettimeofday(ptr: any) {
  var now = Date.now();
  HEAP32[ptr >> 2] = now / 1e3 | 0;
  HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
  return 0;
}
