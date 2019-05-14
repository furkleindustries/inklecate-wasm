import {
  alignUp,
} from '../alignUp';
import {
  ASMJS_PAGE_SIZE,
  WASM_PAGE_SIZE,
} from '../constants';
import {
  getModule,
} from '../getModule';

const Module = getModule();

export const wasmReallocBuffer = (size: number) => {
  const PAGE_MULTIPLE = Module.usingWasm ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
  size = alignUp(size, PAGE_MULTIPLE);
  const old = Module.buffer;
  const oldSize = old.byteLength;
  if (Module.usingWasm) {
    try {
      const result = Module.wasmMemory.grow((size - oldSize) / WASM_PAGE_SIZE);
      if (result !== (-1 | 0)) {
        Module.buffer = Module.wasmMemory.buffer;
        return Module.buffer;
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }
};
