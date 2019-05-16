import {
  getBinaryPromise,
} from './getWasmBinaryPromise';
import {
  Module,
} from '../Module';

export const instantiateArrayBuffer = (receiver: any) => (
  getBinaryPromise().then((binary) => (
    // @ts-ignore
    WebAssembly.instantiate(binary, info)
  )).then(
    receiver,
    (reason: string) => {
      Module.printErr(`Failed to asynchronously prepare WASM: ${reason}.`);
      Module.abort(reason);
    },
  )
);
