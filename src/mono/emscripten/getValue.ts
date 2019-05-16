import {
  getHeap,
} from '../heaps/heaps';
import {
  Module,
} from '../Module';

export const getValue = (ptr: number, type: string) => {
  let realType = type || 'i8';
  if (realType.charAt(realType.length - 1) === '*') {
    realType = 'i32';
  }

  if (realType === 'i1') {
    return getHeap('HEAP8')[ptr >> 0];
  } else if (realType === 'i8') {
    return getHeap('HEAP8')[ptr >> 0];
  } else if (realType === 'i16') {
    return getHeap('HEAP16')[ptr >> 1];
  } else if (realType === 'i32' || realType === 'i64') {
    return getHeap('HEAP32')[ptr >> 2];
  } else if (realType === 'float') {
    return getHeap('HEAPF32')[ptr >> 2];
  } else if (realType === 'double') {
    return getHeap('HEAPF64')[ptr >> 3];
  } else {
    Module.abort('invalid type for getValue: ' + realType);
  }

  return null;
};
