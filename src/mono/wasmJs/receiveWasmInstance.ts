import {
  getExports,
  setExports,
} from './exports';
import {
  Module,
} from '../Module';
import {
  updateGlobalBuffer,
  updateGlobalBufferViews,
} from '../heaps/heaps';
import {
  removeRunDependency,
} from '../run/runDependencies';

export const receiveWasmInstance = (
  { exports }: Record<string, any>,
  _module: string,
) => {
  setExports(exports);
  if (exports.memory) {
    const oldBuffer = Module.buffer;
    if (exports.memory.byteLength < oldBuffer.byteLength) {
      Module.printErr(
        'The new buffer in mergeMemory is smaller than the previous one. In native wasm, we should grow memory here.',
      );
    }

    const oldView = new Int8Array(oldBuffer);
    const newView = new Int8Array(exports.memory);
    newView.set(oldView);
    updateGlobalBuffer(exports.memory);
    updateGlobalBufferViews(); 
  };

  Module.asm = exports;
  Module.usingWasm = true;
  removeRunDependency('wasm-instantiate');

  return exports;
};
