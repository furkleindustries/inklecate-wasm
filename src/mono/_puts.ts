import {
  Module,
} from './Module';
import {
  pointerStringify,
} from './pointers/pointerStringify';
import {
  assertValid,
} from 'ts-assertions';

export function _puts(s: number) {
  const result = assertValid<string>(pointerStringify(s));
  let string = result.substr(0);
  if (string[string.length - 1] === "\n") {
    string = string.substr(0, string.length - 1);
  }

  Module.print(string);

  return result.length;
}
