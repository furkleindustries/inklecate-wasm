const utf8Decoder = typeof TextDecoder !== 'undefined' ?
  new TextDecoder('utf8') :
  undefined;

export const utf8ArrayToString = (u8Array: Uint8Array, id: number) => {
  let endPtr = id;
  while (u8Array[endPtr]) {
    endPtr += 1;
  }

  if (endPtr - id > 16 && u8Array.subarray && utf8Decoder) {
    return utf8Decoder.decode(u8Array.subarray(id, endPtr))
  } else {
    let u0;
    let u1;
    let u2;
    let u3;
    let u4;
    let u5;
    let str = '';
    while (1) {
      u0 = u8Array[id++];
      if (!u0) {
        return str;
      } else if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }

      u1 = u8Array[id++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }

      u2 = u8Array[id++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u3 = u8Array[id++] & 63;
        if ((u0 & 248) == 240) {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
        } else {
          u4 = u8Array[id++] & 63;
          if ((u0 & 252) == 248) {
            u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
          } else {
            u5 = u8Array[id++] & 63;
            u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
          }
        }
      }

      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        const ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
  }
};
