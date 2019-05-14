import {
  callRuntimeCallbacks,
} from './callRuntimeCallbacks';
import {
  getAtInit,
} from './getAtInit';

let runtimeInitialized = false;
export const ensureInitRuntime = () => {
  if (runtimeInitialized) {
    return;
  }

  runtimeInitialized = true;
  callRuntimeCallbacks(getAtInit());
};
