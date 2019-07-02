import {
  PTHREAD_SPECIFIC,
} from './PTHREAD_SPECIFIC';

export function _pthread_getspecific(key: any) {
  return PTHREAD_SPECIFIC[key] || 0;
}
