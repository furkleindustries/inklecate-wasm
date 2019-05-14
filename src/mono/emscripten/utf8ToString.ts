import {
  getHeap,
} from '../heaps/heaps';
import {
  utf8ArrayToString,
} from './utf8ArrayToString';

export const utf8ToString = (ptr: number) => utf8ArrayToString(
  getHeap('HEAPU8'),
  ptr,
);
