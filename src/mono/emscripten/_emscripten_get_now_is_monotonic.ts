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

export const _emscripten_get_now_is_monotonic = () => (
  envType === EnvironmentTypes.Node ||
    // @ts-ignore
    typeof dateNow !== 'undefined' ||
    (envType === EnvironmentTypes.Web || envType === EnvironmentTypes.Worker) &&
    self.performance &&
    self.performance.now
);
