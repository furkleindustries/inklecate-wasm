import {
  getBinaryPromise,
} from './getWasmBinaryPromise';
import {
  Module,
} from '../Module';
import {
  getMonoWasmFilePaths,
} from './getMonoWasmFilePaths';
import {
  instantiateArrayBuffer,
} from './instantiateArrayBuffer';
import {
  isDataUri,
} from '../isDataUri';
import {
  receiveInstantiatedSource,
} from './receiveInstantiatedSource';
import {
  addRunDependency,
} from '../run/runDependencies';
import {
  receiveWasmInstance,
} from './receiveWasmInstance';

const [
  wasmTextFile,
  wasmBinaryFile,
  asmjsCodeFile,
] = getMonoWasmFilePaths();

export const doNativeWasm = (
  global: any,
  env: any,
  providedBuffer?: Buffer,
) => {
  // @ts-ignore
  if (typeof WebAssembly !== 'object') {
    Module.printErr('No native WASM support detected.');
    return false;
  }

  // @ts-ignore
  if (!(Module.wasmMemory instanceof WebAssembly.Memory)) {
    Module.printErr('No native WASM Memory in use.');
    return false;
  }

  env.memory = Module.wasmMemory;

  const info = {
    env,
    asm2wasm: {
      'f64-rem': (x: number, y: number) => x % y,
      debugger: () => { debugger; },
    },

    global: {
      NaN: NaN,
      Infinity: Infinity
    },
    
    'global.Math': Math,
    parent: Module,
  };


  addRunDependency('wasm-instantiate');
  if (typeof Module.instantiateWasm === 'function') {
    try {
      return Module.instantiateWasm(info, receiveWasmInstance);
    } catch (e) {
      Module.printErr(
        `Module.instantiateWasm callback failed with error: ${e}`,
      );

      return false;
    }
  }

  if (!Module.wasmBinary &&
      // @ts-ignore
      typeof WebAssembly.instantiateStreaming === 'function' &&
      !isDataUri(wasmBinaryFile) &&
      typeof fetch === 'function')
  {
    // @ts-ignore
    WebAssembly.instantiateStreaming(
      fetch(wasmBinaryFile, { credentials: 'same-origin' }), info,
    ).then(
        receiveInstantiatedSource,
        (reason: string) => {
          Module.printErr(`WASM streaming compile failed: ${reason}.`);
          Module.printErr('Falling back to ArrayBuffer instantiation.');
          instantiateArrayBuffer(receiveInstantiatedSource);
        },
    );
  } else {
    instantiateArrayBuffer(receiveInstantiatedSource);
  }

  return {};
}
