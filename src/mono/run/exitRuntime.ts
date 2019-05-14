import {
  callRuntimeCallbacks,
} from './callRuntimeCallbacks';
import {
  getAtExit,
} from './getAtExit';

export const exitRuntime = () => callRuntimeCallbacks(getAtExit());
