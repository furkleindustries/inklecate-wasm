import {
  ccall,
} from './ccall';
import {
  getCFunc,
} from '../getCFunc';
import {
  WasmTypes,
} from '../WasmTypes';

export function cwrap(
  ident: string,
  returnType: WasmTypes,
  argTypes: WasmTypes[],
) {
  const realArgTypes = argTypes || [];
  const cFunc = getCFunc(ident);
  const numericArgs = realArgTypes.every((type) => type === 'number');
  const numericRet = returnType !== 'string';
  if (numericRet && numericArgs) {
    return cFunc;
  }

  return () => ccall(
    ident,
    returnType,
    realArgTypes,
    Array.prototype.slice.call(arguments),
  );
}