import {
  ENV,
} from './env/ENV';
import {
  getHeap,
} from './heaps/heaps';
import {
  Module,
} from './Module';
import {
  getPointer,
  setPointer,
} from './pointers/pointers';
import {
  staticAlloc,
} from './pointers/staticAlloc';
import {
  writeAsciiToMemory,
} from './heaps/writeAsciiToMemory';

export const _environ = getPointer('STATICTOP');
setPointer('STATICTOP', _environ + 16);

const HEAP32 = getHeap('HEAP32');

export function ___buildEnvironment(env: any) {
  let MAX_ENV_VALUES = 64;
  let TOTAL_ENV_SIZE = 1024;
  let poolPtr;
  let envPtr;

  if (!(___buildEnvironment as any).called) {
    (___buildEnvironment as any).called = true;
    ENV.USER = ENV.LOGNAME = "web_user";
    ENV.PATH = "/";
    ENV.PWD = "/";
    ENV.HOME = "/home/web_user";
    ENV.LANG = "C.UTF-8";
    ENV._ = Module.thisProgram;
    poolPtr = staticAlloc(TOTAL_ENV_SIZE);
    envPtr = staticAlloc(MAX_ENV_VALUES * 4);
    HEAP32[envPtr >> 2] = poolPtr;
    HEAP32[_environ >> 2] = envPtr
  } else {
    envPtr = HEAP32[_environ >> 2];
    poolPtr = HEAP32[envPtr >> 2]
  }

  let strings = [];
  let totalSize = 0;
  for (let key in env) {
    if (typeof env[key] === "string") {
      let line = key + "=" + env[key];
      strings.push(line);
      totalSize += line.length
    }
  }

  if (totalSize > TOTAL_ENV_SIZE) {
    throw new Error("Environment size exceeded TOTAL_ENV_SIZE!")
  }

  let ptrSize = 4;
  for (let i = 0; i < strings.length; i++) {
    let line = strings[i];
    writeAsciiToMemory(line, poolPtr);
    HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
    poolPtr += line.length + 1
  }

  HEAP32[envPtr + strings.length * ptrSize >> 2] = 0
}
