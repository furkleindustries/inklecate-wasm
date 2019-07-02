import {
  getAtExit,
} from '../run/getAtExit';
import {
  Module,
} from '../Module';

const __ATEXIT__ = getAtExit();

export function _pthread_cleanup_push(routine: any, arg: any) {
  __ATEXIT__.push(function () {
    Module.dynCall_vi(routine, arg);
  });

  (_pthread_cleanup_push as any).level = __ATEXIT__.length
}
