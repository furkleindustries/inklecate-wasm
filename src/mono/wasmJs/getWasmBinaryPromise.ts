import {
  EnvironmentTypes,
} from '../EnvironmentTypes';
import {
  getEnvType,
} from '../getEnvVars';
import {
  getModule,
} from '../getModule';
import {
  getMonoWasmFilePaths,
} from './getMonoWasmFilePaths';
import { getWasmBinary } from './getWasmBinary';
import { assertValid } from 'ts-assertions';

const Module = getModule();

const envType = getEnvType(Module.ENVIRONMENT);

const [
  wasmTextFile,
  wasmBinaryFile,
  asmjsCodeFile,
] = getMonoWasmFilePaths();

const onlineEnv = envType === EnvironmentTypes.Web ||
                  envType === EnvironmentTypes.Worker;

export const getBinaryPromise = () => (
  !Module.wasmBinary &&
    onlineEnv &&
    typeof fetch === 'function' ?
      fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(({
        arrayBuffer,
        ok,
      }) => assertValid<() => ArrayBuffer>(
        arrayBuffer,
        `Failed to load wasm binary file at "${wasmBinaryFile}".`,
        () => ok,
      )(),
      getWasmBinary,
    ) :
    new Promise(getWasmBinary)
);
