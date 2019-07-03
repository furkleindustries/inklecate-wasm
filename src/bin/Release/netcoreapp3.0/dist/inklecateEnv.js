const initInklecateEnvironment = () => {
  const findMethod = Module.cwrap(
    'mono_wasm_assembly_find_method',
    'number',
    [
      'number',
      'string',
      'number',
    ],
  );
  
  window.compile = (inputStr) => {
    const moduleName = Module.entryPoint.a;
    const modulePtr = MonoRuntime.assembly_load(moduleName);
    const nsName = Module.entryPoint.n;
    const className = Module.entryPoint.t;
    const classPtr = MonoRuntime.find_class(modulePtr, nsName, className);
    const methodPtr = MonoRuntime.find_method(classPtr, 'Test', 0);
    const ret = MonoRuntime.call_method(
      methodPtr,
      classPtr,
      [],
    );

    const retStr = MonoRuntime.conv_string(ret);
    return JSON.parse(retStr);    
  };
};
