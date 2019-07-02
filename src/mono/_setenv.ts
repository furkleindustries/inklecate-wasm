import {
  ___buildEnvironment,
} from './___buildEnvironment';
import {
  ___setErrNo,
} from './errors/___setErrNo';
import {
  ENV,
} from './env/ENV';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';
import {
  pointerStringify,
} from './pointers/pointerStringify';
import {
  assertValid,
} from 'ts-assertions';

export function _setenv(envname: number, envval: number, overwrite: boolean) {
  if (envname === 0) {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  const name = assertValid<string>(pointerStringify(envname));
  const val = pointerStringify(envval);
  if (name === '' || name!.indexOf('=') !== -1) {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  if (ENV.hasOwnProperty(name!) && !overwrite) {
    return 0;
  }

  ENV[name] = val;
  ___buildEnvironment(ENV);

  return 0;
}
