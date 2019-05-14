import {
  getModule,
} from '../getModule';
import {
  writeArrayToMemory,
} from '../heaps/writeArrayToMemory';

const Module = getModule();

export const arrayToC = (arr: Array<any>) => {
  const ret = Module.stackAlloc(arr.length);
  writeArrayToMemory(arr, ret);
  return ret;
};
