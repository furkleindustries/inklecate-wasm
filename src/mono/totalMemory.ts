import {
  Module,
} from './Module';

let totalMemory = Module.TOTAL_MEMORY || 134217728;
export const getTotalMemory = () => totalMemory;
export const setTotalMemory = (value: number) => totalMemory = value;
