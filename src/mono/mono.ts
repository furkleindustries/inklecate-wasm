import DEBUG from '../DEBUG';

import {
  assertLittleEndian,
} from './assertions/assertLittleEndian';
import {
  WASM_PAGE_SIZE,
} from './constants';
import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  FS,
} from './filesystems/FS/FS';
import {
  getAtInit,
} from './run/getAtInit';
import {
  getEnvType,
} from './getEnvVars';
import {
  getBuffer,
  setBuffer,
  updateGlobalBufferViews,
  getHeap,
} from './heaps/heaps';
import {
  Module,
} from './Module';
import {
  getTotalMemory,
} from './totalMemory';
import {
  getTotalStack,
} from './totalStack';
import {
  getPointer,
  setPointer,
} from './pointers/pointers';
import { setNewEmscriptenGetNow } from './emscripten/_emscripten_get_now';
import { getAtMain } from './run/getAtMain';
import { getAtExit } from './run/getAtExit';
import { TTY } from './TTY';
import { SOCKFS } from './filesystems/SOCKFS/SOCKFS';
import { PIPEFS } from './filesystems/PIPEFS/PIPEFS';
import { ___buildEnvironment } from './___buildEnvironment';
import { ENV } from './env/ENV';
import { MONO } from './MONOObj';
import { run } from './run/run';
import { alignMemory } from './alignMemory';
import { staticAlloc } from './pointers/staticAlloc';

const envType = getEnvType(Module.ENVIRONMENT);

if (envType === EnvironmentTypes.Shell) {
  // @ts-ignore
  if (typeof scriptArgs !== 'undefined') {
    // @ts-ignore
    Module.arguments = scriptArgs;
  // @ts-ignore
  } else if (typeof arguments !== 'undefined') {
    // @ts-ignore
    Module.arguments = arguments;
  }
} else if ((envType === EnvironmentTypes.Web ||
            envType === EnvironmentTypes.Worker) &&
           // @ts-ignore
           typeof arguments !== 'undefined')
{
  // @ts-ignore
  Module.arguments = arguments;
}

let byteLength;
try {
  byteLength = Function.prototype.call.bind(
    // @ts-ignore
    Object.getOwnPropertyDescriptor(
      ArrayBuffer.prototype,
      'byteLength',
    ).get,
  );

  byteLength(new ArrayBuffer(4));
} catch (e) {
  byteLength = ({ byteLength }: Buffer) => byteLength;
}

const totalStack = getTotalStack();
const totalMemory = getTotalMemory();
if (totalMemory < totalStack)
  Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + totalMemory + '! (TOTAL_STACK=' + totalStack + ')');
if (Module.buffer) {
  setBuffer(Module.buffer);
} else {
  // @ts-ignore
  if (typeof WebAssembly === 'object' &&
      // @ts-ignore
      typeof WebAssembly.Memory === 'function')
  {
    const initial = totalMemory / WASM_PAGE_SIZE;
    // @ts-ignore
    Module.wasmMemory = new WebAssembly.Memory({ initial });
    setBuffer(Module.wasmMemory.buffer);
  } else {
    // @ts-ignore
    setBuffer(new ArrayBuffer(totalMemory));
  }

  Module.buffer = getBuffer();
}

updateGlobalBufferViews();
assertLittleEndian();

setPointer('STATIC_BASE', getPointer('GLOBAL_BASE'));
setPointer('STATICTOP', getPointer('STATIC_BASE') + 635680);

getAtInit().push();

setPointer('STATICTOP', getPointer('STATICTOP') + 64);

setNewEmscriptenGetNow();

FS.staticInit();

const __ATINIT__ = getAtInit();
__ATINIT__.unshift(function () {
  if (!Module.noFSInit && !FS.init.initialized) {
    FS.init();
  }
});

const __ATMAIN__ = getAtMain();
__ATMAIN__.push(function () {
  FS.ignorePermissions = false;
});


const __ATEXIT__ = getAtExit();
__ATEXIT__.push(function () {
  FS.quit()
});

__ATINIT__.unshift(function () {
  TTY.init();
});

__ATEXIT__.push(function () {
  TTY.shutdown();
});

__ATINIT__.push(function () {
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
});

__ATINIT__.push(function () {
  PIPEFS.root = FS.mount(PIPEFS, {}, null)
});

___buildEnvironment(ENV);

Module.pump_message = MONO.pump_message;
setPointer('DYNAMICTOP_PTR', staticAlloc(4));
const aligned = alignMemory(getPointer('STATICTOP'));
setPointer('STACK_BASE', aligned);
setPointer('STACKTOP', aligned);
setPointer('STACK_MAX', getPointer('STACK_BASE') + totalStack);
setPointer('DYNAMIC_BASE', alignMemory(getPointer('STACK_MAX')));

const HEAP32 = getHeap('HEAP32');
HEAP32[getPointer('DYNAMICTOP_PTR') >> 2] = getPointer('DYNAMIC_BASE');

if (DEBUG) {
  debugger;
}

Module.asm = Module.asm(Module.asmGlobalArg, Module.asmLibraryArg, getBuffer());

let dependenciesFulfilled = function runCaller() {
  if (!Module.calledRun) {
    run();
    dependenciesFulfilled = runCaller;
  }
};

run();
