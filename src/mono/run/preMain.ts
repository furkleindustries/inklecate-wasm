import {
  callRuntimeCallbacks,
} from './callRuntimeCallbacks';
import {
  getAtMain,
} from './getAtMain';

export const preMain = () => callRuntimeCallbacks(getAtMain());
