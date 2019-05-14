import {
  getHeap,
} from './heaps';

export const writeAsciiToMemory = (
  str: string,
  buffer: number,
  dontAddNull: boolean,
) => {
  for (let ii = 0; ii < str.length; ii += 1) {
    getHeap('HEAP8')[buffer++ >> 0] = str.charCodeAt(ii);
  }

  if (!dontAddNull) {
    getHeap('HEAP8')[buffer >> 0] = 0;
  }
};
