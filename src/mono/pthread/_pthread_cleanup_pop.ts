import {
  _pthread_cleanup_push,
} from './_pthread_cleanup_push';
import {
  getAtExit,
} from '../run/getAtExit';
import {
  assert,
} from 'ts-assertions';

const __ATEXIT__ = getAtExit();

export function _pthread_cleanup_pop() {
  assert((_pthread_cleanup_push as any).level == __ATEXIT__.length, 'Cannot pop if something else added meanwhile.');
  __ATEXIT__.pop();
  (_pthread_cleanup_push as any).level = __ATEXIT__.length
}
