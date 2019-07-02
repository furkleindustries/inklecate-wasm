import {
  _execl,
} from './_execl';

export function _execve() {
  return _execl.apply(null, arguments as any);
}
