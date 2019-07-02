import {
  ErrorNumberCodes,
} from '../errors/ErrorNumberCodes';
import {
  PTHREAD_SPECIFIC,
} from './PTHREAD_SPECIFIC';

export function _pthread_key_delete(key: any) {
  if (key in PTHREAD_SPECIFIC) {
    delete PTHREAD_SPECIFIC[key];
    return 0;
  }

  return ErrorNumberCodes.EINVAL;
}
