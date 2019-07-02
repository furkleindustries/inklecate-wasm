import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  _emscripten_get_now_is_monotonic,
} from './emscripten/_emscripten_get_now_is_monotonic';
import {
  _emscripten_get_now_res,
} from './emscripten/_emscripten_get_now_res';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';
import {
  getHeap,
} from './heaps/heaps';

const HEAP32 = getHeap('HEAP32');

export function _clock_getres(clk_id: any, res: any) {
  var nsec;
  if (clk_id === 0) {
    nsec = 1e3 * 1e3;
  } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
    nsec = _emscripten_get_now_res();
  } else {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  HEAP32[res >> 2] = nsec / 1e9 | 0;
  HEAP32[res + 4 >> 2] = nsec;

  return 0;
}
