import {
  MONO,
} from './MonoClass';

export function _mono_wasm_add_float_var(var_value: number) {
  MONO.var_info!.push({
    value: {
      type: 'number',
      value: var_value,
    }
  })
}
