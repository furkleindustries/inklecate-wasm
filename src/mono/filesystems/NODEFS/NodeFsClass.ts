import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import fs from 'fs-extra';
import {
  getEnvType,
} from '../../getEnvVars';
import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  EnvironmentTypes,
} from '../../EnvironmentTypes';
import {
  FS,
} from '../FS/FS';
import {
  Module,
} from '../../Module';
import path from 'path';
import {
  PATH,
} from '../../PATH';
import {
  assert,
} from 'ts-assertions';
import {
  throwFromErrorNumber,
} from '../../TTYClass';

const envType = getEnvType(Module.ENVIRONMENT);

const BaseNodeFs = getGlobalValue('NODEFS') || {};

export class NodeFsClass extends BaseNodeFs {
  public isWindows = false;

  // @ts-ignore
  private readonly _flags = process.binding('constants').fs || process.binding('constants');
  public readonly flagsForNodeMap: Record<number, any> = {
    0: this._flags.O_RDONLY,
    1: this._flags.O_WRONLY,
    2: this._flags.O_RDWR,
    64: this._flags.O_CREAT,
    128: this._flags.O_EXCL,
    512: this._flags.O_TRUNC,
    1024: this._flags.O_APPEND,
    4096: this._flags.O_SYNC,
  };

  public readonly staticInit = () => {
    throw new Error('No longer used.');
  };

  public readonly bufferFrom = (arrayBuffer: ArrayBuffer) => (
    Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer)
  );

  public readonly mount = (mount: { opts: { root: string } }) => {
    assert(envType === EnvironmentTypes.Node);
    return this.createNode(null, '/', this.getMode(mount.opts.root), 0);
  };

  public readonly createNode = (
    parent: FsNode | null,
    name: string,
    mode: number,
    dev?: number,
  ) => {
    if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
      throwFromErrorNumber(ErrorNumberCodes.EINVAL);
    }

    return Object.assign(
      FS.createNode(parent, name, mode),
      {
        node_ops: this.node_ops,
        stream_ops: this.stream_ops,
      },
    );
  };

  public readonly getMode = (path: string) => {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(path);
      if (this.isWindows) {
        stat.mode = stat.mode | (stat.mode & 292) >> 2;
      }
    } catch (e) {
      if (!e.code) {
        throw e;
      }

      throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
    }

    return stat!.mode;
  };

  public readonly realPath = (node: FsNode) => {
    const parts = [];
    while (node.parent !== node) {
      parts.push(node.name);
      node = node.parent;
    }

    parts.push(node.mount.opts.root);
    parts.reverse();

    return PATH.join(...parts);
  };

  public readonly flagsForNode = (flags: number) => {
    flags &= ~2097152;
    flags &= ~2048;
    flags &= ~32768;
    flags &= ~524288;
    let newFlags = 0;
    for (let k in this.flagsForNodeMap) {
      if (flags & Number(k)) {
        newFlags |= this.flagsForNodeMap[k];
        flags ^= Number(k);
      }
    }

    if (!flags) {
      return newFlags;
    } else {
      return throwFromErrorNumber(ErrorNumberCodes.EINVAL);
    }
  };

  public readonly node_ops = Object.freeze({
    getattr: (node: FsNode) => {
      const path = this.realPath(node);
      let stat;
      try {
        stat = fs.lstatSync(path)
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
        return;
      }

      if (this.isWindows && !stat.blksize) {
        stat.blksize = 4096;
      }

      if (this.isWindows && !stat.blocks) {
        stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
      }

      return {
        atime: stat.atime,
        blksize: stat.blksize,
        blocks: stat.blocks,
        ctime: stat.ctime,
        dev: stat.dev,
        gid: stat.gid,
        ino: stat.ino,
        mode: stat.mode,
        mtime: stat.mtime,
        nlink: stat.nlink,
        rdev: stat.rdev,
        size: stat.size,
        uid: stat.uid,
      };
    },

    setattr: (node: FsNode, attr: {
      mode: number;
      size: number;
      timestamp: number;
    }) => {
      const path = this.realPath(node);
      try {
        if (attr.mode !== undefined) {
          fs.chmodSync(path, attr.mode);
          node.mode = attr.mode;
        }

        if (attr.timestamp !== undefined) {
          const date = new Date(attr.timestamp);
          fs.utimesSync(path, date, date)
        }

        if (attr.size !== undefined) {
          fs.truncateSync(path, attr.size)
        }
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    lookup: (parent: FsNode, name: string) => {
      const path = PATH.join2(this.realPath(parent), name);
      const mode = this.getMode(path);
      return this.createNode(parent, name, mode);
    },

    mknod: (parent: FsNode, name: string, mode: number, dev: number) => {
      var node = this.createNode(parent, name, mode, dev);
      var path = this.realPath(node);
      try {
        if (FS.isDir(node.mode)) {
          fs.mkdirSync(path, node.mode);
        } else {
          fs.writeFileSync(path, '', { mode: node.mode });
        }
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }

      return node;
    },

    rename: (oldNode: FsNode, newDir: FsNode, newName: string) => {
      const oldPath = this.realPath(oldNode);
      const newPath = PATH.join2(this.realPath(newDir), newName);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    unlink: (parent: FsNode, name: string) => {
      const path = PATH.join2(this.realPath(parent), name);
      try {
        fs.unlinkSync(path);
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    rmdir: (parent: FsNode, name: string) => {
      const path = PATH.join2(this.realPath(parent), name);
      try {
        fs.rmdirSync(path);
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    readdir: (node: FsNode) => {
      const path = this.realPath(node);
      try {
        return fs.readdirSync(path);
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    symlink: (parent: FsNode, newName: string, oldPath: string) => {
      var newPath = PATH.join2(this.realPath(parent), newName);
      try {
        fs.symlinkSync(oldPath, newPath);
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    readlink: (node: FsNode) => {
      let _path = this.realPath(node);
      try {
        _path = fs.readlinkSync(_path);
        _path = path.relative(path.resolve(node.mount.opts.root), _path);
        return path;
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },
  });

  public readonly stream_ops = Object.freeze({
    open: (stream: {
      flags: number,
      nfd: number,
      node: FsNode,
    }) => {
      const path = this.realPath(stream.node);
      try {
        if (FS.isFile(stream.node.mode)) {
          stream.nfd = fs.openSync(path, this.flagsForNode(stream.flags));
        }
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    close: (stream: {
      nfd: number,
      node: FsNode,
    }) => {
      try {
        if (FS.isFile(stream.node.mode) && stream.nfd) {
          fs.closeSync(stream.nfd);
        }
      } catch (e) {
        if (!e.code) {
          throw e;
        }

        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    read: (
      stream: { nfd: number },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      if (length === 0) {
        return 0;
      }

      try {
        return fs.readSync(
          stream.nfd,
          this.bufferFrom(buffer.buffer),
          offset,
          length,
          position,
        );
      } catch (e) {
        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    write: (
      stream: { nfd: number },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      try {
        return fs.writeSync(
          stream.nfd,
          this.bufferFrom(buffer.buffer),
          offset,
          length,
          position,
        );
      } catch (e) {
        throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
      }
    },

    llseek: (
      offset: number,
      stream: {
        nfd: number,
        node: { mode: number },
        position: number,
      },

      whence: number,
    ) => {
      let position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          try {
            const stat = fs.fstatSync(stream.nfd);
            position += stat.size;
          } catch (e) {
            throwFromErrorNumber(ErrorNumberCodes[e.code] as any);
          }
        }
      }

      if (position < 0) {
        throwFromErrorNumber(ErrorNumberCodes.EINVAL);
      }

      return position;
    },
  });
}

export interface FsNode {
  mode: number;
  mount: {
    opts: { root: string };    
  };

  name: string;
  parent: FsNode;
}
