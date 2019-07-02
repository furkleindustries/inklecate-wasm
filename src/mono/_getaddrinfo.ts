import {
  __inet_ntop6_raw,
} from './filesystems/SOCKFS/__inet_ntop6_raw';
import {
  __inet_ntop4_raw,
} from './filesystems/SOCKFS/__inet_ntop4_raw';
import {
  __write_sockaddr,
} from './filesystems/SOCKFS/__write_sockaddr';
import {
  getHeap,
} from './heaps/heaps';
import {
  assert,
} from 'ts-assertions';
import { pointerStringify } from './pointers/pointerStringify';
import { __inet_pton6_raw } from './filesystems/SOCKFS/__inet_pton6_raw';
import { __inet_pton4_raw } from './filesystems/SOCKFS/__inet_pton4_raw';
import { DNS } from './filesystems/SOCKFS/DNS';

const HEAP32 = getHeap('HEAP32');

export function _getaddrinfo(node: any, service: any, hint: any, out: any) {
  let addr: number | number[] | null = 0;
  let port = 0;
  let flags = 0;
  let family = 0;
  let type = 0;
  let proto = 0;
  let ai;
  
  function allocaddrinfo(family: any, type: any, proto: any, canon: any, addr: any, port: any) {
    let sa, salen, ai;
    let res;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? __inet_ntop6_raw(addr) : __inet_ntop4_raw(addr);
    sa = _malloc(salen);
    res = __write_sockaddr(sa, family, addr, port);
    assert(!res.errno);
    ai = _malloc(32);
    HEAP32[ai + 4 >> 2] = family;
    HEAP32[ai + 8 >> 2] = type;
    HEAP32[ai + 12 >> 2] = proto;
    HEAP32[ai + 24 >> 2] = canon;
    HEAP32[ai + 20 >> 2] = sa;
    if (family === 10) {
      HEAP32[ai + 16 >> 2] = 28;
    } else {
      HEAP32[ai + 16 >> 2] = 16;
    }
    HEAP32[ai + 28 >> 2] = 0;
    return ai;
  }

  if (hint) {
    flags = HEAP32[hint >> 2];
    family = HEAP32[hint + 4 >> 2];
    type = HEAP32[hint + 8 >> 2];
    proto = HEAP32[hint + 12 >> 2];
  }

  if (type && !proto) {
    proto = type === 2 ? 17 : 6;
  }

  if (!type && proto) {
    type = proto === 17 ? 2 : 1;
  }

  if (proto === 0) {
    proto = 6;
  }

  if (type === 0) {
    type = 1;
  }

  if (!node && !service) {
    return -2
  }
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
    return -1;
  }

  if (hint !== 0 && HEAP32[hint >> 2] & 2 && !node) {
    return -1;
  }

  if (flags & 32) {
    return -2;
  }

  if (type !== 0 && type !== 1 && type !== 2) {
    return -7;
  }

  if (family !== 0 && family !== 2 && family !== 10) {
    return -6;
  }

  if (service) {
    service = pointerStringify(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {
        return -2;
      }

      return -8;
    }
  }

  if (!node) {
    if (family === 0) {
      family = 2;
    }

    if ((flags & 1) === 0) {
      if (family === 2) {
        addr = _htonl(2130706433);
      } else {
        addr = [0, 0, 0, 1];
      }
    }

    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAP32[out >> 2] = ai;
    return 0;
  }

  node = pointerStringify(node);
  addr = __inet_pton4_raw(node);

  if (addr !== null) {
    if (family === 0 || family === 2) {
      family = 2
    } else if (family === 10 && flags & 8) {
      addr = [0, 0, _htonl(65535), addr];
      family = 10
    } else {
      return -2
    }
  } else {
    addr = __inet_pton6_raw(node);
    if (addr !== null) {
      if (family === 0 || family === 10) {
        family = 10
      } else {
        return -2
      }
    }
  }

  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }

  if (flags & 4) {
    return -2
  }

  node = DNS.lookup_name(node);
  addr = __inet_pton4_raw(node);
  if (family === 0) {
    family = 2;
  } else if (family === 10) {
    addr = [0, 0, _htonl(65535), addr];
  }

  ai = allocaddrinfo(family, type, proto, null, addr, port);
  HEAP32[out >> 2] = ai;
  return 0;
}