import {
  assert,
} from 'ts-assertions';

export const getNativeTypeSize = (type: string) => {
  if (type === 'i1' || type === 'i8') {
    return 1;
  } else if (type === 'i16') {
    return 2;
  } else if (type === 'i32') {
    return 4;
  } else if (type === 'i64') {
    return 8;
  } else if (type === 'float') {
    return 4;
  } else if (type === 'double') {
    return 8;
  } else {
    if (type[type.length - 1] === '*') {
      return 4;
    } else if (type[0] === 'i') {
      var bits = parseInt(type.substr(1));
      assert(bits % 8 === 0);
      return bits / 8;
    } else {
      return 0;
    }
  }
};
