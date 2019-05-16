import {
  __inet_pton4_raw,
} from './__inet_pton4_raw';
import {
  __inet_pton6_raw,
} from './__inet_pton6_raw';
import {
  _htons,
} from '../../_htons';
import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  getHeap,
} from '../../heaps/heaps';

export const __write_sockaddr = (sa: number, family: number, addr: string, port: number) => {
  if (family === 2) {
    getHeap('HEAP16')[sa >> 1] = family;
    getHeap('HEAP32')[sa + 4 >> 2] = __inet_pton4_raw(addr);
    getHeap('HEAP16')[sa + 2 >> 1] = _htons(port);
  } else if (family === 10) {
    const raw = __inet_pton6_raw(addr)!;
    getHeap('HEAP32')[sa >> 2] = family;
    getHeap('HEAP32')[sa + 8 >> 2] = raw[0];
    getHeap('HEAP32')[sa + 12 >> 2] = raw[1];
    getHeap('HEAP32')[sa + 16 >> 2] = raw[2];
    getHeap('HEAP32')[sa + 20 >> 2] = raw[3];
    getHeap('HEAP16')[sa + 2 >> 1] = _htons(port);
    getHeap('HEAP32')[sa + 4 >> 2] = 0;
    getHeap('HEAP32')[sa + 24 >> 2] = 0;
  } else {
    return { errno: ErrorNumberCodes.EAFNOSUPPORT };
  }

  return {};
};
