import {
  _htons,
} from '../../_htons';
import {
  _ntohs,
} from '../../_ntohs';
import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  getHeap,
} from '../../heaps/heaps';
import {
  assert,
} from 'ts-assertions';

export const __inet_pton6_raw = (_str: string) => {
  let address = _str;
  let words: string[];
  const valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
  const parts = [];
  if (!valid6regx.test(address)) {
    return null;
  }

  if (address === '::') {
    return [ 0, 0, 0, 0, 0, 0, 0, 0, ];
  } else if (address.indexOf('::') === 0) {
    address = address.replace('::', 'Z:');
  } else {
    address = address.replace('::', ':Z:');
  }

  if (address.indexOf('.') > 0) {
    address = address.replace(new RegExp('[.]','g'), ':');
    words = address.split(':');
    // @ts-ignore
    words[words.length - 4] =
      parseInt(words[words.length - 4]) + parseInt(words[words.length - 3]) * 256;

    // @ts-ignore
    words[words.length - 3] =
      parseInt(words[words.length - 2]) + parseInt(words[words.length - 1]) * 256;

    words = words.slice(0, words.length - 2);
  } else {
    words = address.split(':');
  }

  let offset = 0;
  for (let ii = 0; ii < words.length; ii += 1) {
    if (typeof words[ii] === 'string') {
      if (words[ii] === 'Z') {
        let jj;
        for (jj = 0; jj < 8 - words.length + 1; jj += 1) {
          parts[ii + jj] = 0;
        }

        offset = jj - 1;
      } else {
        parts[ii + offset] = _htons(parseInt(words[ii], 16));
      }
    } else {
      parts[ii + offset] = words[ii];
    }
  }

  return [
    parts[1] << 16 | parts[0],
    parts[3] << 16 | parts[2],
    parts[5] << 16 | parts[4],
    parts[7] << 16 | parts[6],
  ];
};
