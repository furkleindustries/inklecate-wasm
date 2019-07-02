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

export function _unsetenv(name: any) {
  if (name === 0) {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  name = pointerStringify(name);
  if (name === '' || name.indexOf('=') !== -1) {
    ___setErrNo(ErrorNumberCodes.EINVAL);
    return -1;
  }

  if (ENV.hasOwnProperty(name)) {
    delete ENV[name];
    ___buildEnvironment(ENV);
  }

  return 0;
}
