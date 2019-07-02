import {
  _wait,
} from './_wait';

export function _waitpid() {
  return _wait.apply(null, arguments as any);
}
