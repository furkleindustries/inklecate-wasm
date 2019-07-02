import {
  getHeap,
} from '../heaps/heaps';

const HEAPU8 = getHeap('HEAPU8');

export function _emscripten_memcpy_big(dest: any, src: number, num: number) {
  HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
  return dest;
};
