import {
  EnvironmentTypes,
} from './EnvironmentTypes';
import {
  ErrorNumberCodes as ErrorNumberCodes,
} from './errors/ErrorNumberCodes';
import {
  FS,
} from './FS';
import fs from 'fs-extra';
import {
  getEnvType,
} from './getEnvVars';
import {
  intArrayFromString,
} from './emscripten/intArrayFromString';
import {
  Module,
} from './Module';
import {
  utf8ArrayToString,
} from './emscripten';

const envType = getEnvType(Module.ENVIRONMENT);

export interface TtyStream {
  node: {
    rdev: number;
    timestamp: number;
  };

  seekable: boolean;
  tty: TtyInstance;
}

export interface TtyInstance {
  input: number[];
  output: number[];
  ops: {
    [key: string]: any;
    flush(tty: TtyInstance): void;
    put_char(tty: TtyInstance, pos: number): void;    
  };
}

export class TTY {
  public readonly ttys: TtyInstance[] = [];
  public readonly init = () => {};
  public readonly shutdown = () => {};
  public readonly register = (dev: number, ops: any) => {
    this.ttys[dev] = {
      ops,
      input: [],
      output: [],
    };

    FS.registerDevice(dev, this.stream_ops);
  };

  public readonly stream_ops = Object.freeze({
    open: (stream: TtyStream) => {
      const tty = this.ttys[stream.node.rdev];
      if (!tty) {
        throwFromErrorNumber(ErrorNumberCodes.ENODEV);
      }

      stream.tty = tty;
      stream.seekable = false;
    },

    close: ({ tty }: TtyStream) => tty.ops.flush(tty),
    flush: ({ tty }: TtyStream) => tty.ops.flush(tty),
    read: (
      stream: TtyStream,
      buffer: Buffer,
      offset: number,
      length: number,
      pos: number,
    ) => {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throwFromErrorNumber(ErrorNumberCodes.ENXIO);
      }

      let bytesRead = 0;
      for (let ii = 0; ii < length; ii += 1) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty)
        } catch (e) {
          throwFromErrorNumber(ErrorNumberCodes.EIO);
        }

        if (result === undefined && bytesRead === 0) {
          throwFromErrorNumber(ErrorNumberCodes.EAGAIN);
        }

        if (result === null || result === undefined) {
          break;
        }

        bytesRead += 1;
        buffer[offset + ii] = result;
      }

      if (bytesRead) {
        stream.node.timestamp = Date.now();
      }

      return bytesRead;
    },

    write: (
      {
        node,
        tty,
        tty: {
          ops: { put_char },
        },
      }: TtyStream,

      buffer: Buffer,
      offset: number,
      length: number,
      pos: number,
    ) => {
      if (!tty || !put_char) {
        throwFromErrorNumber(ErrorNumberCodes.ENXIO);
      }

      let ii = 0;
      for (; ii < length; ii += 1) {
        try {
          put_char(tty, buffer[offset + ii]);
        } catch (e) {
          throwFromErrorNumber(ErrorNumberCodes.EIO);
        }
      }

      if (length) {
        node.timestamp = Date.now();
      }

      return ii;
    }
  });

  public readonly default_tty_ops = {
    get_char: (tty: TtyInstance) => {
      let usingDevice = false;
      if (!tty.input.length) {
        let result = null;
        if (envType === EnvironmentTypes.Node) {
          const BUFSIZE = 256;
          const buf = new Buffer(BUFSIZE);
          const isPosixPlatform = process.platform !== 'win32';
          let bytesRead = 0;

          // @ts-ignore
          let fd = process.stdin.fd;
          if (isPosixPlatform) {
            try {
              fd = fs.openSync('/dev/stdin', 'r');
              usingDevice = true
            } catch (e) {

            }
          }

          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
          } catch (e) {
            if (e.toString().indexOf('EOF') != -1) {
              bytesRead = 0;
            } else {
              throw e;
            }
          }

          if (usingDevice) {
            fs.closeSync(fd);
          }

          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          } else {
            result = null;
          }
        } else if (typeof window != 'undefined' &&
                   typeof window.prompt == 'function')
        {
          const prompted = window.prompt('Input: ')
          result = prompted === null ? prompted : `${prompted}\n`;
        } else if (
          // @ts-ignore
          typeof readline == 'function')
        {
          // @ts-ignore
          result = readline();
          if (result !== null) {
            result += '\n;'
          }
        }

        if (!result) {
          return null
        }

        tty.input = intArrayFromString(result, true);
      }

      return tty.input.shift();
    },

    put_char: (tty: TtyInstance, val: number) => {
      if (val === null || val === 10) {
        Module.print(utf8ArrayToString(tty.output, 0));
        tty.output = [];
      } else if (val !== 0) {
        tty.output.push(val);
      }
    },

    flush: (tty: TtyInstance) => {
      if (tty.output && tty.output.length > 0) {
        Module.print(utf8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    },
  };

  public readonly default_tty1_ops = Object.freeze({
    put_char: (tty: TtyInstance, val: number) => {
      if (val === null || val === 10) {
        Module.printErr(utf8ArrayToString(tty.output, 0));
        tty.output = []
      } else {
        if (val != 0)
          tty.output.push(val)
      }
    },

    flush: (tty: TtyInstance) => {
      if (tty.output && tty.output.length > 0) {
        Module.printErr(utf8ArrayToString(tty.output, 0));
        tty.output = []
      }
    },
  });
};

export const throwFromErrorNumber = (errorNumber: ErrorNumberCodes) => {
  throw new FS.ErrnoError(errorNumber);
};
