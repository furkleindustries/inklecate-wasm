import {
  getModule,
} from './getModule';
import {
  assertValid,
} from 'ts-assertions';

const Module = getModule();

export const getCFunc = (ident: string) => assertValid<Function>(
  Module[`_${ident}`],
  `Cannot call unknown function "${ident}". Make sure it is exported.`,
);
