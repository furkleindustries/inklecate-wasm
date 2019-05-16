import {
  Module,
} from '../Module';
import {
  writeArrayToMemory,
} from '../heaps/writeArrayToMemory';

export const arrayToC = (arr: Array<any>) => {
  const ret = Module.stackAlloc(arr.length);
  writeArrayToMemory(arr, ret);
  return ret;
};
