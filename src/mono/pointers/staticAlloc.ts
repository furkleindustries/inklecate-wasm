import {
  assert,
} from 'ts-assertions';

let staticSealed = false;
export const staticAlloc = (size: number) => {
  // @ts-ignore
  assert(!staticSealed);
  // @ts-ignore
  var ret = STATICTOP;
  // @ts-ignore
  STATICTOP = STATICTOP + size + 15 & -16;
  return ret
};