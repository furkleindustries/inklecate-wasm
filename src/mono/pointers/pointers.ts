import {
  assertValid,
} from 'ts-assertions';

const pointers: StackPointers = {
  ABORT: 0,
  DYNAMIC_BASE: 0,
  DYNAMICTOP_PTR: 0,
  EXITSTATUS: 0,
  GLOBAL_BASE: 1024,
  STACK_ALIGN: 16,
  STACK_BASE: 0,
  STACK_MAX: 0,
  STACKTOP: 0,
  STATIC_BASE: 0,
  STATIC_BUMP: 0,
  STATICTOP: 0,
};

export const getPointer = (id: keyof StackPointers) => assertValid<number>(
  pointers[id],
  `The pointer "${id}" could not be found.`,
);

export const setPointer = (id: keyof StackPointers, value: number) => assertValid<number>(
  pointers[id] = value,
  'The value was not a positive integer.',
  (value) => value >= 0 && value % 1 === 0,
);

type StackPointers = {
  ABORT: number;
  DYNAMIC_BASE: number;
  DYNAMICTOP_PTR: number;
  EXITSTATUS: number;
  GLOBAL_BASE: number;
  STACK_ALIGN: number;
  STACKTOP: number;
  STATIC_BASE: number;
  STATIC_BUMP: number;
  STATICTOP: number;
  STACK_BASE: number;
  STACK_MAX: number;
}
