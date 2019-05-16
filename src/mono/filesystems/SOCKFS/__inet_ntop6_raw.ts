import {
  __inet_pton4_raw,
} from './__inet_pton4_raw';
import {
  _ntohs,
} from '../../_ntohs';
import { __inet_ntop4_raw } from './__inet_ntop4_raw';

export const __inet_ntop6_raw = (ints: number[]) => {
  let str = '';
  let longest = 0;
  let lastzero = 0;
  let zstart = 0;
  let len = 0;
  const parts = [
    ints[0] & 65535,
    ints[0] >> 16,
    ints[1] & 65535,
    ints[1] >> 16,
    ints[2] & 65535,
    ints[2] >> 16,
    ints[3] & 65535,
    ints[3] >> 16,
  ];

  let hasipv4 = true;
  let v4part = '';
  for (let ii = 0; ii < 5; ii += 1) {
    if (parts[ii] !== 0) {
      hasipv4 = false;
      break;
    }
  }

  if (hasipv4) {
    v4part = __inet_ntop4_raw(parts[6] | parts[7] << 16);
    if (parts[5] === -1) {
      return `::ffff:${v4part}`;
    }

    if (parts[5] === 0) {
      str = '::';
      if (v4part === '0.0.0.0') {
        v4part = '';
      } else if (v4part === '0.0.0.1') {
        v4part = '1';
      }

      str += v4part;
      return str;
    }
  }

  for (let word = 0; word < 8; word += 1) {
    if (parts[word] === 0) {
      if (word - lastzero > 1) {
        len = 0;
      }

      lastzero = word;
      len += 1;
    }

    if (len > longest) {
      longest = len;
      zstart = word - longest + 1;
    }
  }

  for (let word = 0; word < 8; word += 1) {
    if (longest > 1) {
      if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
        if (word === zstart) {
          str += ':';
          if (zstart === 0) {
            str += ':';
          }
        }

        continue;
      }
    }

    str += Number(_ntohs(parts[word] & 65535)).toString(16);
    str += word < 7 ? ':' : '';
  }

  return str;
};
