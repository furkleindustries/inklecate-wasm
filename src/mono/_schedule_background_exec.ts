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
} from './MonoClass';

const envType = getEnvType(Module.ENVIRONMENT);

export function _schedule_background_exec() {
  MONO.pump_count += 1;
  if (envType === EnvironmentTypes.Web) {
    setTimeout(MONO.pump_message, 0);
  }
}
