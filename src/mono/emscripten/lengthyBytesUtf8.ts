export const lengthBytesUtf8 = (str: string) => {
  let len = 0;
  for (let ii = 0; ii < str.length; ++ii) {
    let u = str.charCodeAt(ii);
    if (u >= 55296 && u <= 57343) {
      u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++ii) & 1023;
    }

    if (u <= 127) {
      len += 1;
    } else if (u <= 2047) {
      len += 2;
    } else if (u <= 65535) {
      len += 3;
    } else if (u <= 2097151) {
      len += 4;
    } else if (u <= 67108863) {
      len += 5;
    } else {
      len += 6;
    }
  }

  return len;
};
