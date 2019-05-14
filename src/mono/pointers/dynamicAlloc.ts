import {
  enlargeMemory,
} from '../enlargeMemory';
import {
  getHeap,
} from '../heaps/heaps';
import {
  getPointer,
} from './pointers';
import {
  getTotalMemory,
} from '../totalMemory';
import {
  assertValid,
} from 'ts-assertions';

export const dynamicAlloc = (size: number) => {
  const dt_ptr = assertValid<number>(getPointer('DYNAMICTOP_PTR'));
  const ret = getHeap('HEAP32')[dt_ptr >> 2];
  const end = ret + size + 15 & -16;
  getHeap('HEAP32')[getPointer('DYNAMICTOP_PTR') >> 2] = end;
  if (end >= getTotalMemory()) {
    const success = enlargeMemory();
    if (!success) {
      getHeap('HEAP32')[getPointer('DYNAMICTOP_PTR') >> 2] = ret;
      return 0;
    }
  }

  return ret;
};
