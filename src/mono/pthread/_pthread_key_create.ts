import {
  ErrorNumberCodes,
} from '../errors/ErrorNumberCodes';
import {
  getHeap,
} from '../heaps/heaps';
import {
  PTHREAD_SPECIFIC,
} from './PTHREAD_SPECIFIC';

const HEAP32 = getHeap('HEAP32');

let PTHREAD_SPECIFIC_NEXT_KEY = 1;
export function _pthread_key_create(key: any, destructor: any) {
  if (key == 0) {
    return ErrorNumberCodes.EINVAL;
  }

  HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
  PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
  PTHREAD_SPECIFIC_NEXT_KEY += 1;

  return 0;
}
