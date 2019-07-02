import DEBUG from '../DEBUG';

import {
  log,
  warn,
} from 'colorful-logging';
import {
  doNativeWasm,
} from './wasmJs/doNativeWasm';
import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import * as emscriptenFuncs from './emscripten';
import {
  FS,
} from './filesystems/FS/FS';
import fs from 'fs-extra';
import {
  getGlobalValue,
} from './getGlobalValue';
import {
  getEnvType,
} from './getEnvVars';
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
import {
  wasmReallocBuffer,
} from './wasmJs/wasmReallocBuffer';

import {

} from './abort';
import inkCompiler from './bin/Release/netcoreapp3.0/ink_compiler.dll';
import inkEngineRuntime from './bin/Release/netcoreapp3.0/ink-engine-runtime.dll';
import inklecateWasm from './bin/Release/netcoreapp3.0/dist/managed/inklecate_wasm.dll';
import { getTotalMemory } from './totalMemory';
import { enlargeMemory } from './enlargeMemory';
import { abortOnCannotGrowMemory } from './errors/abortOnCannotGrowMemory';
import { ___clock_gettime } from './___clock_gettime';
import { ___lock } from './__lock';
import { ___setErrNo } from './errors/___setErrNo';
import { ___syscall10 } from './syscalls/___syscall10';
import { ___syscall102 } from './syscalls/___syscall102';
import { ___syscall118 } from './syscalls/___syscall108';
import { ___syscall12 } from './syscalls/___syscall12';
import { ___syscall122 } from './syscalls/___syscall122';
import { ___syscall125 } from './syscalls/___syscall125';
import { ___syscall140 } from './syscalls/___syscall140';
import { ___syscall142 } from './syscalls/___syscall142';
import { ___syscall144 } from './syscalls/___syscall143';
import { ___syscall145 } from './syscalls/___syscall145';
import { ___syscall146 } from './syscalls/___syscall146';
import { ___syscall15 } from './syscalls/___syscall15';
import { ___syscall168 } from './syscalls/___syscall168';
import { ___syscall183 } from './syscalls/___syscall183';
import { ___syscall191 } from './syscalls/___syscall191';
import { ___syscall192 } from './syscalls/___syscall192';
import { ___syscall194 } from './syscalls/___syscall194';
import { ___syscall195 } from './syscalls/___syscall195';
import { ___syscall197 } from './syscalls/___syscall197';
import { ___syscall199 } from './syscalls/___syscall199';
import { ___syscall196 } from './syscalls/___syscall196';
import { ___syscall20 } from './syscalls/___syscall20';
import { ___syscall201 } from './syscalls/___syscall201';
import { ___syscall202 } from './syscalls/___syscall202';
import { ___syscall209 } from './syscalls/___syscall209';
import { ___syscall219 } from './syscalls/___syscall219';
import { ___syscall220 } from './syscalls/___syscall220';
import { ___syscall221 } from './syscalls/___syscall221';
import { ___syscall268 } from './syscalls/___syscall268';
import { ___syscall272 } from './syscalls/___syscall272';
import { ___syscall3 } from './syscalls/___syscall3';
import { ___syscall33 } from './syscalls/___syscall33';
import { ___syscall340 } from './syscalls/___syscall340';
import { ___syscall38 } from './syscalls/___syscall38';
import { ___syscall39 } from './syscalls/___syscall39';
import { ___syscall4 } from './syscalls/___syscall4';
import { ___syscall40 } from './syscalls/___syscall40';
import { ___syscall41 } from './syscalls/___syscall41';
import { ___syscall42 } from './syscalls/___syscall42';
import { ___syscall5 } from './syscalls/___syscall5';
import { ___syscall54 } from './syscalls/___syscall54';
import { ___syscall6 } from './syscalls/___syscall6';
import { ___syscall63 } from './syscalls/___syscall63';
import { ___syscall77 } from './syscalls/___syscall77';
import { ___syscall85 } from './syscalls/___syscall85';
import { ___syscall91 } from './syscalls/___syscall91';
import { ___syscall96 } from './syscalls/___syscall96';
import { ___syscall97 } from './syscalls/___syscall97';
import { ___unlock } from './___unlock';
import { __exit } from './__exit';
import { _abort } from './_abort';
import { _atexit } from './_atexit';
import { _clock_getres } from './_clock_getres';
import { _clock_gettime } from './_clock_gettime';
import { _emscripten_asm_const_i } from './emscripten/_emscripten_asm_const_i';
import { _emscripten_asm_const_iii } from './emscripten/_emscripten_asm_const_iii';
import { _emscripten_memcpy_big } from './emscripten/_emscripten_memcpy_big';
import { _execve } from './_execve';
import { _exit } from './_exit';
import { _fork } from './_fork';
import { _getaddrinfo } from './_getaddrinfo';
import { _getenv } from './env/_getenv';
import { _getnameinfo } from './_getnameinfo';
import { _getprotobyname } from './_getprotobyname';
import { _gettimeofday } from './_gettimeofday';
import { _gmtime_r } from './_gmtime_r';
import { _kill } from './_kill';
import { _llvm_trap } from './_llvm_trap';
import { _localtime_r } from './_localtime_r';
import { _mono_set_timeout } from './_mono_set_timeout';
import { _mono_wasm_add_bool_var } from './_mono_wasm_add_bool_var';
import { _mono_wasm_add_float_var } from './_mono_wasm_add_float_var';
import { _mono_wasm_add_frame } from './_mono_wasm_add_frame';
import { _mono_wasm_add_int_var } from './mono_wasm_add_int_var';
import { _mono_wasm_add_long_var } from './_mono_wasm_add_long_var';
import { _mono_wasm_add_string_var } from './_mono_wasm_add_string_var';
import { _mono_wasm_fire_bp } from './_mono_wasm_fire_bp';
import { _nanosleep } from './_nanosleep';
import { _pthread_cleanup_pop } from './pthread/_pthread_cleanup_pop';
import { _pthread_cleanup_push } from './pthread/_pthread_cleanup_push';
import { _pthread_cond_destroy } from './pthread/_pthread_cond_destroy';
import { _pthread_cond_init } from './_pthread_cond_init';
import { _pthread_cond_signal } from './pthread/_pthread_cond_signal';
import { _pthread_cond_timedwait } from './pthread/_pthread_cond_timedwait';
import { _pthread_cond_wait } from './pthread/_pthread_cond_wait';
import { _pthread_getspecific } from './pthread/_pthread_getspecific';
import { _pthread_key_delete } from './pthread/_pthread_key_delete';
import { _pthread_key_create } from './pthread/_pthread_key_create';
import { _pthread_mutex_destroy } from './pthread/_pthread_mutex_destroy';
import { _pthread_mutex_init } from './pthread/_pthread_mutex_init';
import { _pthread_mutexattr_destroy } from './pthread/_pthread_mutexattr_destroy';
import { _pthread_mutexattr_init } from './pthread/_pthread_mutexattr_init';
import { _pthread_mutexattr_settype } from './pthread/_pthread_mutexattr_settype';
import { _pthread_setcancelstate } from './pthread/_pthread_setcancelstate';
import { _pthread_setspecific } from './pthread/_pthread_setspecific';
import { _putchar } from './_putchar';
import { _puts } from './_puts';
import { _schedule_background_exec } from './_schedule_background_exec';
import { _sem_destroy } from './sem/_sem_destroy';
import { _sem_init } from './sem/_sem_init';
import { _sem_post } from './sem/_sem_post';
import { _sem_trywait } from './sem/_sem_trywait';
import { _sem_wait } from './sem/_sem_wait';
import { _setenv } from './_setenv';
import { _sigaction } from './_sigaction';
import { _sigemptyset } from './_sigemptyset';
import { _strftime } from './_strftime';
import { _sysconf } from './_sysconf';
import { _time } from './_time';
import { _unsetenv } from './_unsetenv';
import { _utime } from './_utime';
import { _utimes } from './_utimes';
import { _waitpid } from './_waitpid';
import { _environ } from './___buildEnvironment';

export const BaseModule = getGlobalValue('Module') || {};

const argv = (process || {}).argv || [];

const envType = getEnvType(BaseModule.ENVIRONMENT);

export class ModuleClass extends BaseModule {
  public ABORT = false;
  public EXITSTATUS = 0;
  public noExitRuntime = true;
  public calledRun = false;
  public wasmTable?: any[];
  public wasmTableSize = 69448;
  public wasmMaxTableSize = 69448;
  public asmGlobalArg = {}; 

  public ENVIRONMENT?: Record<string, any>;

  public readonly STATIC_BASE = getPointer('STATIC_BASE');
  public readonly STATIC_BUMP = getPointer('STATIC_BUMP');

  public readonly arguments = [];
  public readonly assemblies = [
    inkCompiler,
    inkEngineRuntime,
    inklecateWasm,
  ];

  public readonly entryPoint = {
    assemblyName: 'inklecate_wasm',
    namespace: 'inklecate_wasm',
    className: 'Program',
    mainMethodName: 'Main',
    inklecateCompileName: 'Compile',
    inklecatePlayName: 'Play',
  };

  public preRun = [];
  public postRun = [];

  public readonly thisProgram = (
    envType === EnvironmentTypes.Node && argv.length > 1 ?
      slash(argv[1]) :
      './this.program'
  );

  public readonly preloadedImages = {};
  public readonly preloadedAudios = {};

  public preInit?: any[] | ((...args: any[]) => any);

  public readonly asmLibraryArg = {
    abort,
    enlargeMemory,
    getTotalMemory,
    abortOnCannotGrowMemory,
    ___clock_gettime,
    ___lock,
    ___setErrNo,
    ___syscall10,
    ___syscall102,
    ___syscall118,
    ___syscall12,
    ___syscall122,
    ___syscall125,
    ___syscall140,
    ___syscall142,
    ___syscall144,
    ___syscall145,
    ___syscall146,
    ___syscall15,
    ___syscall168,
    ___syscall183,
    ___syscall191,
    ___syscall192,
    ___syscall194,
    ___syscall195,
    ___syscall196,
    ___syscall197,
    ___syscall199,
    ___syscall20,
    ___syscall201,
    ___syscall202,
    ___syscall209,
    ___syscall219,
    ___syscall220,
    ___syscall221,
    ___syscall268,
    ___syscall272,
    ___syscall3,
    ___syscall33,
    ___syscall340,
    ___syscall38,
    ___syscall39,
    ___syscall4,
    ___syscall40,
    ___syscall41,
    ___syscall42,
    ___syscall5,
    ___syscall54,
    ___syscall6,
    ___syscall63,
    ___syscall77,
    ___syscall85,
    ___syscall91,
    ___syscall96,
    ___syscall97,
    ___unlock,
    __exit,
    _abort,
    _atexit,
    _clock_getres,
    _clock_gettime,
    _emscripten_asm_const_i,
    _emscripten_asm_const_iii,
    _emscripten_memcpy_big,
    _execve,
    _exit,
    _fork,
    _getaddrinfo,
    _getenv,
    _getnameinfo,
    _getprotobyname:_getprotobyname,
    _getpwuid,
    _gettimeofday,
    _gmtime_r,
    _kill,
    _llvm_trap,
    _localtime_r,
    _mono_set_timeout,
    _mono_wasm_add_bool_var,
    _mono_wasm_add_float_var,
    _mono_wasm_add_frame,
    _mono_wasm_add_int_var,
    _mono_wasm_add_long_var,
    _mono_wasm_add_string_var,
    _mono_wasm_fire_bp,
    _nanosleep,
    _pthread_cleanup_pop,
    _pthread_cleanup_push,
    _pthread_cond_destroy,
    _pthread_cond_init,
    _pthread_cond_signal,
    _pthread_cond_timedwait,
    _pthread_cond_wait,
    _pthread_getspecific,
    _pthread_key_create,
    _pthread_key_delete,
    _pthread_mutex_destroy,
    _pthread_mutex_init,
    _pthread_mutexattr_destroy,
    _pthread_mutexattr_init,
    _pthread_mutexattr_settype,
    _pthread_setcancelstate,
    _pthread_setspecific,
    _putchar,
    _puts,
    _schedule_background_exec,
    _sem_destroy,
    _sem_init,
    _sem_post,
    _sem_trywait,
    _sem_wait,
    _setenv,
    _sigaction,
    _sigemptyset,
    _strftime,
    _sysconf,
    _time,
    _unsetenv,
    _utime,
    _utimes,
    _waitpid,
    DYNAMICTOP_PTR: getPointer('DYNAMICTOP_PTR'),
    STACKTOP: getPointer('STACKTOP'),
    _environ,
  };

  constructor(...args: any[]) {
    super(...args);

    Object.keys(emscriptenFuncs).forEach((key) => {
      this[key] = (emscriptenFuncs as any)[key]
    });

    if (this.preInit) {
      if (typeof this.preInit === 'function') {
        this.preInit = [ this.preInit ];
      }

      while (this.preInit!.length) {
        this.preInit.pop()();
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

  public asm = (global: any, env: any, providedBuffer?: Buffer) => {
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
      env.tableBase = 0;
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
      )(filename, binary);
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

  public readonly print = (text?: string, ...args: any[]) => {
    if (typeof console !== 'undefined') {
      log(text, ...args);
    } else if (typeof print !== 'undefined') {
      // @ts-ignore
      print(text, ...args);
    }
  };

  public readonly printErr = (text?: string, ...args: any[]) => (
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

  public readonly abort = (what?: string): never | number => {
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

  public readonly FS_createPath = FS.createPath;
  public readonly FS_createDataFile = FS.createDataFile;

  public readonly _usleep = (useconds: number) => {
    var msec = useconds / 1e3;
    if ((envType === EnvironmentTypes.Web || envType === EnvironmentTypes.Worker) && self["performance"] && self["performance"]["now"]) {
      var start = self.performance.now();
      while (self.performance.now() - start < msec) {}
    } else {
      var start = Date.now();
      while (Date.now() - start < msec) {}
    }

    return 0;
  };
}
