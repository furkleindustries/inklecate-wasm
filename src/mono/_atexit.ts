import {
  getAtExit,
} from './run/getAtExit';

export function _atexit(func: (...args: any[]) => any, arg: any) {
  getAtExit().unshift({
    arg,
    func,
  });
}
