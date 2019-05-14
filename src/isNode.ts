export const isNode = () => (
  typeof process === 'object' &&
    process &&
    typeof require === 'function'
);