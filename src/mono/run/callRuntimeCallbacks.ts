import {
  Module,
} from '../Module';

export const callRuntimeCallbacks = (callbacks: Array<Function | { arg: any, func: any }>) => {
  while (callbacks.length > 0) {
    const callback = callbacks.shift();
    if (typeof callback === 'function') {
      callback();
      continue;
    }

    const safeCallback: { arg: any, func: any } = callback!;

    var func = safeCallback.func;
    if (typeof func === 'number') {
      if (safeCallback.arg === undefined) {
        Module.dynCall_v(func);
      } else {
        Module.dynCall_vi(func, safeCallback.arg);
      }
    } else {
      func(safeCallback.arg === undefined ? null : safeCallback.arg);
    }
  }
};
