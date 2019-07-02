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
  Pipe,
} from 'stream';
import {
  assert,
} from 'ts-assertions';
import {
  throwFromErrorNumber,
} from '../../TTYClass';


/* TODO: remove the ! null-ignoring operators throughout file. */

const BasePipeFs = getGlobalValue('this') || {};

export class PipeFsClass extends BasePipeFs {
  public readonly BUCKET_BUFFER_SIZE = 8192;

  public current = 0;

  public readonly mount = (mount: never) => FS.createNode(
    null,
    '/',
    16384 | 511,
    0,
  );

  public readonly createNode = (name: string, root: unknown, pipe: Pipe) => {
    const node = FS.createNode(root, name, 4096, 0);
    node.pipe = pipe;
    return node;
  };

  public readonly createStream = (
    name: string,
    pipe: Pipe,
  ) => {
    const node = this.createNode(name, this.root, pipe);
    const stream = FS.createStream({
      node,
      flags: FS.modeStringToFlags('r'),
      path: name,
      seekable: false,
      stream_ops: this.stream_ops,
    });

    node.stream = stream;

    return stream;
  };

  public readonly createPipe = () => {
    const pipe = {
      buckets: [
        {
          buffer: new Uint8Array(this.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0,
        },
      ],
    };

    return {
      readable_fd: this.createStream(this.nextname(), pipe).fd,
      writable_fd: this.createStream(this.nextname(), pipe).fd,
    };
  };

  public readonly stream_ops = Object.freeze({
    poll: ({
      flags,
      node: {
        pipe: { buckets },
      },
    }: PipeFsStream) => {
      if ((flags & 2097155) === 1) {
        return 256 | 4;
      }

      for (const bucket of buckets!) {
        if (bucket.offset - bucket.roffset > 0) {
          return 64 | 1;
        }
      }

      return 0;
    },

    ioctl: (stream: never, request: never, varargs: never) => (
      ErrorNumberCodes.EINVAL
    ),

    read: (
      stream: PipeFsStream,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      if (length <= 0) {
        return 0;
      }

      const pipe = stream.node.pipe;
      let currentLength = 0;
      for (const bucket of pipe.buckets!) {
        currentLength += bucket.offset - bucket.roffset;
      }

      assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));

      let data = buffer.subarray(offset, offset + length);

      if (currentLength === 0) {
        throwFromErrorNumber(ErrorNumberCodes.EAGAIN);
      }

      let toRead = Math.min(currentLength, length);
      const totalRead = toRead;
      let toRemove = 0;
      for (const currBucket of pipe.buckets!) {
        const bucketSize = currBucket.offset - currBucket.roffset;
        if (toRead <= bucketSize) {
          let tmpSlice = currBucket.buffer.subarray(
            currBucket.roffset,
            currBucket.offset,
          );

          if (toRead < bucketSize) {
            tmpSlice = tmpSlice.subarray(0, toRead);
            currBucket.roffset += toRead;
          } else {
            toRemove += 1;
          }

          data.set(tmpSlice);
          break;
        } else {
          const tmpSlice = currBucket.buffer.subarray(
            currBucket.roffset,
            currBucket.offset,
          );

          data.set(tmpSlice);
          data = data.subarray(tmpSlice.byteLength);
          toRead -= tmpSlice.byteLength;
          toRemove++
        }
      }

      if (toRemove && toRemove === pipe.buckets!.length) {
        toRemove -= 1;
        pipe.buckets![toRemove].offset = 0;
        pipe.buckets![toRemove].roffset = 0
      }

      pipe.buckets!.splice(0, toRemove);
      return totalRead;
    },

    write: (
      stream: PipeFsStream,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) => {
      const pipe = stream.node.pipe;
      assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
      let data = buffer.subarray(offset, offset + length);
      const dataLen = data.byteLength;
      if (dataLen <= 0) {
        return 0;
      }

      let currBucket = null;
      if (pipe.buckets!.length === 0) {
        currBucket = {
          buffer: new Uint8Array(this.BUCKET_BUFFER_SIZE),
          roffset: 0,
          offset: 0,
        };

        pipe.buckets!.push(currBucket);
      } else {
        currBucket = pipe.buckets![pipe.buckets!.length - 1]
      }

      assert(currBucket.offset <= this.BUCKET_BUFFER_SIZE);
      const freeBytesInCurrBuffer = this.BUCKET_BUFFER_SIZE -
        currBucket.offset;

      if (freeBytesInCurrBuffer >= dataLen) {
        currBucket.buffer.set(data, currBucket.offset);
        currBucket.offset += dataLen;
        return dataLen;
      } else if (freeBytesInCurrBuffer > 0) {
        currBucket.buffer.set(
          data.subarray(0, freeBytesInCurrBuffer),
          currBucket.offset,
        );

        currBucket.offset += freeBytesInCurrBuffer;
        data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
      }

      const numBuckets = data.byteLength / this.BUCKET_BUFFER_SIZE | 0;
      const remElements = data.byteLength % this.BUCKET_BUFFER_SIZE;
      for (let ii = 0; ii < numBuckets; ii += 1) {
        const newBucket = {
          buffer: new Uint8Array(this.BUCKET_BUFFER_SIZE),
          offset: this.BUCKET_BUFFER_SIZE,
          roffset: 0,
        };

        pipe.buckets!.push(newBucket);
        newBucket.buffer.set(data.subarray(0, this.BUCKET_BUFFER_SIZE));
        data = data.subarray(this.BUCKET_BUFFER_SIZE, data.byteLength);
      }

      if (remElements > 0) {
        const newBucket = {
          buffer: new Uint8Array(this.BUCKET_BUFFER_SIZE),
          offset: data.byteLength,
          roffset: 0,
        };

        pipe.buckets!.push(newBucket);
        newBucket.buffer.set(data)
      }

      return dataLen;
    },

    close: ({
      node: { pipe },
    }: PipeFsStream) =>  pipe.buckets = null,
  });

  public readonly nextname = () => {
    if (!this.current) {
      this.current = 0;
    }

    const ret = `pipe[${this.current}]`;
    this.current += 1;

    return ret;
  };
}

export interface PipeFsStream {
  flags: number;
  node: {
    pipe: {
      buckets: Array<{
        buffer: Uint8Array;
        offset: number;
        roffset: number;
      }> | null;
    }
  }
}
