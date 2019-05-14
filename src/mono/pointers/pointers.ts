import {
  assertValid,
} from 'ts-assertions';

const pointers: Record<string, number> = {
  ABORT: 0,
  DYNAMIC_BASE: 0,
  DYNAMICTOP_PTR: 0,
  EXITSTATUS: 0,
  GLOBAL_BASE: 1024,
  STACK_ALIGN: 16,
  STACK_BASE: 0,
  STACK_MAX: 0,
  STACK_TOP: 0,
  STATIC_BASE: 0,
  STATIC_BUMP: 0,
  STATICTOP: 0,
};

export const pointerIds = Object.freeze(Object.keys(pointers));

export const getPointer = (id: string) => assertValid<number>(
  pointers[id],
  `The pointer "${id}" could not be found.`,
);

export const setPointer = (id: string, value: number) => assertValid<number>(
  pointers[id] = value,
  'The value was not a positive integer.',
  (value) => value >= 0 && value % 1 === 0,
);
