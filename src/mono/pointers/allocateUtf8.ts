import {
  getHeap,
} from '../heaps/heaps';
import {
  Module,
} from '../Module';
import {
  lengthBytesUtf8,
} from '../emscripten/lengthyBytesUtf8';
import {
  stringToUtf8Array,
} from '../emscripten/stringToUtf8Array';

export const allocateUTF8 = (str: string) => {
  var size = lengthBytesUtf8(str) + 1;
  var ret = Module._malloc(size);
  if (ret) {
    stringToUtf8Array(str, getHeap('HEAP8'), ret, size);
  }

  return ret;
};
