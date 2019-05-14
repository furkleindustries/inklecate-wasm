import {
  ASM_CONSTS,
} from '../ASM_CONSTS';
import {
  assertValid,
} from 'ts-assertions';

export const _emscripten_asm_const_i = (code: 1 | 2) => {
  const index = assertValid<1 | 2>(
    code,
    'The code was 0, which requires two pointer arguments.',
    () => code > 1,
  );

  return ASM_CONSTS[index]();
};
