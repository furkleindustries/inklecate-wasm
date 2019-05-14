import {
  getHeap,
} from '../heaps/heaps';
import {
  getModule,
} from '../getModule';

const Module = getModule();

export const ___setErrNo = (value: number) => {
  if (Module.___errno_location) {
    getHeap('HEAP32')[Module.___errno_location() >> 2] = value;
  }

  return value;
};
