import {
  getAtPostRun,
} from './getAtPostRun';

export const addOnPostRun = (cb: any) => getAtPostRun().unshift(cb);
