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

export function _emscripten_get_now_res() {
  if (envType === EnvironmentTypes.Node) {
    return 1;
  } else if (
    // @ts-ignore
    typeof dateNow !== 'undefined' ||
      (envType === EnvironmentTypes.Web ||
        envType === EnvironmentTypes.Worker) &&
      self.performance &&
      self.performance.now)
  {
    return 1e3;
  }

  return 1e3 * 1e3;
}
