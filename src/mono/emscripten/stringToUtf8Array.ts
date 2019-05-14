export const stringToUtf8Array = (
  str: string,
  outU8Array: Uint8Array,
  outId: number,
  maxBytesToWrite: number,
) => {
  if (!(maxBytesToWrite > 0)) {
    return 0;
  }

  let startId = outId;
  let endId = outId + maxBytesToWrite - 1;
  for (let ii = 0; ii < str.length; ii += 1) {
    let u = str.charCodeAt(ii);
    if (u >= 55296 && u <= 57343) {
      u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++ii) & 1023;
    }

    if (u <= 127) {
      if (outId >= endId) {
        break;
      }

      outU8Array[outId++] = u;
    } else if (u <= 2047) {
      if (outId + 1 >= endId) {
        break;
      }

      outU8Array[outId++] = 192 | u >> 6;
      outU8Array[outId++] = 128 | u & 63;
    } else if (u <= 65535) {
      if (outId + 2 >= endId) {
        break;
      }

      outU8Array[outId++] = 224 | u >> 12;
      outU8Array[outId++] = 128 | u >> 6 & 63;
      outU8Array[outId++] = 128 | u & 63;
    } else if (u <= 2097151) {
      if (outId + 3 >= endId) {
        break;
      }

      outU8Array[outId++] = 240 | u >> 18;
      outU8Array[outId++] = 128 | u >> 12 & 63;
      outU8Array[outId++] = 128 | u >> 6 & 63;
      outU8Array[outId++] = 128 | u & 63;
    } else if (u <= 67108863) {
      if (outId + 4 >= endId) {
        break;
      }

      outU8Array[outId++] = 248 | u >> 24;
      outU8Array[outId++] = 128 | u >> 18 & 63;
      outU8Array[outId++] = 128 | u >> 12 & 63;
      outU8Array[outId++] = 128 | u >> 6 & 63;
      outU8Array[outId++] = 128 | u & 63
    } else {
      if (outId + 5 >= endId) {
        break;
      }

      outU8Array[outId++] = 252 | u >> 30;
      outU8Array[outId++] = 128 | u >> 24 & 63;
      outU8Array[outId++] = 128 | u >> 18 & 63;
      outU8Array[outId++] = 128 | u >> 12 & 63;
      outU8Array[outId++] = 128 | u >> 6 & 63;
      outU8Array[outId++] = 128 | u & 63
    }
  }

  outU8Array[outId] = 0;

  return outId - startId;
};
