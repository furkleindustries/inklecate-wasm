import {
  alignUp,
} from './alignUp';
import {
  ASMJS_PAGE_SIZE,
  MIN_TOTAL_MEMORY,
  WASM_PAGE_SIZE,
} from './constants';
import {
  getHeap,
  updateGlobalBuffer,
  updateGlobalBufferViews,
} from './heaps/heaps';
import {
  Module,
} from './Module';
import {
  getPointer,
} from './pointers/pointers';
import {
  getTotalMemory,
  setTotalMemory,
} from './totalMemory';

export const enlargeMemory = () => {
  const PAGE_MULTIPLE = Module.usingWasm ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
  const LIMIT = 2147483648 - PAGE_MULTIPLE;
  if (getHeap('HEAP32')[getPointer('DYNAMICTOP_PTR') >> 2] > LIMIT) {
    return false;
  }

  const OLD_TOTAL_MEMORY = getTotalMemory();
  const totalMemory = Math.max(OLD_TOTAL_MEMORY, MIN_TOTAL_MEMORY);
  setTotalMemory(Math.max(OLD_TOTAL_MEMORY, MIN_TOTAL_MEMORY));
  while (totalMemory < getHeap('HEAP32')[getPointer('DYNAMICTOP_PTR') >> 2]) {
    if (totalMemory <= 536870912) {
      setTotalMemory(alignUp(2 * totalMemory, PAGE_MULTIPLE));
    } else {
      setTotalMemory(Math.min(alignUp((3 * totalMemory + 2147483648) / 4, PAGE_MULTIPLE), LIMIT));
    }
  }

  const replacement = Module.reallocBuffer(totalMemory);
  if (!replacement || replacement.byteLength !== totalMemory) {
    setTotalMemory(OLD_TOTAL_MEMORY);
    return false;
  }

  updateGlobalBuffer(replacement);
  updateGlobalBufferViews();

  return true;
};
