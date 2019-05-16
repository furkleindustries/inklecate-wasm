import {
  Module,
} from './Module';
import {
  assertValid,
} from 'ts-assertions';

export const getCFunc = (ident: string) => assertValid<Function>(
  Module[`_${ident}`],
  `Cannot call unknown function "${ident}". Make sure it is exported.`,
);
