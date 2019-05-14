export const PATH = {
  splitPath: (filename: string) => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename)!.slice(1)
  },

  normalizeArray: (parts: string[], allowAboveRoot: boolean) => {
    let up = 0;
    for (var ii = parts.length - 1; ii >= 0; ii -= 1) {
      var last = parts[ii];
      if (last === '.') {
        parts.splice(ii, 1);
      } else if (last === '..') {
        parts.splice(ii, 1);
        up += 1;
      } else if (up) {
        parts.splice(ii, 1);
        up -= 1;
      }
    }

    if (allowAboveRoot) {
      for (; up; up -= 1) {
        parts.unshift('..');
      }
    }

    return parts;
  },

  normalize: (path: string) => {
    let isAbsolute = path.charAt(0) === '/';
    let trailingSlash = path.substr(-1) === '/';
    path = PATH.normalizeArray(
      path.split('/').filter(Boolean),
      !isAbsolute,
    ).join('/');

    if (!path && !isAbsolute) {
      path = '.';
    }

    if (path && trailingSlash) {
      path += '/';
    }

    return `${isAbsolute ? '/' : ''}${path}`;
  },

  dirname: (path: string) => {
    let result = PATH.splitPath(path);
    let root = result[0];
    let dir = result[1];
    if (!root && !dir) {
      return '.';
    } else if (dir) {
      dir = dir.substr(0, dir.length - 1);
    }

    return `${root}${dir}`;
  },

  basename: (path: string) => {
    if (path === '/') {
      return '/';
    }

    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return path;
    }

    return path.substr(lastSlash + 1)
  },

  extname: (path: string) => PATH.splitPath(path)[3],
  join: (...args: string[]) => PATH.normalize(args.join('/')),
  join2: (left: string, right: string) => PATH.normalize(`${left}/${right}`),
  resolve: (...args: any[]) => {
    let resolvedPath = '';
    let resolvedAbsolute = false;
    for (var ii = args.length - 1; ii >= -1 && !resolvedAbsolute; ii -= 1) {
      const path = ii >= 0 ? args[ii] : FS.cwd();
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings.');
      } else if (!path) {
        return '';
      }

      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charAt(0) === '/';
    }

    resolvedPath = PATH.normalizeArray(
      resolvedPath.split('/').filter(Boolean),
      !resolvedAbsolute,
    ).join('/');

    return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
  },

  relative: (from: string, to: string) => {
    from = PATH.resolve(from).substr(1);
    to = PATH.resolve(to).substr(1);
    const trim = (arr: string[]) => {
      let start = 0;
      for (; start < arr.length; start += 1) {
        if (arr[start] !== '') {
          break;
        }
      }

      let end = arr.length - 1;
      for (; end >= 0; end -= 1) {
        if (arr[end] !== '') {
          break;
        }
      }

      if (start > end) {
        return [];
      }

      return arr.slice(start, end - start + 1);
    }

    const fromParts = trim(from.split("/"));
    const toParts = trim(to.split("/"));
    const length = Math.min(fromParts.length, toParts.length);
    let samePartsLength = length;
    for (let ii = 0; ii < length; ii += 1) {
      if (fromParts[ii] !== toParts[ii]) {
        samePartsLength = ii;
        break;
      }
    }

    let outputParts = [];
    for (let ii = samePartsLength; ii < fromParts.length; ii += 1) {
      outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
  },
};