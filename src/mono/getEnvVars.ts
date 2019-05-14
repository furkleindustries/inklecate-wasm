import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  isNode,
} from '../isNode';

export function getEnvType(baseEnv: any): EnvironmentTypes {
  let help: Record<string, boolean>;
  if (!baseEnv) {
    help = helper(
      isNode(),
      typeof window === 'object',
      typeof importScripts === 'function',
    );
  }


  help = helper(
    baseEnv === 'WEB',
    baseEnv === 'WORKER',
    baseEnv === 'NODE',
  );

  let retVal = EnvironmentTypes.Shell;
  if (help.ENVIRONMENT_IS_NODE) {
    retVal = EnvironmentTypes.Node;
  } else if (help.ENVIRONMENT_IS_WEB) {
    retVal = EnvironmentTypes.Web;
  } else if (help.ENVIRONMENT_IS_WORKER) {
    retVal = EnvironmentTypes.Worker;
  }

  return retVal;
}

const helper = (
  ENVIRONMENT_IS_NODE: boolean,
  ENVIRONMENT_IS_WEB: boolean,
  ENVIRONMENT_IS_WORKER: boolean,
): Record<string, boolean> => ({
  ENVIRONMENT_IS_WEB,
  ENVIRONMENT_IS_WORKER,
  ENVIRONMENT_IS_NODE: ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB,
});
