import {
  arrayToC,
} from './arrayToC';
import {
  getCFunc,
} from '../getCFunc';
import {
  Module,
} from '../Module';
import {
  pointerStringify,
} from '../pointers/pointerStringify';
import {
  stringToC,
} from './stringToC';

export const ccall = (
  ident: string,
  returnType: string,
  argTypes: Array<'string' | 'array' | 'number'>,
  args: any[],
  opts?: never[],
) => {
  const func = getCFunc(ident);
  const cArgs = [];
  let stack = 0;
  if (args) {
    for (let ii = 0; ii < args.length; ii += 1) {
      if (argTypes[ii] === 'string' || argTypes[ii] === 'array') {
        if (!stack) {
          stack = Module.stackSave();
        }

        if (argTypes[ii] === 'string') {
          cArgs[ii] = stringToC(args[ii]);
        } else {
          cArgs[ii] = arrayToC(args[ii]);
        }
      } else {
        cArgs[ii] = args[ii];
      }
    }
  }

  const ret = returnType === 'string' ?
    pointerStringify(func(...cArgs)) :
    func(...cArgs);

  if (stack) {
    Module.stackRestore(stack)
  }

  return ret;
};
