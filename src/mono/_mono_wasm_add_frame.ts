import {
  Module,
} from './Module';
import {
  MONO,
} from './MonoClass';

export function _mono_wasm_add_frame(il: any, method: any, name: any) {
  MONO.active_frames.push({
    il_pos: il,
    method_token: method,
    assembly_name: Module.UTF8ToString(name),
  });
}
