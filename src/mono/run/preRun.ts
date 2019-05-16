import {
  addOnPreRun,
} from './addOnPreRun';
import {
  callRuntimeCallbacks,
} from './callRuntimeCallbacks';
import {
  getAtPreRun,
} from './getAtPreRun';
import {
  Module,
} from '../Module';

export const preRun = () => {
  if (Module.preRun) {
    if (typeof Module.preRun === 'function') {
      Module.preRun = [ Module.preRun ];
    }

    while (Module.preRun.length) {
      addOnPreRun(Module.preRun.shift());
    }
  }

  callRuntimeCallbacks(getAtPreRun());
};
