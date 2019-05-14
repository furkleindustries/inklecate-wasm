import {
  getHeap,
} from '../heaps/heaps';
import {
  getModule,
} from '../getModule';

const Module = getModule();

export const setValue = (ptr: number, value: number, type: string) => {
  let realType = type || 'i8';
  if (realType.charAt(type.length - 1) === '*') {
    realType = 'i32';
  }

  if (realType === 'i1') {
    getHeap('HEAP8')[ptr >> 0] = value;
  } else if (realType === 'i8') {
    getHeap('HEAP8')[ptr >> 0] = value;
  } else if (realType === 'i16') {
    getHeap('HEAP16')[ptr >> 1] = value;
  } else if (realType === 'i32') {
    getHeap('HEAP32')[ptr >> 2] = value;
  } else if (realType === 'i64') {
    let tempDouble;
    /* what the heck is this??? */
    const tempI64 = [
      value >>> 0,
      (
        tempDouble = value,
        +Math.abs(tempDouble) >= 1 ?
          tempDouble > 0 ?
            (
              Math.min(
                +Math.floor(tempDouble / 4294967296),
                4294967295,
              ) | 0
            ) >>> 0 :
              ~~+Math.ceil(
                (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
              ) >>> 0 :
                0
      )
    ];

    getHeap('HEAP32')[ptr >> 2] = tempI64[0],
    getHeap('HEAP32')[ptr + 4 >> 2] = tempI64[1];
  } else if (realType === 'float') {
    getHeap('HEAPF32')[ptr >> 2] = value;
  } else if (realType === 'double') {
    getHeap('HEAPF64')[ptr >> 3] = value;
  } else {
    Module.abort('invalid type for setValue: ' + type)
  }
};
