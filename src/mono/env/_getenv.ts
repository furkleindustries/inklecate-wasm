import {
  allocateUTF8,
} from '../pointers/allocateUtf8';
import {
  ENV,
} from './ENV';
import {
  pointerStringify,
} from '../pointers/pointerStringify';

export function _getenv(name: any) {
  if (name === 0) {
    return 0;
  }

  name = pointerStringify(name);
  if (!ENV.hasOwnProperty(name)) {
    return 0;
  }

  const __getenv: any = _getenv;
  if (__getenv.ret) {
    _free(__getenv.ret);
  }

  __getenv.ret = allocateUTF8(ENV[name]);
  return __getenv.ret;
}
