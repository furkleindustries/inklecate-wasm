import {
  _setprotoent,
} from './_setprotoent';
import {
  pointerStringify,
} from './pointers/pointerStringify';
import {
  Protocols,
} from './Protocols';

function _getprotobyname(name: any) {
  name = pointerStringify(name);
  _setprotoent(true);
  var result = Protocols.map[name];
  return result;
}
