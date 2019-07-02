import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  FS,
} from '../FS/FS';
import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  _malloc,
} from '../../_malloc';
import {
  throwFromErrorNumber,
} from '../../TTYClass';
import {
  assertValid,
} from 'ts-assertions';

const BaseMemfs = getGlobalValue('MEMFS') || {};

export class MemfsClass extends BaseMemfs {
  public ops_table = getOpsTable(this);

  public readonly mount = (mount: never) => this.createNode(
    null,
    '/',
    16384 | 511,
    0,
  );

  public readonly createNode = (
    parent: MemNode | null,
    name: string,
    mode: number,
    dev: number,
  ) => {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      throwFromErrorNumber(ErrorNumberCodes.EPERM);
    }

    if (!this.ops_table) {
      this.ops_table = getOpsTable(this);
    }

    const node: MemNode = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = this.ops_table.dir.node;
      node.stream_ops = this.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = this.ops_table.file.node;
      node.stream_ops = this.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = null;
    } else if (FS.isLink(node.mode)) {
      node.node_ops = this.ops_table.link.node;
      node.stream_ops = this.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = this.ops_table.chrdev.node;
      node.stream_ops = this.ops_table.chrdev.stream;
    }

    node.timestamp = Date.now();
    if (parent) {
      // @ts-ignore
      parent.contents[name] = node;
    }

    return node;
  };

  public readonly getFileDataAsRegularArray = (node: MemNode) => {
    if (node.contents &&
        // @ts-ignore
        typeof node.contents.subarray === 'function')
    {
      let arr: number[] = [];
      for (let ii = 0; ii < node.usedBytes; ii += 1) {
        arr.push((node.contents as Buffer)[ii]);
      }

      return arr;
    }

    return node.contents;
  };

  public readonly getFileDataAsTypedArray = ({ contents }: MemNode) => {
    if (!contents) {
      return new Uint8Array();
    } else if (
      // @ts-ignore
      contents.subarray)
    {
      // @ts-ignore
      return contents.subarray(0, node.usedBytes);
    }

    return new Uint8Array(contents as Buffer);
  };

  public readonly expandFileStorage = (node: MemNode, newCapacity: number) => {
    if (node.contents &&
        // @ts-ignore
        node.contents.subarray &&
        newCapacity > node.contents.length)
    {
      node.contents = this.getFileDataAsRegularArray(node);
      node.usedBytes = (node.contents || []).length;
    }

    if (!node.contents ||
        // @ts-ignore
        node.contents.subarray)
    {
      const prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity) {
        return;
      }

      const CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(
        newCapacity,
        prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0,
      );

      if (prevCapacity !== 0) {
        newCapacity = Math.max(newCapacity, 256);
      }

      const oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity);
      if (node.usedBytes > 0) {
        node.contents.set(
          // @ts-ignore
          oldContents.subarray(
            0,
            node.usedBytes,
          ),
          0,
        );
      }

      return;
    } else if (!node.contents && newCapacity > 0) {
      node.contents = [];
    }

    while (node.contents.length < newCapacity) {
      // @ts-ignore
      node.contents.push(0);
    }
  };

  public resizeFileStorage = (node: MemNode, newSize: number) => {
    if (node.usedBytes == newSize) {
      return;
    } else if (newSize == 0) {
      node.contents = [];
      node.usedBytes = 0;
      return;
    } else if (!node.contents ||
               // @ts-ignore
               node.contents.subarray)
    {
      var oldContents = node.contents;
      node.contents = new Uint8Array(new ArrayBuffer(newSize));
      if (oldContents) {
        node.contents.set(
          // @ts-ignore
          oldContents.subarray(
            0,
            Math.min(newSize, node.usedBytes),
          ),
        );
      }

      node.usedBytes = newSize;
      return;
    }
    
    if (!node.contents) {
      node.contents = [];
    }

    if (node.contents.length > newSize) {
      // @ts-ignore
      node.contents.length = newSize;
    } else {
      while (node.contents.length < newSize) {
        // @ts-ignore
        node.contents.push(0);
      }
    }

    node.usedBytes = newSize;
  };

  public readonly node_ops = Object.freeze({
    getattr: (node: MemNode): MemNodeAttr => {
      let size;
      if (FS.isDir(node.mode)) {
        size = 4096;
      } else if (FS.isFile(node.mode)) {
        size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        size = node.link.length;
      } else {
        size = 0;
      }

      const blksize = 4096;

      return {
        blksize,
        size,
        atime: new Date(node.timestamp),
        blocks: Math.ceil(size / blksize),
        ctime: new Date(node.timestamp),
        dev: FS.isChrdev(node.mode) ? node.id : 1,
        gid: 0,
        ino: node.id,
        mode: node.mode,
        nlink: 1,
        uid: 0,
        rdev: node.rdev,
        mtime: new Date(node.timestamp),
      };
    },

    setattr: (
      node: MemNode,
      attr: MemNodeAttr,
    ) => {
      if (attr.mode !== undefined) {
        node.mode = attr.mode;
      }

      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp;
      }

      if (attr.size !== undefined) {
        this.resizeFileStorage(node, attr.size);
      }
    },

    lookup: (parent: MemNode, name: string) => {
      throw FS.genericErrors[ErrorNumberCodes.ENOENT];
    },

    mknod: (parent: MemNode, name: string, mode: number, dev: number) => (
      this.createNode(parent, name, mode, dev)
    ),

    rename: (old_node: MemNode, new_dir: MemNode, new_name: string) => {
      if (FS.isDir(old_node.mode)) {
        let new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}

        if (new_node && Object.keys(new_node.contents).length) {
          throwFromErrorNumber(ErrorNumberCodes.ENOTEMPTY);
        }
      }

      // @ts-ignore
      delete old_node.parent.contents[old_node.name];
      old_node.name = new_name;
      (new_dir.contents as any)[new_name] = old_node;
      old_node.parent = new_dir;
    },

    unlink: (parent: MemNode, name: string) => (
      void delete (parent.contents as any)[name]
    ),

    rmdir: (parent: MemNode, name: string) => {
      const node = FS.lookupNode(parent, name);
      if (Object.keys(node.contents)) {
        throwFromErrorNumber(ErrorNumberCodes.ENOTEMPTY);
      }

      delete (parent.contents as any)[name];
    },

    readdir: ({ contents }: MemNode) => {
      const entries = [
        '.',
        '..',
      ];

      for (let key in contents) {
        if (!contents.hasOwnProperty(key)) {
          continue
        }

        entries.push(key);
      }

      return entries;
    },

    symlink: (parent: MemNode, newname: string, oldpath: any) => {
      const node = this.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node
    },
    readlink: (node: MemNode) => {
      if (!FS.isLink(node.mode)) {
        throwFromErrorNumber(ErrorNumberCodes.EINVAL);
      }
      return node.link
    },
  });

  readonly stream_ops = Object.freeze({
    read: (
      { node }: { node: MemNode },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      const contents = node.contents;
      if (position >= node.usedBytes) {
        return 0;
      }

      const size = assertValid<number>(
        Math.min(node.usedBytes - position, length),
        'The size of the MEMFS value was negative.',
        (value) => value >= 0,
      );

      // @ts-ignore
      if (size > 8 && contents.subarray) {
        // @ts-ignore
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (let ii = 0; ii < size; ii += 1) {
          buffer[offset + ii] = (contents as any)[position + ii];
        }
      }

      return size;
    },

    write: (
      { node }: { node: MemNode },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
      canOwn: boolean,
    ) => {
      if (!length) {
        return 0;
      }

      node.timestamp = Date.now();
      if (buffer.subarray &&
          (!node.contents ||
          // @ts-ignore
          node.contents.subarray))
      {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = new Uint8Array(
            buffer.subarray(offset, offset + length)
          );

          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          // @ts-ignore
          node.contents.set(
            buffer.subarray(offset, offset + length),
            position,
          );

          return length;
        }
      }

      this.expandFileStorage(node, position + length);
      // @ts-ignore
      if (node.contents.subarray &&
          buffer.subarray)
      {
        // @ts-ignore
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (let ii = 0; ii < length; ii++) {
          (node.contents as any)[position + ii] = buffer[offset + ii];
        }
      }

      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    },

    llseek: (
      stream: {
        node: MemNode,
        position: number,
      },

      offset: number,
      whence: number,
    ) => {
      let position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }

      if (position < 0) {
        throwFromErrorNumber(ErrorNumberCodes.EINVAL);
      }

      return position;
    },

    allocate: (stream: { node: MemNode }, offset: number, length: number) => {
      this.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    },

    mmap: (
      stream: { node: MemNode },
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
      prot: any,
      flags: any,
    ) => {
      if (!FS.isFile(stream.node.mode)) {
        throwFromErrorNumber(ErrorNumberCodes.ENODEV);
      }

      let ptr;
      let allocated;
      let contents = stream.node.contents;
      if (!(flags & 2) &&
          // @ts-ignore
          (contents.buffer === buffer || contents.buffer === buffer.buffer))
      {
        allocated = false;
        // @ts-ignore
        ptr = contents.byteOffset;
      } else {
        if (position > 0 || position + length < stream.node.usedBytes) {
          // @ts-ignore
          if (contents.subarray) {
            // @ts-ignore
            contents = contents.subarray(
              position,
              position + length,
            );
          } else {
            contents = Array.prototype.slice.call(
              contents,
              position,
              position + length,
            );
          }
        }

        allocated = true;
        ptr = _malloc(length);
        if (!ptr) {
          throwFromErrorNumber(ErrorNumberCodes.ENOMEM);
        }

        buffer.set(contents as any, ptr)
      }

      return {
        ptr: ptr,
        allocated: allocated
      }
    },

    msync: (
      stream: { node: MemNode },
      buffer: Buffer,
      offset: number,
      length: number,
      mmapFlags: any,
    ) => {
      if (!FS.isFile(stream.node.mode)) {
        throwFromErrorNumber(ErrorNumberCodes.ENODEV);
      }

      if (mmapFlags & 2) {
        return 0;
      }

      const bytesWritten = this.stream_ops.write(
        stream,
        buffer,
        0,
        length,
        offset,
        false,
      );

      return 0;
    },
  });
};

export const getOpsTable = (MemFs: MemfsClass) => Object.freeze({
  dir: {
    node: {
      getattr: MemFs.node_ops.getattr,
      setattr: MemFs.node_ops.setattr,
      lookup: MemFs.node_ops.lookup,
      mknod: MemFs.node_ops.mknod,
      rename: MemFs.node_ops.rename,
      unlink: MemFs.node_ops.unlink,
      rmdir: MemFs.node_ops.rmdir,
      readdir: MemFs.node_ops.readdir,
      symlink: MemFs.node_ops.symlink
    },

    stream: { llseek: MemFs.stream_ops.llseek },
  },

  file: {
    node: {
      getattr: MemFs.node_ops.getattr,
      setattr: MemFs.node_ops.setattr
    },

    stream: {
      allocate: MemFs.stream_ops.allocate,
      llseek: MemFs.stream_ops.llseek,
      mmap: MemFs.stream_ops.mmap,
      msync: MemFs.stream_ops.msync,
      read: MemFs.stream_ops.read,
      write: MemFs.stream_ops.write,
    },
  },

  link: {
    node: {
      getattr: MemFs.node_ops.getattr,
      setattr: MemFs.node_ops.setattr,
      readlink: MemFs.node_ops.readlink
    },

    stream: {},
  },

  chrdev: {
    node: {
      getattr: MemFs.node_ops.getattr,
      setattr: MemFs.node_ops.setattr
    },

    stream: FS.chrdev_stream_ops,
  },
});



export interface MemNode {
  contents: Uint8Array | number[] | Record<string, any> | null;
  readonly id: number;
  link: { length: number };
  mode: number;
  name: string;
  node_ops: any;
  parent: MemNode;
  readonly rdev: number;
  stream_ops: any;
  usedBytes: number;
  timestamp: number;
}

export interface MemNodeAttr { 
  readonly atime: Date;
  readonly blksize: number;
  readonly blocks: number;
  readonly ctime: Date;
  readonly dev: number;
  readonly gid: 0;
  readonly ino: number;
  readonly mode: number;
  readonly mtime: Date;
  readonly nlink: 1;
  readonly size: number;
  readonly rdev: number;
  readonly timestamp?: number;
  readonly uid: 0;
}
