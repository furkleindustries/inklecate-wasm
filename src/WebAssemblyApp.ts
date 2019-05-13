import {
  assertValid,
} from 'ts-assertions';

const getModule = () => require('./Module').Module;
const getRuntime = () => require('./MonoRuntime').MonoRuntime;

export class WebAssemblyApp {
  public static wasmSession: string;

  public static readonly init = () => {
    getRuntime().callMethod(WebAssemblyApp.mainMethod, null, []);
    WebAssemblyApp.wasmSession = 'main';
  };

  public static readonly mainAssembly = assertValid<number>(
    getRuntime().assemblyLoad(getModule().entryPoint.assemblyName),
    `Could not find main module "${getModule().entryPoint.assemblyName}.dll".`,
  );

  public static readonly mainClass = assertValid<number>(
    getRuntime().findClass(
      WebAssemblyApp.mainAssembly,
      getModule().entryPoint.namespace,
      getModule().entryPoint.className,
    ),
    `Could not find class "${getModule().entryPoint.className}" in module "${getModule().entryPoint.assemblyName}".`,
  );

  public static readonly mainMethod = assertValid<number>(
    getRuntime().findMethod(WebAssemblyApp.mainClass, getModule().entryPoint.mainMethodName, -1),
    `Could not find method "${getModule().entryPoint.mainMethodName}" in class "${WebAssemblyApp.mainClass}" of assembly "${WebAssemblyApp.mainAssembly}".`,
  );
}
