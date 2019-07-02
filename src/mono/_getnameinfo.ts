import {
  __read_sockaddr,
} from './__read_sockaddr';
import {
  DNS,
} from './DNS';
import {
  stringToUtf8,
} from './emscripten';

export function _getnameinfo(sa: any, salen: any, node: any, nodelen: any, serv: any, servlen: any, flags: any) {
  let info = __read_sockaddr(sa, salen);
  if (info.errno) {
    return -6;
  }

  let port = info.port;
  let addr = info.addr;
  let overflowed = false;
  if (node && nodelen) {
    let lookup;
    if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
      if (flags & 8) {
        return -2;
      }
    } else {
      addr = lookup;
    }

    let numBytesWrittenExclNull = stringToUtf8(addr, node, nodelen);
    if (numBytesWrittenExclNull + 1 >= nodelen) {
      overflowed = true;
    }
  }

  if (serv && servlen) {
    port = "" + port;
    let numBytesWrittenExclNull = stringToUtf8(port, serv, servlen);
    if (numBytesWrittenExclNull + 1 >= servlen) {
      overflowed = true;
    }
  }

  if (overflowed) {
    return -12;
  }

  return 0;
}
