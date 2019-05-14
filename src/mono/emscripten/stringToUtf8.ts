import {
  getHeap,
} from '../heaps/heaps';
import {
  stringToUtf8Array,
} from './stringToUtf8Array';

export const stringToUtf8 = (
  str: string,
  outPtr: number,
  maxBytesToWrite: number,
) => stringToUtf8Array(str, getHeap('HEAPU8'), outPtr, maxBytesToWrite);
