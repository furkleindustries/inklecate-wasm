/**
 * Ooui v0.10.222
 * Originally at https://github.com/praeclarum/Ooui.
 * Modified by furkle to make use of Inkle's inklecate.
 */
export const DEBUG = true;

import {
  log,
} from 'colorful-logging';
import {
  Module,
} from './Module';
import {
  assertValid,
} from 'ts-assertions';

export const MonoRuntime = Object.freeze({
  loadRuntime: Module.cwrap(
    'mono_wasm_load_runtime',
    null,
    [
      'string',
      'number',
    ],
  ) as unknown as (one: string, two: number) => void,

  init() {
    this.loadRuntime('managed', 1);
    if (DEBUG) {
      log('Done initializing the runtime.');
    }

    require('./WebAssemblyApp').init();
  },

  assemblyLoad: Module.cwrap(
    'mono_wasm_assembly_load',
    'number',
    [ 'string' ],
  ) as unknown as (assemblyName: string) => number,

  findClass: Module.cwrap(
    'mono_wasm_assembly_find_class',
    'number',
    [
      'number',
      'string',
      'string',
    ],
  ) as unknown as (
    assemblyName: number,
    namespace: string,
    className: string,
  ) => number,

  findMethod: Module.cwrap(
    'mono_wasm_assembly_find_method',
    'number',
    [
      'number',
      'string',
      'number',
    ],
  ) as unknown as (
    classPointer: number,
    methodName: string,
    numOfArgs: number,
  ) => number,

  invokeMethod: Module.cwrap(
    'mono_wasm_invoke_method',
    'number',
    [
      'number',
      'number',
      'number',
    ],
  ) as unknown as (
    method: number,
    thisArg: number | null,
    args: number,
  ) => number,

  monoStringGetUtf8: Module.cwrap(
    'mono_wasm_string_get_utf8',
    'number',
    [ 'number' ],
  ) as unknown as (monoObj: number) => number,

  monoString: Module.cwrap(
    'mono_wasm_string_from_js',
    'number',
    [ 'string' ],
  ) as unknown as (str: string) => number,

  convertString: function (monoObject: any) {
    if (!monoObject) {
      return null;
    }

    const raw = this.monoStringGetUtf8(monoObject);
    const res = Module.UTF8ToString(raw);
    Module._free(raw);

    return res;
  },

  callMethod: function (
    method: number,
    thisArg: number | null,
    args: any[],
  ) {
    const argsMem = Module._malloc(args.length * 4);
    const ehThrow = Module._malloc(4);
    for (let ii = 0; ii < args.length * 4; ii += 4) {
      Module.setValue(argsMem + ii, args[ii / 4], 'i32');
    }

    Module.setValue(ehThrow, 0, 'i32');

    const res = this.invokeMethod(method, thisArg, argsMem);
    const ehRes = Module.getValue(ehThrow, 'i32');

    Module._free(argsMem);
    Module._free(ehThrow);

    return assertValid(
      res,
      this.convertString(res),
      () => ehRes,
    );
  },
});
