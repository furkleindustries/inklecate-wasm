import {
  getModule,
} from './getModule';
import {
  getPointer,
} from './pointers/pointers';
import {
  getTotalStack,
} from './totalStack';
import {
  setValue,
} from './emscripten/setValue';
import {
  stringToUtf16,
} from './emscripten/stringToUtf16';
import {
  utf8ToString,
} from './emscripten/utf8ToString';

const Module = getModule();

export const ASM_CONSTS: Array<(...args: any[]) => number> = [
  ($0: number, $1: number) => {
    const str = utf8ToString($0);
    let res;
    try {
      res = eval(str!);
      if (res === null) {
        return 0;
      }

      res = String(res);
      setValue($1, 0, 'i32')
    } catch (err) {
      res = String(err);
      setValue($1, 1, 'i32');
      if (res === null) {
        res = 'Unknown exception.';
      }
    }

    const buff = Module._malloc((res.length + 1) * 2);
    stringToUtf16(res, buff, (res.length + 1) * 2);
    return buff;
  },
  () => getPointer('STACK_BASE'),
  getTotalStack,
];
