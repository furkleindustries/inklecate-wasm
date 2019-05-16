import {
  _ntohs,
} from '../../_ntohs';
import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  getHeap,
} from '../../heaps/heaps';
import {
  __inet_ntop4_raw,
} from './__inet_ntop4_raw';
import {
  __inet_ntop6_raw,
} from './__inet_ntop6_raw';
import {
  __inet_pton4_raw,
} from './__inet_pton4_raw';

export const __read_sockaddr = (sa: number, salen: number) => {
  const family = getHeap('HEAP16')[sa >> 1];
  const port = _ntohs(getHeap('HEAP16')[sa + 2 >> 1]);
  let addr;
  if (family === 2) {
    if (salen !== 16) {
      return { errno: ErrorNumberCodes.EINVAL };
    }

    addr = getHeap('HEAP32')[sa + 4 >> 2];
    addr = __inet_ntop4_raw(addr);
  } else if (family === 10) {
    if (salen !== 28) {
      return { errno: ErrorNumberCodes.EINVAL };
    }

    addr = __inet_ntop6_raw([
      getHeap('HEAP32')[sa + 8 >> 2],
      getHeap('HEAP32')[sa + 12 >> 2],
      getHeap('HEAP32')[sa + 16 >> 2],
      getHeap('HEAP32')[sa + 20 >> 2],
    ]);
  } else {
    return { errno: ErrorNumberCodes.EAFNOSUPPORT };
  }

  return {
    addr,
    family,
    port,
  };
};
