import {
  Module,
} from '../Module';
import {
  getMonoWasmFilePaths,
} from './getMonoWasmFilePaths';

const [
  wasmTextFile,
  wasmBinaryFile,
  asmjsCodeFile,
] = getMonoWasmFilePaths();

export const getWasmBinary = () => {
  try {
    if (Module.wasmBinary) {
      return new Uint8Array(Module.wasmBinary);
    } else if (typeof Module.readBinary === 'function') {
      return Module.readBinary(wasmBinaryFile);
    } else {
      throw new Error(
        `On the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS).`,
      );
    }
  } catch (err) {
    Module.abort(err)
  }
};
