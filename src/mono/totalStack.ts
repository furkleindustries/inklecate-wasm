import {
  Module,
} from './Module';

let totalStack = Module.TOTAL_STACK || 5242880;
export const getTotalStack = () => totalStack;
export const setTotalStack = (value: number) => totalStack = value;
