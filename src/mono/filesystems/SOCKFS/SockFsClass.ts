import {
  EnvironmentTypes,
} from '../../EnvironmentTypes';
import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  FS,
} from '../FS/FS';
import {
  getEnvType,
} from '../../getEnvVars';
import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  Module,
} from '../../Module';
import {
  assert,
} from 'ts-assertions';
import { getHeap } from '../../heaps/heaps';

const envType = getEnvType(Module.ENVIRONMENT);

const BaseSockFs = getGlobalValue('this') || {};

export class SockFsClass extends BaseSockFs {
  public readonly mount = (mount: any) => {
    Module.websocket = Module.websocket && typeof Module.websocket === 'object' ?
      Module.websocket :
      {};

    Module.websocket._callbacks = {};
    Module.websocket.on = (eventName: string, callback: Function) => {
      if (typeof callback === 'function') {
        this._callbacks[eventName] = callback;
      }

      return this;
    };

    Module.websocket.emit = (eventName: string, param: unknown) => {
      if (typeof this._callbacks[eventName] === 'function') {
        this._callbacks[eventName].call(this, param);
      }
    };

    return FS.createNode(null, '/', 16384 | 511, 0);
  };

  createSocket = (family: any, type: any, protocol: any) => {
    const streaming = type == 1;
    if (protocol) {
      assert(streaming === (protocol === 6));
    }

    const sock: Record<string, any> = {
      family,
      protocol,
      type,
      server: null,
      error: null,
      peers: {},
      pending: [],
      recv_queue: [],
      sock_ops: this.websocket_sock_ops
    };

    const name = this.nextname();
    const node = FS.createNode(this.root, name, 49152, 0);
    node.sock = sock;
    var stream = FS.createStream({
      path: name,
      node: node,
      flags: FS.modeStringToFlags('r+'),
      seekable: false,
      stream_ops: this.stream_ops
    });

    sock.stream = stream;
    return sock
  };

  getSocket = (fd: number) => {
    const stream = FS.getStream(fd);
    if (!stream || !FS.isSocket(stream.node.mode)) {
      return null;
    }

    return stream.node.sock;
  };

  stream_ops = {
    poll: (stream: any) => {
      const sock = stream.node.sock;
      return sock.sock_ops.poll(sock);
    },

    ioctl: (stream: any, request: any, varargs: any) => {
      const sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs);
    },

    read: (stream: any, buffer: any, offset: any, length: any, position: any) => {
      const sock = stream.node.sock;
      const msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {
        return 0;
      }

      buffer.set(msg.buffer, offset);
      return msg.buffer.length;
    },

    write: (stream: any, buffer: any, offset: any, length: any, position: any) => {
      var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length);
    },

    close: (stream: any) => {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock)
    },
  };

  nextname = (): any => {
    // @ts-ignore
    if (!this.nextname.current) {
      // @ts-ignore
      this.nextname.current = 0;
    }

    // @ts-ignore
    return 'socket[' + this.nextname.current++ + ']'
  };

  websocket_sock_ops = {
    createPeer: (sock: any, addr: any, port?: any) => {
      let ws;
      if (typeof addr === 'object') {
        ws = addr;
        addr = null;
        port = null;
      }

      if (ws) {
        if (ws._socket) {
          addr = ws._socket.remoteAddress;
          port = ws._socket.remotePort
        } else {
          const result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {
            throw new Error('WebSocket URL must be in the format ws(s)://address:port')
          }

          addr = result[1];
          port = parseInt(result[2], 10);
        }
      } else {
        try {
          const runtimeConfig = Module['websocket'] && 'object' === typeof Module['websocket'];
          let url = 'ws:#'.replace('#', '//');
          if (runtimeConfig) {
            if ('string' === typeof Module['websocket']['url']) {
              url = Module['websocket']['url']
            }
          }

          if (url === 'ws://' || url === 'wss://') {
            var parts = addr.split('/');
            url = url + parts[0] + ':' + port + '/' + parts.slice(1).join('/')
          }

          let subProtocols: string | string[] = 'binary';
          if (runtimeConfig) {
            if ('string' === typeof Module['websocket']['subprotocol']) {
              subProtocols = Module['websocket']['subprotocol']
            }
          }

          subProtocols = (subProtocols as string).replace(/^ +| +$/g, '').split(/ *, */);
          let opts: string[] | Record<string, any> | undefined = envType === EnvironmentTypes.Node ? {
            'protocol': subProtocols.toString()
          } : subProtocols;

          if (runtimeConfig && null === Module.websocket.subprotocol) {
            subProtocols = 'null';
            opts = undefined;
          }

          var WebSocketConstructor;
          if (envType === EnvironmentTypes.Node) {
            WebSocketConstructor = require('ws')
          } else if (envType === EnvironmentTypes.Web) {
            // @ts-ignore
            WebSocketConstructor = window.WebSocket;
          } else {
            WebSocketConstructor = WebSocket
          }

          ws = new WebSocketConstructor(url, opts);
          ws.binaryType = 'arraybuffer';
        } catch (e) {
          throw new FS.ErrnoError(String(ErrorNumberCodes.EHOSTUNREACH));
        }
      }

      const peer: Record<string, any> = {
        addr,
        port,
        socket: ws,
        dgram_send_queue: [],
      };

      this.websocket_sock_ops.addPeer(sock, peer);
      this.websocket_sock_ops.handlePeerEvents(sock, peer);
      if (sock.type === 2 && typeof sock.sport !== 'undefined') {
        peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, 'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))
      }

      return peer;
    },

    getPeer: (sock: any, addr: any, port: any) => {
      return sock.peers[addr + ':' + port];
    },

    addPeer: (sock: any, peer: any) => {
      sock.peers[peer.addr + ':' + peer.port] = peer;
    },

    removePeer: (sock: any, peer: any) => {
      delete sock.peers[peer.addr + ':' + peer.port];
    },

    handlePeerEvents: (sock: any, peer: any) => {
      let first = true;
      const handleOpen = function() {
        Module.websocket.emit('open', sock.stream.fd);
        try {
          let queued = peer.dgram_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.dgram_send_queue.shift();
          }
        } catch (e) {
          peer.socket.close();
        }
      };

      const handleMessage = (data: any) => {
        assert(typeof data !== 'string' && data.byteLength !== undefined);
        if (data.byteLength == 0) {
          return;
        }

        data = new Uint8Array(data);
        let wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
          var newport = data[8] << 8 | data[9];
          this.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          this.websocket_sock_ops.addPeer(sock, peer);
          return;
        }

        sock.recv_queue.push({
          addr: peer.addr,
          port: peer.port,
          data: data
        });

        Module.websocket.emit('message', sock.stream.fd);
      }

      if (envType === EnvironmentTypes.Node) {
        peer.socket.on('open', handleOpen);
        peer.socket.on('message', (data: Buffer, flags: any) => {
          if (!flags.binary) {
            return;
          }

          handleMessage((new Uint8Array(data)).buffer)
        });

        peer.socket.on('close', (function() {
          Module['websocket'].emit('close', sock.stream.fd)
        }
        ));
        peer.socket.on('error', (error: Error) => {
          sock.error = ErrorNumberCodes.ECONNREFUSED;
          Module.websocket.emit(
            'error',
            [
              sock.stream.fd,
              sock.error,
              'ECONNREFUSED: Connection refused.',
            ],
          );
        });
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = () => {
          Module.websocket.emit('close', sock.stream.fd);
        };

        peer.socket.onmessage = (event: any) => {
          handleMessage(event.data)
        };

        peer.socket.onerror = (error: Error) => {
          sock.error = ErrorNumberCodes.ECONNREFUSED;
          Module.websocket.emit(
            'error',
            [
              sock.stream.fd,
              sock.error,
              'ECONNREFUSED: Connection refused',
            ],
          );
        };
      }
    },

    poll: (sock: any) => {
      if (sock.type === 1 && sock.server) {
        return sock.pending.length ? 64 | 1 : 0;
      }

      let mask = 0;
      let dest = sock.type === 1 ? this.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
        mask |= 64 | 1;
      }

      if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
        mask |= 4;
      }

      if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
        mask |= 16;
      }

      return mask;
    },

    ioctl: (sock: any, request: any, arg: any) => {
      switch (request) {
      case 21531:
        var bytes = 0;
        if (sock.recv_queue.length) {
          bytes = sock.recv_queue[0].data.length
        }
        getHeap('HEAP32')[arg >> 2] = bytes;
        return 0;
      default:
        return ErrorNumberCodes.EINVAL;
      }
    },

    close: (sock: any) => {
      if (sock.server) {
        try {
          sock.server.close();
        } catch (e) {}
        sock.server = null;
      }

      let peers = Object.keys(sock.peers);
      for (let ii = 0; ii < peers.length; ii += 1) {
        var peer = sock.peers[peers[ii]];
        try {
          peer.socket.close();
        } catch (e) {}
        this.websocket_sock_ops.removePeer(sock, peer);
      }

      return 0;
    },

    bind: (sock: any, addr: any, port: any) => {
      if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EINVAL));
      }

      sock.saddr = addr;
      sock.sport = port;
      if (sock.type === 2) {
        if (sock.server) {
          sock.server.close();
          sock.server = null;
        }

        try {
          sock.sock_ops.listen(sock,  0);
        } catch (err) {
          if (!(err instanceof FS.ErrnoError)) {
            throw err;
          } else if (
            // @ts-ignore
            err.errno !== ErrorNumberCodes.EOPNOTSUPP) {
            throw err;
          }
        }
      }
    },

    connect: (sock: any, addr: any, port: any) => {
      if (sock.server) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EOPNOTSUPP));
      }

      if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
        let dest = this.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {
          if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(String(ErrorNumberCodes.EALREADY));
          } else {
            throw new FS.ErrnoError(String(ErrorNumberCodes.EISCONN));
          }
        }
      }

      const peer = this.websocket_sock_ops.createPeer(sock, addr, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      throw new FS.ErrnoError(String(ErrorNumberCodes.EINPROGRESS));
    },

    listen: (sock: any, backlog: any) => {
      if (envType !== EnvironmentTypes.Node) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EOPNOTSUPP));
      }

      if (sock.server) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EINVAL));
      }

      const WebSocketServer = require('ws').Server;
      const host = sock.saddr;
      sock.server = new WebSocketServer({
        host: host,
        port: sock.sport
      });

      Module.websocket.emit('listen', sock.stream.fd);
      sock.server.on('connection', (ws: any) => {
        if (sock.type === 1) {
          const newsock = this.createSocket(sock.family, sock.type, sock.protocol);
          const peer = this.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          sock.pending.push(newsock);
          Module.websocket.emit('connection', newsock.stream.fd);
        } else {
          this.websocket_sock_ops.createPeer(sock, ws);
          Module.websocket.emit('connection', sock.stream.fd);
        }
      });

      sock.server.on('closed', () => {
        Module['websocket'].emit('close', sock.stream.fd);
        sock.server = null
      });

      sock.server.on('error', (error: any) => {
        sock.error = ErrorNumberCodes.EHOSTUNREACH;
        Module.websocket.emit(
          'error',
          [
            sock.stream.fd,
            sock.error,
            'EHOSTUNREACH: Host is unreachable',
          ],
        );
      });
    },

    accept: (listensock: any) => {
      if (!listensock.server) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EINVAL));
      }

      const newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock;
    },

    getname: (sock: any, peer: any) => {
      let addr;
      let port;
      if (peer) {
        if (sock.daddr === undefined || sock.dport === undefined) {
          throw new FS.ErrnoError(String(ErrorNumberCodes.ENOTCONN));
        }

        addr = sock.daddr;
        port = sock.dport;
      } else {
        addr = sock.saddr || 0;
        port = sock.sport || 0;
      }

      return {
        addr,
        port,
      };
    },

    sendmsg: (sock: any, buffer: any, offset: any, length: any, addr: any, port: any) => {
      if (sock.type === 2) {
        if (addr === undefined || port === undefined) {
          addr = sock.daddr;
          port = sock.dport;
        }

        if (addr === undefined || port === undefined) {
          throw new FS.ErrnoError(String(ErrorNumberCodes.EDESTADDRREQ));
        }
      } else {
        addr = sock.daddr;
        port = sock.dport
      }

      let dest = this.websocket_sock_ops.getPeer(sock, addr, port);
      if (sock.type === 1) {
        if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
          throw new FS.ErrnoError(String(ErrorNumberCodes.ENOTCONN));
        } else if (dest.socket.readyState === dest.socket.CONNECTING) {
          throw new FS.ErrnoError(String(ErrorNumberCodes.EAGAIN));
        }
      }

      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer
      }

      let data;
      data = buffer.slice(offset, offset + length);
      if (sock.type === 2) {
        if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            dest = this.websocket_sock_ops.createPeer(sock, addr, port)
          }

          dest.dgram_send_queue.push(data);
          return length
        }
      }
      try {
        dest.socket.send(data);
        return length
      } catch (e) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.EINVAL));
      }
    },

    recvmsg: (sock: any, length: any) => {
      if (sock.type === 1 && sock.server) {
        throw new FS.ErrnoError(String(ErrorNumberCodes.ENOTCONN));
      }

      const queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          const dest = this.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {
            throw new FS.ErrnoError(String(ErrorNumberCodes.ENOTCONN));
          } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            return null;
          } else {
            throw new FS.ErrnoError(String(ErrorNumberCodes.EAGAIN));
          }
        } else {
          throw new FS.ErrnoError(String(ErrorNumberCodes.EAGAIN));
        }
      }

      const queuedLength = queued.data.byteLength || queued.data.length;
      const queuedOffset = queued.data.byteOffset || 0;
      const queuedBuffer = queued.data.buffer || queued.data;
      const bytesRead = Math.min(length, queuedLength);
      const res = {
        buffer: new Uint8Array(queuedBuffer,queuedOffset,bytesRead),
        addr: queued.addr,
        port: queued.port,
      };

      if (sock.type === 1 && bytesRead < queuedLength) {
        const bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer,queuedOffset + bytesRead,bytesRemaining);
        sock.recv_queue.unshift(queued)
      }

      return res;
    },
  };
}
