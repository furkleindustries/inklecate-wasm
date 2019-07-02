import {
  ALLOC_NORMAL,
} from './pointers/constants';
import {
  allocate,
} from './pointers/allocate';
import {
  getHeap,
} from './heaps/heaps';
import {
  getPointer,
  setPointer,
} from './pointers/pointers';
import {
  intArrayFromString,
} from './emscripten/intArrayFromString';

const HEAP32 = getHeap('HEAP32');

export const _tzname = getPointer('STATICTOP');
setPointer('STATICTOP', _tzname + 16);
export const _daylight = getPointer('STATICTOP');
setPointer('STATICTOP', _daylight + 16);
export const _timezone = getPointer('STATICTOP');
setPointer('STATICTOP', _timezone + 16);

export function _tzset() {
  if ((_tzset as any).called) {
    return;
  }

  (_tzset as any).called = true;
  HEAP32[_timezone >> 2] = (new Date).getTimezoneOffset() * 60;
  var winter = new Date(2e3,0,1);
  var summer = new Date(2e3,6,1);
  HEAP32[_daylight >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
  function extractZone(date: Date) {
    var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
    return match ? match[1] : "GMT"
  }

  var winterName = extractZone(winter);
  var summerName = extractZone(summer);
  var winterNamePtr = allocate(intArrayFromString(winterName), 'i8', ALLOC_NORMAL);
  var summerNamePtr = allocate(intArrayFromString(summerName), 'i8', ALLOC_NORMAL);
  if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
    HEAP32[_tzname >> 2] = winterNamePtr;
    HEAP32[_tzname + 4 >> 2] = summerNamePtr
  } else {
    HEAP32[_tzname >> 2] = summerNamePtr;
    HEAP32[_tzname + 4 >> 2] = winterNamePtr
  }
}
