import {
  lengthBytesUtf8,
} from './lengthyBytesUtf8';
import {
  stringToUtf8Array,
} from './stringToUtf8Array';

export const intArrayFromString = (
  string: string,
  dontAddNull?: boolean,
  length?: number,
) => {
  const len = length || lengthBytesUtf8(string) + 1;
  const u8array = new Array(len);
  const numBytesWritten = stringToUtf8Array(
    string,
    u8array,
    0,
    u8array.length,
  );

  if (dontAddNull) {
    u8array.length = numBytesWritten;
  }

  return u8array;
};
