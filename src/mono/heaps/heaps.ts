import {
  getModule,
} from '../getModule';

const Module = getModule();

let buffer: Buffer;
export const getBuffer = () => buffer;
export const setBuffer = (buf: Buffer) => buffer = buf;

const heaps: Record<string, any> = {
  HEAP8: Int8Array,
  HEAPU8: Uint8Array,
  HEAP16: Int16Array,
  HEAPU16: Uint16Array,
  HEAP32: Int32Array,
  HEAPU32: Uint32Array,
  HEAPF32: Float32Array,
  HEAPF64: Float64Array,
};

export const getHeap = (id: string) => heaps[id];

export const updateGlobalBuffer = (buf: Buffer) => {
  buffer = buf;
  Module.buffer = buffer;
};

export const updateGlobalBufferViews = () => {
  heaps.HEAP8 = new Int8Array(buffer);
  Module.HEAP8 = heaps.HEAP8;

  heaps.HEAPU8 = new Uint8Array(buffer);
  Module.HEAPU8 = heaps.HEAPU8;

  heaps.HEAP16 = new Int16Array(buffer);
  Module.HEAP16 = heaps.HEAP16;

  heaps.HEAPU16 = new Uint16Array(buffer);
  Module.HEAPU16 = heaps.HEAPU16;

  heaps.HEAP32 = new Int32Array(buffer);
  Module.HEAP32 = heaps.HEAP32;

  heaps.HEAPU32 = new Uint32Array(buffer);
  Module.HEAPU32 = heaps.HEAPU32;

  heaps.HEAPF32 = new Float32Array(buffer);
  Module.HEAPF32 = heaps.HEAPF32;

  heaps.HEAPF64 = new Float64Array(buffer)
  Module.HEAPF64 = heaps.HEAPF64;
};
