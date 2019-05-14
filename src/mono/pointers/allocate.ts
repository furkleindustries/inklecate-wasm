import {
  ALLOC_STATIC,
  ALLOC_NONE,
} from './constants';
import {
  dynamicAlloc,
} from './dynamicAlloc';
import {
  getHeap,
} from '../heaps/heaps';
import {
  getModule,
} from '../getModule';
import {
  getNativeTypeSize,
} from '../getNativeTypeSize';
import {
  setValue,
} from '../emscripten/setValue';
import {
  staticAlloc,
} from './staticAlloc';
import {
  assert,
} from 'ts-assertions';

const Module = getModule();

export const allocate = (
  slab: number | number[],
  types: string | string[],
  allocator: number,
  ptr: number,
) => {
  let zeroFill;
  let size;
  if (typeof slab === 'number') {
    zeroFill = true;
    size = slab;
  } else {
    zeroFill = false;
    size = slab.length
  }

  const singleType = typeof types === 'string' ? types : null;
  let ret;
  if (allocator === ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [
      typeof Module._malloc === 'function' ? Module._malloc : staticAlloc,
      Module.stackAlloc,
      staticAlloc,
      dynamicAlloc,
    ][typeof allocator === 'undefined' ? ALLOC_STATIC : allocator](
      Math.max(
        size,
        singleType ? 1 : types.length,
      ),
    );
  }

  if (zeroFill) {
    let stop;
    ptr = ret;
    assert(!(ret & 3));
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      getHeap('HEAP32')[ptr >> 2] = 0;
    }

    stop = ret + size;
    while (ptr < stop) {
      getHeap('HEAP8')[ptr++ >> 0] = 0;
    }

    return ret;
  }

  if (singleType === 'i8') {
    if (typeof slab === 'number') {
      getHeap('HEAPU8').set(new Uint8Array(slab), ret)
    } else {
      getHeap('HEAPU8').set(slab, ret)
    }

    return ret;
  }

  let ii = 0;
  let type;
  let typeSize;
  let previousType;

  while (ii < size) {
    let curr = Array.isArray(slab) ? slab[ii] : slab;
    type = singleType || types[ii];

    // @ts-ignore
    if (type === 0) {
      ii += 1;
      continue;
    }

    if (type === 'i64') {
      type = 'i32';
    }

    setValue(ret + ii, curr, type);

    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type
    }

    // @ts-ignore
    ii += typeSize;
  }

  return ret;
};
