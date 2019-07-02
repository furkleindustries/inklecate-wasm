import {
  MONO,
} from './MonoClass';

export function _mono_wasm_add_bool_var(var_value: number) {
  MONO.var_info!.push({
    value: {
      type: 'boolean',
      value: var_value != 0,
    }
  });
}
