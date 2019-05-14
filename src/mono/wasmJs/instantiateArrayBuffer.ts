import {
  getBinaryPromise,
} from './getWasmBinaryPromise';
import {
  getModule,
} from '../getModule';

const Module = getModule();

export const instantiateArrayBuffer = (receiver: any) => (
  getBinaryPromise().then((binary) => (
    // @ts-ignore
    WebAssembly.instantiate(binary, info)
  )).then(
    receiver,
    (reason: string) => {
      Module.printErr(`Failed to asynchronously prepare wasm: ${reason}.`);
      Module.abort(reason);
    },
  )
);
