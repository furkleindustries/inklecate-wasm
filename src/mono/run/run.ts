import {
  ensureInitRuntime,
} from './ensureInitRuntime';
import {
  getModule,
} from '../getModule';
import {
  preMain,
} from './preMain';
import {
  preRun,
} from './preRun';
import {
  postRun,
} from './postRun';
import { getRunDependencies } from './runDependencies';

const Module = getModule();

export const run = (...args: any[]) => {
  args = args || Module.arguments;
  if (getRunDependencies()) {
    return;
  }

  preRun();

  if (getRunDependencies() || Module.calledRun) {
    return;
  }
 
  const doRun = () => {
    if (Module.calledRun) {
      return;
    }

    Module.calledRun = true;

    if (Module.ABORT) {
      return;
    }

    ensureInitRuntime();
    preMain();

    if (typeof Module.onRuntimeInitialized === 'function') {
      Module.onRuntimeInitialized();
    }

    postRun();
  };

  if (typeof Module.setStatus === 'function') {
    Module.setStatus('Running...');
    setTimeout(() => {
      setTimeout(Module.setStatus, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
};
