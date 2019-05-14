import {
  getModule,
} from '../getModule';

const Module = getModule();

let runDependencies = 0;
export const getRunDependencies = () => runDependencies;

let runDependencyWatcher: any = null;
let dependenciesFulfilled: any = null;

export const getUniqueRunDependency = (id: any) => id;

export const addRunDependency = (id: any) => {
  runDependencies += 1;
  if (Module.monitorRunDependencies) {
    Module.monitorRunDependencies(runDependencies);
  }
};

export const removeRunDependency = (id: any) => {
  runDependencies--;
  if (typeof Module.monitorRunDependencies === 'function') {
    Module.monitorRunDependencies(runDependencies)
  }

  if (runDependencies === 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }

    if (dependenciesFulfilled) {
      const callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
};
