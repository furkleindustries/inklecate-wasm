import {
  getModule,
} from './getModule';

const Module = getModule();

let totalStack = Module.TOTAL_STACK || 5242880;
export const getTotalStack = () => totalStack;
export const setTotalStack = (value: number) => totalStack = value;
