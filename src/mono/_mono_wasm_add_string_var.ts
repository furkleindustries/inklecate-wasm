import {
  Module,
} from './Module';
import {
  MONO,
} from './MonoClass';

export function _mono_wasm_add_string_var(var_value: string | number) {
  if (var_value == 0) {
    MONO.var_info.push({
      value: {
        type: 'object',
        subtype: 'null',
      },
    });
  } else {
    MONO.var_info.push({
      value: {
        type: 'string',
        value: Module.UTF8ToString(var_value),
      },
    });
  }
}
