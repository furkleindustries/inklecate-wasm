import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';

export function _fork() {
  ___setErrNo(ErrorNumberCodes.EAGAIN);
  return -1;
}
