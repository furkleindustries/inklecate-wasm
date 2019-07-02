import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';

export function _wait(stat_loc: any) {
  ___setErrNo(ErrorNumberCodes.ECHILD);
  return -1;
}
