import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  ErrorNumberCodes,
} from './errors/ErrorNumberCodes';
import {
  FS,
} from './FS';
import {
  getEnvType,
} from './getEnvVars';
import {
  getGlobalValue,
} from './getGlobalValue';
import {
  Module,
} from './Module';
import {
  assert,
} from 'ts-assertions';
import {
  throwFromErrorNumber,
} from './TTY';

const envType = getEnvType(Module.ENVIRONMENT);

const BaseWorkerFs = getGlobalValue('this');

declare class FileReaderSync {};

export class WorkerFsClass extends BaseWorkerFs {
  public readonly DIR_MODE = 16895;
  public readonly FILE_MODE = 33279;
  public reader: FileReaderSync | null = null;

  public readonly mount = ({
    opts,
  }: {
    opts: {
      blobs: WorkerFsBlob[];
      files: WorkerFsFile[];
      packages: WorkerFsPackage[];
    };
  }) => {
    assert(envType === EnvironmentTypes.Worker);
    if (!this.reader) {
      this.reader = new FileReaderSync();
    }

    const root = this.createNode(null, '/', this.DIR_MODE, 0);
    const createdParents: Record<string, WorkerFsNode> = {};
    const ensureParent = (path: string) => {
      const parts = path.split('/');
      let parent = root;
      for (let ii = 0; ii < parts.length - 1; ii += 1) {
        const curr = parts.slice(0, ii + 1).join('/');
        if (!createdParents[curr]) {
          createdParents[curr] = this.createNode(
            parent,
            parts[ii],
            this.DIR_MODE,
            0,
          );
        }

        parent = createdParents[curr];
      }

      return parent;
    };

    const base = (path: string) => {
      const parts = path.split('/');
      return parts[parts.length - 1]
    };

    Array.prototype.forEach.call(opts.files || [], (file: WorkerFsFile) => (
      this.createNode(
        ensureParent(file.name),
        base(file.name),
        this.FILE_MODE,
        0,
        // @ts-ignore
        file,
        file.lastModifiedDate,
      )
    ));

    (opts.blobs || []).forEach(({
      data,
      name,
    }) => this.createNode(
      ensureParent(name),
      base(name),
      this.FILE_MODE,
      0,
      // @ts-ignore
      data,
    ));

    let name;
    (opts.packages || []).forEach(({
      blob,
      metadata: { files },
    }) => (
      files.forEach(({
        end,
        filename,
        start,
      }: WorkerFsFile) => (
        name = filename.substr(1),
        this.createNode(
          ensureParent(name),
          base(name),
          this.FILE_MODE,
          0,
          blob.slice(start, end),
        )
      ))
    ));

    return root;
  };

  createNode = (
    parent: WorkerFsNode | null,
    name: string,
    mode?: number,
    dev?: number,
    contents?: { size: number },
    mtime?: Date,
  ): WorkerFsNode => {
    // @ts-ignore
    assert(this.FILE_MODE !== this.DIR_MODE);
    const node = Object.assign(
      FS.createNode(parent, name, mode),
      {
        mode,
        contents: mode === this.FILE_MODE ? contents : {},
        node_ops: this.node_ops,
        size: (
          mode === this.FILE_MODE ?
            (contents || { size: 4096 }).size :
            4096
        ),

        stream_ops: this.stream_ops,
        timestamp: (mtime || new Date()).getTime(),
      },
    );

    if (mode === this.FILE_MODE) {
      node.size = (contents || { size: 0 }).size;
      node.contents = contents;
    } else {
      node.size = 4096;
      node.contents = {};
    }

    if (parent) {
      (parent.contents as any)[name] = node;
    }

    return node;
  };

  public readonly node_ops = Object.freeze({
    getattr: (node: WorkerFsNode) => ({
      atime: new Date(node.timestamp),
      blksize: 4096,
      blocks: Math.ceil(node.size / 4096),
      ctime: new Date(node.timestamp),
      dev: 1,
      gid: 0,
      ino: undefined,
      mode: node.mode,
      mtime: new Date(node.timestamp),
      nlink: 1,
      rdev: undefined,
      size: node.size,
      uid: 0,
    }),

    setattr: (node: WorkerFsNode, attr: WorkerFsAttr) => {
      if (attr.mode !== undefined) {
        node.mode = attr.mode;
      }

      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp;
      }
    },

    lookup: (parent: never, name: never) => (
      throwFromErrorNumber(ErrorNumberCodes.ENOENT)
    ),

    mknod: (parent: never, name: never, mode: never, dev: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),

    rename: (oldNode: never, newDir: never, newName: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),

    unlink: (parent: never, name: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),

    rmdir: (parent: never, name: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),

    readdir: (node: WorkerFsNode) => {
      const entries = [
        '.',
        '..',
      ];

      for (let key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue;
        }

        entries.push(key);
      }

      return entries;
    },

    symlink: (parent: never, newName: never, oldPath: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),

    readlink: (node: never) => (
      throwFromErrorNumber(ErrorNumberCodes.EPERM)
    ),
  });

  public readonly stream_ops = Object.freeze({
    read: (
      stream: { node: WorkerFsNode },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      if (position >= stream.node.size) {
        return 0;
      }

      const chunk = stream.node.contents.slice(position, position + length);
      const ab = (this.reader as any).readAsArrayBuffer(chunk);
      buffer.set(new Uint8Array(ab), offset);

      // @ts-ignore
      return chunk.size;
    },

    write: (
      stream: never,
      buffer: never,
      offset: never,
      length: never,
      position: never,
    ) => throwFromErrorNumber(ErrorNumberCodes.EIO),

    llseek: (stream: {
      node: WorkerFsNode;
      position: number;
    }, offset: number, whence: number) => {
      let position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.size;
        }
      }

      if (position < 0) {
        throwFromErrorNumber(ErrorNumberCodes.EINVAL);
      }

      return position;
    },
  });
}

export interface WorkerFsNode {
  contents: Buffer;
  mode: number;
  name: string;
  parent: WorkerFsNode;
  size: number;
  timestamp: number;
}

export interface WorkerFsFile {
  end: number;
  filename: string;
  lastModifiedDate: number;
  name: string;
  start: number;
}

export interface WorkerFsPackage {
  blob: Blob;
  metadata: {
    files: WorkerFsFile[];
  };
}

export interface WorkerFsAttr {
  atime: Date;
  blksize: number;
  blocks: number,
  ctime: Date,
  dev: number;
  gid: number;
  ino?: any;
  mode: number,
  mtime: Date;
  nlink: number;
  rdev?: number;
  size: number;
  timestamp?: number;
  uid: number;
}

export interface WorkerFsBlob {
  data: Buffer;
  name: string;
}
