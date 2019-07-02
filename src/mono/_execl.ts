import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';

export function _execl() {
  ___setErrNo(ErrorNumberCodes.ENOEXEC);
  return -1;
}
