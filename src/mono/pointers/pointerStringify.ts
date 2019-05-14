import {
  getHeap,
} from '../heaps/heaps';
import {
  utf8ToString,
} from '../emscripten/utf8ToString';

export const pointerStringify = (ptr: number, length?: number) => {
  if (length === 0 || !ptr) {
    return '';
  }

  let hasUtf = 0;
  let t;
  let ii = 0;
  while (1) {
    t = getHeap('HEAPU8')[ptr + ii >> 0];
    hasUtf |= t;
    if (!t && !length) {
      break;
    }

    ii += 1;

    if (length && ii === length) {
      break;
    }
  }

  if (!length) {
    length = ii;
  }

  let ret = '';
  if (hasUtf < 128) {
    const MAX_CHUNK = 1024;
    let curr;
    while (length) {
      curr = String.fromCharCode.apply(
        String,
        getHeap('HEAPU8').subarray(ptr, ptr + Math.min(length, MAX_CHUNK)),
      );

      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }

    return ret;
  }

  return utf8ToString(ptr);
};
