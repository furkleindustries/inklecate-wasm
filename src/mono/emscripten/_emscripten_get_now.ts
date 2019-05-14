import {
  getModule,
} from '../getModule';

const Module = getModule();

export const _emscripten_get_now = (msg: string) => Module.abort(msg);
