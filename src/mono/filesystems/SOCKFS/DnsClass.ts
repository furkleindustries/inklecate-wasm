import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  assert,
} from 'ts-assertions';
import {
  __inet_pton4_raw,
} from './__inet_pton4_raw';
import {
  __inet_pton6_raw,
} from './__inet_pton6_raw';

const BaseDns = getGlobalValue('DNS') || {};

export class DnsClass extends BaseDns {
  public readonly address_map: Record<string, any> = {
    addrs: {},
    id: 1,
    names: {},
  };

  public readonly lookup_name = (name: string) => {
    let res: number | number[] | null = __inet_pton4_raw(name);
    if (res !== null) {
      return name;
    }

    res = __inet_pton6_raw(name);
    if (res !== null) {
      return name;
    }

    let addr;
    if (this.address_map.addrs[name]) {
      addr = this.address_map.addrs[name];
    } else {
      const id = this.address_map.id += 1;
      assert(id < 65535, 'Exceeded max DNS address mappings of 65535.');
      addr = '172.29.' + (id & 255) + '.' + (id & 65280);
      this.address_map.names[addr] = name;
      this.address_map.addrs[name] = addr;
    }

    return addr;
  };

  public readonly lookup_addr = (addr: any) => {
    if (this.address_map.names[addr]) {
      return this.address_map.names[addr];
    }

    return null;
  };
};
