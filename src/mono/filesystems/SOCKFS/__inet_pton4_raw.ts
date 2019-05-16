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

export const __inet_pton4_raw = (str: string) => {
  const dotSplit: number[] = str.split('.') as any as number[];
  for (let ii = 0; ii < 4; ii += 1) {
    var tmp = Number(dotSplit[ii]);
    if (Number.isNaN(tmp)) {
      return null;
    }

    dotSplit[ii] = tmp;
  }

  return (dotSplit[0] | dotSplit[1] << 8 | dotSplit[2] << 16 | dotSplit[3] << 24) >>> 0;
};
