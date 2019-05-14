import DEBUG from '../DEBUG';

import {
  log,
  warn,
} from 'colorful-logging';
import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import * as emscriptenFuncs from './emscripten';
import fs from 'fs-extra';
import {
  getEnvType,
} from './getEnvVars';
import {
  getHeap,
} from './heaps/heaps';
import {
  getPointer,
} from './pointers/pointers';
import {
  MonoRuntime,
} from './MonoRuntime';
import path from 'path';
import slash from 'slash';
import {
  assert,
  assertValid,
} from 'ts-assertions';

import inkCompiler from './bin/Release/netcoreapp3.0/ink_compiler.dll';
import inkEngineRuntime from './bin/Release/netcoreapp3.0/ink-engine-runtime.dll';
import inklecateWasm from './bin/Release/netcoreapp3.0/dist/managed/inklecate_wasm.dll';
import { doNativeWasm } from './wasmJs/doNativeWasm';
import { wasmReallocBuffer } from './wasmJs/wasmReallocBuffer';

export const BaseModule: any = 
  // @ts-ignore
  typeof (this || global || window).Module === 'object' ?
    /* @ts-ignore */
    ((this || global || window) as any).Module :
    {};

const argv = (process || {}).argv || [];

const envType = getEnvType(BaseModule.ENVIRONMENT);

export class ModuleClass extends BaseModule {
  public ABORT = false;
  public EXITSTATUS = 0;
  public noExitRuntime = true;
  public calledRun = false;

  public readonly STATIC_BASE = getPointer('STATIC_BASE');
  public readonly STATIC_BUMP = getPointer('STATIC_BUMP');

  public readonly arguments = [];
  public readonly assemblies = Object.freeze([
    inkCompiler,
    inkEngineRuntime,
    inklecateWasm,
  ]);

  public readonly entryPoint = Object.freeze({
    assemblyName: 'inklecate_wasm',
    namespace: 'inklecate_wasm',
    className: 'Program',
    mainMethodName: 'Main',
    inklecateCompileName: 'Compile',
    inklecatePlayName: 'Play',
  });

  public preRun = [];
  public postRun = [];

  public readonly thisProgram = (
    envType === EnvironmentTypes.Node && argv.length > 1 ?
      slash(argv[1]) :
      './this.program'
  );

  public readonly preloadedImages = {};
  public readonly preloadedAudios = {};

  constructor(...args: any[]) {
    super(...args);

    Object.keys(emscriptenFuncs).forEach((key) => {
      this[key] = (emscriptenFuncs as any)[key]
    });

    if (this.preInit) {
      if (typeof this.preInit === 'function') {
        this.preInit = [ this.preInit ];
      }

      while (this.preInit.length) {
        this.preInit.pop()()
      }
    }

    [
      '___errno_location',
      '_emscripten_replace_memory',
      '_free',
      '_htonl',
      '_htons',
      '_malloc',
      '_memalign',
      '_memset',
      '_mono_background_exec',
      '_mono_print_method_from_ip',
      '_mono_set_timeout_exec',
      '_mono_wasm_assembly_find_class',
      '_mono_wasm_assembly_find_method',
      '_mono_wasm_assembly_load',
      '_mono_wasm_current_bp_id',
      '_mono_wasm_enum_frames',
      '_mono_wasm_get_var_info',
      '_mono_wasm_invoke_method',
      '_mono_wasm_load_runtime',
      '_mono_wasm_set_breakpoint',
      '_mono_wasm_string_from_js',
      '_mono_wasm_string_get_utf8',
      '_ntohs',
      '_wasm_get_stack_base',
      '_wasm_get_stack_size',
      'dynCall_v',
      'dynCall_vi',
      'stackAlloc',
      'stackSave',
      'stackRestore',
    ].forEach((asmKey) => this[asmKey] = (this.asm as any)[asmKey]);
  }

  public asm = (global: any, env: any, providedBuffer: Buffer) => {
    if (!env.table) {
      const TABLE_SIZE = typeof this.wasmTableSize === 'undefined' ?
        1024 :
        this.wasmTableSize;

      const MAX_TABLE_SIZE = this.wasmMaxTableSize;
      // @ts-ignore
      if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
        if (MAX_TABLE_SIZE !== undefined) {
          // @ts-ignore
          env.table = new WebAssembly.Table({
            element: 'anyfunc',
            initial: TABLE_SIZE,
            maximum: MAX_TABLE_SIZE,
          });
        } else {
          // @ts-ignore
          env.table = new WebAssembly.Table({
            initial: TABLE_SIZE,
            element: 'anyfunc',
          });
        }
      } else {
        env.table = new Array(TABLE_SIZE);
      }

      this.wasmTable = env.table;
    }

    if (!env.memoryBase) {
      env.memoryBase = this.STATIC_BASE;
    }

    if (!env.tableBase) {
      env.tableBase = 0
    }

    const exps = doNativeWasm(global, env, providedBuffer);
    if (!exps) {
      this.abort(
        'No binaryen method succeeded. Consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods.',
      );
    }

    return exps;
  };

  public readonly asmPreload = this.asm;

  public readonly read = (filename: string, binary: any) => {
    if (envType === EnvironmentTypes.Node) {
      const normalized = path.normalize(filename);
      const ret = fs.readFileSync(normalized);
      return binary ? ret : String(ret);
    } else if (envType === EnvironmentTypes.Shell) {
      return assertValid<(filename: string, binary: any) => any>(
        // @ts-ignore
        read,
        'The environment is Shell, but the "read" function cannot be found.',
      )(filename, binary)
    } else if (
      envType === EnvironmentTypes.Web ||
        envType === EnvironmentTypes.Worker
    ) {
      const xhr = new XMLHttpRequest;
      xhr.open('GET', filename, false);
      xhr.send(null);
      return xhr.responseText;
    }
  };

  readBinary = (filename: string) => {
    if (envType === EnvironmentTypes.Node) {
      let binary = ModuleClass.read(filename, true);
      if (!binary.buffer) {
        binary = new Uint8Array(binary);
      }
  
      return assertValid(
        binary,
        'The binary return buffer could not be created.',
        () => binary.buffer,
      );
    } else if (envType === EnvironmentTypes.Shell) {
      return (
        // @ts-ignore
        typeof readbuffer === 'function' ?
          // @ts-ignore
          new Uint8Array(readbuffer(ff)) :
          assertValid(
            // @ts-ignore
            this.read(ff, 'binary'),
            'The binary did not decompile successfully.',
            (data) => typeof data === 'object',
          )
      );
    } else if (envType === EnvironmentTypes.Worker) {
      const xhr = new XMLHttpRequest;
      xhr.open('GET', filename, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(xhr.response)
    }
  };

  public readonly inspect = () => '[Emscripten Module object]';

  public readonly onRuntimeInitialized = () => {
    DEBUG && log('Done with WASM module instantiation.');

    this.FS_createPath('/', 'managed', true, true);

    let pending = 0;
    const failMsg = 'Failed to load assembly "%0".';

    return Promise.all(this.assemblies.map((asmName: string) => {
      if (DEBUG) {
        log(`Loading assembly "${asmName}".`);
      }

      pending += 1;

      return new Promise((resolve, reject) => fetch(
        `managed/${asmName}`,
        { credentials: 'same-origin' },
      ).then(({
        arrayBuffer,
        ok,
      }) => assertValid<() => Promise<ArrayBuffer>>(
        arrayBuffer,
        failMsg.replace('%0', asmName),
        () => ok,
      )()).then((blob: any) => {
        try {
          this.FS_createDataFile(
            `managed/${asmName}`,
            null,
            new Uint8Array(blob),
            true,
            true,
            true,
          );
        } catch (err) {
          return reject(err);
        }

        pending -= 1;
        if (!pending) {
          this.bclLoadingDone();
        }
      }));
    }));
  };

  public readonly reallocBuffer = (size: number) => {
    if (super.reallocBuffer) {
      return super.reallocBuffer(size);
    }

    return wasmReallocBuffer(size);
  };

  public readonly bclLoadingDone = () => {
    DEBUG && log('Done loading the BCL.');
    MonoRuntime.init();
  };

  public readonly quit = (status: any, toThrow: Error): any => {
    if (envType === EnvironmentTypes.Shell) {
      // @ts-ignore
      return typeof quit === 'function' ?
        // @ts-ignore
        quit(status, toThrow) :
        this.quit(status, toThrow);
    }

    throw toThrow;
  };

  public readonly setWindowTitle = (title: string) => {
    assert(
      envType === EnvironmentTypes.Web || envType === EnvironmentTypes.Worker,
      'Module.setWindowTitle can only be called from Web and Worker environments.',
    );

    document.title = title;
  };

  public readonly print = (text: string, ...args: any[]) => {
    if (typeof console !== 'undefined') {
      log(text, ...args);
    } else if (typeof print !== 'undefined') {
      // @ts-ignore
      print(text, ...args);
    }
  };

  public readonly printErr = (text: string, ...args: any[]) => (
    (() => {
      // @ts-ignore
      if (typeof printErr !== 'undefined') {
        // @ts-ignore
        return printErr;
      } else if (console) {
        return warn;
      } else {
        return this.print;
      }
    })()(text, ...args)
  );

  public readonly abort = (what: string) => {
    if (this.onAbort) {
      this.onAbort(what);
    }

    if (what) {
      this.print(what);
      this.printErr(what);
      what = JSON.stringify(what);
    } else {
      what = '';
    }

    this.ABORT = true;
    this.EXITSTATUS = 1;

    throw new Error(
      `abort(${what}). Build with -s ASSERTIONS=1 for more info.`
    );
  };
}
