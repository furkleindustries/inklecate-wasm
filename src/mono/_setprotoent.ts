import {
  _malloc,
} from './_malloc';
import {
  getHeap,
} from './heaps/heaps';
import {
  Protocols,
} from './Protocols';
import {
  writeAsciiToMemory,
} from './heaps/writeAsciiToMemory';

const HEAP32 = getHeap('HEAP32');

export function _setprotoent(stayopen: any) {
  function allocprotoent(name: any, proto: any, aliases: any) {
    let nameBuf = _malloc(name.length + 1);
    writeAsciiToMemory(name, nameBuf);
    let j = 0;
    let length = aliases.length;
    let aliasListBuf = _malloc((length + 1) * 4);
    for (let i = 0; i < length; i += 1, j += 4) {
      let alias = aliases[i];
      let aliasBuf = _malloc(alias.length + 1);
      writeAsciiToMemory(alias, aliasBuf);
      HEAP32[aliasListBuf + j >> 2] = aliasBuf
    }

    HEAP32[aliasListBuf + j >> 2] = 0;

    let pe = _malloc(12);
    HEAP32[pe >> 2] = nameBuf;
    HEAP32[pe + 4 >> 2] = aliasListBuf;
    HEAP32[pe + 8 >> 2] = proto;
    return pe;
  }

  let list = Protocols.list;
  let map = Protocols.map;

  if (list.length === 0) {
    let entry = allocprotoent('tcp', 6, ['TCP']);
    list.push(entry);
    map.tcp = map['6'] = entry;
    entry = allocprotoent('udp', 17, ['UDP']);
    list.push(entry);
    map.udp = map['17'] = entry;
  }

  _setprotoent.index = 0;
}
