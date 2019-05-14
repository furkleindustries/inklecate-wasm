import {
  demangle,
} from './demangle';

export const demangleAll = (text: string) => (
  text.replace(/__Z[\w\d_]+/g, (toReplace) => (
    toReplace === demangle(toReplace) ?
      toReplace :
      `${toReplace} [${demangle(toReplace)}]`
  ))
);
