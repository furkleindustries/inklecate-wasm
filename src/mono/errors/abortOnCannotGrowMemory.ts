import {
  Module,
} from '../Module';
import {
  getTotalMemory,
} from '../totalMemory';

export const abortOnCannotGrowMemory = () => Module.abort(
  `Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ${getTotalMemory()}, (2) compile with -s ALLOW_MEMORY_GROWTH=1 which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -s ABORTING_MALLOC=0.`
);
