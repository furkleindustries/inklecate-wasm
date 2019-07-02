import {
  ErrorNumberCodes,
} from '../errors/ErrorNumberCodes';
import {
  PTHREAD_SPECIFIC,
} from './PTHREAD_SPECIFIC';

export function _pthread_setspecific(key: any, value: any) {
  if (!(key in PTHREAD_SPECIFIC)) {
    return ErrorNumberCodes.EINVAL;
  }

  PTHREAD_SPECIFIC[key] = value;

  return 0;
}
