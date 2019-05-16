import {
  Module,
} from '../Module';
import { stringToUtf8 } from './stringToUtf8';

export const stringToC = (str: string) => {
  let ret = 0;
  // @ts-ignore
  if (str !== null && str !== undefined && str !== 0) {
    const len = (str.length << 2) + 1;
    ret = Module.stackAlloc(len);
    stringToUtf8(str, ret, len);
  }

  return ret;
};
