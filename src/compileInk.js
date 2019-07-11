export const compileInk = (Module, MonoRuntime, text) => {
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

  let cb;
  let oldWrite;
  const writeExists = process &&
    process.stdout &&
    typeof process.stdout.write === 'function';

  if (writeExists) {
    oldWrite = process.stdout.write;
    cb = function (string) {
      if (/^(error|warning):?\s/i.test(string)) {
        returnObj.compilerOutput.push(string);
      } else {
        console.warn(string);
      }
    };

    process.stdout.write = cb;
  }

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

  if (writeExists) {
    process.stdout.write = oldWrite;
  }

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
