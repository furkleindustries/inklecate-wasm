import {
  demangleAll,
} from './demangleAll';
import {
  getModule,
} from '../getModule';
import {
  jsStackTrace,
} from './jsStackTrace';

const Module = getModule();

export const stackTrace = () => demangleAll(
  typeof Module.extraStackTrace === 'function' ?
    `${jsStackTrace()}\n${Module.extraStackTrace()}` :
    jsStackTrace()
);
