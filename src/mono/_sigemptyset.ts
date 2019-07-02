import { getHeap } from './heaps/heaps';

const HEAP32 = getHeap('HEAP32');

export function _sigemptyset(set: number) {
  HEAP32[set >> 2] = 0;
  return 0;
}
