import {
  getPointer,
} from './pointers/pointers';

export const alignMemory = (size: number, factor?: number) => {
  const realFactor = factor || getPointer('STACK_ALIGN');
  return Math.ceil(size / realFactor) * realFactor;
};
