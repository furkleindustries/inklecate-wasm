import {
  getHeap,
} from './heaps';

export const writeArrayToMemory = (array: Array<any>, buffer: Buffer) => {
  getHeap('HEAP8').set(array, buffer);
};
