import {
  Module,
} from './Module';

export class MonoClass {
  public active_frames: any[] = [];
  public pump_count = 0;
  public mono_background_exec: any;
  public timeout_queue: Array<(...args: any[]) => any> = [];
  public var_info: any[] = [];
  public pump_message = () => {
    if (!this.mono_background_exec) {
      this.mono_background_exec = Module.cwrap('mono_background_exec', 'void', []);
    }

    while (this.timeout_queue.length > 0) {
      --this.pump_count;
      this.timeout_queue.shift()!();
    }
    while (this.pump_count > 0) {
      --this.pump_count;
      this.mono_background_exec();
    }
  };

  public mono_wasm_get_call_stack = () => {
    const bp_id = this.mono_wasm_current_bp_id();
    this.active_frames = [];
    this.mono_wasm_enum_frames();
    const the_frames = this.active_frames;
    this.active_frames = [];
    return {
      breakpoint_id: bp_id,
      frames: the_frames,
    };
  };

  public mono_wasm_current_bp_id = Module.cwrap('mono_wasm_current_bp_id', 'number', []);

  public mono_wasm_enum_frames = Module.cwrap('mono_wasm_enum_frames', 'void', []);

  public mono_wasm_get_variables = (scope: any, var_list: any[]) => {
    this.var_info = [];
    for (let ii = 0; ii < var_list.length; ii += 1) {
      this.mono_wasm_get_var_info(scope, var_list[ii]);
    }

    let res = this.var_info;
    this.var_info = [];

    return res;
  };

  public mono_wasm_get_var_info = Module.cwrap(
    'mono_wasm_get_var_info',
    'void',
    [
      'number',
      'number',
    ],
  );
};
