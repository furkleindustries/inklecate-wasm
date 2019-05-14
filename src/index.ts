export * from './mono/mono';
export * from './mono/MonoRuntime';
export * from './WebAssemblyApp';

import './bin/Release/netcoreapp3.0/ink_compiler.dll';
import './bin/Release/netcoreapp3.0/ink-engine-runtime.dll';
import './bin/Release/netcoreapp3.0/dist/mono.wasm';
import './bin/Release/netcoreapp3.0/dist/managed/inklecate_wasm.dll';
import './bin/Release/netcoreapp3.0/dist/managed/mscorlib.dll';

process.on('uncaughtException', (err) => { throw err; });
process.on('unhandledRejection', (err: any) => { throw new Error(err); });
