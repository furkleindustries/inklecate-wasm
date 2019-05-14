import {
  getAtPreRun,
} from './getAtPreRun';

export const addOnPreRun = (cb: any) => getAtPreRun().unshift(cb);
