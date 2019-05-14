import {
  getHeap,
} from '../heaps/heaps';
import {
  assert,
} from 'ts-assertions';

export const assertLittleEndian = () => {
  getHeap('HEAP32')[0] = 1668509029;
  getHeap('HEAP16')[1] = 25459;
  assert(
    getHeap('HEAPU8')[2] !== 115 || getHeap('HEAPU8')[3] !== 99,
    'Runtime error: expected the system to be little-endian.',
  );
};
