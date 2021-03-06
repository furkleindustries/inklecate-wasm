import {
  Module,
} from '../Module';
import {
  isDataUri,
} from '../isDataUri';

export const getMonoWasmFilePaths = () => {
  let asmjsCodeFile = 'mono.temp.asm.js';
  let wasmBinaryFile = 'mono.wasm';
  let wasmTextFile = 'mono.wast';

  if (typeof Module.locateFile === 'function') {
    if (!isDataUri(asmjsCodeFile)) {
      asmjsCodeFile = Module.locateFile(asmjsCodeFile);
    }

    if (!isDataUri(wasmBinaryFile)) {
      wasmBinaryFile = Module.locateFile(wasmBinaryFile);
    }

    if (!isDataUri(wasmTextFile)) {
      wasmTextFile = Module.locateFile(wasmTextFile);
    }
  }

  return [
    asmjsCodeFile,
    wasmBinaryFile,
    wasmTextFile,
  ];
};
