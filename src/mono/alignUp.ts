export const alignUp = (x: number, multiple: number) => (
  x % multiple > 0 ?
    x + multiple - x % multiple :
    x
);
