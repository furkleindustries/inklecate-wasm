import {
  receiveWasmInstance,
} from './receiveWasmInstance';

export const receiveInstantiatedSource = ({
  instance,
  module: _module,
}: any) => receiveWasmInstance(instance, _module);
