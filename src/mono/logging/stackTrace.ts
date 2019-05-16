import {
  demangleAll,
} from './demangleAll';
import {
  Module,
} from '../Module';
import {
  jsStackTrace,
} from './jsStackTrace';

export const stackTrace = () => demangleAll(
  typeof Module.extraStackTrace === 'function' ?
    `${jsStackTrace()}\n${Module.extraStackTrace()}` :
    jsStackTrace()
);
