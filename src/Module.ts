import DEBUG from './DEBUG';

import {
  log,
} from 'colorful-logging';
import {
  Module as _Module,
} from './mono';
import {
  assertValid,
} from 'ts-assertions';

import inkCompiler from './bin/Release/netcoreapp3.0/ink_compiler.dll';
import inkEngineRuntime from './bin/Release/netcoreapp3.0/ink-engine-runtime.dll';
import inklecateWasm from './bin/Release/netcoreapp3.0/dist/managed/inklecate_wasm.dll';
//import system from './managed/System.dll';
//import systemCore from './managed/System.Core.dll';

const mixin = {
  assemblies: Object.freeze([
    inkCompiler,
    inkEngineRuntime,
    inklecateWasm,
    //system,
    //systemCore,
  ]),

  entryPoint: Object.freeze({
    assemblyName: 'inklecate_wasm',
    namespace: 'inklecate_wasm',
    className: 'Program',
    mainMethodName: 'Main',
    inklecateCompileName: 'Compile',
    inklecatePlayName: 'Play',
  }),

  onRuntimeInitialized: () => {
    if (DEBUG) {
      log('Done with WASM module instantiation.');
    }

    Module.FS_createPath('/', 'managed', true, true);

    let pending = 0;
    const failMsg = `Failed to load assembly "%0".`;

    Module.assemblies.forEach((asmName: string) => {
      if (DEBUG) {
        log(`Loading assembly "${asmName}".`);
      }

      pending += 1;

      fetch(`managed/${asmName}`, { credentials: 'same-origin' }, ).then(({
        arrayBuffer,
        ok,
      }) => assertValid<() => ArrayBuffer>(
        arrayBuffer,
        failMsg.replace('%0', asmName),
        () => ok,
      )()).then((blob) => {
        Module.FS_createDataFile(
          `managed/${asmName}`,
          null,
          new Uint8Array(blob),
          true,
          true,
          true,
        );

        pending -= 1;
        if (!pending) {
          Module.bclLoadingDone();
        }
      });
    });
  },

  bclLoadingDone: () => {
    if (DEBUG) {
      log('Done loading the BCL.');
    }

    require('./MonoRuntime').MonoRuntime.init();
  },
};

export const Module = Object.assign({}, _Module, mixin);
