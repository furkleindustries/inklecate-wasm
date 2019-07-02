import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';

export function _kill(pid: any, sig: any) {
  ___setErrNo(ErrorNumberCodes.EPERM);
  return -1;
}
