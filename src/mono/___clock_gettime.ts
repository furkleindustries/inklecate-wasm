import {
  _clock_gettime,
} from './_clock_gettime';

export const ___clock_gettime = (clkId: number, tp: number) => _clock_gettime(
  clkId,
  tp,
);
