import {
  addOnPostRun,
} from './addOnPostRun';
import {
  callRuntimeCallbacks,
} from './callRuntimeCallbacks';
import {
  getAtPostRun,
} from './getAtPostRun';
import {
  getModule,
} from '../getModule';

const Module = getModule();

export const postRun = () => {
  if (Module.postRun) {
    if (typeof Module.postRun === 'function') {
      Module.postRun = [ Module.postRun ];
    }

    while (Module.postRun.length) {
      addOnPostRun(Module.postRun.shift())
    }
  }

  callRuntimeCallbacks(getAtPostRun());
};
