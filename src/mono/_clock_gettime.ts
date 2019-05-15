import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  _emscripten_get_now,
} from './emscripten/_emscripten_get_now';
import {
  _emscripten_get_now_is_monotonic,
} from './emscripten/_emscripten_get_now_is_monotonic';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';
import {
  getHeap,
} from './heaps/heaps';

export const _clock_gettime = (clk_id: number, tp: number) => {
  let now;
  if (clk_id === 0) {
    now = Date.now();
  } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
    now = _emscripten_get_now('No message. Will add later.');
  } else {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  getHeap('HEAP32')[tp >> 2] = now / 1e3 | 0;
  getHeap('HEAP32')[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;

  return 0;
};
