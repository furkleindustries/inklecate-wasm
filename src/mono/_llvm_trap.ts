import {
  abort,
} from './abort';

export function _llvm_trap() {
  abort('trap!');
}
