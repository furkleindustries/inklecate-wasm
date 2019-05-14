import {
  getHeap,
} from '../heaps/heaps';

export const stringToUtf16 = (
  str: string,
  outPtr: number,
  maxBytesToWrite: number,
) => {
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 2147483647;
  }

  if (maxBytesToWrite < 2) {
    return 0;
  }

  maxBytesToWrite -= 2;

  const startPtr = outPtr;
  const numCharsToWrite = maxBytesToWrite < str.length * 2 ?
    maxBytesToWrite / 2 :
    str.length;

  for (let ii = 0; ii < numCharsToWrite; ii += 1) {
    const codeUnit = str.charCodeAt(ii);
    getHeap('HEAP16')[outPtr >> 1] = codeUnit;
    outPtr += 2;
  }

  getHeap('HEAP16')[outPtr >> 1] = 0;

  return outPtr - startPtr;
};
