/* Adapted from Ooui v0.10.222. */
const debug = false;

let ENVIRONMENT_IS_WEB = typeof window === "object";
let ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
let ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
let ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

let ___errno_location;
let _emscripten_replace_memory;
let _free;
let _htonl;
let _htons;
let _malloc;
let _memalign;
let _memset;
let _mono_background_exec;
let _mono_print_method_from_ip;
let _mono_set_timeout_exec;
let _mono_wasm_assembly_find_class;
let _mono_wasm_assembly_find_method;
let _mono_wasm_assembly_load;
let _mono_wasm_current_bp_id;
let _mono_wasm_enum_frames;
let _mono_wasm_get_var_info;
let _mono_wasm_invoke_method;
let _mono_wasm_load_runtime;
let _mono_wasm_set_breakpoint;
let _mono_wasm_string_from_js;
let _mono_wasm_string_get_utf8;
let _ntohs;
let _wasm_get_stack_base;
let _wasm_get_stack_size;
let stackAlloc;
let stackRestore;
let stackSave;
let dynCall_v;
let dynCall_vi;

const Module = {
  assemblies: [
    'ink_compiler.dll',
    'ink-engine-runtime.dll',
    'inklecate_wasm.dll',
    'mscorlib.dll',
    'System.Core.dll',
    'System.dll',
  ],

  entryPoint: {
    assemblyName: 'inklecate_wasm',
    nsName: 'inklecate_wasm',
    className: 'Program',
    mainMethodName: 'Main',
  },

  /* Do not change the below to an arrow function! It needs the scope. */
  onRuntimeInitialized: function (resolve) {
    if (debug) console.log('Done with WASM module instantiation.');

    Module.FS_createPath('/', 'managed', true, true);

    var pending = 0;
    this.assemblies.forEach((asmName) => {
      if (debug) console.log('Loading '  + asmName + '.');
      ++pending;

      let prom;
      if (ENVIRONMENT_IS_NODE) {
        const {
          readFile,
        } = require('fs-extra');
        const path = require('path');
        prom = readFile(path.join(__dirname, 'managed', asmName));
      } else {
        prom = fetch(
          'managed/' + asmName,
          {
            contentType: 'application/wasm',
            credentials: 'same-origin',
          },
        );
      }

      prom.then((data) => {
        const asm = new Uint8Array(data);
        Module.FS_createDataFile('managed/' + asmName, null, asm, true, true, true);
        pending -= 1;
        if (pending === 0) {
          Module.bclLoadingDone(resolve);
        }
      });
    });
  },

  bclLoadingDone: (resolve) => {
    if (debug) console.log('Done loading the Mono Base Class Library.');
    MonoRuntime.init();
    MonoRuntime.compileInk = (text) => {
      const returnObj = {
        text,
        compilerOutput: [],
        storyContent: null,
      };

      let failed = false;

      let inklecateResponse;

      const moduleName = Module.entryPoint.assemblyName;
      const nsName = Module.entryPoint.nsName;
      const className = Module.entryPoint.className;
      
      const oldWrite = process.stdout.write;
      const cb = function (string) {
        if (/^(error|warning):?\s/i.test(string)) {
          returnObj.compilerOutput.push(string);
        } else {
          console.warn(string);
        }
      };

      process.stdout.write = cb;

      try {
        /* All of these methods have to be curried to prevent them from either
         * causing exceptions in Mono before all DLLs are loaded, or appearing
         * in modules as undefined. */
        const modulePtr = MonoRuntime.assembly_load()(moduleName);
        const classPtr = MonoRuntime.find_class()(modulePtr, nsName, className);
        const methodPtr = MonoRuntime.find_method()(classPtr, 'CompileToString', 1);
        const inputMonoStr = MonoRuntime.mono_string()(text);

        inklecateResponse = MonoRuntime.call_method(
          methodPtr,
          classPtr,
          [ inputMonoStr ],
        );
      } catch (err) {
        failed = true;
        const errStr = String(err);
        if (/^(error|warning):?\s/i.test(errStr)) {
          returnObj.compilerOutput.push(errStr);
        }
      }

      process.stdout.write = oldWrite;

      if (failed) {
        return returnObj;
      }

      const storyContentStr = MonoRuntime.conv_string(inklecateResponse);
      try {
        returnObj.storyContent = JSON.parse(storyContentStr);
      } catch (err) {
        compilerErrors.push('INKLECATE-WASM: The inklecate response could ' +
          'not be loaded from JSON.');
      }

      return returnObj;
    };

    return resolve(MonoRuntime.compileInk);
  },
};

const MonoRuntime = {
  load_runtime() {
    return Module.cwrap('mono_wasm_load_runtime', null, [ 'string', 'number', ]);
  },

  assembly_load() {
    return Module.cwrap('mono_wasm_assembly_load', 'number', [ 'string' ]);
  },

  find_class() {
    return Module.cwrap('mono_wasm_assembly_find_class', 'number', [ 'number', 'string', 'string', ]);
  },

  find_method() {
    return Module.cwrap('mono_wasm_assembly_find_method', 'number', [ 'number', 'string', 'number', ]);
  },

  invoke_method() {
    return Module.cwrap('mono_wasm_invoke_method', 'number', [ 'number', 'number', 'number', ]);
  },

  mono_string_get_utf8() {
    return Module.cwrap('mono_wasm_string_get_utf8', 'number', [ 'number' ]);
  },

  mono_string() {
    return Module.cwrap('mono_wasm_string_from_js', 'number', [ 'string' ]);
  },

  init() {
    this.load_runtime()('managed', 1);
    if (debug) console.log('Done initializing the runtime.');
    WebAssemblyApp.init();
  },
  
  call_method(method, this_arg, args) {
    const args_mem = Module._malloc(args.length * 4);
    const eh_throw = Module._malloc(4);
    for (let ii = 0; ii < args.length; ++ii) {
      Module.setValue(args_mem + ii * 4, args [ii], "i32");
    }

    Module.setValue(eh_throw, 0, "i32");

    var res = this.invoke_method()(method, this_arg, args_mem, eh_throw);

    var eh_res = Module.getValue(eh_throw, "i32");

    Module._free(args_mem);
    Module._free(eh_throw);

    if (eh_res !== 0) {
      const msg = this.conv_string(res);
      throw new Error(msg);
    }

    return res;
  },

  conv_string(mono_obj) {
    if (mono_obj === 0) {
      return null;
    }

    const raw = this.mono_string_get_utf8()(mono_obj);
    const res = Module.UTF8ToString(raw);
    Module._free(raw);

    return res;
  },
};

const WebAssemblyApp = {
  init() {
    this.findMethods();
    MonoRuntime.call_method(this.main_method, null, []);
  },
  
  findMethods() {
    this.main_module = MonoRuntime.assembly_load()(Module.entryPoint.assemblyName);
    if (!this.main_module) {
      throw new Error('Could not find Main Module ' + Module.entryPoint.assemblyName + '.dll.');
    }

    this.main_class = MonoRuntime.find_class()(this.main_module, Module.entryPoint.nsName, Module.entryPoint.className);
    if (!this.main_class) {
      throw new Error(`Could not find ${Module.entryPoint.className} class in main module.`);
    }

    this.main_method = MonoRuntime.find_method()(this.main_class, Module.entryPoint.mainMethodName, -1);
    if (!this.main_method) {
      throw new Error('Could not find Main method.');
    }
  },
};

/* End Ooui.js-derived section. */

const initializeMonoEnvironment = () => new Promise((resolve, reject) => {
  var moduleOverrides = {};
  var key;
  for (key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key]
    }
  }
  Module["arguments"] = [];
  Module["thisProgram"] = "./this.program";
  Module["quit"] = (function(status, toThrow) {
    err.code = status;
    return reject(err);
  });

  Module["preRun"] = [];
  Module["postRun"] = [];

  if (Module["ENVIRONMENT"]) {
    if (Module["ENVIRONMENT"] === "WEB") {
      ENVIRONMENT_IS_WEB = true;
    } else if (Module["ENVIRONMENT"] === "WORKER") {
      ENVIRONMENT_IS_WORKER = true;
    } else if (Module["ENVIRONMENT"] === "NODE") {
      ENVIRONMENT_IS_NODE = true;
    } else if (Module["ENVIRONMENT"] === "SHELL") {
      ENVIRONMENT_IS_SHELL = true;
    } else {
      return reject(new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL."));
    }
  }

  if (ENVIRONMENT_IS_NODE) {
    var nodeFS;
    var nodePath;
    Module["read"] = function shell_read(filename, binary) {
      var ret;
      if (!nodeFS) nodeFS = require("fs");
      if (!nodePath) nodePath = require("path");
      filename = nodePath["normalize"](filename);
      ret = nodeFS["readFileSync"](filename);
      return binary ? ret : ret.toString()
    };
    Module["readBinary"] = function readBinary(filename) {
      var ret = Module["read"](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret)
      }

      assert(ret.buffer);
      return ret;
    };

    if (process["argv"].length > 1) {
      Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
    }

    Module["arguments"] = process["argv"].slice(2);
    Module["inspect"] = (function() {
      return "[Emscripten Module object]";
    });
  } else if (ENVIRONMENT_IS_SHELL) {
    if (typeof read != "undefined") {
      Module["read"] = function shell_read(f) {
        return read(f);
      }
    }

    Module["readBinary"] = function readBinary(f) {
      var data;
      if (typeof readbuffer === "function") {
        return new Uint8Array(readbuffer(f));
      }

      data = read(f, "binary");
      assert(typeof data === "object");
      return data;
    };

    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }

    if (typeof quit === "function") {
      Module["quit"] = (function(status, toThrow) {
        quit(status, toThrow);
      });
    }
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function shell_read(url) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText
    };

    if (ENVIRONMENT_IS_WORKER) {
      Module["readBinary"] = function readBinary(url) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response)
      }
    }

    Module["readAsync"] = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          onload(xhr.response);
          return;
        }

        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null)
    };
    if (typeof arguments != "undefined") {
      Module["arguments"] = arguments
    }
    Module["setWindowTitle"] = (function(title) {
      document.title = title
    })
  }
  Module["print"] = typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null;
  Module["printErr"] = typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || Module["print"];
  Module.print = Module["print"];
  Module.printErr = Module["printErr"];
  for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key]
    }
  }
  moduleOverrides = undefined;
  var STACK_ALIGN = 16;

  function staticAlloc(size) {
    assert(!staticSealed);
    var ret = STATICTOP;
    STATICTOP = STATICTOP + size + 15 & -16;
    return ret
  }

  function dynamicAlloc(size) {
    assert(DYNAMICTOP_PTR);
    var ret = HEAP32[DYNAMICTOP_PTR >> 2];
    var end = ret + size + 15 & -16;
    HEAP32[DYNAMICTOP_PTR >> 2] = end;
    if (end >= TOTAL_MEMORY) {
      var success = enlargeMemory();
      if (!success) {
        HEAP32[DYNAMICTOP_PTR >> 2] = ret;
        return 0
      }
    }
    return ret
  }

  function alignMemory(size, factor) {
    if (!factor) factor = STACK_ALIGN;
    var ret = size = Math.ceil(size / factor) * factor;
    return ret
  }

  function getNativeTypeSize(type) {
    switch (type) {
      case "i1":
      case "i8":
        return 1;
      case "i16":
        return 2;
      case "i32":
        return 4;
      case "i64":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      default: {
        if (type[type.length - 1] === "*") {
          return 4
        } else if (type[0] === "i") {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits / 8
        } else {
          return 0
        }
      }
    }
  }
  var functionPointers = new Array(0);
  var GLOBAL_BASE = 1024;
  var ABORT = 0;
  var EXITSTATUS = 0;

  function assert(condition, text) {
    if (!condition) {
      abort("Assertion failed: " + text)
    }
  }

  function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
    return func
  }
  var JSfuncs = {
    "stackSave": (function() {
      stackSave()
    }),
    "stackRestore": (function() {
      stackRestore()
    }),
    "arrayToC": (function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret
    }),
    "stringToC": (function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len)
      }
      return ret
    })
  };
  var toC = {
    "string": JSfuncs["stringToC"],
    "array": JSfuncs["arrayToC"]
  };

  function ccall(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = stackSave();
          cArgs[i] = converter(args[i])
        } else {
          cArgs[i] = args[i]
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === "string") ret = Pointer_stringify(ret);
    if (stack !== 0) {
      stackRestore(stack)
    }
    return ret
  }

  function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    var numericArgs = argTypes.every((function(type) {
      return type === "number"
    }));
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs) {
      return cfunc
    }
    return (function() {
      return ccall(ident, returnType, argTypes, arguments)
    })
  }

  function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
      case "i1":
        HEAP8[ptr >> 0] = value;
        break;
      case "i8":
        HEAP8[ptr >> 0] = value;
        break;
      case "i16":
        HEAP16[ptr >> 1] = value;
        break;
      case "i32":
        HEAP32[ptr >> 2] = value;
        break;
      case "i64":
        tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
        break;
      case "float":
        HEAPF32[ptr >> 2] = value;
        break;
      case "double":
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort("invalid type for setValue: " + type)
    }
  }

  function getValue(ptr, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
      case "i1":
        return HEAP8[ptr >> 0];
      case "i8":
        return HEAP8[ptr >> 0];
      case "i16":
        return HEAP16[ptr >> 1];
      case "i32":
        return HEAP32[ptr >> 2];
      case "i64":
        return HEAP32[ptr >> 2];
      case "float":
        return HEAPF32[ptr >> 2];
      case "double":
        return HEAPF64[ptr >> 3];
      default:
        abort("invalid type for getValue: " + type)
    }
    return null
  }
  var ALLOC_NORMAL = 0;
  var ALLOC_STATIC = 2;
  var ALLOC_NONE = 4;

  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
      zeroinit = true;
      size = slab
    } else {
      zeroinit = false;
      size = slab.length
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr
    } else {
      ret = [typeof _malloc === "function" ? _malloc : staticAlloc, stackAlloc, staticAlloc, dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
    }
    if (zeroinit) {
      var stop;
      ptr = ret;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0
      }
      return ret
    }
    if (singleType === "i8") {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret)
      } else {
        HEAPU8.set(new Uint8Array(slab), ret)
      }
      return ret
    }
    var i = 0,
      type, typeSize, previousType;
    while (i < size) {
      var curr = slab[i];
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue
      }
      if (type == "i64") type = "i32";
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = getNativeTypeSize(type);
        previousType = type
      }
      i += typeSize
    }
    return ret
  }

  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      t = HEAPU8[ptr + i >> 0];
      hasUtf |= t;
      if (t == 0 && !length) break;
      i++;
      if (length && i == length) break
    }
    if (!length) length = i;
    var ret = "";
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK
      }
      return ret
    }
    return UTF8ToString(ptr)
  }
  var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

  function UTF8ArrayToString(u8Array, idx) {
    var endPtr = idx;
    while (u8Array[endPtr]) ++endPtr;
    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
      return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
    } else {
      var u0, u1, u2, u3, u4, u5;
      var str = "";
      while (1) {
        u0 = u8Array[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2
        } else {
          u3 = u8Array[idx++] & 63;
          if ((u0 & 248) == 240) {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
          } else {
            u4 = u8Array[idx++] & 63;
            if ((u0 & 252) == 248) {
              u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
            } else {
              u5 = u8Array[idx++] & 63;
              u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
            }
          }
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0)
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        }
      }
    }
  }

  function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr)
  }

  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | u >> 6;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | u >> 12;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | u >> 18;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | u >> 24;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | u >> 30;
        outU8Array[outIdx++] = 128 | u >> 24 & 63;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx
  }

  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
  }

  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
      if (u <= 127) {
        ++len
      } else if (u <= 2047) {
        len += 2
      } else if (u <= 65535) {
        len += 3
      } else if (u <= 2097151) {
        len += 4
      } else if (u <= 67108863) {
        len += 5
      } else {
        len += 6
      }
    }
    return len
  }
  var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

  function stringToUTF16(str, outPtr, maxBytesToWrite) {
    if (maxBytesToWrite === undefined) {
      maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
      var codeUnit = str.charCodeAt(i);
      HEAP16[outPtr >> 1] = codeUnit;
      outPtr += 2
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr
  }

  function allocateUTF8(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = _malloc(size);
    if (ret) stringToUTF8Array(str, HEAP8, ret, size);
    return ret
  }

  function demangle(func) {
    return func
  }

  function demangleAll(text) {
    var regex = /__Z[\w\d_]+/g;
    return text.replace(regex, (function(x) {
      var y = demangle(x);
      return x === y ? x : x + " [" + y + "]"
    }))
  }

  function jsStackTrace() {
    var err = new Error;
    if (!err.stack) {
      try {
        throw new Error(0)
      } catch (e) {
        err = e
      }
      if (!err.stack) {
        return "(no stack trace available)"
      }
    }
    return err.stack.toString()
  }

  function stackTrace() {
    var js = jsStackTrace();
    if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
    return demangleAll(js)
  }
  var PAGE_SIZE = 16384;
  var WASM_PAGE_SIZE = 65536;
  var ASMJS_PAGE_SIZE = 16777216;
  var MIN_TOTAL_MEMORY = 16777216;

  function alignUp(x, multiple) {
    if (x % multiple > 0) {
      x += multiple - x % multiple
    }
    return x
  }
  var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

  function updateGlobalBuffer(buf) {
    Module["buffer"] = buffer = buf
  }

  function updateGlobalBufferViews() {
    Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
    Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
    Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer)
  }
  var STATIC_BASE, STATICTOP, staticSealed;
  var STACK_BASE, STACKTOP, STACK_MAX;
  var DYNAMIC_BASE, DYNAMICTOP_PTR;
  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;

  function abortOnCannotGrowMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")
  }
  if (!Module["reallocBuffer"]) Module["reallocBuffer"] = (function(size) {
    var ret;
    try {
      if (ArrayBuffer.transfer) {
        ret = ArrayBuffer.transfer(buffer, size)
      } else {
        var oldHEAP8 = HEAP8;
        ret = new ArrayBuffer(size);
        var temp = new Int8Array(ret);
        temp.set(oldHEAP8)
      }
    } catch (e) {
      return false
    }
    var success = _emscripten_replace_memory(ret);
    if (!success) return false;
    return ret
  });

  function enlargeMemory() {
    var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
    var LIMIT = 2147483648 - PAGE_MULTIPLE;
    if (HEAP32[DYNAMICTOP_PTR >> 2] > LIMIT) {
      return false
    }
    var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
    TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY);
    while (TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR >> 2]) {
      if (TOTAL_MEMORY <= 536870912) {
        TOTAL_MEMORY = alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE)
      } else {
        TOTAL_MEMORY = Math.min(alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE), LIMIT)
      }
    }
    var replacement = Module["reallocBuffer"](TOTAL_MEMORY);
    if (!replacement || replacement.byteLength != TOTAL_MEMORY) {
      TOTAL_MEMORY = OLD_TOTAL_MEMORY;
      return false
    }
    updateGlobalBuffer(replacement);
    updateGlobalBufferViews();
    return true
  }
  var byteLength;
  try {
    byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get);
    byteLength(new ArrayBuffer(4))
  } catch (e) {
    byteLength = (function(buffer) {
      return buffer.byteLength
    })
  }
  var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
  var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 134217728;
  if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
  if (Module["buffer"]) {
    buffer = Module["buffer"]
  } else {
    if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
      Module["wasmMemory"] = new WebAssembly.Memory({
        "initial": TOTAL_MEMORY / WASM_PAGE_SIZE
      });
      buffer = Module["wasmMemory"].buffer
    } else {
      buffer = new ArrayBuffer(TOTAL_MEMORY)
    }
    Module["buffer"] = buffer
  }
  updateGlobalBufferViews();

  function getTotalMemory() {
    return TOTAL_MEMORY
  }
  HEAP32[0] = 1668509029;
  HEAP16[1] = 25459;
  if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";

  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == "function") {
        callback();
        continue
      }
      var func = callback.func;
      if (typeof func === "number") {
        if (callback.arg === undefined) {
          Module["dynCall_v"](func)
        } else {
          Module["dynCall_vi"](func, callback.arg)
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg)
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;

  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift())
      }
    }
    callRuntimeCallbacks(__ATPRERUN__)
  }

  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
  }

  function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
  }

  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true
  }

  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift())
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
  }

  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
  }

  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
  }

  function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer)
  }

  function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
      HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0
  }
  var Math_abs = Math.abs;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_min = Math.min;
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null;

  function getUniqueRunDependency(id) {
    return id;
  }

  function addRunDependency() {
    runDependencies += 1;
    if (typeof Module.monitorRunDependencies === 'function') {
      Module.monitorRunDependencies(runDependencies);
    }
  }

  function removeRunDependency() {
    runDependencies -= 1;
    if (typeof Module.monitorRunDependencies === 'function') {
      Module.monitorRunDependencies(runDependencies);
    }

    if (runDependencies === 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }

      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }

  Module.preloadedImages = {};
  Module.preloadedAudios = {};

  const dataURIPrefix = 'data:application/octet-stream;base64,';
  function isDataURI(filename) {
    return filename.indexOf(dataURIPrefix) === 0;;
  }

  function integrateWasmJS() {
    var wasmBinaryFile = 'mono.wasm';
    var wasmTextFile = 'mono.wast';
    var asmjsCodeFile = 'mono.temp.asm.js';
    if (ENVIRONMENT_IS_NODE) {
      const path = require('path');
      wasmBinaryFile = path.join(__dirname, 'mono.wasm');
      wasmTextFile = path.join(__dirname, 'mono.wast');
      asmjsCodeFile = path.join(__dirname, 'mono.temp.asm.js');
    }

    if (typeof Module.locateFile === 'function') {
      if (!isDataURI(wasmTextFile)) {
        wasmTextFile = Module.locateFile(wasmTextFile);
      }

      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = Module.locateFile(wasmBinaryFile);
      }

      if (!isDataURI(asmjsCodeFile)) {
        asmjsCodeFile = Module.locateFile(asmjsCodeFile);
      }
    }

    const wasmPageSize = 64 * 1024;
    const info = {
      env: null,
      global: null,
      asm2wasm: {
        debugger: function() {
          debugger
        },

        "f64-rem": function(x, y) {
          return x % y;
        },
      },

      parent: Module,
    };

    let exports = null;

    function mergeMemory(newBuffer) {
      const oldBuffer = Module.buffer;
      if (newBuffer.byteLength < oldBuffer.byteLength) {
        Module.printErr('The new buffer in mergeMemory is smaller than the ' +
          'previous one. In native wasm, we should grow memory here.');
      }

      const oldView = new Int8Array(oldBuffer);
      const newView = new Int8Array(newBuffer);
      newView.set(oldView);
      updateGlobalBuffer(newBuffer);
      updateGlobalBufferViews();
    }

    function fixImports(imports) {
      return imports;
    }

    function getBinary() {
      try {
        if (Module.wasmBinary) {
          return new Uint8Array(Module.wasmBinary);
        } else if (Module.readBinary) {
          return Module.readBinary(wasmBinaryFile);
        } else {
          throw new Error(
            'On the web, we need the wasm binary to be preloaded and set on ' +
              'Module[\'wasmBinary\']. emcc.py will do that for you when ' +
              'generating HTML (but not JS).'
          );
        }
      } catch (err) {
        abort(err);
      }
    }

    function getBinaryPromise() {
      if (!Module.wasmBinary &&
        (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
        return fetch(wasmBinaryFile, {
          credentials: 'same-origin',
        }).then((function(response) {
          if (!response.ok) {
            throw new Error('Failed to load wasm binary file at "' + wasmBinaryFile + '".');
          }

          return response.arrayBuffer();
        })).catch((function() {
          return getBinary();
        }))
      }

      return new Promise((function(resolve) {
        resolve(getBinary());
      }));
    }

    function doNativeWasm(global, env) {
      if (typeof WebAssembly !== "object") {
        Module.printErr('No native WASM support detected.');
        return false;
      } else if (!(Module.wasmMemory instanceof WebAssembly.Memory)) {
        Module.printErr('No native WASM Memory in use.');
        return false
      }

      env.memory = Module.wasmMemory;

      info.global = {
        Infinity,
        NaN,
      };

      info['global.Math'] = Math;
      info.env = env;

      function receiveInstance(instance, module) {
        exports = instance.exports;
        if (exports.memory) mergeMemory(exports.memory);
        Module.asm = exports;
        Module.usingWasm = true;
        removeRunDependency();
      }

      addRunDependency();
      if (Module["instantiateWasm"]) {
        try {
          return Module["instantiateWasm"](info, receiveInstance)
        } catch (e) {
          Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
          return false
        }
      }

      function receiveInstantiatedSource(output) {
        receiveInstance(output["instance"], output["module"])
      }

      function instantiateArrayBuffer(receiver) {
        getBinaryPromise().then((function(binary) {
          return WebAssembly.instantiate(binary, info)
        })).then(receiver).catch((function(reason) {
          Module["printErr"]("failed to asynchronously prepare wasm: " + reason);
          abort(reason)
        }))
      }
      if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
        WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
          credentials: "same-origin"
        }), info).then(receiveInstantiatedSource).catch((function(reason) {
          Module["printErr"]("wasm streaming compile failed: " + reason);
          Module["printErr"]("falling back to ArrayBuffer instantiation");
          instantiateArrayBuffer(receiveInstantiatedSource)
        }))
      } else {
        instantiateArrayBuffer(receiveInstantiatedSource)
      }
      return {}
    }
    Module["asmPreload"] = Module["asm"];
    var asmjsReallocBuffer = Module["reallocBuffer"];
    var wasmReallocBuffer = (function(size) {
      var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
      size = alignUp(size, PAGE_MULTIPLE);
      var old = Module["buffer"];
      var oldSize = old.byteLength;
      if (Module["usingWasm"]) {
        try {
          var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
          if (result !== (-1 | 0)) {
            return Module["buffer"] = Module["wasmMemory"].buffer
          } else {
            return null
          }
        } catch (e) {
          return null
        }
      }
    });
    Module["reallocBuffer"] = (function(size) {
      if (finalMethod === "asmjs") {
        return asmjsReallocBuffer(size)
      } else {
        return wasmReallocBuffer(size)
      }
    });
    var finalMethod = "";
    Module["asm"] = (function(global, env, providedBuffer) {
      env = fixImports(env);
      if (!env["table"]) {
        var TABLE_SIZE = Module["wasmTableSize"];
        if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
        var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
        if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
          if (MAX_TABLE_SIZE !== undefined) {
            env["table"] = new WebAssembly.Table({
              "initial": TABLE_SIZE,
              "maximum": MAX_TABLE_SIZE,
              "element": "anyfunc"
            })
          } else {
            env["table"] = new WebAssembly.Table({
              "initial": TABLE_SIZE,
              element: "anyfunc"
            })
          }
        } else {
          env["table"] = new Array(TABLE_SIZE)
        }
        Module["wasmTable"] = env["table"]
      }
      if (!env["memoryBase"]) {
        env["memoryBase"] = Module["STATIC_BASE"]
      }
      if (!env["tableBase"]) {
        env["tableBase"] = 0
      }
      var exports;
      exports = doNativeWasm(global, env, providedBuffer);
      if (!exports) abort("no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods");
      return exports
    })
  }
  integrateWasmJS();
  var ASM_CONSTS = [(function($0, $1) {
    var str = UTF8ToString($0);
    try {
      var res = eval(str);
      if (res === null) return 0;
      res = res.toString();
      setValue($1, 0, "i32")
    } catch (e) {
      res = e.toString();
      setValue($1, 1, "i32");
      if (res === null) res = "unknown exception"
    }
    var buff = Module._malloc((res.length + 1) * 2);
    stringToUTF16(res, buff, (res.length + 1) * 2);
    return buff
  }), (function() {
    return STACK_BASE
  }), (function() {
    return TOTAL_STACK
  })];

  function _emscripten_asm_const_i(code) {
    return ASM_CONSTS[code]()
  }

  function _emscripten_asm_const_iii(code, a0, a1) {
    return ASM_CONSTS[code](a0, a1)
  }
  STATIC_BASE = GLOBAL_BASE;
  STATICTOP = STATIC_BASE + 635680;
  __ATINIT__.push();
  var STATIC_BUMP = 635680;
  Module["STATIC_BASE"] = STATIC_BASE;
  Module["STATIC_BUMP"] = STATIC_BUMP;
  STATICTOP += 16;

  function _emscripten_get_now() {
    abort()
  }

  function _emscripten_get_now_is_monotonic() {
    return ENVIRONMENT_IS_NODE || typeof dateNow !== "undefined" || (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]
  }
  var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
  };

  function ___setErrNo(value) {
    if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
    return value
  }

  function _clock_gettime(clk_id, tp) {
    var now;
    if (clk_id === 0) {
      now = Date.now()
    } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
      now = _emscripten_get_now()
    } else {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    HEAP32[tp >> 2] = now / 1e3 | 0;
    HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
    return 0
  }

  function ___clock_gettime() {
    return _clock_gettime.apply(null, arguments)
  }

  function ___lock() {}
  var ERRNO_MESSAGES = {
    0: "Success",
    1: "Not super-user",
    2: "No such file or directory",
    3: "No such process",
    4: "Interrupted system call",
    5: "I/O error",
    6: "No such device or address",
    7: "Arg list too long",
    8: "Exec format error",
    9: "Bad file number",
    10: "No children",
    11: "No more processes",
    12: "Not enough core",
    13: "Permission denied",
    14: "Bad address",
    15: "Block device required",
    16: "Mount device busy",
    17: "File exists",
    18: "Cross-device link",
    19: "No such device",
    20: "Not a directory",
    21: "Is a directory",
    22: "Invalid argument",
    23: "Too many open files in system",
    24: "Too many open files",
    25: "Not a typewriter",
    26: "Text file busy",
    27: "File too large",
    28: "No space left on device",
    29: "Illegal seek",
    30: "Read only file system",
    31: "Too many links",
    32: "Broken pipe",
    33: "Math arg out of domain of func",
    34: "Math result not representable",
    35: "File locking deadlock error",
    36: "File or path name too long",
    37: "No record locks available",
    38: "Function not implemented",
    39: "Directory not empty",
    40: "Too many symbolic links",
    42: "No message of desired type",
    43: "Identifier removed",
    44: "Channel number out of range",
    45: "Level 2 not synchronized",
    46: "Level 3 halted",
    47: "Level 3 reset",
    48: "Link number out of range",
    49: "Protocol driver not attached",
    50: "No CSI structure available",
    51: "Level 2 halted",
    52: "Invalid exchange",
    53: "Invalid request descriptor",
    54: "Exchange full",
    55: "No anode",
    56: "Invalid request code",
    57: "Invalid slot",
    59: "Bad font file fmt",
    60: "Device not a stream",
    61: "No data (for no delay io)",
    62: "Timer expired",
    63: "Out of streams resources",
    64: "Machine is not on the network",
    65: "Package not installed",
    66: "The object is remote",
    67: "The link has been severed",
    68: "Advertise error",
    69: "Srmount error",
    70: "Communication error on send",
    71: "Protocol error",
    72: "Multihop attempted",
    73: "Cross mount point (not really error)",
    74: "Trying to read unreadable message",
    75: "Value too large for defined data type",
    76: "Given log. name not unique",
    77: "f.d. invalid for this operation",
    78: "Remote address changed",
    79: "Can   access a needed shared lib",
    80: "Accessing a corrupted shared lib",
    81: ".lib section in a.out corrupted",
    82: "Attempting to link in too many libs",
    83: "Attempting to exec a shared library",
    84: "Illegal byte sequence",
    86: "Streams pipe error",
    87: "Too many users",
    88: "Socket operation on non-socket",
    89: "Destination address required",
    90: "Message too long",
    91: "Protocol wrong type for socket",
    92: "Protocol not available",
    93: "Unknown protocol",
    94: "Socket type not supported",
    95: "Not supported",
    96: "Protocol family not supported",
    97: "Address family not supported by protocol family",
    98: "Address already in use",
    99: "Address not available",
    100: "Network interface is not configured",
    101: "Network is unreachable",
    102: "Connection reset by network",
    103: "Connection aborted",
    104: "Connection reset by peer",
    105: "No buffer space available",
    106: "Socket is already connected",
    107: "Socket is not connected",
    108: "Can't send after socket shutdown",
    109: "Too many references",
    110: "Connection timed out",
    111: "Connection refused",
    112: "Host is down",
    113: "Host is unreachable",
    114: "Socket already connected",
    115: "Connection already in progress",
    116: "Stale file handle",
    122: "Quota exceeded",
    123: "No medium (in tape drive)",
    125: "Operation canceled",
    130: "Previous owner died",
    131: "State not recoverable"
  };
  var PATH = {
    splitPath: (function(filename) {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1)
    }),
    normalizeArray: (function(parts, allowAboveRoot) {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1)
        } else if (last === "..") {
          parts.splice(i, 1);
          up++
        } else if (up) {
          parts.splice(i, 1);
          up--
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts.unshift("..")
        }
      }
      return parts
    }),
    normalize: (function(path) {
      var isAbsolute = path.charAt(0) === "/",
        trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((function(p) {
        return !!p
      })), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = "."
      }
      if (path && trailingSlash) {
        path += "/"
      }
      return (isAbsolute ? "/" : "") + path
    }),
    dirname: (function(path) {
      var result = PATH.splitPath(path),
        root = result[0],
        dir = result[1];
      if (!root && !dir) {
        return "."
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1)
      }
      return root + dir
    }),
    basename: (function(path) {
      if (path === "/") return "/";
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1) return path;
      return path.substr(lastSlash + 1)
    }),
    extname: (function(path) {
      return PATH.splitPath(path)[3]
    }),

    join: (function() {
      var paths = Array.prototype.slice.call(arguments, 0);
      return PATH.normalize(paths.join("/"))
    }),

    join2: (function(l, r) {
      return PATH.normalize(l + '/' + r)
    }),

    resolve: (function() {
      var resolvedPath = "",
        resolvedAbsolute = false;
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : FS.cwd();
        if (typeof path !== "string") {
          throw new TypeError("Arguments to path.resolve must be strings")
        } else if (!path) {
          return ""
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = path.charAt(0) === "/"
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
        return !!p
      })), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    }),
    relative: (function(from, to) {
      from = PATH.resolve(from).substr(1);
      to = PATH.resolve(to).substr(1);

      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1)
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push("..")
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/")
    })
  };
  var TTY = {
    ttys: [],
    init: (function() {}),
    shutdown: (function() {}),
    register: (function(dev, ops) {
      TTY.ttys[dev] = {
        input: [],
        output: [],
        ops: ops
      };
      FS.registerDevice(dev, TTY.stream_ops)
    }),
    stream_ops: {
      open: (function(stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        stream.tty = tty;
        stream.seekable = false
      }),
      close: (function(stream) {
        stream.tty.ops.flush(stream.tty)
      }),
      flush: (function(stream) {
        stream.tty.ops.flush(stream.tty)
      }),
      read: (function(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.get_char) {
          throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
        }
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty)
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now()
        }
        return bytesRead
      }),
      write: (function(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) {
          throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
        }
        for (var i = 0; i < length; i++) {
          try {
            stream.tty.ops.put_char(stream.tty, buffer[offset + i])
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
        }
        if (length) {
          stream.node.timestamp = Date.now()
        }
        return i
      })
    },
    default_tty_ops: {
      get_char: (function(tty) {
        if (!tty.input.length) {
          var result = null;
          if (ENVIRONMENT_IS_NODE) {
            var BUFSIZE = 256;
            var buf = new Buffer(BUFSIZE);
            var bytesRead = 0;
            var isPosixPlatform = process.platform != "win32";
            var fd = process.stdin.fd;
            if (isPosixPlatform) {
              var usingDevice = false;
              try {
                fd = fs.openSync("/dev/stdin", "r");
                usingDevice = true
              } catch (e) {}
            }
            try {
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null)
            } catch (e) {
              if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
              else throw e
            }
            if (usingDevice) {
              fs.closeSync(fd)
            }
            if (bytesRead > 0) {
              result = buf.slice(0, bytesRead).toString("utf-8")
            } else {
              result = null
            }
          } else if (typeof window != "undefined" && typeof window.prompt == "function") {
            result = window.prompt("Input: ");
            if (result !== null) {
              result += "\n"
            }
          } else if (typeof readline == "function") {
            result = readline();
            if (result !== null) {
              result += "\n"
            }
          }
          if (!result) {
            return null
          }
          tty.input = intArrayFromString(result, true)
        }
        return tty.input.shift()
      }),
      put_char: (function(tty, val) {
        if (val === null || val === 10) {
          Module["print"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        } else {
          if (val != 0) tty.output.push(val)
        }
      }),
      flush: (function(tty) {
        if (tty.output && tty.output.length > 0) {
          Module["print"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        }
      })
    },
    default_tty1_ops: {
      put_char: (function(tty, val) {
        if (val === null || val === 10) {
          Module["printErr"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        } else {
          if (val != 0) tty.output.push(val)
        }
      }),
      flush: (function(tty) {
        if (tty.output && tty.output.length > 0) {
          Module["printErr"](UTF8ArrayToString(tty.output, 0));
          tty.output = []
        }
      })
    }
  };
  var MEMFS = {
    ops_table: null,
    mount: (function(mount) {
      return MEMFS.createNode(null, "/", 16384 | 511, 0)
    }),
    createNode: (function(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (!MEMFS.ops_table) {
        MEMFS.ops_table = {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        }
      }
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {}
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream
      }
      node.timestamp = Date.now();
      if (parent) {
        parent.contents[name] = node
      }
      return node
    }),
    getFileDataAsRegularArray: (function(node) {
      if (node.contents && node.contents.subarray) {
        var arr = [];
        for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
        return arr
      }
      return node.contents
    }),
    getFileDataAsTypedArray: (function(node) {
      if (!node.contents) return new Uint8Array;
      if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents)
    }),
    expandFileStorage: (function(node, newCapacity) {
      if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
        node.contents = MEMFS.getFileDataAsRegularArray(node);
        node.usedBytes = node.contents.length
      }
      if (!node.contents || node.contents.subarray) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
        return
      }
      if (!node.contents && newCapacity > 0) node.contents = [];
      while (node.contents.length < newCapacity) node.contents.push(0)
    }),
    resizeFileStorage: (function(node, newSize) {
      if (node.usedBytes == newSize) return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
        return
      }
      if (!node.contents || node.contents.subarray) {
        var oldContents = node.contents;
        node.contents = new Uint8Array(new ArrayBuffer(newSize));
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
        }
        node.usedBytes = newSize;
        return
      }
      if (!node.contents) node.contents = [];
      if (node.contents.length > newSize) node.contents.length = newSize;
      else
        while (node.contents.length < newSize) node.contents.push(0);
      node.usedBytes = newSize
    }),
    node_ops: {
      getattr: (function(node) {
        var attr = {};
        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
        attr.ino = node.id;
        attr.mode = node.mode;
        attr.nlink = 1;
        attr.uid = 0;
        attr.gid = 0;
        attr.rdev = node.rdev;
        if (FS.isDir(node.mode)) {
          attr.size = 4096
        } else if (FS.isFile(node.mode)) {
          attr.size = node.usedBytes
        } else if (FS.isLink(node.mode)) {
          attr.size = node.link.length
        } else {
          attr.size = 0
        }
        attr.atime = new Date(node.timestamp);
        attr.mtime = new Date(node.timestamp);
        attr.ctime = new Date(node.timestamp);
        attr.blksize = 4096;
        attr.blocks = Math.ceil(attr.size / attr.blksize);
        return attr
      }),
      setattr: (function(node, attr) {
        if (attr.mode !== undefined) {
          node.mode = attr.mode
        }
        if (attr.timestamp !== undefined) {
          node.timestamp = attr.timestamp
        }
        if (attr.size !== undefined) {
          MEMFS.resizeFileStorage(node, attr.size)
        }
      }),
      lookup: (function(parent, name) {
        throw FS.genericErrors[ERRNO_CODES.ENOENT]
      }),
      mknod: (function(parent, name, mode, dev) {
        return MEMFS.createNode(parent, name, mode, dev)
      }),
      rename: (function(old_node, new_dir, new_name) {
        if (FS.isDir(old_node.mode)) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name)
          } catch (e) {}
          if (new_node) {
            for (var i in new_node.contents) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
            }
          }
        }

        delete old_node.parent.contents[old_node.name];
        old_node.name = new_name;
        new_dir.contents[new_name] = old_node;
        old_node.parent = new_dir
      }),

      unlink: (function(parent, name) {
        delete parent.contents[name]
      }),

      rmdir: (function(parent, name) {
        var node = FS.lookupNode(parent, name);
        for (var i in node.contents) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
        }
        delete parent.contents[name]
      }),
      readdir: (function(node) {
        var entries = [".", ".."];
        for (var key in node.contents) {
          if (!node.contents.hasOwnProperty(key)) {
            continue
          }
          entries.push(key)
        }
        return entries
      }),
      symlink: (function(parent, newname, oldpath) {
        var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
        node.link = oldpath;
        return node
      }),
      readlink: (function(node) {
        if (!FS.isLink(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return node.link
      })
    },
    stream_ops: {
      read: (function(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= stream.node.usedBytes) return 0;
        var size = Math.min(stream.node.usedBytes - position, length);
        assert(size >= 0);
        if (size > 8 && contents.subarray) {
          buffer.set(contents.subarray(position, position + size), offset)
        } else {
          for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
        }
        return size
      }),
      write: (function(stream, buffer, offset, length, position, canOwn) {
        if (!length) return 0;
        var node = stream.node;
        node.timestamp = Date.now();
        if (buffer.subarray && (!node.contents || node.contents.subarray)) {
          if (canOwn) {
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
            return length
          } else if (node.usedBytes === 0 && position === 0) {
            node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
            node.usedBytes = length;
            return length
          } else if (position + length <= node.usedBytes) {
            node.contents.set(buffer.subarray(offset, offset + length), position);
            return length
          }
        }
        MEMFS.expandFileStorage(node, position + length);
        if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
        else {
          for (var i = 0; i < length; i++) {
            node.contents[position + i] = buffer[offset + i]
          }
        }
        node.usedBytes = Math.max(node.usedBytes, position + length);
        return length
      }),
      llseek: (function(stream, offset, whence) {
        var position = offset;
        if (whence === 1) {
          position += stream.position
        } else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) {
            position += stream.node.usedBytes
          }
        }
        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return position
      }),
      allocate: (function(stream, offset, length) {
        MEMFS.expandFileStorage(stream.node, offset + length);
        stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
      }),
      mmap: (function(stream, buffer, offset, length, position, prot, flags) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        var ptr;
        var allocated;
        var contents = stream.node.contents;
        if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
          allocated = false;
          ptr = contents.byteOffset
        } else {
          if (position > 0 || position + length < stream.node.usedBytes) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length)
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length)
            }
          }
          allocated = true;
          ptr = _malloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
          }
          buffer.set(contents, ptr)
        }
        return {
          ptr: ptr,
          allocated: allocated
        }
      }),
      msync: (function(stream, buffer, offset, length, mmapFlags) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        if (mmapFlags & 2) {
          return 0
        }
        var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
        return 0
      })
    }
  };
  var IDBFS = {
    dbs: {},
    indexedDB: (function() {
      if (typeof indexedDB !== "undefined") return indexedDB;
      var ret = null;
      if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      assert(ret, "IDBFS used, but indexedDB not supported");
      return ret
    }),
    DB_VERSION: 21,
    DB_STORE_NAME: "FILE_DATA",
    mount: (function(mount) {
      return MEMFS.mount.apply(null, arguments)
    }),
    syncfs: (function(mount, populate, callback) {
      IDBFS.getLocalSet(mount, (function(err, local) {
        if (err) return callback(err);
        IDBFS.getRemoteSet(mount, (function(err, remote) {
          if (err) return callback(err);
          var src = populate ? remote : local;
          var dst = populate ? local : remote;
          IDBFS.reconcile(src, dst, callback)
        }))
      }))
    }),
    getDB: (function(name, callback) {
      var db = IDBFS.dbs[name];
      if (db) {
        return callback(null, db)
      }
      var req;
      try {
        req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
      } catch (e) {
        return callback(e)
      }
      if (!req) {
        return callback("Unable to connect to IndexedDB")
      }
      req.onupgradeneeded = (function(e) {
        var db = e.target.result;
        var transaction = e.target.transaction;
        var fileStore;
        if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
          fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
        } else {
          fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
        }
        if (!fileStore.indexNames.contains("timestamp")) {
          fileStore.createIndex("timestamp", "timestamp", {
            unique: false
          })
        }
      });
      req.onsuccess = (function() {
        db = req.result;
        IDBFS.dbs[name] = db;
        callback(null, db)
      });
      req.onerror = (function(e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    getLocalSet: (function(mount, callback) {
      var entries = {};

      function isRealDir(p) {
        return p !== "." && p !== ".."
      }

      function toAbsolute(root) {
        return (function(p) {
          return PATH.join2(root, p)
        })
      }
      var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
      while (check.length) {
        var path = check.pop();
        var stat;
        try {
          stat = FS.stat(path)
        } catch (e) {
          return callback(e)
        }
        if (FS.isDir(stat.mode)) {
          check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
        }
        entries[path] = {
          timestamp: stat.mtime
        }
      }
      return callback(null, {
        type: "local",
        entries: entries
      })
    }),
    getRemoteSet: (function(mount, callback) {
      var entries = {};
      IDBFS.getDB(mount.mountpoint, (function(err, db) {
        if (err) return callback(err);
        try {
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
          transaction.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
          });
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index("timestamp");
          index.openKeyCursor().onsuccess = (function(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, {
                type: "remote",
                db: db,
                entries: entries
              })
            }
            entries[cursor.primaryKey] = {
              timestamp: cursor.key
            };
            cursor.continue()
          })
        } catch (e) {
          return callback(e)
        }
      }))
    }),
    loadLocalEntry: (function(path, callback) {
      var stat, node;
      try {
        var lookup = FS.lookupPath(path);
        node = lookup.node;
        stat = FS.stat(path)
      } catch (e) {
        return callback(e)
      }
      if (FS.isDir(stat.mode)) {
        return callback(null, {
          timestamp: stat.mtime,
          mode: stat.mode
        })
      } else if (FS.isFile(stat.mode)) {
        node.contents = MEMFS.getFileDataAsTypedArray(node);
        return callback(null, {
          timestamp: stat.mtime,
          mode: stat.mode,
          contents: node.contents
        })
      } else {
        return callback(new Error("node type not supported"))
      }
    }),
    storeLocalEntry: (function(path, entry, callback) {
      try {
        if (FS.isDir(entry.mode)) {
          FS.mkdir(path, entry.mode)
        } else if (FS.isFile(entry.mode)) {
          FS.writeFile(path, entry.contents, {
            canOwn: true
          })
        } else {
          return callback(new Error("node type not supported"))
        }
        FS.chmod(path, entry.mode);
        FS.utime(path, entry.timestamp, entry.timestamp)
      } catch (e) {
        return callback(e)
      }
      callback(null)
    }),
    removeLocalEntry: (function(path, callback) {
      try {
        var lookup = FS.lookupPath(path);
        var stat = FS.stat(path);
        if (FS.isDir(stat.mode)) {
          FS.rmdir(path)
        } else if (FS.isFile(stat.mode)) {
          FS.unlink(path)
        }
      } catch (e) {
        return callback(e)
      }
      callback(null)
    }),
    loadRemoteEntry: (function(store, path, callback) {
      var req = store.get(path);
      req.onsuccess = (function(event) {
        callback(null, event.target.result)
      });
      req.onerror = (function(e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    storeRemoteEntry: (function(store, path, entry, callback) {
      var req = store.put(entry, path);
      req.onsuccess = (function() {
        callback(null)
      });
      req.onerror = (function(e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    removeRemoteEntry: (function(store, path, callback) {
      var req = store.delete(path);
      req.onsuccess = (function() {
        callback(null)
      });
      req.onerror = (function(e) {
        callback(this.error);
        e.preventDefault()
      })
    }),
    reconcile: (function(src, dst, callback) {
      var total = 0;
      var create = [];
      Object.keys(src.entries).forEach((function(key) {
        var e = src.entries[key];
        var e2 = dst.entries[key];
        if (!e2 || e.timestamp > e2.timestamp) {
          create.push(key);
          total++
        }
      }));
      var remove = [];
      Object.keys(dst.entries).forEach((function(key) {
        var e = dst.entries[key];
        var e2 = src.entries[key];
        if (!e2) {
          remove.push(key);
          total++
        }
      }));
      if (!total) {
        return callback(null)
      }
      var completed = 0;
      var db = src.type === "remote" ? src.db : dst.db;
      var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
      var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

      function done(err) {
        if (err) {
          if (!done.errored) {
            done.errored = true;
            return callback(err)
          }
          return
        }
        if (++completed >= total) {
          return callback(null)
        }
      }
      transaction.onerror = (function(e) {
        done(this.error);
        e.preventDefault()
      });
      create.sort().forEach((function(path) {
        if (dst.type === "local") {
          IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
            if (err) return done(err);
            IDBFS.storeLocalEntry(path, entry, done)
          }))
        } else {
          IDBFS.loadLocalEntry(path, (function(err, entry) {
            if (err) return done(err);
            IDBFS.storeRemoteEntry(store, path, entry, done)
          }))
        }
      }));
      remove.sort().reverse().forEach((function(path) {
        if (dst.type === "local") {
          IDBFS.removeLocalEntry(path, done)
        } else {
          IDBFS.removeRemoteEntry(store, path, done)
        }
      }))
    })
  };
  var NODEFS = {
    isWindows: false,
    staticInit: (function() {
      NODEFS.isWindows = !!process.platform.match(/^win/);
      var flags = process["binding"]("constants");
      if (flags["fs"]) {
        flags = flags["fs"]
      }
      NODEFS.flagsForNodeMap = {
        "1024": flags["O_APPEND"],
        "64": flags["O_CREAT"],
        "128": flags["O_EXCL"],
        "0": flags["O_RDONLY"],
        "2": flags["O_RDWR"],
        "4096": flags["O_SYNC"],
        "512": flags["O_TRUNC"],
        "1": flags["O_WRONLY"]
      }
    }),
    bufferFrom: (function(arrayBuffer) {
      return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer)
    }),
    mount: (function(mount) {
      assert(ENVIRONMENT_IS_NODE);
      return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
    }),
    createNode: (function(parent, name, mode, dev) {
      if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node = FS.createNode(parent, name, mode);
      node.node_ops = NODEFS.node_ops;
      node.stream_ops = NODEFS.stream_ops;
      return node
    }),
    getMode: (function(path) {
      var stat;
      try {
        stat = fs.lstatSync(path);
        if (NODEFS.isWindows) {
          stat.mode = stat.mode | (stat.mode & 292) >> 2
        }
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code])
      }
      return stat.mode
    }),
    realPath: (function(node) {
      var parts = [];
      while (node.parent !== node) {
        parts.push(node.name);
        node = node.parent
      }
      parts.push(node.mount.opts.root);
      parts.reverse();
      return PATH.join.apply(null, parts)
    }),
    flagsForNode: (function(flags) {
      flags &= ~2097152;
      flags &= ~2048;
      flags &= ~32768;
      flags &= ~524288;
      var newFlags = 0;
      for (var k in NODEFS.flagsForNodeMap) {
        if (flags & k) {
          newFlags |= NODEFS.flagsForNodeMap[k];
          flags ^= k
        }
      }
      if (!flags) {
        return newFlags
      } else {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
    }),
    node_ops: {
      getattr: (function(node) {
        var path = NODEFS.realPath(node);
        var stat;
        try {
          stat = fs.lstatSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        if (NODEFS.isWindows && !stat.blksize) {
          stat.blksize = 4096
        }
        if (NODEFS.isWindows && !stat.blocks) {
          stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
        }
        return {
          dev: stat.dev,
          ino: stat.ino,
          mode: stat.mode,
          nlink: stat.nlink,
          uid: stat.uid,
          gid: stat.gid,
          rdev: stat.rdev,
          size: stat.size,
          atime: stat.atime,
          mtime: stat.mtime,
          ctime: stat.ctime,
          blksize: stat.blksize,
          blocks: stat.blocks
        }
      }),
      setattr: (function(node, attr) {
        var path = NODEFS.realPath(node);
        try {
          if (attr.mode !== undefined) {
            fs.chmodSync(path, attr.mode);
            node.mode = attr.mode
          }
          if (attr.timestamp !== undefined) {
            var date = new Date(attr.timestamp);
            fs.utimesSync(path, date, date)
          }
          if (attr.size !== undefined) {
            fs.truncateSync(path, attr.size)
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      lookup: (function(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        var mode = NODEFS.getMode(path);
        return NODEFS.createNode(parent, name, mode)
      }),
      mknod: (function(parent, name, mode, dev) {
        var node = NODEFS.createNode(parent, name, mode, dev);
        var path = NODEFS.realPath(node);
        try {
          if (FS.isDir(node.mode)) {
            fs.mkdirSync(path, node.mode)
          } else {
            fs.writeFileSync(path, "", {
              mode: node.mode
            })
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return node
      }),
      rename: (function(oldNode, newDir, newName) {
        var oldPath = NODEFS.realPath(oldNode);
        var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
        try {
          fs.renameSync(oldPath, newPath)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      unlink: (function(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        try {
          fs.unlinkSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      rmdir: (function(parent, name) {
        var path = PATH.join2(NODEFS.realPath(parent), name);
        try {
          fs.rmdirSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      readdir: (function(node) {
        var path = NODEFS.realPath(node);
        try {
          return fs.readdirSync(path)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      symlink: (function(parent, newName, oldPath) {
        var newPath = PATH.join2(NODEFS.realPath(parent), newName);
        try {
          fs.symlinkSync(oldPath, newPath)
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      readlink: (function(node) {
        var path = NODEFS.realPath(node);
        try {
          path = fs.readlinkSync(path);
          path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
          return path
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      })
    },
    stream_ops: {
      open: (function(stream) {
        var path = NODEFS.realPath(stream.node);
        try {
          if (FS.isFile(stream.node.mode)) {
            stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags))
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      close: (function(stream) {
        try {
          if (FS.isFile(stream.node.mode) && stream.nfd) {
            fs.closeSync(stream.nfd)
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      read: (function(stream, buffer, offset, length, position) {
        if (length === 0) return 0;
        try {
          return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position)
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      write: (function(stream, buffer, offset, length, position) {
        try {
          return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position)
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
      }),
      llseek: (function(stream, offset, whence) {
        var position = offset;
        if (whence === 1) {
          position += stream.position
        } else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) {
            try {
              var stat = fs.fstatSync(stream.nfd);
              position += stat.size
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
          }
        }
        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return position
      })
    }
  };
  var WORKERFS = {
    DIR_MODE: 16895,
    FILE_MODE: 33279,
    reader: null,
    mount: (function(mount) {
      assert(ENVIRONMENT_IS_WORKER);
      if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync;
      var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
      var createdParents = {};

      function ensureParent(path) {
        var parts = path.split("/");
        var parent = root;
        for (var i = 0; i < parts.length - 1; i++) {
          var curr = parts.slice(0, i + 1).join("/");
          if (!createdParents[curr]) {
            createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0)
          }
          parent = createdParents[curr]
        }
        return parent
      }

      function base(path) {
        var parts = path.split("/");
        return parts[parts.length - 1]
      }
      Array.prototype.forEach.call(mount.opts["files"] || [], (function(file) {
        WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate)
      }));
      (mount.opts["blobs"] || []).forEach((function(obj) {
        WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"])
      }));
      (mount.opts["packages"] || []).forEach((function(pack) {
        pack["metadata"].files.forEach((function(file) {
          var name = file.filename.substr(1);
          WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end))
        }))
      }));
      return root
    }),
    createNode: (function(parent, name, mode, dev, contents, mtime) {
      var node = FS.createNode(parent, name, mode);
      node.mode = mode;
      node.node_ops = WORKERFS.node_ops;
      node.stream_ops = WORKERFS.stream_ops;
      node.timestamp = (mtime || new Date).getTime();
      assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
      if (mode === WORKERFS.FILE_MODE) {
        node.size = contents.size;
        node.contents = contents
      } else {
        node.size = 4096;
        node.contents = {}
      }
      if (parent) {
        parent.contents[name] = node
      }
      return node
    }),
    node_ops: {
      getattr: (function(node) {
        return {
          dev: 1,
          ino: undefined,
          mode: node.mode,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: undefined,
          size: node.size,
          atime: new Date(node.timestamp),
          mtime: new Date(node.timestamp),
          ctime: new Date(node.timestamp),
          blksize: 4096,
          blocks: Math.ceil(node.size / 4096)
        }
      }),
      setattr: (function(node, attr) {
        if (attr.mode !== undefined) {
          node.mode = attr.mode
        }
        if (attr.timestamp !== undefined) {
          node.timestamp = attr.timestamp
        }
      }),
      lookup: (function(parent, name) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }),
      mknod: (function(parent, name, mode, dev) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }),
      rename: (function(oldNode, newDir, newName) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }),
      unlink: (function(parent, name) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }),
      rmdir: (function(parent, name) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }),
      readdir: (function(node) {
        var entries = [".", ".."];
        for (var key in node.contents) {
          if (!node.contents.hasOwnProperty(key)) {
            continue
          }
          entries.push(key)
        }
        return entries
      }),
      symlink: (function(parent, newName, oldPath) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }),
      readlink: (function(node) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      })
    },
    stream_ops: {
      read: (function(stream, buffer, offset, length, position) {
        if (position >= stream.node.size) return 0;
        var chunk = stream.node.contents.slice(position, position + length);
        var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
        buffer.set(new Uint8Array(ab), offset);
        return chunk.size
      }),
      write: (function(stream, buffer, offset, length, position) {
        throw new FS.ErrnoError(ERRNO_CODES.EIO)
      }),
      llseek: (function(stream, offset, whence) {
        var position = offset;
        if (whence === 1) {
          position += stream.position
        } else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) {
            position += stream.node.size
          }
        }
        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return position
      })
    }
  };
  STATICTOP += 16;
  STATICTOP += 16;
  STATICTOP += 16;
  var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
      openFlags: {
        READ: 1,
        WRITE: 2
      }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    handleFSError: (function(e) {
      if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
      return ___setErrNo(e.errno)
    }),
    lookupPath: (function(path, opts) {
      path = PATH.resolve(FS.cwd(), path);
      opts = opts || {};
      if (!path) return {
        path: "",
        node: null
      };
      var defaults = {
        follow_mount: true,
        recurse_count: 0
      };
      for (var key in defaults) {
        if (opts[key] === undefined) {
          opts[key] = defaults[key]
        }
      }
      if (opts.recurse_count > 8) {
        throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
      }
      var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
        return !!p
      })), false);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break
        }
        current = FS.lookupNode(current, parts[i]);
        current_path = PATH.join2(current_path, parts[i]);
        if (FS.isMountpoint(current)) {
          if (!islast || islast && opts.follow_mount) {
            current = current.mounted.root
          }
        }
        if (!islast || opts.follow) {
          var count = 0;
          while (FS.isLink(current.mode)) {
            var link = FS.readlink(current_path);
            current_path = PATH.resolve(PATH.dirname(current_path), link);
            var lookup = FS.lookupPath(current_path, {
              recurse_count: opts.recurse_count
            });
            current = lookup.node;
            if (count++ > 40) {
              throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
            }
          }
        }
      }
      return {
        path: current_path,
        node: current
      }
    }),
    getPath: (function(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
        }
        path = path ? node.name + "/" + path : node.name;
        node = node.parent
      }
    }),
    hashName: (function(parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0
      }
      return (parentid + hash >>> 0) % FS.nameTable.length
    }),
    hashAddNode: (function(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node
    }),
    hashRemoveNode: (function(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break
          }
          current = current.name_next
        }
      }
    }),
    lookupNode: (function(parent, name) {
      var err = FS.mayLookup(parent);
      if (err) {
        throw new FS.ErrnoError(err, parent)
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node
        }
      }
      return FS.lookup(parent, name)
    }),
    createNode: (function(parent, name, mode, rdev) {
      if (!FS.FSNode) {
        FS.FSNode = (function(parent, name, mode, rdev) {
          if (!parent) {
            parent = this
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.mounted = null;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.node_ops = {};
          this.stream_ops = {};
          this.rdev = rdev
        });
        FS.FSNode.prototype = {};
        var readMode = 292 | 73;
        var writeMode = 146;
        Object.defineProperties(FS.FSNode.prototype, {
          read: {
            get: (function() {
              return (this.mode & readMode) === readMode
            }),
            set: (function(val) {
              val ? this.mode |= readMode : this.mode &= ~readMode
            })
          },
          write: {
            get: (function() {
              return (this.mode & writeMode) === writeMode
            }),
            set: (function(val) {
              val ? this.mode |= writeMode : this.mode &= ~writeMode
            })
          },
          isFolder: {
            get: (function() {
              return FS.isDir(this.mode)
            })
          },
          isDevice: {
            get: (function() {
              return FS.isChrdev(this.mode)
            })
          }
        })
      }
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node
    }),
    destroyNode: (function(node) {
      FS.hashRemoveNode(node)
    }),
    isRoot: (function(node) {
      return node === node.parent
    }),
    isMountpoint: (function(node) {
      return !!node.mounted
    }),
    isFile: (function(mode) {
      return (mode & 61440) === 32768
    }),
    isDir: (function(mode) {
      return (mode & 61440) === 16384
    }),
    isLink: (function(mode) {
      return (mode & 61440) === 40960
    }),
    isChrdev: (function(mode) {
      return (mode & 61440) === 8192
    }),
    isBlkdev: (function(mode) {
      return (mode & 61440) === 24576
    }),
    isFIFO: (function(mode) {
      return (mode & 61440) === 4096
    }),
    isSocket: (function(mode) {
      return (mode & 49152) === 49152
    }),
    flagModes: {
      "r": 0,
      "rs": 1052672,
      "r+": 2,
      "w": 577,
      "wx": 705,
      "xw": 705,
      "w+": 578,
      "wx+": 706,
      "xw+": 706,
      "a": 1089,
      "ax": 1217,
      "xa": 1217,
      "a+": 1090,
      "ax+": 1218,
      "xa+": 1218
    },
    modeStringToFlags: (function(str) {
      var flags = FS.flagModes[str];
      if (typeof flags === "undefined") {
        throw new Error("Unknown file open mode: " + str)
      }
      return flags
    }),
    flagsToPermissionString: (function(flag) {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w"
      }
      return perms
    }),
    nodePermissions: (function(node, perms) {
      if (FS.ignorePermissions) {
        return 0
      }
      if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
        return ERRNO_CODES.EACCES
      } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
        return ERRNO_CODES.EACCES
      } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
        return ERRNO_CODES.EACCES
      }
      return 0
    }),
    mayLookup: (function(dir) {
      var err = FS.nodePermissions(dir, "x");
      if (err) return err;
      if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
      return 0
    }),
    mayCreate: (function(dir, name) {
      try {
        var node = FS.lookupNode(dir, name);
        return ERRNO_CODES.EEXIST
      } catch (e) {}
      return FS.nodePermissions(dir, "wx")
    }),
    mayDelete: (function(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name)
      } catch (e) {
        return e.errno
      }
      var err = FS.nodePermissions(dir, "wx");
      if (err) {
        return err
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return ERRNO_CODES.ENOTDIR
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return ERRNO_CODES.EBUSY
        }
      } else {
        if (FS.isDir(node.mode)) {
          return ERRNO_CODES.EISDIR
        }
      }
      return 0
    }),
    mayOpen: (function(node, flags) {
      if (!node) {
        return ERRNO_CODES.ENOENT
      }
      if (FS.isLink(node.mode)) {
        return ERRNO_CODES.ELOOP
      } else if (FS.isDir(node.mode)) {
        if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
          return ERRNO_CODES.EISDIR
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    }),
    MAX_OPEN_FDS: 4096,
    nextfd: (function(fd_start, fd_end) {
      fd_start = fd_start || 0;
      fd_end = fd_end || FS.MAX_OPEN_FDS;
      for (var fd = fd_start; fd <= fd_end; fd++) {
        if (!FS.streams[fd]) {
          return fd
        }
      }
      throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
    }),
    getStream: (function(fd) {
      return FS.streams[fd]
    }),
    createStream: (function(stream, fd_start, fd_end) {
      if (!FS.FSStream) {
        FS.FSStream = (function() {});
        FS.FSStream.prototype = {};
        Object.defineProperties(FS.FSStream.prototype, {
          object: {
            get: (function() {
              return this.node
            }),
            set: (function(val) {
              this.node = val
            })
          },
          isRead: {
            get: (function() {
              return (this.flags & 2097155) !== 1
            })
          },
          isWrite: {
            get: (function() {
              return (this.flags & 2097155) !== 0
            })
          },
          isAppend: {
            get: (function() {
              return this.flags & 1024
            })
          }
        })
      }
      var newStream = new FS.FSStream;
      for (var p in stream) {
        newStream[p] = stream[p]
      }
      stream = newStream;
      var fd = FS.nextfd(fd_start, fd_end);
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream
    }),
    closeStream: (function(fd) {
      FS.streams[fd] = null
    }),
    chrdev_stream_ops: {
      open: (function(stream) {
        var device = FS.getDevice(stream.node.rdev);
        stream.stream_ops = device.stream_ops;
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream)
        }
      }),
      llseek: (function() {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      })
    },
    major: (function(dev) {
      return dev >> 8
    }),
    minor: (function(dev) {
      return dev & 255
    }),
    makedev: (function(ma, mi) {
      return ma << 8 | mi
    }),
    registerDevice: (function(dev, ops) {
      FS.devices[dev] = {
        stream_ops: ops
      }
    }),
    getDevice: (function(dev) {
      return FS.devices[dev]
    }),
    getMounts: (function(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push.apply(check, m.mounts)
      }
      return mounts
    }),
    syncfs: (function(populate, callback) {
      if (typeof populate === "function") {
        callback = populate;
        populate = false
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;

      function doCallback(err) {
        assert(FS.syncFSRequests > 0);
        FS.syncFSRequests--;
        return callback(err)
      }

      function done(err) {
        if (err) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(err)
          }
          return
        }
        if (++completed >= mounts.length) {
          doCallback(null)
        }
      }
      mounts.forEach((function(mount) {
        if (!mount.type.syncfs) {
          return done(null)
        }
        mount.type.syncfs(mount, populate, done)
      }))
    }),
    mount: (function(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, {
          follow_mount: false
        });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
      }
      var mount = {
        type: type,
        opts: opts,
        mountpoint: mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount)
        }
      }
      return mountRoot
    }),
    unmount: (function(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((function(hash) {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.indexOf(current.mount) !== -1) {
            FS.destroyNode(current)
          }
          current = next
        }
      }));
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      assert(idx !== -1);
      node.mount.mounts.splice(idx, 1)
    }),
    lookup: (function(parent, name) {
      return parent.node_ops.lookup(parent, name)
    }),
    mknod: (function(path, mode, dev) {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name || name === "." || name === "..") {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var err = FS.mayCreate(parent, name);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      return parent.node_ops.mknod(parent, name, mode, dev)
    }),
    create: (function(path, mode) {
      mode = mode !== undefined ? mode : 438;
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0)
    }),
    mkdir: (function(path, mode) {
      mode = mode !== undefined ? mode : 511;
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0)
    }),
    mkdirTree: (function(path, mode) {
      var dirs = path.split("/");
      var d = "";
      for (var i = 0; i < dirs.length; ++i) {
        if (!dirs[i]) continue;
        d += "/" + dirs[i];
        try {
          FS.mkdir(d, mode)
        } catch (e) {
          if (e.errno != ERRNO_CODES.EEXIST) throw e
        }
      }
    }),
    mkdev: (function(path, mode, dev) {
      if (typeof dev === "undefined") {
        dev = mode;
        mode = 438
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev)
    }),

    symlink: function(oldpath, newpath) {
      if (!PATH.resolve(oldpath)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
      }

      const lookup = FS.lookupPath(newpath, { parent: true });
      const parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
      }

      const newname = PATH.basename(newpath);
      const err = FS.mayCreate(parent, newname);
      if (err) {
        throw new FS.ErrnoError(err);
      }

      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM);
      }

      return parent.node_ops.symlink(parent, newname, oldpath);
    },

    rename: function (old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      try {
        lookup = FS.lookupPath(old_path, {
          parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
          parent: true
        });
        new_dir = lookup.node
      } catch (e) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      relative = PATH.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name)
      } catch (e) {}
      if (old_node === new_node) {
        return
      }
      var isdir = FS.isDir(old_node.mode);
      var err = FS.mayDelete(old_dir, old_name, isdir);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (err) {
        throw new FS.ErrnoError(err)
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
      }
      if (new_dir !== old_dir) {
        err = FS.nodePermissions(old_dir, "w");
        if (err) {
          throw new FS.ErrnoError(err)
        }
      }
      try {
        if (FS.trackingDelegate["willMovePath"]) {
          FS.trackingDelegate["willMovePath"](old_path, new_path)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name)
      } catch (e) {
        throw e
      } finally {
        FS.hashAddNode(old_node)
      }
      try {
        if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
      } catch (e) {
        console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
      }
    },

    rmdir: function (path) {
      const lookup = FS.lookupPath(path, { parent: true });
      const parent = lookup.node;
      const name = PATH.basename(path);
      const node = FS.lookupNode(parent, name);

      const err = FS.mayDelete(parent, name, true);
      if (err) {
        throw new FS.ErrnoError(err);
      } else if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM);
      } else if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
      }

      try {
        if (FS.trackingDelegate["willDeletePath"]) {
          FS.trackingDelegate["willDeletePath"](path)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
      try {
        if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
      } catch (e) {
        console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
      }
    },

    readdir: function (path) {
      const lookup = FS.lookupPath(path, { follow: true });
      const node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
      }

      return node.node_ops.readdir(node);
    },

    unlink: function (path) {
      const lookup = FS.lookupPath(path, { parent: true });
      const parent = lookup.node;
      const name = PATH.basename(path);
      const node = FS.lookupNode(parent, name);
      const err = FS.mayDelete(parent, name, false);

      if (err) {
        throw new FS.ErrnoError(err);
      } else if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM);
      } else if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
      }

      try {
        if (typeof FS.trackingDelegate.willDeletePath === 'function') {
          FS.trackingDelegate.willDeletePath(path);
        }
      } catch (e) {
        console.log("FS.trackingDelegate.willDeletePath('" + path + "') threw an exception: " + e.message);
      }

      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);

      try {
        if (typeof FS.trackingDelegate.onDeletePath === 'function') FS.trackingDelegate.onDeletePath(path);
      } catch (e) {
        console.log("FS.trackingDelegate.onDeletePath('" + path + "') threw an exception: " + e.message);
      }
    },

    readlink: function (path) {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    },

    stat: (function(path, dontFollow) {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      return node.node_ops.getattr(node)
    }),
    lstat: (function(path) {
      return FS.stat(path, true)
    }),
    chmod: (function(path, mode, dontFollow) {
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: !dontFollow
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      node.node_ops.setattr(node, {
        mode: mode & 4095 | node.mode & ~4095,
        timestamp: Date.now()
      })
    }),
    lchmod: (function(path, mode) {
      FS.chmod(path, mode, true)
    }),
    fchmod: (function(fd, mode) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      FS.chmod(stream.node, mode)
    }),
    chown: (function(path, uid, gid, dontFollow) {
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: !dontFollow
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      node.node_ops.setattr(node, {
        timestamp: Date.now()
      })
    }),
    lchown: (function(path, uid, gid) {
      FS.chown(path, uid, gid, true)
    }),
    fchown: (function(fd, uid, gid) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      FS.chown(stream.node, uid, gid)
    }),
    truncate: (function(path, len) {
      if (len < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var node;
      if (typeof path === "string") {
        var lookup = FS.lookupPath(path, {
          follow: true
        });
        node = lookup.node
      } else {
        node = path
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM)
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var err = FS.nodePermissions(node, "w");
      if (err) {
        throw new FS.ErrnoError(err)
      }
      node.node_ops.setattr(node, {
        size: len,
        timestamp: Date.now()
      })
    }),
    ftruncate: (function(fd, len) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      FS.truncate(stream.node, len)
    }),
    utime: (function(path, atime, mtime) {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      var node = lookup.node;
      node.node_ops.setattr(node, {
        timestamp: Math.max(atime, mtime)
      })
    }),
    open: (function(path, flags, mode, fd_start, fd_end) {
      if (path === "") {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
      mode = typeof mode === "undefined" ? 438 : mode;
      if (flags & 64) {
        mode = mode & 4095 | 32768
      } else {
        mode = 0
      }
      var node;
      if (typeof path === "object") {
        node = path
      } else {
        path = PATH.normalize(path);
        try {
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072)
          });
          node = lookup.node
        } catch (e) {}
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true
        }
      }
      if (!node) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512
      }
      if (flags & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
      }
      if (!created) {
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err)
        }
      }
      if (flags & 512) {
        FS.truncate(node, 0)
      }
      flags &= ~(128 | 512);
      var stream = FS.createStream({
        node: node,
        path: FS.getPath(node),
        flags: flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false
      }, fd_start, fd_end);
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream)
      }
      if (Module["logReadFiles"] && !(flags & 1)) {
        if (!FS.readFiles) FS.readFiles = {};
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
          Module["printErr"]("read file: " + path)
        }
      }
      try {
        if (FS.trackingDelegate["onOpenFile"]) {
          var trackingFlags = 0;
          if ((flags & 2097155) !== 1) {
            trackingFlags |= FS.tracking.openFlags.READ
          }
          if ((flags & 2097155) !== 0) {
            trackingFlags |= FS.tracking.openFlags.WRITE
          }
          FS.trackingDelegate["onOpenFile"](path, trackingFlags)
        }
      } catch (e) {
        console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
      }
      return stream
    }),
    close: (function(stream) {
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream)
        }
      } catch (e) {
        throw e
      } finally {
        FS.closeStream(stream.fd)
      }
    }),
    llseek: (function(stream, offset, whence) {
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position
    }),
    read: (function(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      var seeking = typeof position !== "undefined";
      if (!seeking) {
        position = stream.position
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead
    }),
    write: (function(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if (stream.flags & 1024) {
        FS.llseek(stream, 0, 2)
      }
      var seeking = typeof position !== "undefined";
      if (!seeking) {
        position = stream.position
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      try {
        if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
      } catch (e) {
        console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
      }
      return bytesWritten
    }),
    allocate: (function(stream, offset, length) {
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EBADF)
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
      }
      stream.stream_ops.allocate(stream, offset, length)
    }),
    mmap: (function(stream, buffer, offset, length, position, prot, flags) {
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(ERRNO_CODES.EACCES)
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
      }
      return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
    }),
    msync: (function(stream, buffer, offset, length, mmapFlags) {
      if (!stream || !stream.stream_ops.msync) {
        return 0
      }
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    }),
    munmap: (function(stream) {
      return 0
    }),
    ioctl: (function(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
      }
      return stream.stream_ops.ioctl(stream, cmd, arg)
    }),
    readFile: (function(path, opts) {
      opts = opts || {};
      opts.flags = opts.flags || "r";
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error('Invalid encoding type "' + opts.encoding + '"')
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf, 0)
      } else if (opts.encoding === "binary") {
        ret = buf
      }
      FS.close(stream);
      return ret
    }),
    writeFile: (function(path, data, opts) {
      opts = opts || {};
      opts.flags = opts.flags || "w";
      var stream = FS.open(path, opts.flags, opts.mode);
      if (typeof data === "string") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
      } else if (ArrayBuffer.isView(data)) {
        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
      } else {
        throw new Error("Unsupported data type")
      }
      FS.close(stream)
    }),
    cwd: (function() {
      return FS.currentPath
    }),
    chdir: (function(path) {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      if (lookup.node === null) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
      }
      var err = FS.nodePermissions(lookup.node, "x");
      if (err) {
        throw new FS.ErrnoError(err)
      }
      FS.currentPath = lookup.path
    }),
    createDefaultDirectories: (function() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user")
    }),
    createDefaultDevices: (function() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: (function() {
          return 0
        }),
        write: (function(stream, buffer, offset, length, pos) {
          return length
        })
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var random_device;
      if (typeof crypto !== "undefined") {
        var randomBuffer = new Uint8Array(1);
        random_device = (function() {
          crypto.getRandomValues(randomBuffer);
          return randomBuffer[0]
        })
      } else if (ENVIRONMENT_IS_NODE) {
        random_device = (function() {
          return require("crypto")["randomBytes"](1)[0]
        })
      } else {
        random_device = (function() {
          return Math.random() * 256 | 0
        })
      }
      FS.createDevice("/dev", "random", random_device);
      FS.createDevice("/dev", "urandom", random_device);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp")
    }),
    createSpecialDirectories: (function() {
      FS.mkdir("/proc");
      FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({
        mount: (function() {
          var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
          node.node_ops = {
            lookup: (function(parent, name) {
              var fd = +name;
              var stream = FS.getStream(fd);
              if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
              var ret = {
                parent: null,
                mount: {
                  mountpoint: "fake"
                },
                node_ops: {
                  readlink: (function() {
                    return stream.path
                  })
                }
              };
              ret.parent = ret;
              return ret
            })
          };
          return node
        })
      }, {}, "/proc/self/fd")
    }),
    createStandardStreams: (function() {
      if (Module["stdin"]) {
        FS.createDevice("/dev", "stdin", Module["stdin"])
      } else {
        FS.symlink("/dev/tty", "/dev/stdin")
      }
      if (Module["stdout"]) {
        FS.createDevice("/dev", "stdout", null, Module["stdout"])
      } else {
        FS.symlink("/dev/tty", "/dev/stdout")
      }
      if (Module["stderr"]) {
        FS.createDevice("/dev", "stderr", null, Module["stderr"])
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr")
      }
      var stdin = FS.open("/dev/stdin", "r");
      assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
      var stdout = FS.open("/dev/stdout", "w");
      assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
      var stderr = FS.open("/dev/stderr", "w");
      assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    }),
    ensureErrnoError: (function() {
      if (FS.ErrnoError) return;
      FS.ErrnoError = function ErrnoError(errno, node) {
        this.node = node;
        this.setErrno = (function(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break
            }
          }
        });
        this.setErrno(errno);
        this.message = ERRNO_MESSAGES[errno];
        if (this.stack) Object.defineProperty(this, "stack", {
          value: (new Error).stack,
          writable: true
        })
      };
      FS.ErrnoError.prototype = new Error;
      FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      [ERRNO_CODES.ENOENT].forEach((function(code) {
        FS.genericErrors[code] = new FS.ErrnoError(code);
        FS.genericErrors[code].stack = "<generic error, no stack>"
      }))
    }),
    staticInit: (function() {
      FS.ensureErrnoError();
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = {
        "MEMFS": MEMFS,
        "IDBFS": IDBFS,
        "NODEFS": NODEFS,
        "WORKERFS": WORKERFS
      }
    }),
    init: (function(input, output, error) {
      assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
      FS.init.initialized = true;
      FS.ensureErrnoError();
      Module["stdin"] = input || Module["stdin"];
      Module["stdout"] = output || Module["stdout"];
      Module["stderr"] = error || Module["stderr"];
      FS.createStandardStreams()
    }),
    quit: (function() {
      FS.init.initialized = false;
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      for (var i = 0; i < FS.streams.length; i++) {
        var stream = FS.streams[i];
        if (!stream) {
          continue
        }
        FS.close(stream)
      }
    }),
    getMode: (function(canRead, canWrite) {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode
    }),
    joinPath: (function(parts, forceRelative) {
      var path = PATH.join.apply(null, parts);
      if (forceRelative && path[0] == "/") path = path.substr(1);
      return path
    }),
    absolutePath: (function(relative, base) {
      return PATH.resolve(base, relative)
    }),
    standardizePath: (function(path) {
      return PATH.normalize(path)
    }),
    findObject: (function(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (ret.exists) {
        return ret.object
      } else {
        ___setErrNo(ret.error);
        return null
      }
    }),
    analyzePath: (function(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, {
          follow: !dontResolveLastLink
        });
        path = lookup.path
      } catch (e) {}
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, {
          parent: true
        });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, {
          follow: !dontResolveLastLink
        });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/"
      } catch (e) {
        ret.error = e.errno
      }
      return ret
    }),
    createFolder: (function(parent, name, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.mkdir(path, mode)
    }),
    createPath: (function(parent, path, canRead, canWrite) {
      parent = typeof parent === "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current)
        } catch (e) {}
        parent = current
      }
      return current
    }),
    createFile: (function(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.create(path, mode)
    }),
    createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
      var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
      var mode = FS.getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data === "string") {
          var arr = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
          data = arr
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, "w");
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode)
      }
      return node
    }),
    createDevice: (function(parent, name, input, output) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(!!input, !!output);
      if (!FS.createDevice.major) FS.createDevice.major = 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open: (function(stream) {
          stream.seekable = false
        }),
        close: (function(stream) {
          if (output && output.buffer && output.buffer.length) {
            output(10)
          }
        }),
        read: (function(stream, buffer, offset, length, pos) {
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = input()
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset + i] = result
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now()
          }
          return bytesRead
        }),
        write: (function(stream, buffer, offset, length, pos) {
          for (var i = 0; i < length; i++) {
            try {
              output(buffer[offset + i])
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
          }
          if (length) {
            stream.node.timestamp = Date.now()
          }
          return i
        })
      });
      return FS.mkdev(path, mode, dev)
    }),
    createLink: (function(parent, name, target, canRead, canWrite) {
      var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
      return FS.symlink(target, path)
    }),
    forceLoadFile: (function(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      var success = true;
      if (typeof XMLHttpRequest !== "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
      } else if (Module["read"]) {
        try {
          obj.contents = intArrayFromString(Module["read"](obj.url), true);
          obj.usedBytes = obj.contents.length
        } catch (e) {
          success = false
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.")
      }
      if (!success) ___setErrNo(ERRNO_CODES.EIO);
      return success
    }),
    createLazyFile: (function(parent, name, url, canRead, canWrite) {
      function LazyUint8Array() {
        this.lengthKnown = false;
        this.chunks = []
      }
      LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return undefined
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset]
      };
      LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
        this.getter = getter
      };
      LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        var xhr = new XMLHttpRequest;
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (function(from, to) {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, false);
          if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
          if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
          if (xhr.overrideMimeType) {
            xhr.overrideMimeType("text/plain; charset=x-user-defined")
          }
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          if (xhr.response !== undefined) {
            return new Uint8Array(xhr.response || [])
          } else {
            return intArrayFromString(xhr.responseText || "", true)
          }
        });
        var lazyArray = this;
        lazyArray.setDataGetter((function(chunkNum) {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray.chunks[chunkNum] === "undefined") {
            lazyArray.chunks[chunkNum] = doXHR(start, end)
          }
          if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
          return lazyArray.chunks[chunkNum]
        }));
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          console.log("LazyFiles on gzip forces download of the whole file when length is accessed")
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true
      };
      if (typeof XMLHttpRequest !== "undefined") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array;
        Object.defineProperties(lazyArray, {
          length: {
            get: (function() {
              if (!this.lengthKnown) {
                this.cacheLength()
              }
              return this._length
            })
          },
          chunkSize: {
            get: (function() {
              if (!this.lengthKnown) {
                this.cacheLength()
              }
              return this._chunkSize
            })
          }
        });
        var properties = {
          isDevice: false,
          contents: lazyArray
        }
      } else {
        var properties = {
          isDevice: false,
          url: url
        }
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url
      }
      Object.defineProperties(node, {
        usedBytes: {
          get: (function() {
            return this.contents.length
          })
        }
      });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((function(key) {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
          }
          return fn.apply(null, arguments)
        }
      }));
      stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
        if (!FS.forceLoadFile(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO)
        }
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        assert(size >= 0);
        if (contents.slice) {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents[position + i]
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents.get(position + i)
          }
        }
        return size
      };
      node.stream_ops = stream_ops;
      return node
    }),
    createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
      Browser.init();
      var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency("cp " + fullname);

      function processData(byteArray) {
        function finish(byteArray) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
          }
          if (onload) onload();
          removeRunDependency(dep)
        }
        var handled = false;
        Module["preloadPlugins"].forEach((function(plugin) {
          if (handled) return;
          if (plugin["canHandle"](fullname)) {
            plugin["handle"](byteArray, fullname, finish, (function() {
              if (onerror) onerror();
              removeRunDependency(dep)
            }));
            handled = true
          }
        }));
        if (!handled) finish(byteArray)
      }
      addRunDependency(dep);
      if (typeof url == "string") {
        Browser.asyncLoad(url, (function(byteArray) {
          processData(byteArray)
        }), onerror)
      } else {
        processData(url)
      }
    }),
    indexedDB: (function() {
      return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    }),
    DB_NAME: (function() {
      return "EM_FS_" + window.location.pathname
    }),
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (function(paths, onload, onerror) {
      onload = onload || (function() {});
      onerror = onerror || (function() {});
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
      } catch (e) {
        return onerror(e)
      }
      openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
        console.log("creating db");
        var db = openRequest.result;
        db.createObjectStore(FS.DB_STORE_NAME)
      };
      openRequest.onsuccess = function openRequest_onsuccess() {
        var db = openRequest.result;
        var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0,
          fail = 0,
          total = paths.length;

        function finish() {
          if (fail == 0) onload();
          else onerror()
        }
        paths.forEach((function(path) {
          var putRequest = files.put(FS.analyzePath(path).object.contents, path);
          putRequest.onsuccess = function putRequest_onsuccess() {
            ok++;
            if (ok + fail == total) finish()
          };
          putRequest.onerror = function putRequest_onerror() {
            fail++;
            if (ok + fail == total) finish()
          }
        }));
        transaction.onerror = onerror
      };
      openRequest.onerror = onerror
    }),
    loadFilesFromDB: (function(paths, onload, onerror) {
      onload = onload || (function() {});
      onerror = onerror || (function() {});
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
      } catch (e) {
        return onerror(e)
      }
      openRequest.onupgradeneeded = onerror;
      openRequest.onsuccess = function openRequest_onsuccess() {
        var db = openRequest.result;
        try {
          var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
        } catch (e) {
          onerror(e);
          return
        }
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0,
          fail = 0,
          total = paths.length;

        function finish() {
          if (fail == 0) onload();
          else onerror()
        }
        paths.forEach((function(path) {
          var getRequest = files.get(path);
          getRequest.onsuccess = function getRequest_onsuccess() {
            if (FS.analyzePath(path).exists) {
              FS.unlink(path)
            }
            FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
            ok++;
            if (ok + fail == total) finish()
          };
          getRequest.onerror = function getRequest_onerror() {
            fail++;
            if (ok + fail == total) finish()
          }
        }));
        transaction.onerror = onerror
      };
      openRequest.onerror = onerror
    })
  };
  var SYSCALLS = {
    DEFAULT_POLLMASK: 5,
    mappings: {},
    umask: 511,
    calculateAt: (function(dirfd, path) {
      if (path[0] !== "/") {
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd()
        } else {
          var dirstream = FS.getStream(dirfd);
          if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
          dir = dirstream.path
        }
        path = PATH.join2(dir, path)
      }
      return path
    }),
    doStat: (function(func, path, buf) {
      try {
        var stat = func(path)
      } catch (e) {
        if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
          return -ERRNO_CODES.ENOTDIR
        }
        throw e
      }
      HEAP32[buf >> 2] = stat.dev;
      HEAP32[buf + 4 >> 2] = 0;
      HEAP32[buf + 8 >> 2] = stat.ino;
      HEAP32[buf + 12 >> 2] = stat.mode;
      HEAP32[buf + 16 >> 2] = stat.nlink;
      HEAP32[buf + 20 >> 2] = stat.uid;
      HEAP32[buf + 24 >> 2] = stat.gid;
      HEAP32[buf + 28 >> 2] = stat.rdev;
      HEAP32[buf + 32 >> 2] = 0;
      HEAP32[buf + 36 >> 2] = stat.size;
      HEAP32[buf + 40 >> 2] = 4096;
      HEAP32[buf + 44 >> 2] = stat.blocks;
      HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
      HEAP32[buf + 52 >> 2] = 0;
      HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
      HEAP32[buf + 60 >> 2] = 0;
      HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
      HEAP32[buf + 68 >> 2] = 0;
      HEAP32[buf + 72 >> 2] = stat.ino;
      return 0
    }),
    doMsync: (function(addr, stream, len, flags) {
      var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
      FS.msync(stream, buffer, 0, len, flags)
    }),
    doMkdir: (function(path, mode) {
      path = PATH.normalize(path);
      if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
      FS.mkdir(path, mode, 0);
      return 0
    }),
    doMknod: (function(path, mode, dev) {
      switch (mode & 61440) {
        case 32768:
        case 8192:
        case 24576:
        case 4096:
        case 49152:
          break;
        default:
          return -ERRNO_CODES.EINVAL
      }
      FS.mknod(path, mode, dev);
      return 0
    }),
    doReadlink: (function(path, buf, bufsize) {
      if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
      var ret = FS.readlink(path);
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len] = endChar;
      return len
    }),
    doAccess: (function(path, amode) {
      if (amode & ~7) {
        return -ERRNO_CODES.EINVAL
      }
      var node;
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      node = lookup.node;
      var perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && FS.nodePermissions(node, perms)) {
        return -ERRNO_CODES.EACCES
      }
      return 0
    }),
    doDup: (function(path, flags, suggestFD) {
      var suggest = FS.getStream(suggestFD);
      if (suggest) FS.close(suggest);
      return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    }),
    doReadv: (function(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[iov + i * 8 >> 2];
        var len = HEAP32[iov + (i * 8 + 4) >> 2];
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break
      }
      return ret
    }),
    doWritev: (function(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[iov + i * 8 >> 2];
        var len = HEAP32[iov + (i * 8 + 4) >> 2];
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr
      }
      return ret
    }),
    varargs: 0,
    get: (function(varargs) {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
      return ret
    }),
    getStr: (function() {
      var ret = Pointer_stringify(SYSCALLS.get());
      return ret
    }),
    getStreamFromFD: (function() {
      var stream = FS.getStream(SYSCALLS.get());
      if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
      return stream
    }),
    getSocketFromFD: (function() {
      var socket = SOCKFS.getSocket(SYSCALLS.get());
      if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
      return socket
    }),
    getSocketAddress: (function(allowNull) {
      var addrp = SYSCALLS.get(),
        addrlen = SYSCALLS.get();
      if (allowNull && addrp === 0) return null;
      var info = __read_sockaddr(addrp, addrlen);
      if (info.errno) throw new FS.ErrnoError(info.errno);
      info.addr = DNS.lookup_addr(info.addr) || info.addr;
      return info
    }),
    get64: (function() {
      var low = SYSCALLS.get(),
        high = SYSCALLS.get();
      if (low >= 0) assert(high === 0);
      else assert(high === -1);
      return low
    }),
    getZero: (function() {
      assert(SYSCALLS.get() === 0)
    })
  };

  function ___syscall10(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr();
      FS.unlink(path);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }
  var SOCKFS = {
    mount: (function(mount) {
      Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
      Module["websocket"]._callbacks = {};
      Module["websocket"]["on"] = (function(event, callback) {
        if ("function" === typeof callback) {
          this._callbacks[event] = callback
        }
        return this
      });
      Module["websocket"].emit = (function(event, param) {
        if ("function" === typeof this._callbacks[event]) {
          this._callbacks[event].call(this, param)
        }
      });
      return FS.createNode(null, "/", 16384 | 511, 0)
    }),
    createSocket: (function(family, type, protocol) {
      var streaming = type == 1;
      if (protocol) {
        assert(streaming == (protocol == 6))
      }
      var sock = {
        family: family,
        type: type,
        protocol: protocol,
        server: null,
        error: null,
        peers: {},
        pending: [],
        recv_queue: [],
        sock_ops: SOCKFS.websocket_sock_ops
      };
      var name = SOCKFS.nextname();
      var node = FS.createNode(SOCKFS.root, name, 49152, 0);
      node.sock = sock;
      var stream = FS.createStream({
        path: name,
        node: node,
        flags: FS.modeStringToFlags("r+"),
        seekable: false,
        stream_ops: SOCKFS.stream_ops
      });
      sock.stream = stream;
      return sock
    }),
    getSocket: (function(fd) {
      var stream = FS.getStream(fd);
      if (!stream || !FS.isSocket(stream.node.mode)) {
        return null
      }
      return stream.node.sock
    }),
    stream_ops: {
      poll: (function(stream) {
        var sock = stream.node.sock;
        return sock.sock_ops.poll(sock)
      }),
      ioctl: (function(stream, request, varargs) {
        var sock = stream.node.sock;
        return sock.sock_ops.ioctl(sock, request, varargs)
      }),
      read: (function(stream, buffer, offset, length, position) {
        var sock = stream.node.sock;
        var msg = sock.sock_ops.recvmsg(sock, length);
        if (!msg) {
          return 0
        }
        buffer.set(msg.buffer, offset);
        return msg.buffer.length
      }),
      write: (function(stream, buffer, offset, length, position) {
        var sock = stream.node.sock;
        return sock.sock_ops.sendmsg(sock, buffer, offset, length)
      }),
      close: (function(stream) {
        var sock = stream.node.sock;
        sock.sock_ops.close(sock)
      })
    },
    nextname: (function() {
      if (!SOCKFS.nextname.current) {
        SOCKFS.nextname.current = 0
      }
      return "socket[" + SOCKFS.nextname.current++ + "]"
    }),
    websocket_sock_ops: {
      createPeer: (function(sock, addr, port) {
        var ws;
        if (typeof addr === "object") {
          ws = addr;
          addr = null;
          port = null
        }
        if (ws) {
          if (ws._socket) {
            addr = ws._socket.remoteAddress;
            port = ws._socket.remotePort
          } else {
            var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
            if (!result) {
              throw new Error("WebSocket URL must be in the format ws(s)://address:port")
            }
            addr = result[1];
            port = parseInt(result[2], 10)
          }
        } else {
          try {
            var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
            var url = "ws:#".replace("#", "//");
            if (runtimeConfig) {
              if ("string" === typeof Module["websocket"]["url"]) {
                url = Module["websocket"]["url"]
              }
            }
            if (url === "ws://" || url === "wss://") {
              var parts = addr.split("/");
              url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
            }
            var subProtocols = "binary";
            if (runtimeConfig) {
              if ("string" === typeof Module["websocket"]["subprotocol"]) {
                subProtocols = Module["websocket"]["subprotocol"]
              }
            }
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            var opts = ENVIRONMENT_IS_NODE ? {
              "protocol": subProtocols.toString()
            } : subProtocols;
            if (runtimeConfig && null === Module["websocket"]["subprotocol"]) {
              subProtocols = "null";
              opts = undefined
            }
            var WebSocketConstructor;
            if (ENVIRONMENT_IS_NODE) {
              WebSocketConstructor = require("ws")
            } else if (ENVIRONMENT_IS_WEB) {
              WebSocketConstructor = window["WebSocket"]
            } else {
              WebSocketConstructor = WebSocket
            }
            ws = new WebSocketConstructor(url, opts);
            ws.binaryType = "arraybuffer"
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH)
          }
        }
        var peer = {
          addr: addr,
          port: port,
          socket: ws,
          dgram_send_queue: []
        };
        SOCKFS.websocket_sock_ops.addPeer(sock, peer);
        SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
        if (sock.type === 2 && typeof sock.sport !== "undefined") {
          peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))
        }
        return peer
      }),
      getPeer: (function(sock, addr, port) {
        return sock.peers[addr + ":" + port]
      }),
      addPeer: (function(sock, peer) {
        sock.peers[peer.addr + ":" + peer.port] = peer
      }),
      removePeer: (function(sock, peer) {
        delete sock.peers[peer.addr + ":" + peer.port]
      }),
      handlePeerEvents: (function(sock, peer) {
        var first = true;
        var handleOpen = (function() {
          Module["websocket"].emit("open", sock.stream.fd);
          try {
            var queued = peer.dgram_send_queue.shift();
            while (queued) {
              peer.socket.send(queued);
              queued = peer.dgram_send_queue.shift()
            }
          } catch (e) {
            peer.socket.close()
          }
        });

        function handleMessage(data) {
          assert(typeof data !== "string" && data.byteLength !== undefined);
          if (data.byteLength == 0) {
            return
          }
          data = new Uint8Array(data);
          var wasfirst = first;
          first = false;
          if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
            var newport = data[8] << 8 | data[9];
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
            peer.port = newport;
            SOCKFS.websocket_sock_ops.addPeer(sock, peer);
            return
          }
          sock.recv_queue.push({
            addr: peer.addr,
            port: peer.port,
            data: data
          });
          Module["websocket"].emit("message", sock.stream.fd)
        }
        if (ENVIRONMENT_IS_NODE) {
          peer.socket.on("open", handleOpen);
          peer.socket.on("message", (function(data, flags) {
            if (!flags.binary) {
              return
            }
            handleMessage((new Uint8Array(data)).buffer)
          }));
          peer.socket.on("close", (function() {
            Module["websocket"].emit("close", sock.stream.fd)
          }));
          peer.socket.on("error", (function(error) {
            sock.error = ERRNO_CODES.ECONNREFUSED;
            Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
          }))
        } else {
          peer.socket.onopen = handleOpen;
          peer.socket.onclose = (function() {
            Module["websocket"].emit("close", sock.stream.fd)
          });
          peer.socket.onmessage = function peer_socket_onmessage(event) {
            handleMessage(event.data)
          };
          peer.socket.onerror = (function(error) {
            sock.error = ERRNO_CODES.ECONNREFUSED;
            Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
          })
        }
      }),
      poll: (function(sock) {
        if (sock.type === 1 && sock.server) {
          return sock.pending.length ? 64 | 1 : 0
        }
        var mask = 0;
        var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
        if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
          mask |= 64 | 1
        }
        if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
          mask |= 4
        }
        if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
          mask |= 16
        }
        return mask
      }),
      ioctl: (function(sock, request, arg) {
        switch (request) {
          case 21531:
            var bytes = 0;
            if (sock.recv_queue.length) {
              bytes = sock.recv_queue[0].data.length
            }
            HEAP32[arg >> 2] = bytes;
            return 0;
          default:
            return ERRNO_CODES.EINVAL
        }
      }),
      close: (function(sock) {
        if (sock.server) {
          try {
            sock.server.close()
          } catch (e) {}
          sock.server = null
        }
        var peers = Object.keys(sock.peers);
        for (var i = 0; i < peers.length; i++) {
          var peer = sock.peers[peers[i]];
          try {
            peer.socket.close()
          } catch (e) {}
          SOCKFS.websocket_sock_ops.removePeer(sock, peer)
        }
        return 0
      }),
      bind: (function(sock, addr, port) {
        if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        sock.saddr = addr;
        sock.sport = port;
        if (sock.type === 2) {
          if (sock.server) {
            sock.server.close();
            sock.server = null
          }
          try {
            sock.sock_ops.listen(sock, 0)
          } catch (e) {
            if (!(e instanceof FS.ErrnoError)) throw e;
            if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e
          }
        }
      }),
      connect: (function(sock, addr, port) {
        if (sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (dest) {
            if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EALREADY)
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EISCONN)
            }
          }
        }
        var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
        sock.daddr = peer.addr;
        sock.dport = peer.port;
        throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS)
      }),
      listen: (function(sock, backlog) {
        if (!ENVIRONMENT_IS_NODE) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        if (sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var WebSocketServer = require("ws").Server;
        var host = sock.saddr;
        sock.server = new WebSocketServer({
          host: host,
          port: sock.sport
        });
        Module["websocket"].emit("listen", sock.stream.fd);
        sock.server.on("connection", (function(ws) {
          if (sock.type === 1) {
            var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
            var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
            newsock.daddr = peer.addr;
            newsock.dport = peer.port;
            sock.pending.push(newsock);
            Module["websocket"].emit("connection", newsock.stream.fd)
          } else {
            SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            Module["websocket"].emit("connection", sock.stream.fd)
          }
        }));
        sock.server.on("closed", (function() {
          Module["websocket"].emit("close", sock.stream.fd);
          sock.server = null
        }));
        sock.server.on("error", (function(error) {
          sock.error = ERRNO_CODES.EHOSTUNREACH;
          Module["websocket"].emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"])
        }))
      }),
      accept: (function(listensock) {
        if (!listensock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var newsock = listensock.pending.shift();
        newsock.stream.flags = listensock.stream.flags;
        return newsock
      }),
      getname: (function(sock, peer) {
        var addr, port;
        if (peer) {
          if (sock.daddr === undefined || sock.dport === undefined) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
          }
          addr = sock.daddr;
          port = sock.dport
        } else {
          addr = sock.saddr || 0;
          port = sock.sport || 0
        }
        return {
          addr: addr,
          port: port
        }
      }),
      sendmsg: (function(sock, buffer, offset, length, addr, port) {
        if (sock.type === 2) {
          if (addr === undefined || port === undefined) {
            addr = sock.daddr;
            port = sock.dport
          }
          if (addr === undefined || port === undefined) {
            throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ)
          }
        } else {
          addr = sock.daddr;
          port = sock.dport
        }
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
        if (sock.type === 1) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
          } else if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
        }
        if (ArrayBuffer.isView(buffer)) {
          offset += buffer.byteOffset;
          buffer = buffer.buffer
        }
        var data;
        data = buffer.slice(offset, offset + length);
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
            }
            dest.dgram_send_queue.push(data);
            return length
          }
        }
        try {
          dest.socket.send(data);
          return length
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
      }),
      recvmsg: (function(sock, length) {
        if (sock.type === 1 && sock.server) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
        }
        var queued = sock.recv_queue.shift();
        if (!queued) {
          if (sock.type === 1) {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (!dest) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
            } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              return null
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
            }
          } else {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
          }
        }
        var queuedLength = queued.data.byteLength || queued.data.length;
        var queuedOffset = queued.data.byteOffset || 0;
        var queuedBuffer = queued.data.buffer || queued.data;
        var bytesRead = Math.min(length, queuedLength);
        var res = {
          buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
          addr: queued.addr,
          port: queued.port
        };
        if (sock.type === 1 && bytesRead < queuedLength) {
          var bytesRemaining = queuedLength - bytesRead;
          queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
          sock.recv_queue.unshift(queued)
        }
        return res
      })
    }
  };

  function __inet_pton4_raw(str) {
    var b = str.split(".");
    for (var i = 0; i < 4; i++) {
      var tmp = Number(b[i]);
      if (isNaN(tmp)) return null;
      b[i] = tmp
    }
    return (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0
  }

  function __inet_pton6_raw(str) {
    var words;
    var w, offset, z;
    var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
    var parts = [];
    if (!valid6regx.test(str)) {
      return null
    }
    if (str === "::") {
      return [0, 0, 0, 0, 0, 0, 0, 0]
    }
    if (str.indexOf("::") === 0) {
      str = str.replace("::", "Z:")
    } else {
      str = str.replace("::", ":Z:")
    }
    if (str.indexOf(".") > 0) {
      str = str.replace(new RegExp("[.]", "g"), ":");
      words = str.split(":");
      words[words.length - 4] = parseInt(words[words.length - 4]) + parseInt(words[words.length - 3]) * 256;
      words[words.length - 3] = parseInt(words[words.length - 2]) + parseInt(words[words.length - 1]) * 256;
      words = words.slice(0, words.length - 2)
    } else {
      words = str.split(":")
    }
    offset = 0;
    z = 0;
    for (w = 0; w < words.length; w++) {
      if (typeof words[w] === "string") {
        if (words[w] === "Z") {
          for (z = 0; z < 8 - words.length + 1; z++) {
            parts[w + z] = 0
          }
          offset = z - 1
        } else {
          parts[w + offset] = _htons(parseInt(words[w], 16))
        }
      } else {
        parts[w + offset] = words[w]
      }
    }
    return [parts[1] << 16 | parts[0], parts[3] << 16 | parts[2], parts[5] << 16 | parts[4], parts[7] << 16 | parts[6]]
  }
  var DNS = {
    address_map: {
      id: 1,
      addrs: {},
      names: {}
    },
    lookup_name: (function(name) {
      var res = __inet_pton4_raw(name);
      if (res !== null) {
        return name
      }
      res = __inet_pton6_raw(name);
      if (res !== null) {
        return name
      }
      var addr;
      if (DNS.address_map.addrs[name]) {
        addr = DNS.address_map.addrs[name]
      } else {
        var id = DNS.address_map.id++;
        assert(id < 65535, "exceeded max address mappings of 65535");
        addr = "172.29." + (id & 255) + "." + (id & 65280);
        DNS.address_map.names[addr] = name;
        DNS.address_map.addrs[name] = addr
      }
      return addr
    }),
    lookup_addr: (function(addr) {
      if (DNS.address_map.names[addr]) {
        return DNS.address_map.names[addr]
      }
      return null
    })
  };

  function __inet_ntop4_raw(addr) {
    return (addr & 255) + "." + (addr >> 8 & 255) + "." + (addr >> 16 & 255) + "." + (addr >> 24 & 255)
  }

  function __inet_ntop6_raw(ints) {
    var str = "";
    var word = 0;
    var longest = 0;
    var lastzero = 0;
    var zstart = 0;
    var len = 0;
    var i = 0;
    var parts = [ints[0] & 65535, ints[0] >> 16, ints[1] & 65535, ints[1] >> 16, ints[2] & 65535, ints[2] >> 16, ints[3] & 65535, ints[3] >> 16];
    var hasipv4 = true;
    var v4part = "";
    for (i = 0; i < 5; i++) {
      if (parts[i] !== 0) {
        hasipv4 = false;
        break
      }
    }
    if (hasipv4) {
      v4part = __inet_ntop4_raw(parts[6] | parts[7] << 16);
      if (parts[5] === -1) {
        str = "::ffff:";
        str += v4part;
        return str
      }
      if (parts[5] === 0) {
        str = "::";
        if (v4part === "0.0.0.0") v4part = "";
        if (v4part === "0.0.0.1") v4part = "1";
        str += v4part;
        return str
      }
    }
    for (word = 0; word < 8; word++) {
      if (parts[word] === 0) {
        if (word - lastzero > 1) {
          len = 0
        }
        lastzero = word;
        len++
      }
      if (len > longest) {
        longest = len;
        zstart = word - longest + 1
      }
    }
    for (word = 0; word < 8; word++) {
      if (longest > 1) {
        if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
          if (word === zstart) {
            str += ":";
            if (zstart === 0) str += ":"
          }
          continue
        }
      }
      str += Number(_ntohs(parts[word] & 65535)).toString(16);
      str += word < 7 ? ":" : ""
    }
    return str
  }

  function __read_sockaddr(sa, salen) {
    var family = HEAP16[sa >> 1];
    var port = _ntohs(HEAP16[sa + 2 >> 1]);
    var addr;
    switch (family) {
      case 2:
        if (salen !== 16) {
          return {
            errno: ERRNO_CODES.EINVAL
          }
        }
        addr = HEAP32[sa + 4 >> 2];
        addr = __inet_ntop4_raw(addr);
        break;
      case 10:
        if (salen !== 28) {
          return {
            errno: ERRNO_CODES.EINVAL
          }
        }
        addr = [HEAP32[sa + 8 >> 2], HEAP32[sa + 12 >> 2], HEAP32[sa + 16 >> 2], HEAP32[sa + 20 >> 2]];
        addr = __inet_ntop6_raw(addr);
        break;
      default:
        return {
          errno: ERRNO_CODES.EAFNOSUPPORT
        }
    }
    return {
      family: family,
      addr: addr,
      port: port
    }
  }

  function __write_sockaddr(sa, family, addr, port) {
    switch (family) {
      case 2:
        addr = __inet_pton4_raw(addr);
        HEAP16[sa >> 1] = family;
        HEAP32[sa + 4 >> 2] = addr;
        HEAP16[sa + 2 >> 1] = _htons(port);
        break;
      case 10:
        addr = __inet_pton6_raw(addr);
        HEAP32[sa >> 2] = family;
        HEAP32[sa + 8 >> 2] = addr[0];
        HEAP32[sa + 12 >> 2] = addr[1];
        HEAP32[sa + 16 >> 2] = addr[2];
        HEAP32[sa + 20 >> 2] = addr[3];
        HEAP16[sa + 2 >> 1] = _htons(port);
        HEAP32[sa + 4 >> 2] = 0;
        HEAP32[sa + 24 >> 2] = 0;
        break;
      default:
        return {
          errno: ERRNO_CODES.EAFNOSUPPORT
        }
    }
    return {}
  }

  function ___syscall102(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var call = SYSCALLS.get(),
        socketvararg = SYSCALLS.get();
      SYSCALLS.varargs = socketvararg;
      switch (call) {
        case 1: {
          var domain = SYSCALLS.get(),
            type = SYSCALLS.get(),
            protocol = SYSCALLS.get();
          var sock = SOCKFS.createSocket(domain, type, protocol);
          assert(sock.stream.fd < 64);
          return sock.stream.fd
        };
      case 2: {
        var sock = SYSCALLS.getSocketFromFD(),
          info = SYSCALLS.getSocketAddress();
        sock.sock_ops.bind(sock, info.addr, info.port);
        return 0
      };
      case 3: {
        var sock = SYSCALLS.getSocketFromFD(),
          info = SYSCALLS.getSocketAddress();
        sock.sock_ops.connect(sock, info.addr, info.port);
        return 0
      };
      case 4: {
        var sock = SYSCALLS.getSocketFromFD(),
          backlog = SYSCALLS.get();
        sock.sock_ops.listen(sock, backlog);
        return 0
      };
      case 5: {
        var sock = SYSCALLS.getSocketFromFD(),
          addr = SYSCALLS.get(),
          addrlen = SYSCALLS.get();
        var newsock = sock.sock_ops.accept(sock);
        if (addr) {
          var res = __write_sockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport);
          assert(!res.errno)
        }
        return newsock.stream.fd
      };
      case 6: {
        var sock = SYSCALLS.getSocketFromFD(),
          addr = SYSCALLS.get(),
          addrlen = SYSCALLS.get();
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport);
        assert(!res.errno);
        return 0
      };
      case 7: {
        var sock = SYSCALLS.getSocketFromFD(),
          addr = SYSCALLS.get(),
          addrlen = SYSCALLS.get();
        if (!sock.daddr) {
          return -ERRNO_CODES.ENOTCONN
        }
        var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport);
        assert(!res.errno);
        return 0
      };
      case 11: {
        var sock = SYSCALLS.getSocketFromFD(),
          message = SYSCALLS.get(),
          length = SYSCALLS.get(),
          flags = SYSCALLS.get(),
          dest = SYSCALLS.getSocketAddress(true);
        if (!dest) {
          return FS.write(sock.stream, HEAP8, message, length)
        } else {
          return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port)
        }
      };
      case 12: {
        var sock = SYSCALLS.getSocketFromFD(),
          buf = SYSCALLS.get(),
          len = SYSCALLS.get(),
          flags = SYSCALLS.get(),
          addr = SYSCALLS.get(),
          addrlen = SYSCALLS.get();
        var msg = sock.sock_ops.recvmsg(sock, len);
        if (!msg) return 0;
        if (addr) {
          var res = __write_sockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port);
          assert(!res.errno)
        }
        HEAPU8.set(msg.buffer, buf);
        return msg.buffer.byteLength
      };
      case 14: {
        return -ERRNO_CODES.ENOPROTOOPT
      };
      case 15: {
        var sock = SYSCALLS.getSocketFromFD(),
          level = SYSCALLS.get(),
          optname = SYSCALLS.get(),
          optval = SYSCALLS.get(),
          optlen = SYSCALLS.get();
        if (level === 1) {
          if (optname === 4) {
            HEAP32[optval >> 2] = sock.error;
            HEAP32[optlen >> 2] = 4;
            sock.error = null;
            return 0
          }
        }
        return -ERRNO_CODES.ENOPROTOOPT
      };
      case 16: {
        var sock = SYSCALLS.getSocketFromFD(),
          message = SYSCALLS.get(),
          flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var addr, port;
        var name = HEAP32[message >> 2];
        var namelen = HEAP32[message + 4 >> 2];
        if (name) {
          var info = __read_sockaddr(name, namelen);
          if (info.errno) return -info.errno;
          port = info.port;
          addr = DNS.lookup_addr(info.addr) || info.addr
        }
        var total = 0;
        for (var i = 0; i < num; i++) {
          total += HEAP32[iov + (8 * i + 4) >> 2]
        }
        var view = new Uint8Array(total);
        var offset = 0;
        for (var i = 0; i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          for (var j = 0; j < iovlen; j++) {
            view[offset++] = HEAP8[iovbase + j >> 0]
          }
        }
        return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port)
      };
      case 17: {
        var sock = SYSCALLS.getSocketFromFD(),
          message = SYSCALLS.get(),
          flags = SYSCALLS.get();
        var iov = HEAP32[message + 8 >> 2];
        var num = HEAP32[message + 12 >> 2];
        var total = 0;
        for (var i = 0; i < num; i++) {
          total += HEAP32[iov + (8 * i + 4) >> 2]
        }
        var msg = sock.sock_ops.recvmsg(sock, total);
        if (!msg) return 0;
        var name = HEAP32[message >> 2];
        if (name) {
          var res = __write_sockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port);
          assert(!res.errno)
        }
        var bytesRead = 0;
        var bytesRemaining = msg.buffer.byteLength;
        for (var i = 0; bytesRemaining > 0 && i < num; i++) {
          var iovbase = HEAP32[iov + (8 * i + 0) >> 2];
          var iovlen = HEAP32[iov + (8 * i + 4) >> 2];
          if (!iovlen) {
            continue
          }
          var length = Math.min(iovlen, bytesRemaining);
          var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
          HEAPU8.set(buf, iovbase + bytesRead);
          bytesRead += length;
          bytesRemaining -= length
        }
        return bytesRead
      };
      default:
        abort("unsupported socketcall syscall " + call)
      }
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall118(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall12(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr();
      FS.chdir(path);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall122(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var buf = SYSCALLS.get();
      if (!buf) return -ERRNO_CODES.EFAULT;
      var layout = {
        "sysname": 0,
        "nodename": 65,
        "domainname": 325,
        "machine": 260,
        "version": 195,
        "release": 130,
        "__size__": 390
      };

      function copyString(element, value) {
        var offset = layout[element];
        writeAsciiToMemory(value, buf + offset)
      }
      copyString("sysname", "Emscripten");
      copyString("nodename", "emscripten");
      copyString("release", "1.0");
      copyString("version", "#1");
      copyString("machine", "x86-JS");
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall125(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        offset_high = SYSCALLS.get(),
        offset_low = SYSCALLS.get(),
        result = SYSCALLS.get(),
        whence = SYSCALLS.get();
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[result >> 2] = stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall142(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var nfds = SYSCALLS.get(),
        readfds = SYSCALLS.get(),
        writefds = SYSCALLS.get(),
        exceptfds = SYSCALLS.get(),
        timeout = SYSCALLS.get();
      assert(nfds <= 64, "nfds must be less than or equal to 64");
      assert(!exceptfds, "exceptfds not supported");
      var total = 0;
      var srcReadLow = readfds ? HEAP32[readfds >> 2] : 0,
        srcReadHigh = readfds ? HEAP32[readfds + 4 >> 2] : 0;
      var srcWriteLow = writefds ? HEAP32[writefds >> 2] : 0,
        srcWriteHigh = writefds ? HEAP32[writefds + 4 >> 2] : 0;
      var srcExceptLow = exceptfds ? HEAP32[exceptfds >> 2] : 0,
        srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0;
      var dstReadLow = 0,
        dstReadHigh = 0;
      var dstWriteLow = 0,
        dstWriteHigh = 0;
      var dstExceptLow = 0,
        dstExceptHigh = 0;
      var allLow = (readfds ? HEAP32[readfds >> 2] : 0) | (writefds ? HEAP32[writefds >> 2] : 0) | (exceptfds ? HEAP32[exceptfds >> 2] : 0);
      var allHigh = (readfds ? HEAP32[readfds + 4 >> 2] : 0) | (writefds ? HEAP32[writefds + 4 >> 2] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0);

      function check(fd, low, high, val) {
        return fd < 32 ? low & val : high & val
      }
      for (var fd = 0; fd < nfds; fd++) {
        var mask = 1 << fd % 32;
        if (!check(fd, allLow, allHigh, mask)) {
          continue
        }
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        var flags = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          flags = stream.stream_ops.poll(stream)
        }
        if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
          fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
          total++
        }
        if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
          fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
          total++
        }
        if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
          fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
          total++
        }
      }
      if (readfds) {
        HEAP32[readfds >> 2] = dstReadLow;
        HEAP32[readfds + 4 >> 2] = dstReadHigh
      }
      if (writefds) {
        HEAP32[writefds >> 2] = dstWriteLow;
        HEAP32[writefds + 4 >> 2] = dstWriteHigh
      }
      if (exceptfds) {
        HEAP32[exceptfds >> 2] = dstExceptLow;
        HEAP32[exceptfds + 4 >> 2] = dstExceptHigh
      }
      return total
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall144(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var addr = SYSCALLS.get(),
        len = SYSCALLS.get(),
        flags = SYSCALLS.get();
      var info = SYSCALLS.mappings[addr];
      if (!info) return 0;
      SYSCALLS.doMsync(addr, FS.getStream(info.fd), len, info.flags);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall145(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        iov = SYSCALLS.get(),
        iovcnt = SYSCALLS.get();
      return SYSCALLS.doReadv(stream, iov, iovcnt)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        iov = SYSCALLS.get(),
        iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall15(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        mode = SYSCALLS.get();
      FS.chmod(path, mode);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall168(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var fds = SYSCALLS.get(),
        nfds = SYSCALLS.get(),
        timeout = SYSCALLS.get();
      var nonzero = 0;
      for (var i = 0; i < nfds; i++) {
        var pollfd = fds + 8 * i;
        var fd = HEAP32[pollfd >> 2];
        var events = HEAP16[pollfd + 4 >> 1];
        var mask = 32;
        var stream = FS.getStream(fd);
        if (stream) {
          mask = SYSCALLS.DEFAULT_POLLMASK;
          if (stream.stream_ops.poll) {
            mask = stream.stream_ops.poll(stream)
          }
        }
        mask &= events | 8 | 16;
        if (mask) nonzero++;
        HEAP16[pollfd + 6 >> 1] = mask
      }
      return nonzero
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall183(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var buf = SYSCALLS.get(),
        size = SYSCALLS.get();
      if (size === 0) return -ERRNO_CODES.EINVAL;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd);
      if (size < cwdLengthInBytes + 1) return -ERRNO_CODES.ERANGE;
      stringToUTF8(cwd, buf, size);
      return buf
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall191(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var resource = SYSCALLS.get(),
        rlim = SYSCALLS.get();
      HEAP32[rlim >> 2] = -1;
      HEAP32[rlim + 4 >> 2] = -1;
      HEAP32[rlim + 8 >> 2] = -1;
      HEAP32[rlim + 12 >> 2] = -1;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall192(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var addr = SYSCALLS.get(),
        len = SYSCALLS.get(),
        prot = SYSCALLS.get(),
        flags = SYSCALLS.get(),
        fd = SYSCALLS.get(),
        off = SYSCALLS.get();
      off <<= 12;
      var ptr;
      var allocated = false;
      if (fd === -1) {
        ptr = _memalign(PAGE_SIZE, len);
        if (!ptr) return -ERRNO_CODES.ENOMEM;
        _memset(ptr, 0, len);
        allocated = true
      } else {
        var info = FS.getStream(fd);
        if (!info) return -ERRNO_CODES.EBADF;
        var res = FS.mmap(info, HEAPU8, addr, len, off, prot, flags);
        ptr = res.ptr;
        allocated = res.allocated
      }
      SYSCALLS.mappings[ptr] = {
        malloc: ptr,
        len: len,
        allocated: allocated,
        fd: fd,
        flags: flags
      };
      return ptr
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall194(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var fd = SYSCALLS.get(),
        zero = SYSCALLS.getZero(),
        length = SYSCALLS.get64();
      FS.ftruncate(fd, length);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall195(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        buf = SYSCALLS.get();
      return SYSCALLS.doStat(FS.stat, path, buf)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall196(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        buf = SYSCALLS.get();
      return SYSCALLS.doStat(FS.lstat, path, buf)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall197(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        buf = SYSCALLS.get();
      return SYSCALLS.doStat(FS.stat, stream.path, buf)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall202(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall199() {
    return ___syscall202.apply(null, arguments)
  }
  var PROCINFO = {
    ppid: 1,
    pid: 42,
    sid: 42,
    pgid: 42
  };

  function ___syscall20(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return PROCINFO.pid
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall201() {
    return ___syscall202.apply(null, arguments)
  }

  function ___syscall211(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var ruid = SYSCALLS.get(),
        euid = SYSCALLS.get(),
        suid = SYSCALLS.get();
      HEAP32[ruid >> 2] = 0;
      HEAP32[euid >> 2] = 0;
      HEAP32[suid >> 2] = 0;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall209() {
    return ___syscall211.apply(null, arguments)
  }

  function ___syscall219(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall220(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        dirp = SYSCALLS.get(),
        count = SYSCALLS.get();
      if (!stream.getdents) {
        stream.getdents = FS.readdir(stream.path)
      }
      var pos = 0;
      while (stream.getdents.length > 0 && pos + 268 <= count) {
        var id;
        var type;
        var name = stream.getdents.pop();
        if (name[0] === ".") {
          id = 1;
          type = 4
        } else {
          var child = FS.lookupNode(stream.node, name);
          id = child.id;
          type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8
        }
        HEAP32[dirp + pos >> 2] = id;
        HEAP32[dirp + pos + 4 >> 2] = stream.position;
        HEAP16[dirp + pos + 8 >> 1] = 268;
        HEAP8[dirp + pos + 10 >> 0] = type;
        stringToUTF8(name, dirp + pos + 11, 256);
        pos += 268
      }
      return pos
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall221(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        cmd = SYSCALLS.get();
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -ERRNO_CODES.EINVAL
          }
          var newStream;
          newStream = FS.open(stream.path, stream.flags, 0, arg);
          return newStream.fd
        };
      case 1:
      case 2:
        return 0;
      case 3:
        return stream.flags;
      case 4: {
        var arg = SYSCALLS.get();
        stream.flags |= arg;
        return 0
      };
      case 12:
      case 12: {
        var arg = SYSCALLS.get();
        var offset = 0;
        HEAP16[arg + offset >> 1] = 2;
        return 0
      };
      case 13:
      case 14:
      case 13:
      case 14:
        return 0;
      case 16:
      case 8:
        return -ERRNO_CODES.EINVAL;
      case 9:
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      default: {
        return -ERRNO_CODES.EINVAL
      }
      }
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall268(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        size = SYSCALLS.get(),
        buf = SYSCALLS.get();
      assert(size === 64);
      HEAP32[buf + 4 >> 2] = 4096;
      HEAP32[buf + 40 >> 2] = 4096;
      HEAP32[buf + 8 >> 2] = 1e6;
      HEAP32[buf + 12 >> 2] = 5e5;
      HEAP32[buf + 16 >> 2] = 5e5;
      HEAP32[buf + 20 >> 2] = FS.nextInode;
      HEAP32[buf + 24 >> 2] = 1e6;
      HEAP32[buf + 28 >> 2] = 42;
      HEAP32[buf + 44 >> 2] = 2;
      HEAP32[buf + 36 >> 2] = 255;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall272(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall3(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        buf = SYSCALLS.get(),
        count = SYSCALLS.get();
      return FS.read(stream, HEAP8, buf, count)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall33(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        amode = SYSCALLS.get();
      return SYSCALLS.doAccess(path, amode)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall340(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var pid = SYSCALLS.get(),
        resource = SYSCALLS.get(),
        new_limit = SYSCALLS.get(),
        old_limit = SYSCALLS.get();
      if (old_limit) {
        HEAP32[old_limit >> 2] = -1;
        HEAP32[old_limit + 4 >> 2] = -1;
        HEAP32[old_limit + 8 >> 2] = -1;
        HEAP32[old_limit + 12 >> 2] = -1
      }
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall38(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var old_path = SYSCALLS.getStr(),
        new_path = SYSCALLS.getStr();
      FS.rename(old_path, new_path);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall39(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        mode = SYSCALLS.get();
      return SYSCALLS.doMkdir(path, mode)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall4(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        buf = SYSCALLS.get(),
        count = SYSCALLS.get();
      return FS.write(stream, HEAP8, buf, count)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall40(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr();
      FS.rmdir(path);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall41(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var old = SYSCALLS.getStreamFromFD();
      return FS.open(old.path, old.flags, 0).fd
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }
  var PIPEFS = {
    BUCKET_BUFFER_SIZE: 8192,
    mount: (function(mount) {
      return FS.createNode(null, "/", 16384 | 511, 0)
    }),
    createPipe: (function() {
      var pipe = {
        buckets: []
      };
      pipe.buckets.push({
        buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
        offset: 0,
        roffset: 0
      });
      var rName = PIPEFS.nextname();
      var wName = PIPEFS.nextname();
      var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
      var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
      rNode.pipe = pipe;
      wNode.pipe = pipe;
      var readableStream = FS.createStream({
        path: rName,
        node: rNode,
        flags: FS.modeStringToFlags("r"),
        seekable: false,
        stream_ops: PIPEFS.stream_ops
      });
      rNode.stream = readableStream;
      var writableStream = FS.createStream({
        path: wName,
        node: wNode,
        flags: FS.modeStringToFlags("w"),
        seekable: false,
        stream_ops: PIPEFS.stream_ops
      });
      wNode.stream = writableStream;
      return {
        readable_fd: readableStream.fd,
        writable_fd: writableStream.fd
      }
    }),
    stream_ops: {
      poll: (function(stream) {
        var pipe = stream.node.pipe;
        if ((stream.flags & 2097155) === 1) {
          return 256 | 4
        } else {
          if (pipe.buckets.length > 0) {
            for (var i = 0; i < pipe.buckets.length; i++) {
              var bucket = pipe.buckets[i];
              if (bucket.offset - bucket.roffset > 0) {
                return 64 | 1
              }
            }
          }
        }
        return 0
      }),
      ioctl: (function(stream, request, varargs) {
        return ERRNO_CODES.EINVAL
      }),
      read: (function(stream, buffer, offset, length, position) {
        var pipe = stream.node.pipe;
        var currentLength = 0;
        for (var i = 0; i < pipe.buckets.length; i++) {
          var bucket = pipe.buckets[i];
          currentLength += bucket.offset - bucket.roffset
        }
        assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
        var data = buffer.subarray(offset, offset + length);
        if (length <= 0) {
          return 0
        }
        if (currentLength == 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
        }
        var toRead = Math.min(currentLength, length);
        var totalRead = toRead;
        var toRemove = 0;
        for (var i = 0; i < pipe.buckets.length; i++) {
          var currBucket = pipe.buckets[i];
          var bucketSize = currBucket.offset - currBucket.roffset;
          if (toRead <= bucketSize) {
            var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
            if (toRead < bucketSize) {
              tmpSlice = tmpSlice.subarray(0, toRead);
              currBucket.roffset += toRead
            } else {
              toRemove++
            }
            data.set(tmpSlice);
            break
          } else {
            var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
            data.set(tmpSlice);
            data = data.subarray(tmpSlice.byteLength);
            toRead -= tmpSlice.byteLength;
            toRemove++
          }
        }
        if (toRemove && toRemove == pipe.buckets.length) {
          toRemove--;
          pipe.buckets[toRemove].offset = 0;
          pipe.buckets[toRemove].roffset = 0
        }
        pipe.buckets.splice(0, toRemove);
        return totalRead
      }),
      write: (function(stream, buffer, offset, length, position) {
        var pipe = stream.node.pipe;
        assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
        var data = buffer.subarray(offset, offset + length);
        var dataLen = data.byteLength;
        if (dataLen <= 0) {
          return 0
        }
        var currBucket = null;
        if (pipe.buckets.length == 0) {
          currBucket = {
            buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
            offset: 0,
            roffset: 0
          };
          pipe.buckets.push(currBucket)
        } else {
          currBucket = pipe.buckets[pipe.buckets.length - 1]
        }
        assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
        var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
        if (freeBytesInCurrBuffer >= dataLen) {
          currBucket.buffer.set(data, currBucket.offset);
          currBucket.offset += dataLen;
          return dataLen
        } else if (freeBytesInCurrBuffer > 0) {
          currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
          currBucket.offset += freeBytesInCurrBuffer;
          data = data.subarray(freeBytesInCurrBuffer, data.byteLength)
        }
        var numBuckets = data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE | 0;
        var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
        for (var i = 0; i < numBuckets; i++) {
          var newBucket = {
            buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
            offset: PIPEFS.BUCKET_BUFFER_SIZE,
            roffset: 0
          };
          pipe.buckets.push(newBucket);
          newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
          data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength)
        }
        if (remElements > 0) {
          var newBucket = {
            buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
            offset: data.byteLength,
            roffset: 0
          };
          pipe.buckets.push(newBucket);
          newBucket.buffer.set(data)
        }
        return dataLen
      }),
      close: (function(stream) {
        var pipe = stream.node.pipe;
        pipe.buckets = null
      })
    },
    nextname: (function() {
      if (!PIPEFS.nextname.current) {
        PIPEFS.nextname.current = 0
      }
      return "pipe[" + PIPEFS.nextname.current++ + "]"
    })
  };

  function ___syscall42(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var fdPtr = SYSCALLS.get();
      if (fdPtr == 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EFAULT)
      }
      var res = PIPEFS.createPipe();
      HEAP32[fdPtr >> 2] = res.readable_fd;
      HEAP32[fdPtr + 4 >> 2] = res.writable_fd;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall5(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var pathname = SYSCALLS.getStr(),
        flags = SYSCALLS.get(),
        mode = SYSCALLS.get();
      var stream = FS.open(pathname, flags, mode);
      return stream.fd
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall54(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        op = SYSCALLS.get();
      switch (op) {
        case 21509:
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0
        };
      case 21510:
      case 21511:
      case 21512:
      case 21506:
      case 21507:
      case 21508: {
        if (!stream.tty) return -ERRNO_CODES.ENOTTY;
        return 0
      };
      case 21519: {
        if (!stream.tty) return -ERRNO_CODES.ENOTTY;
        var argp = SYSCALLS.get();
        HEAP32[argp >> 2] = 0;
        return 0
      };
      case 21520: {
        if (!stream.tty) return -ERRNO_CODES.ENOTTY;
        return -ERRNO_CODES.EINVAL
      };
      case 21531: {
        var argp = SYSCALLS.get();
        return FS.ioctl(stream, op, argp)
      };
      case 21523: {
        if (!stream.tty) return -ERRNO_CODES.ENOTTY;
        return 0
      };
      default:
        abort("bad ioctl syscall " + op)
      }
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall63(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var old = SYSCALLS.getStreamFromFD(),
        suggestFD = SYSCALLS.get();
      if (old.fd === suggestFD) return suggestFD;
      return SYSCALLS.doDup(old.path, old.flags, suggestFD)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall77(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var who = SYSCALLS.get(),
        usage = SYSCALLS.get();
      _memset(usage, 0, 136);
      HEAP32[usage >> 2] = 1;
      HEAP32[usage + 4 >> 2] = 2;
      HEAP32[usage + 8 >> 2] = 3;
      HEAP32[usage + 12 >> 2] = 4;
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall85(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var path = SYSCALLS.getStr(),
        buf = SYSCALLS.get(),
        bufsize = SYSCALLS.get();
      return SYSCALLS.doReadlink(path, buf, bufsize)
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall91(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var addr = SYSCALLS.get(),
        len = SYSCALLS.get();
      var info = SYSCALLS.mappings[addr];
      if (!info) return 0;
      if (len === info.len) {
        var stream = FS.getStream(info.fd);
        SYSCALLS.doMsync(addr, stream, len, info.flags);
        FS.munmap(stream);
        SYSCALLS.mappings[addr] = null;
        if (info.allocated) {
          _free(info.malloc)
        }
      }
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall96(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___syscall97(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return -ERRNO_CODES.EPERM
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno
    }
  }

  function ___unlock() {}

  function __exit(status) {
    Module["exit"](status)
  }

  function _abort() {
    Module["abort"]()
  }

  function _atexit(func, arg) {
    __ATEXIT__.unshift({
      func: func,
      arg: arg
    })
  }

  function _emscripten_get_now_res() {
    if (ENVIRONMENT_IS_NODE) {
      return 1
    } else if (typeof dateNow !== "undefined" || (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]) {
      return 1e3
    } else {
      return 1e3 * 1e3
    }
  }

  function _clock_getres(clk_id, res) {
    var nsec;
    if (clk_id === 0) {
      nsec = 1e3 * 1e3
    } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
      nsec = _emscripten_get_now_res()
    } else {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    HEAP32[res >> 2] = nsec / 1e9 | 0;
    HEAP32[res + 4 >> 2] = nsec;
    return 0
  }

  function _execl() {
    ___setErrNo(ERRNO_CODES.ENOEXEC);
    return -1
  }

  function _execve() {
    return _execl.apply(null, arguments)
  }

  function _exit(status) {
    __exit(status)
  }

  function _fork() {
    ___setErrNo(ERRNO_CODES.EAGAIN);
    return -1
  }

  function _getaddrinfo(node, service, hint, out) {
    var addr = 0;
    var port = 0;
    var flags = 0;
    var family = 0;
    var type = 0;
    var proto = 0;
    var ai;

    function allocaddrinfo(family, type, proto, canon, addr, port) {
      var sa, salen, ai;
      var res;
      salen = family === 10 ? 28 : 16;
      addr = family === 10 ? __inet_ntop6_raw(addr) : __inet_ntop4_raw(addr);
      sa = _malloc(salen);
      res = __write_sockaddr(sa, family, addr, port);
      assert(!res.errno);
      ai = _malloc(32);
      HEAP32[ai + 4 >> 2] = family;
      HEAP32[ai + 8 >> 2] = type;
      HEAP32[ai + 12 >> 2] = proto;
      HEAP32[ai + 24 >> 2] = canon;
      HEAP32[ai + 20 >> 2] = sa;
      if (family === 10) {
        HEAP32[ai + 16 >> 2] = 28
      } else {
        HEAP32[ai + 16 >> 2] = 16
      }
      HEAP32[ai + 28 >> 2] = 0;
      return ai
    }
    if (hint) {
      flags = HEAP32[hint >> 2];
      family = HEAP32[hint + 4 >> 2];
      type = HEAP32[hint + 8 >> 2];
      proto = HEAP32[hint + 12 >> 2]
    }
    if (type && !proto) {
      proto = type === 2 ? 17 : 6
    }
    if (!type && proto) {
      type = proto === 17 ? 2 : 1
    }
    if (proto === 0) {
      proto = 6
    }
    if (type === 0) {
      type = 1
    }
    if (!node && !service) {
      return -2
    }
    if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
      return -1
    }
    if (hint !== 0 && HEAP32[hint >> 2] & 2 && !node) {
      return -1
    }
    if (flags & 32) {
      return -2
    }
    if (type !== 0 && type !== 1 && type !== 2) {
      return -7
    }
    if (family !== 0 && family !== 2 && family !== 10) {
      return -6
    }
    if (service) {
      service = Pointer_stringify(service);
      port = parseInt(service, 10);
      if (isNaN(port)) {
        if (flags & 1024) {
          return -2
        }
        return -8
      }
    }
    if (!node) {
      if (family === 0) {
        family = 2
      }
      if ((flags & 1) === 0) {
        if (family === 2) {
          addr = _htonl(2130706433)
        } else {
          addr = [0, 0, 0, 1]
        }
      }
      ai = allocaddrinfo(family, type, proto, null, addr, port);
      HEAP32[out >> 2] = ai;
      return 0
    }
    node = Pointer_stringify(node);
    addr = __inet_pton4_raw(node);
    if (addr !== null) {
      if (family === 0 || family === 2) {
        family = 2
      } else if (family === 10 && flags & 8) {
        addr = [0, 0, _htonl(65535), addr];
        family = 10
      } else {
        return -2
      }
    } else {
      addr = __inet_pton6_raw(node);
      if (addr !== null) {
        if (family === 0 || family === 10) {
          family = 10
        } else {
          return -2
        }
      }
    }
    if (addr != null) {
      ai = allocaddrinfo(family, type, proto, node, addr, port);
      HEAP32[out >> 2] = ai;
      return 0
    }
    if (flags & 4) {
      return -2
    }
    node = DNS.lookup_name(node);
    addr = __inet_pton4_raw(node);
    if (family === 0) {
      family = 2
    } else if (family === 10) {
      addr = [0, 0, _htonl(65535), addr]
    }
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAP32[out >> 2] = ai;
    return 0
  }
  var _environ = STATICTOP;
  STATICTOP += 16;

  function ___buildEnvironment(env) {
    var MAX_ENV_VALUES = 64;
    var TOTAL_ENV_SIZE = 1024;
    var poolPtr;
    var envPtr;
    if (!___buildEnvironment.called) {
      ___buildEnvironment.called = true;
      ENV["USER"] = ENV["LOGNAME"] = "web_user";
      ENV["PATH"] = "/";
      ENV["PWD"] = "/";
      ENV["HOME"] = "/home/web_user";
      ENV["LANG"] = "C.UTF-8";
      ENV["_"] = Module["thisProgram"];
      poolPtr = staticAlloc(TOTAL_ENV_SIZE);
      envPtr = staticAlloc(MAX_ENV_VALUES * 4);
      HEAP32[envPtr >> 2] = poolPtr;
      HEAP32[_environ >> 2] = envPtr
    } else {
      envPtr = HEAP32[_environ >> 2];
      poolPtr = HEAP32[envPtr >> 2]
    }
    var strings = [];
    var totalSize = 0;
    for (var key in env) {
      if (typeof env[key] === "string") {
        var line = key + "=" + env[key];
        strings.push(line);
        totalSize += line.length
      }
    }
    if (totalSize > TOTAL_ENV_SIZE) {
      throw new Error("Environment size exceeded TOTAL_ENV_SIZE!")
    }
    var ptrSize = 4;
    for (var i = 0; i < strings.length; i++) {
      var line = strings[i];
      writeAsciiToMemory(line, poolPtr);
      HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
      poolPtr += line.length + 1
    }
    HEAP32[envPtr + strings.length * ptrSize >> 2] = 0
  }
  var ENV = {};

  function _getenv(name) {
    if (name === 0) return 0;
    name = Pointer_stringify(name);
    if (!ENV.hasOwnProperty(name)) return 0;
    if (_getenv.ret) _free(_getenv.ret);
    _getenv.ret = allocateUTF8(ENV[name]);
    return _getenv.ret
  }

  function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
    var info = __read_sockaddr(sa, salen);
    if (info.errno) {
      return -6
    }
    var port = info.port;
    var addr = info.addr;
    var overflowed = false;
    if (node && nodelen) {
      var lookup;
      if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
        if (flags & 8) {
          return -2
        }
      } else {
        addr = lookup
      }
      var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
      if (numBytesWrittenExclNull + 1 >= nodelen) {
        overflowed = true
      }
    }
    if (serv && servlen) {
      port = "" + port;
      var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
      if (numBytesWrittenExclNull + 1 >= servlen) {
        overflowed = true
      }
    }
    if (overflowed) {
      return -12
    }
    return 0
  }
  var Protocols = {
    list: [],
    map: {}
  };

  function _setprotoent(stayopen) {
    function allocprotoent(name, proto, aliases) {
      var nameBuf = _malloc(name.length + 1);
      writeAsciiToMemory(name, nameBuf);
      var j = 0;
      var length = aliases.length;
      var aliasListBuf = _malloc((length + 1) * 4);
      for (var i = 0; i < length; i++, j += 4) {
        var alias = aliases[i];
        var aliasBuf = _malloc(alias.length + 1);
        writeAsciiToMemory(alias, aliasBuf);
        HEAP32[aliasListBuf + j >> 2] = aliasBuf
      }
      HEAP32[aliasListBuf + j >> 2] = 0;
      var pe = _malloc(12);
      HEAP32[pe >> 2] = nameBuf;
      HEAP32[pe + 4 >> 2] = aliasListBuf;
      HEAP32[pe + 8 >> 2] = proto;
      return pe
    }
    var list = Protocols.list;
    var map = Protocols.map;
    if (list.length === 0) {
      var entry = allocprotoent("tcp", 6, ["TCP"]);
      list.push(entry);
      map["tcp"] = map["6"] = entry;
      entry = allocprotoent("udp", 17, ["UDP"]);
      list.push(entry);
      map["udp"] = map["17"] = entry
    }
    _setprotoent.index = 0
  }

  function _getprotobyname(name) {
    name = Pointer_stringify(name);
    _setprotoent(true);
    var result = Protocols.map[name];
    return result
  }

  function _getpwuid(uid) {
    return 0
  }

  function _gettimeofday(ptr) {
    var now = Date.now();
    HEAP32[ptr >> 2] = now / 1e3 | 0;
    HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
    return 0
  }
  var ___tm_timezone = allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);

  function _gmtime_r(time, tmPtr) {
    var date = new Date(HEAP32[time >> 2] * 1e3);
    HEAP32[tmPtr >> 2] = date.getUTCSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
    HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
    HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
    HEAP32[tmPtr + 36 >> 2] = 0;
    HEAP32[tmPtr + 32 >> 2] = 0;
    var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
    var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
    return tmPtr
  }

  function _kill(pid, sig) {
    ___setErrNo(ERRNO_CODES.EPERM);
    return -1
  }
  var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_STATIC);

  function _llvm_trap() {
    abort("trap!")
  }
  var _tzname = STATICTOP;
  STATICTOP += 16;
  var _daylight = STATICTOP;
  STATICTOP += 16;
  var _timezone = STATICTOP;
  STATICTOP += 16;

  function _tzset() {
    if (_tzset.called) return;
    _tzset.called = true;
    HEAP32[_timezone >> 2] = (new Date).getTimezoneOffset() * 60;
    var winter = new Date(2e3, 0, 1);
    var summer = new Date(2e3, 6, 1);
    HEAP32[_daylight >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());

    function extractZone(date) {
      var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
      return match ? match[1] : "GMT"
    }
    var winterName = extractZone(winter);
    var summerName = extractZone(summer);
    var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
    var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
    if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
      HEAP32[_tzname >> 2] = winterNamePtr;
      HEAP32[_tzname + 4 >> 2] = summerNamePtr
    } else {
      HEAP32[_tzname >> 2] = summerNamePtr;
      HEAP32[_tzname + 4 >> 2] = winterNamePtr
    }
  }

  function _localtime_r(time, tmPtr) {
    _tzset();
    var date = new Date(HEAP32[time >> 2] * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var start = new Date(date.getFullYear(), 0, 1);
    var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var summerOffset = (new Date(2e3, 6, 1)).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst;
    var zonePtr = HEAP32[_tzname + (dst ? 4 : 0) >> 2];
    HEAP32[tmPtr + 40 >> 2] = zonePtr;
    return tmPtr
  }

  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest
  }
  var MONO = {
    pump_count: 0,
    timeout_queue: [],
    pump_message: (function() {
      if (!this.mono_background_exec) this.mono_background_exec = Module.cwrap("mono_background_exec", "void", []);
      while (MONO.timeout_queue.length > 0) {
        --MONO.pump_count;
        MONO.timeout_queue.shift()()
      }
      while (MONO.pump_count > 0) {
        --MONO.pump_count;
        this.mono_background_exec()
      }
    }),
    mono_wasm_get_call_stack: (function() {
      if (!this.mono_wasm_current_bp_id) this.mono_wasm_current_bp_id = Module.cwrap("mono_wasm_current_bp_id", "number", []);
      if (!this.mono_wasm_enum_frames) this.mono_wasm_enum_frames = Module.cwrap("mono_wasm_enum_frames", "void", []);
      var bp_id = this.mono_wasm_current_bp_id();
      this.active_frames = [];
      this.mono_wasm_enum_frames();
      var the_frames = this.active_frames;
      this.active_frames = [];
      return {
        "breakpoint_id": bp_id,
        "frames": the_frames
      }
    }),
    mono_wasm_get_variables: (function(scope, var_list) {
      if (!this.mono_wasm_get_var_info) this.mono_wasm_get_var_info = Module.cwrap("mono_wasm_get_var_info", "void", ["number", "number"]);
      this.var_info = [];
      for (var i = 0; i < var_list.length; ++i) this.mono_wasm_get_var_info(scope, var_list[i]);
      var res = this.var_info;
      this.var_info = [];
      return res
    })
  };

  function _mono_set_timeout(timeout, id) {
    if (!this.mono_set_timeout_exec) this.mono_set_timeout_exec = Module.cwrap("mono_set_timeout_exec", "void", ["number"]);
    if (ENVIRONMENT_IS_WEB) {
      window.setTimeout((function() {
        this.mono_set_timeout_exec(id)
      }), timeout)
    } else {
      ++MONO.pump_count;
      MONO.timeout_queue.push((function() {
        this.mono_set_timeout_exec(id)
      }))
    }
  }

  function _mono_wasm_add_bool_var(var_value) {
    MONO.var_info.push({
      value: {
        type: "boolean",
        value: var_value != 0
      }
    })
  }

  function _mono_wasm_add_float_var(var_value) {
    MONO.var_info.push({
      value: {
        type: "number",
        value: var_value
      }
    })
  }

  function _mono_wasm_add_frame(il, method, name) {
    MONO.active_frames.push({
      il_pos: il,
      method_token: method,
      assembly_name: Module.UTF8ToString(name)
    })
  }

  function _mono_wasm_add_int_var(var_value) {
    MONO.var_info.push({
      value: {
        type: "number",
        value: var_value
      }
    })
  }

  function _mono_wasm_add_long_var(var_value) {
    MONO.var_info.push({
      value: {
        type: "number",
        value: var_value
      }
    })
  }

  function _mono_wasm_add_string_var(var_value) {
    if (var_value == 0) {
      MONO.var_info.push({
        value: {
          type: "object",
          subtype: "null"
        }
      })
    } else {
      MONO.var_info.push({
        value: {
          type: "string",
          value: Module.UTF8ToString(var_value)
        }
      })
    }
  }

  function _mono_wasm_fire_bp() {
    console.log("mono_wasm_fire_bp");
    debugger
  }

  function _usleep(useconds) {
    var msec = useconds / 1e3;
    if ((ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]) {
      var start = self["performance"]["now"]();
      while (self["performance"]["now"]() - start < msec) {}
    } else {
      var start = Date.now();
      while (Date.now() - start < msec) {}
    }
    return 0
  }
  Module["_usleep"] = _usleep;

  function _nanosleep(rqtp, rmtp) {
    var seconds = HEAP32[rqtp >> 2];
    var nanoseconds = HEAP32[rqtp + 4 >> 2];
    if (rmtp !== 0) {
      HEAP32[rmtp >> 2] = 0;
      HEAP32[rmtp + 4 >> 2] = 0
    }
    return _usleep(seconds * 1e6 + nanoseconds / 1e3)
  }

  function _pthread_cleanup_pop() {
    assert(_pthread_cleanup_push.level == __ATEXIT__.length, "cannot pop if something else added meanwhile!");
    __ATEXIT__.pop();
    _pthread_cleanup_push.level = __ATEXIT__.length
  }

  function _pthread_cleanup_push(routine, arg) {
    __ATEXIT__.push((function() {
      Module["dynCall_vi"](routine, arg)
    }));
    _pthread_cleanup_push.level = __ATEXIT__.length
  }

  function _pthread_cond_destroy() {
    return 0
  }

  function _pthread_cond_init() {
    return 0
  }

  function _pthread_cond_signal() {
    return 0
  }

  function _pthread_cond_timedwait() {
    return 0
  }

  function _pthread_cond_wait() {
    return 0
  }
  var PTHREAD_SPECIFIC = {};

  function _pthread_getspecific(key) {
    return PTHREAD_SPECIFIC[key] || 0
  }
  var PTHREAD_SPECIFIC_NEXT_KEY = 1;

  function _pthread_key_create(key, destructor) {
    if (key == 0) {
      return ERRNO_CODES.EINVAL
    }
    HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
    PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
    PTHREAD_SPECIFIC_NEXT_KEY++;
    return 0
  }

  function _pthread_key_delete(key) {
    if (key in PTHREAD_SPECIFIC) {
      delete PTHREAD_SPECIFIC[key];
      return 0
    }
    return ERRNO_CODES.EINVAL
  }

  function _pthread_mutex_destroy() {}

  function _pthread_mutex_init() {}

  function _pthread_mutexattr_destroy() {}

  function _pthread_mutexattr_init() {}

  function _pthread_mutexattr_settype() {}

  function _pthread_setcancelstate() {
    return 0
  }

  function _pthread_setspecific(key, value) {
    if (!(key in PTHREAD_SPECIFIC)) {
      return ERRNO_CODES.EINVAL
    }
    PTHREAD_SPECIFIC[key] = value;
    return 0
  }

  function _putchar() {
    Module["printErr"]("missing function: putchar");
    abort(-1)
  }

  function _puts(s) {
    var result = Pointer_stringify(s);
    var string = result.substr(0);
    if (string[string.length - 1] === "\n") string = string.substr(0, string.length - 1);
    Module.print(string);
    return result.length
  }

  function _schedule_background_exec() {
    ++MONO.pump_count;
    if (ENVIRONMENT_IS_WEB) {
      window.setTimeout(MONO.pump_message, 0)
    }
  }

  function _sem_destroy() {}

  function _sem_init() {}

  function _sem_post() {}

  function _sem_trywait() {}

  function _sem_wait() {}

  function _setenv(envname, envval, overwrite) {
    if (envname === 0) {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    var name = Pointer_stringify(envname);
    var val = Pointer_stringify(envval);
    if (name === "" || name.indexOf("=") !== -1) {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    if (ENV.hasOwnProperty(name) && !overwrite) return 0;
    ENV[name] = val;
    ___buildEnvironment(ENV);
    return 0
  }

  function _sigaction(signum, act, oldact) {
    return 0
  }

  function _sigemptyset(set) {
    HEAP32[set >> 2] = 0;
    return 0
  }

  function __isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  }

  function __arraySum(array, index) {
    var sum = 0;
    for (var i = 0; i <= index; sum += array[i++]);
    return sum
  }
  var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function __addDays(date, days) {
    var newDate = new Date(date.getTime());
    while (days > 0) {
      var leap = __isLeapYear(newDate.getFullYear());
      var currentMonth = newDate.getMonth();
      var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
      if (days > daysInCurrentMonth - newDate.getDate()) {
        days -= daysInCurrentMonth - newDate.getDate() + 1;
        newDate.setDate(1);
        if (currentMonth < 11) {
          newDate.setMonth(currentMonth + 1)
        } else {
          newDate.setMonth(0);
          newDate.setFullYear(newDate.getFullYear() + 1)
        }
      } else {
        newDate.setDate(newDate.getDate() + days);
        return newDate
      }
    }
    return newDate
  }

  function _strftime(s, maxsize, format, tm) {
    var tm_zone = HEAP32[tm + 40 >> 2];
    var date = {
      tm_sec: HEAP32[tm >> 2],
      tm_min: HEAP32[tm + 4 >> 2],
      tm_hour: HEAP32[tm + 8 >> 2],
      tm_mday: HEAP32[tm + 12 >> 2],
      tm_mon: HEAP32[tm + 16 >> 2],
      tm_year: HEAP32[tm + 20 >> 2],
      tm_wday: HEAP32[tm + 24 >> 2],
      tm_yday: HEAP32[tm + 28 >> 2],
      tm_isdst: HEAP32[tm + 32 >> 2],
      tm_gmtoff: HEAP32[tm + 36 >> 2],
      tm_zone: tm_zone ? Pointer_stringify(tm_zone) : ""
    };
    var pattern = Pointer_stringify(format);
    var EXPANSION_RULES_1 = {
      "%c": "%a %b %d %H:%M:%S %Y",
      "%D": "%m/%d/%y",
      "%F": "%Y-%m-%d",
      "%h": "%b",
      "%r": "%I:%M:%S %p",
      "%R": "%H:%M",
      "%T": "%H:%M:%S",
      "%x": "%m/%d/%y",
      "%X": "%H:%M:%S"
    };
    for (var rule in EXPANSION_RULES_1) {
      pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule])
    }
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function leadingSomething(value, digits, character) {
      var str = typeof value === "number" ? value.toString() : value || "";
      while (str.length < digits) {
        str = character[0] + str
      }
      return str
    }

    function leadingNulls(value, digits) {
      return leadingSomething(value, digits, "0")
    }

    function compareByDay(date1, date2) {
      function sgn(value) {
        return value < 0 ? -1 : value > 0 ? 1 : 0
      }
      var compare;
      if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
        if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
          compare = sgn(date1.getDate() - date2.getDate())
        }
      }
      return compare
    }

    function getFirstWeekStartDate(janFourth) {
      switch (janFourth.getDay()) {
        case 0:
          return new Date(janFourth.getFullYear() - 1, 11, 29);
        case 1:
          return janFourth;
        case 2:
          return new Date(janFourth.getFullYear(), 0, 3);
        case 3:
          return new Date(janFourth.getFullYear(), 0, 2);
        case 4:
          return new Date(janFourth.getFullYear(), 0, 1);
        case 5:
          return new Date(janFourth.getFullYear() - 1, 11, 31);
        case 6:
          return new Date(janFourth.getFullYear() - 1, 11, 30)
      }
    }

    function getWeekBasedYear(date) {
      var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
      var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
      var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
      var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
      var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
      if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
        if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
          return thisDate.getFullYear() + 1
        } else {
          return thisDate.getFullYear()
        }
      } else {
        return thisDate.getFullYear() - 1
      }
    }
    var EXPANSION_RULES_2 = {
      "%a": (function(date) {
        return WEEKDAYS[date.tm_wday].substring(0, 3)
      }),
      "%A": (function(date) {
        return WEEKDAYS[date.tm_wday]
      }),
      "%b": (function(date) {
        return MONTHS[date.tm_mon].substring(0, 3)
      }),
      "%B": (function(date) {
        return MONTHS[date.tm_mon]
      }),
      "%C": (function(date) {
        var year = date.tm_year + 1900;
        return leadingNulls(year / 100 | 0, 2)
      }),
      "%d": (function(date) {
        return leadingNulls(date.tm_mday, 2)
      }),
      "%e": (function(date) {
        return leadingSomething(date.tm_mday, 2, " ")
      }),
      "%g": (function(date) {
        return getWeekBasedYear(date).toString().substring(2)
      }),
      "%G": (function(date) {
        return getWeekBasedYear(date)
      }),
      "%H": (function(date) {
        return leadingNulls(date.tm_hour, 2)
      }),
      "%I": (function(date) {
        var twelveHour = date.tm_hour;
        if (twelveHour == 0) twelveHour = 12;
        else if (twelveHour > 12) twelveHour -= 12;
        return leadingNulls(twelveHour, 2)
      }),
      "%j": (function(date) {
        return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
      }),
      "%m": (function(date) {
        return leadingNulls(date.tm_mon + 1, 2)
      }),
      "%M": (function(date) {
        return leadingNulls(date.tm_min, 2)
      }),
      "%n": (function() {
        return "\n"
      }),
      "%p": (function(date) {
        if (date.tm_hour >= 0 && date.tm_hour < 12) {
          return "AM"
        } else {
          return "PM"
        }
      }),
      "%S": (function(date) {
        return leadingNulls(date.tm_sec, 2)
      }),
      "%t": (function() {
        return "\t"
      }),
      "%u": (function(date) {
        var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
        return day.getDay() || 7
      }),
      "%U": (function(date) {
        var janFirst = new Date(date.tm_year + 1900, 0, 1);
        var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
        var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
        if (compareByDay(firstSunday, endDate) < 0) {
          var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
          var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
          var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
          return leadingNulls(Math.ceil(days / 7), 2)
        }
        return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
      }),
      "%V": (function(date) {
        var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
        var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
        if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
          return "53"
        }
        if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
          return "01"
        }
        var daysDifference;
        if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
          daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
        } else {
          daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
        }
        return leadingNulls(Math.ceil(daysDifference / 7), 2)
      }),
      "%w": (function(date) {
        var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
        return day.getDay()
      }),
      "%W": (function(date) {
        var janFirst = new Date(date.tm_year, 0, 1);
        var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
        var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
        if (compareByDay(firstMonday, endDate) < 0) {
          var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
          var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
          var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
          return leadingNulls(Math.ceil(days / 7), 2)
        }
        return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
      }),
      "%y": (function(date) {
        return (date.tm_year + 1900).toString().substring(2)
      }),
      "%Y": (function(date) {
        return date.tm_year + 1900
      }),
      "%z": (function(date) {
        var off = date.tm_gmtoff;
        var ahead = off >= 0;
        off = Math.abs(off) / 60;
        off = off / 60 * 100 + off % 60;
        return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
      }),
      "%Z": (function(date) {
        return date.tm_zone
      }),
      "%%": (function() {
        return "%"
      })
    };
    for (var rule in EXPANSION_RULES_2) {
      if (pattern.indexOf(rule) >= 0) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date))
      }
    }
    var bytes = intArrayFromString(pattern, false);
    if (bytes.length > maxsize) {
      return 0
    }
    writeArrayToMemory(bytes, s);
    return bytes.length - 1
  }

  function _sysconf(name) {
    switch (name) {
      case 30:
        return PAGE_SIZE;
      case 85:
        var maxHeapSize = 2 * 1024 * 1024 * 1024 - 65536;
        return maxHeapSize / PAGE_SIZE;
      case 132:
      case 133:
      case 12:
      case 137:
      case 138:
      case 15:
      case 235:
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 149:
      case 13:
      case 10:
      case 236:
      case 153:
      case 9:
      case 21:
      case 22:
      case 159:
      case 154:
      case 14:
      case 77:
      case 78:
      case 139:
      case 80:
      case 81:
      case 82:
      case 68:
      case 67:
      case 164:
      case 11:
      case 29:
      case 47:
      case 48:
      case 95:
      case 52:
      case 51:
      case 46:
        return 200809;
      case 79:
        return 0;
      case 27:
      case 246:
      case 127:
      case 128:
      case 23:
      case 24:
      case 160:
      case 161:
      case 181:
      case 182:
      case 242:
      case 183:
      case 184:
      case 243:
      case 244:
      case 245:
      case 165:
      case 178:
      case 179:
      case 49:
      case 50:
      case 168:
      case 169:
      case 175:
      case 170:
      case 171:
      case 172:
      case 97:
      case 76:
      case 32:
      case 173:
      case 35:
        return -1;
      case 176:
      case 177:
      case 7:
      case 155:
      case 8:
      case 157:
      case 125:
      case 126:
      case 92:
      case 93:
      case 129:
      case 130:
      case 131:
      case 94:
      case 91:
        return 1;
      case 74:
      case 60:
      case 69:
      case 70:
      case 4:
        return 1024;
      case 31:
      case 42:
      case 72:
        return 32;
      case 87:
      case 26:
      case 33:
        return 2147483647;
      case 34:
      case 1:
        return 47839;
      case 38:
      case 36:
        return 99;
      case 43:
      case 37:
        return 2048;
      case 0:
        return 2097152;
      case 3:
        return 65536;
      case 28:
        return 32768;
      case 44:
        return 32767;
      case 75:
        return 16384;
      case 39:
        return 1e3;
      case 89:
        return 700;
      case 71:
        return 256;
      case 40:
        return 255;
      case 2:
        return 100;
      case 180:
        return 64;
      case 25:
        return 20;
      case 5:
        return 16;
      case 6:
        return 6;
      case 73:
        return 4;
      case 84: {
        if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
        return 1
      }
    }
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
  }

  function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) {
      HEAP32[ptr >> 2] = ret
    }
    return ret
  }

  function _unsetenv(name) {
    if (name === 0) {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    name = Pointer_stringify(name);
    if (name === "" || name.indexOf("=") !== -1) {
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1
    }
    if (ENV.hasOwnProperty(name)) {
      delete ENV[name];
      ___buildEnvironment(ENV)
    }
    return 0
  }

  function _utime(path, times) {
    var time;
    if (times) {
      var offset = 4;
      time = HEAP32[times + offset >> 2];
      time *= 1e3
    } else {
      time = Date.now()
    }
    path = Pointer_stringify(path);
    try {
      FS.utime(path, time, time);
      return 0
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _utimes(path, times) {
    var time;
    if (times) {
      var offset = 8 + 0;
      time = HEAP32[times + offset >> 2] * 1e3;
      offset = 8 + 4;
      time += HEAP32[times + offset >> 2] / 1e3
    } else {
      time = Date.now()
    }
    path = Pointer_stringify(path);
    try {
      FS.utime(path, time, time);
      return 0
    } catch (e) {
      FS.handleFSError(e);
      return -1
    }
  }

  function _wait(stat_loc) {
    ___setErrNo(ERRNO_CODES.ECHILD);
    return -1
  }

  function _waitpid() {
    return _wait.apply(null, arguments)
  }
  if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = function _emscripten_get_now_actual() {
      var t = process["hrtime"]();
      return t[0] * 1e3 + t[1] / 1e6
    }
  } else if (typeof dateNow !== "undefined") {
    _emscripten_get_now = dateNow
  } else if (typeof self === "object" && self["performance"] && typeof self["performance"]["now"] === "function") {
    _emscripten_get_now = (function() {
      return self["performance"]["now"]()
    })
  } else if (typeof performance === "object" && typeof performance["now"] === "function") {
    _emscripten_get_now = (function() {
      return performance["now"]()
    })
  } else {
    _emscripten_get_now = Date.now
  }
  FS.staticInit();
  __ATINIT__.unshift((function() {
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init()
  }));
  __ATMAIN__.push((function() {
    FS.ignorePermissions = false
  }));
  __ATEXIT__.push((function() {
    FS.quit()
  }));
  Module["FS_createPath"] = FS.createPath;
  Module["FS_createDataFile"] = FS.createDataFile;
  __ATINIT__.unshift((function() {
    TTY.init()
  }));
  __ATEXIT__.push((function() {
    TTY.shutdown()
  }));
  if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var NODEJS_PATH = require("path");
    NODEFS.staticInit()
  }
  __ATINIT__.push((function() {
    SOCKFS.root = FS.mount(SOCKFS, {}, null)
  }));
  __ATINIT__.push((function() {
    PIPEFS.root = FS.mount(PIPEFS, {}, null)
  }));
  ___buildEnvironment(ENV);
  Module["pump_message"] = MONO.pump_message;
  DYNAMICTOP_PTR = staticAlloc(4);
  STACK_BASE = STACKTOP = alignMemory(STATICTOP);
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = alignMemory(STACK_MAX);
  HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
  staticSealed = true;

  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
  }
  Module["wasmTableSize"] = 69448;
  Module["wasmMaxTableSize"] = 69448;
  Module.asmGlobalArg = {};
  Module.asmLibraryArg = {
    "abort": abort,
    "enlargeMemory": enlargeMemory,
    "getTotalMemory": getTotalMemory,
    "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
    "___clock_gettime": ___clock_gettime,
    "___lock": ___lock,
    "___setErrNo": ___setErrNo,
    "___syscall10": ___syscall10,
    "___syscall102": ___syscall102,
    "___syscall118": ___syscall118,
    "___syscall12": ___syscall12,
    "___syscall122": ___syscall122,
    "___syscall125": ___syscall125,
    "___syscall140": ___syscall140,
    "___syscall142": ___syscall142,
    "___syscall144": ___syscall144,
    "___syscall145": ___syscall145,
    "___syscall146": ___syscall146,
    "___syscall15": ___syscall15,
    "___syscall168": ___syscall168,
    "___syscall183": ___syscall183,
    "___syscall191": ___syscall191,
    "___syscall192": ___syscall192,
    "___syscall194": ___syscall194,
    "___syscall195": ___syscall195,
    "___syscall196": ___syscall196,
    "___syscall197": ___syscall197,
    "___syscall199": ___syscall199,
    "___syscall20": ___syscall20,
    "___syscall201": ___syscall201,
    "___syscall202": ___syscall202,
    "___syscall209": ___syscall209,
    "___syscall219": ___syscall219,
    "___syscall220": ___syscall220,
    "___syscall221": ___syscall221,
    "___syscall268": ___syscall268,
    "___syscall272": ___syscall272,
    "___syscall3": ___syscall3,
    "___syscall33": ___syscall33,
    "___syscall340": ___syscall340,
    "___syscall38": ___syscall38,
    "___syscall39": ___syscall39,
    "___syscall4": ___syscall4,
    "___syscall40": ___syscall40,
    "___syscall41": ___syscall41,
    "___syscall42": ___syscall42,
    "___syscall5": ___syscall5,
    "___syscall54": ___syscall54,
    "___syscall6": ___syscall6,
    "___syscall63": ___syscall63,
    "___syscall77": ___syscall77,
    "___syscall85": ___syscall85,
    "___syscall91": ___syscall91,
    "___syscall96": ___syscall96,
    "___syscall97": ___syscall97,
    "___unlock": ___unlock,
    "__exit": __exit,
    "_abort": _abort,
    "_atexit": _atexit,
    "_clock_getres": _clock_getres,
    "_clock_gettime": _clock_gettime,
    "_emscripten_asm_const_i": _emscripten_asm_const_i,
    "_emscripten_asm_const_iii": _emscripten_asm_const_iii,
    "_emscripten_memcpy_big": _emscripten_memcpy_big,
    "_execve": _execve,
    "_exit": _exit,
    "_fork": _fork,
    "_getaddrinfo": _getaddrinfo,
    "_getenv": _getenv,
    "_getnameinfo": _getnameinfo,
    "_getprotobyname": _getprotobyname,
    "_getpwuid": _getpwuid,
    "_gettimeofday": _gettimeofday,
    "_gmtime_r": _gmtime_r,
    "_kill": _kill,
    "_llvm_trap": _llvm_trap,
    "_localtime_r": _localtime_r,
    "_mono_set_timeout": _mono_set_timeout,
    "_mono_wasm_add_bool_var": _mono_wasm_add_bool_var,
    "_mono_wasm_add_float_var": _mono_wasm_add_float_var,
    "_mono_wasm_add_frame": _mono_wasm_add_frame,
    "_mono_wasm_add_int_var": _mono_wasm_add_int_var,
    "_mono_wasm_add_long_var": _mono_wasm_add_long_var,
    "_mono_wasm_add_string_var": _mono_wasm_add_string_var,
    "_mono_wasm_fire_bp": _mono_wasm_fire_bp,
    "_nanosleep": _nanosleep,
    "_pthread_cleanup_pop": _pthread_cleanup_pop,
    "_pthread_cleanup_push": _pthread_cleanup_push,
    "_pthread_cond_destroy": _pthread_cond_destroy,
    "_pthread_cond_init": _pthread_cond_init,
    "_pthread_cond_signal": _pthread_cond_signal,
    "_pthread_cond_timedwait": _pthread_cond_timedwait,
    "_pthread_cond_wait": _pthread_cond_wait,
    "_pthread_getspecific": _pthread_getspecific,
    "_pthread_key_create": _pthread_key_create,
    "_pthread_key_delete": _pthread_key_delete,
    "_pthread_mutex_destroy": _pthread_mutex_destroy,
    "_pthread_mutex_init": _pthread_mutex_init,
    "_pthread_mutexattr_destroy": _pthread_mutexattr_destroy,
    "_pthread_mutexattr_init": _pthread_mutexattr_init,
    "_pthread_mutexattr_settype": _pthread_mutexattr_settype,
    "_pthread_setcancelstate": _pthread_setcancelstate,
    "_pthread_setspecific": _pthread_setspecific,
    "_putchar": _putchar,
    "_puts": _puts,
    "_schedule_background_exec": _schedule_background_exec,
    "_sem_destroy": _sem_destroy,
    "_sem_init": _sem_init,
    "_sem_post": _sem_post,
    "_sem_trywait": _sem_trywait,
    "_sem_wait": _sem_wait,
    "_setenv": _setenv,
    "_sigaction": _sigaction,
    "_sigemptyset": _sigemptyset,
    "_strftime": _strftime,
    "_sysconf": _sysconf,
    "_time": _time,
    "_unsetenv": _unsetenv,
    "_utime": _utime,
    "_utimes": _utimes,
    "_waitpid": _waitpid,
    "DYNAMICTOP_PTR": DYNAMICTOP_PTR,
    "STACKTOP": STACKTOP,
    "_environ": _environ
  };
  var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  Module["asm"] = asm;
  ___errno_location = Module["___errno_location"] = (function() {
    return Module["asm"]["___errno_location"].apply(null, arguments)
  });

  _emscripten_replace_memory = Module["_emscripten_replace_memory"] = (function() {
    return Module["asm"]["_emscripten_replace_memory"].apply(null, arguments)
  });

  _free = Module["_free"] = (function() {
    return Module["asm"]["_free"].apply(null, arguments)
  });

  _htonl = Module["_htonl"] = (function() {
    return Module["asm"]["_htonl"].apply(null, arguments)
  });

  _htons = Module["_htons"] = (function() {
    return Module["asm"]["_htons"].apply(null, arguments)
  });

  _malloc = Module["_malloc"] = (function() {
    return Module["asm"]["_malloc"].apply(null, arguments)
  });

  _memalign = Module["_memalign"] = (function() {
    return Module["asm"]["_memalign"].apply(null, arguments)
  });

  _memset = Module["_memset"] = (function() {
    return Module["asm"]["_memset"].apply(null, arguments)
  });

  _mono_background_exec = Module["_mono_background_exec"] = (function() {
    return Module["asm"]["_mono_background_exec"].apply(null, arguments)
  });

  _mono_print_method_from_ip = Module["_mono_print_method_from_ip"] = (function() {
    return Module["asm"]["_mono_print_method_from_ip"].apply(null, arguments)
  });

  _mono_set_timeout_exec = Module["_mono_set_timeout_exec"] = (function() {
    return Module["asm"]["_mono_set_timeout_exec"].apply(null, arguments)
  });

  _mono_wasm_assembly_find_class = Module["_mono_wasm_assembly_find_class"] = (function() {
    return Module["asm"]["_mono_wasm_assembly_find_class"].apply(null, arguments)
  });

  _mono_wasm_assembly_find_method = Module["_mono_wasm_assembly_find_method"] = (function() {
    return Module["asm"]["_mono_wasm_assembly_find_method"].apply(null, arguments)
  });

  _mono_wasm_assembly_load = Module["_mono_wasm_assembly_load"] = (function() {
    return Module["asm"]["_mono_wasm_assembly_load"].apply(null, arguments)
  });

  _mono_wasm_current_bp_id = Module["_mono_wasm_current_bp_id"] = (function() {
    return Module["asm"]["_mono_wasm_current_bp_id"].apply(null, arguments)
  });

  _mono_wasm_enum_frames = Module["_mono_wasm_enum_frames"] = (function() {
    return Module["asm"]["_mono_wasm_enum_frames"].apply(null, arguments)
  });

  _mono_wasm_get_var_info = Module["_mono_wasm_get_var_info"] = (function() {
    return Module["asm"]["_mono_wasm_get_var_info"].apply(null, arguments)
  });

  _mono_wasm_invoke_method = Module["_mono_wasm_invoke_method"] = (function() {
    return Module["asm"]["_mono_wasm_invoke_method"].apply(null, arguments)
  });

  _mono_wasm_load_runtime = Module["_mono_wasm_load_runtime"] = (function() {
    return Module["asm"]["_mono_wasm_load_runtime"].apply(null, arguments)
  });

  _mono_wasm_set_breakpoint = Module["_mono_wasm_set_breakpoint"] = (function() {
    return Module["asm"]["_mono_wasm_set_breakpoint"].apply(null, arguments)
  });

  _mono_wasm_string_from_js = Module["_mono_wasm_string_from_js"] = (function() {
    return Module["asm"]["_mono_wasm_string_from_js"].apply(null, arguments)
  });

  _mono_wasm_string_get_utf8 = Module["_mono_wasm_string_get_utf8"] = (function() {
    return Module["asm"]["_mono_wasm_string_get_utf8"].apply(null, arguments)
  });

  _ntohs = Module["_ntohs"] = (function() {
    return Module["asm"]["_ntohs"].apply(null, arguments)
  });

  _wasm_get_stack_base = Module["_wasm_get_stack_base"] = (function() {
    return Module["asm"]["_wasm_get_stack_base"].apply(null, arguments)
  });

  _wasm_get_stack_size = Module["_wasm_get_stack_size"] = (function() {
    return Module["asm"]["_wasm_get_stack_size"].apply(null, arguments)
  });

  stackAlloc = Module["stackAlloc"] = (function() {
    return Module["asm"]["stackAlloc"].apply(null, arguments)
  });

  stackRestore = Module["stackRestore"] = (function() {
    return Module["asm"]["stackRestore"].apply(null, arguments)
  });

  stackSave = Module["stackSave"] = (function() {
    return Module["asm"]["stackSave"].apply(null, arguments)
  });

  dynCall_v = Module["dynCall_v"] = (function() {
    return Module["asm"]["dynCall_v"].apply(null, arguments)
  });

  dynCall_vi = Module["dynCall_vi"] = (function() {
    return Module["asm"]["dynCall_vi"].apply(null, arguments)
  });

  Module.asm = asm;
  Module.ccall = ccall;
  Module.cwrap = cwrap;
  Module.setValue = setValue;
  Module.getValue = getValue;
  Module.UTF8ToString = UTF8ToString;
  Module.FS_createPath = FS.createPath;
  Module.FS_createDataFile = FS.createDataFile;

  function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
  }
  ExitStatus.prototype = new Error;
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"]) run();
    if (!Module["calledRun"]) dependenciesFulfilled = runCaller
  };

  function run(args) {
    args = args || Module["arguments"];
    if (runDependencies > 0) {
      return
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module["calledRun"]) return;

    function doRun() {
      if (Module["calledRun"]) return;
      Module["calledRun"] = true;
      if (ABORT) return;
      ensureInitRuntime();
      preMain();
      if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"](resolve);
      postRun()
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout((function() {
        setTimeout((function() {
          Module["setStatus"]("")
        }), 1);
        doRun()
      }), 1)
    } else {
      doRun()
    }
  }
  Module["run"] = run;

  function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"] && status === 0) {
      return
    }
    if (Module["noExitRuntime"]) {} else {
      ABORT = true;
      EXITSTATUS = status;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module["onExit"]) Module["onExit"](status)
    }
    /*if (ENVIRONMENT_IS_NODE) {
      process["exit"](status)
    }*/

    Module["quit"](status, new ExitStatus(status))
  }
  Module["exit"] = exit;

  function abort(what) {
    if (Module["onAbort"]) {
      Module["onAbort"](what)
    }
    if (what !== undefined) {
      //Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what)
    } else {
      what = ""
    }
    ABORT = true;
    EXITSTATUS = 1;
    throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info."
  }
  Module["abort"] = abort;
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
      Module["preInit"].pop()()
    }
  }
  Module["noExitRuntime"] = true;
  run();


});

module.exports = {
  initializeMonoEnvironment,
  Module,
  MonoRuntime,
  WebAssemblyApp,
};
