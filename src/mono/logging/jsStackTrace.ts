export const jsStackTrace = () => {
  let err = new Error();
  if (!err.stack) {
    try {
      throw new Error();
    } catch (e) {
      err = e;
    }

    if (!err.stack) {
      return '(no stack trace available)';
    }
  }

  return String(err.stack);
};
