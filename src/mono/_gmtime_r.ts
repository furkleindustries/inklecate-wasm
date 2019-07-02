import {
  ALLOC_STATIC,
} from './pointers/constants';
import {
  allocate,
} from './pointers/allocate';
import {
  getHeap,
} from './heaps/heaps';
import {
  intArrayFromString,
} from './emscripten/intArrayFromString';

const HEAP32 = getHeap('HEAP32');

const ___tm_timezone = allocate(intArrayFromString('GMT'), 'i8', ALLOC_STATIC);

export function _gmtime_r(time: any, tmPtr: any) {
  let date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getUTCSeconds();
  HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
  HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
  HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
  HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
  HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
  HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
  HEAP32[tmPtr + 36 >> 2] = 0;
  HEAP32[tmPtr + 32 >> 2] = 0;
  let start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  let yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
  return tmPtr;
}
