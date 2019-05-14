let exports = {};
export const getExports = () => exports;
export const setExports = (value: Record<string, any> | null) => (
  exports = value
);
