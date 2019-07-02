export function __arraySum(array: any[], index: number) {
  let sum = 0;
  for (let ii = 0; ii <= index; sum += array[ii++]);
  return sum;
}
