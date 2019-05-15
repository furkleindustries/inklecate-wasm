export const getGlobalContext = () => {
  let _self: Record<string | number | symbol, any>;
  // @ts-ignore
  if (this) {
    // @ts-ignore
    _self = this;
  } else if (global) {
    _self = global;
  } else if (window) {
    _self = window;
  } else if (self) {
    _self = self;
  } else {
    throw new Error(
      'No global context object (this, global, window, etc.) could be found.',
    );
  }

  return _self;
};
