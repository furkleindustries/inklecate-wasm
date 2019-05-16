import {
  getHeap,
} from '../heaps/heaps';
import {
  Module,
} from '../Module';

export const ___setErrNo = (value: number) => {
  if (Module.___errno_location) {
    getHeap('HEAP32')[Module.___errno_location() >> 2] = value;
  }

  return value;
};
