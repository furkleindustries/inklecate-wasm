import {
  EnvironmentTypes,
} from '../EnvironmentTypes';
import {
  getEnvType,
} from '../getEnvVars';
import {
  Module,
} from '../Module';

const envType = getEnvType(Module.ENVIRONMENT);

export let _emscripten_get_now = Module.abort;

export const setNewEmscriptenGetNow = () => {
  if (envType === EnvironmentTypes.Node) {
    _emscripten_get_now = function _emscripten_get_now_actual(what: string) {
      var t = process.hrtime();
      return t[0] * 1e3 + t[1] / 1e6;
    }
  } else if (
    // @ts-ignore
    typeof dateNow !== "undefined") {
    // @ts-ignore
    _emscripten_get_now = dateNow;
  } else if (typeof self === "object" && self["performance"] && typeof self["performance"]["now"] === "function") {
    _emscripten_get_now = function () {
      return self.performance.now();
    };
  } else if (typeof performance === "object" && typeof performance["now"] === "function") {
    _emscripten_get_now = function () {
      return performance.now();
    };
  } else {
    _emscripten_get_now = Date.now;
  }
};
