import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  getEnvType,
} from './getEnvVars';
import {
  Module,
} from './Module';
import {
  MONO,
} from './MONOObj';

const envType = getEnvType(Module.ENVIRONMENT);

export function _mono_set_timeout(timeout: number, id: number) {
  // @ts-ignore
  const _this = this;
  if (!_this.mono_set_timeout_exec)
    _this.mono_set_timeout_exec = Module.cwrap('mono_set_timeout_exec', 'void', [ 'number' ]);
  if (envType === EnvironmentTypes.Web) {
    window.setTimeout(function () {
      _this.mono_set_timeout_exec(id);
    }, timeout)
  } else {
    MONO.pump_count += 1;
    MONO.timeout_queue.push(function () {
      _this.mono_set_timeout_exec(id);
    });
  }
}
