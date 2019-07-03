import {
  ___setErrNo,
} from '../../errors/___setErrNo';
import {
  ErrorNumberCodes,
} from '../../errors/ErrorNumberCodes';
import {
  getGlobalValue,
} from '../../getGlobalValue';
import {
  PATH,
} from '../../PATH';
import {
  stackTrace,
} from '../../logging/stackTrace';
import {
  throwFromErrorNumber,
} from '../../TTYClass';

export const BaseFs = getGlobalValue('FS') || {};

export class FsClass extends BaseFs {
  public readonly currentPath = '/';
  public readonly devices = {};
  public readonly ErrnoError: ErrorConstructor = null as any as ErrorConstructor;
  public readonly filesystems = null;
  public readonly genericErrors: Record<string, unknown> = {};
  public ignorePermissions = true;
  public readonly initialized = false;
  public readonly mounts: any[] = [];
  public readonly nameTable = null;
  public readonly nextInode = 1;
  public readonly root = null;
  public readonly streams: any[] = [];
  public readonly syncFSRequests = 0;
  public readonly tracking = {
    openFlags: {
      READ: 1,
      WRITE: 2,
    },
  };

  public readonly trackingDelegate = {};

  public readonly handleFSError = (e: this['ErrnoError']) => {
    if (!(e instanceof (this['ErrnoError'] as any))) {
      throw new Error(`${e} : ${stackTrace()}`);
    }

    return ___setErrNo((e as any).errno);
  };

  public readonly lookupPath = (path: string, opts: LookupPathOpts) => {
    const finalPath = PATH.resolve(this.cwd(), path);
    const finalOpts: Record<string, LookupPathOpts> = Object.assign({}, opts);
    if (!path) {
      return {
        node: null,
        path: '',
      };
    }

    const defaults: Record<string, any> = {
      follow_mount: true,
      recurse_count: 0,
    };

    for (let key in defaults) {
      if (finalOpts[key] === undefined) {
        finalOpts[key] = defaults[key];
      }
    }

    if ((opts.recurse_count as number) > 8) {
      throwFromErrorNumber(ErrorNumberCodes.ELOOP);
    }

    const parts = PATH.normalizeArray(path.split('/').filter(Boolean), false);
    let current = this.root;
    let current_path = '/';
    for (let ii = 0; ii < parts.length; ii += 1) {
      let islast = ii === parts.length - 1;
      if (islast && opts.parent) {
        break;
      }

      current = this.lookupNode(current, parts[ii]);
      current_path = PATH.join2(current_path, parts[ii]);

      if (this.isMountpoint(current)) {
        if (!islast || islast && opts.follow_mount) {
          current = current.mounted.root;
        }
      }

      if (!islast || opts.follow) {
        let count = 0;
        while (this.isLink(current.mode)) {
          const link = this.readlink(current_path);
          current_path = PATH.resolve(PATH.dirname(current_path), link);
          const lookup = this.lookupPath(current_path, {
            recurse_count: opts.recurse_count,
          });

          current = lookup.node;

          if (count++ > 40) {
            throwFromErrorNumber(ErrorNumberCodes.ELOOP);
            return;
          }
        }
      }
    }

    return {
      node: current,
      path: current_path,
    };
  };

  public readonly getPath = (node: FsNode) => {
    let path;
    let parent = node;
    while (true) {
      if (this.isRoot(parent)) {
        const mount = parent.mount.mountpoint;
        return (
          path ?
            (
              /\/$/.test(mount[mount.length - 1]) ?
                `${mount}${path}` :
                `${mount}/${path}`
            ) :
            mount
        );
      }

      path = path ? `${parent.name}/${path}` : parent.name;
      parent = parent.parent;
    }
  };

  public readonly hashName = (parentid: number, name: string) => {
    var hash = 0;
    for (let ii = 0; ii < name.length; ii += 1) {
      hash = (hash << 5) - hash + name.charCodeAt(ii) | 0;
    }

    return (parentid + hash >>> 0) % this.nameTable.length;
  };

  public readonly hashAddNode = (node: FsNode) => {
    const hash = this.hashName(node.parent.id, node.name);
    node.name_next = this.nameTable[hash];
    this.nameTable[hash] = node;
  };

  public readonly hashRemoveNode = (node: FsNode) => {
    var hash = this.hashName(node.parent.id, node.name);
    if (this.nameTable[hash] === node) {
      this.nameTable[hash] = node.name_next
    } else {
      var current = this.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break
        }
        current = current.name_next
      }
    }
  };

  public readonly lookupNode = (parent, name) => {
    var err = this.mayLookup(parent);
    if (err) {
      throw new this.ErrnoError(err,parent)
    }
    var hash = this.hashName(parent.id, name);
    for (var node = this.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node
      }
    }
    return this.lookup(parent, name)
  };

  public readonly createNode = (parent: any, name: any, mode: any, rdev?: any) => {
    if (!this.FSNode) {
      this.FSNode = (function(parent, name, mode, rdev) {
        if (!parent) {
          parent = this
        }
        this.parent = parent;
        this.mount = parent.mount;
        this.mounted = null;
        this.id = this.nextInode++;
        this.name = name;
        this.mode = mode;
        this.node_ops = {};
        this.stream_ops = {};
        this.rdev = rdev
      }
      );
      this.FSNode.prototype = {};
      var readMode = 292 | 73;
      var writeMode = 146;
      Object.defineProperties(this.FSNode.prototype, {
        read: {
          get: (function() {
            return (this.mode & readMode) === readMode
          }
          ),
          set: (function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
          }
          )
        },
        write: {
          get: (function() {
            return (this.mode & writeMode) === writeMode
          }
          ),
          set: (function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
          }
          )
        },
        isFolder: {
          get: (function() {
            return this.isDir(this.mode)
          }
          )
        },
        isDevice: {
          get: (function() {
            return this.isChrdev(this.mode)
          }
          )
        }
      })
    }

    const node = new this.FSNode(parent,name,mode,rdev);
    this.hashAddNode(node);

    return node;
  };

  public readonly destroyNode = this.hashRemoveNode;

  public readonly isRoot = (node) => {
    return node === node.parent
  };

  public readonly isMountpoint = (node) => Boolean(node.mounted);

  public readonly isFile = (mode: number) => (mode & 61440) === 32768;

  public readonly isDir = (mode: number) => (mode & 61440) === 16384;

  public readonly isLink = (mode: number) => (mode & 61440) === 40960;

  public readonly isChrdev = (mode: number) => (mode & 61440) === 8192;

  public readonly isBlkdev = (mode: number) => (mode & 61440) === 24576;

  public readonly isFIFO = (mode: number) => (mode & 61440) === 4096;

  public readonly isSocket = (mode: number) => (mode & 49152) === 49152;

  public readonly flagModes = {
    'r': 0,
    'rs': 1052672,
    'r+': 2,
    'w': 577,
    'wx': 705,
    'xw': 705,
    'w+': 578,
    'wx+': 706,
    'xw+': 706,
    'a': 1089,
    'ax': 1217,
    'xa': 1217,
    'a+': 1090,
    'ax+': 1218,
    'xa+': 1218,
  };

  public readonly modeStringToFlags = (str: string) => {
    const flags = this.flagModes[str];
    if (typeof flags === 'undefined') {
      throw new Error('Unknown file open mode: ' + str);
    }

    return flags;
  };

  public readonly flagsToPermissionString = (flag: number) => {
    let perms = ['r', 'w', 'rw'][flag & 3];
    if (flag & 512) {
      perms += 'w'
    }

    return perms;
  };

  public readonly nodePermissions = (node: any, perms: string) => {
    if (this.ignorePermissions) {
      return 0;
    } else if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
      return ErrorNumberCodes.EACCES;
    } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
      return ErrorNumberCodes.EACCES;
    } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
      return ErrorNumberCodes.EACCES;
    }

    return 0;
  };

  public readonly mayLookup = (dir: any) => {
    var err = this.nodePermissions(dir, 'x');
    if (err) {
      return err;
    } else if (!dir.node_ops.lookup) {
      return ErrorNumberCodes.EACCES;
    }

    return 0;
  };

  public readonly mayCreate = (dir: any, name: any) => {
    try {
      var node = this.lookupNode(dir, name);
      return ErrorNumberCodes.EEXIST;
    } catch (e) {}

    return this.nodePermissions(dir, 'wx');
  };

  public readonly mayDelete = (dir: any, name: string, isdir: boolean) => {
    let node;
    try {
      node = this.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }

    const err = this.nodePermissions(dir, 'wx');
    if (err) {
      return err;
    }

    if (isdir) {
      if (!this.isDir(node.mode)) {
        return ErrorNumberCodes.ENOTDIR;
      } else if (this.isRoot(node) || this.getPath(node) === this.cwd()) {
        return ErrorNumberCodes.EBUSY;
      }
    } else if (this.isDir(node.mode)) {
      return ErrorNumberCodes.EISDIR;
    }

    return 0;
  };

  public readonly mayOpen = (node: any, flags: any) => {
    if (!node) {
      return ErrorNumberCodes.ENOENT;
    } else if (this.isLink(node.mode)) {
      return ErrorNumberCodes.ELOOP;
    } else if (this.isDir(node.mode)) {
      if (this.flagsToPermissionString(flags) !== 'r' || flags & 512) {
        return ErrorNumberCodes.EISDIR;
      }
    }

    return this.nodePermissions(node, this.flagsToPermissionString(flags));
  };

  public readonly MAX_OPEN_FDS = 4096;
  public readonly nextfd = (fd_start: number, fd_end: number) => {
    fd_start = fd_start || 0;
    fd_end = fd_end || this.MAX_OPEN_FDS;
    for (var fd = fd_start; fd <= fd_end; fd++) {
      if (!this.streams[fd]) {
        return fd;
      }
    }

    throw new this.ErrnoError(String(ErrorNumberCodes.EMFILE));
  };

  public readonly getStream (fd: number) {
    return this.streams[fd]
  };

  public FSStream?: any;

  public node: any;

  public readonly createStream = (stream: any, fd_start: number, fd_end: number) => {
    if (!this.FSStream) {
      this.FSStream = () => {};
      this.FSStream.prototype = {};
      Object.defineProperties(this.FSStream.prototype, {
        object: {
          get: () => this.node,
          set: (val) => this.node = val,
        },

        isRead: {
          get: () => (this.flags & 2097155) !== 1,
        },

        isWrite: {
          get: () => (this.flags & 2097155) !== 0,
        },

        isAppend: {
          get: () => this.flags & 1024,
        },
      })
    };

    const newStream = new this.FSStream();
    for (var p in stream) {
      newStream[p] = stream[p]
    }
    stream = newStream;
    var fd = this.nextfd(fd_start, fd_end);
    stream.fd = fd;
    this.streams[fd] = stream;
    return stream
  };

  closeStream = (fd: number) => this.streams[fd] = null;

  chrdev_stream_ops: {
    open: (function(stream) {
      var device = this.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream)
      }
    }
    ),
    llseek: (function() {
      throw new this.ErrnoError(ERRNO_CODES.ESPIPE)
    }
    )
  },
  major: (function(dev) {
    return dev >> 8
  }
  ),
  minor: (function(dev) {
    return dev & 255
  }
  ),
  makedev: (function(ma, mi) {
    return ma << 8 | mi
  }
  ),
  registerDevice: (function(dev, ops) {
    this.devices[dev] = {
      stream_ops: ops
    }
  }
  ),
  getDevice: (function(dev) {
    return this.devices[dev]
  }
  ),
  getMounts: (function(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push.apply(check, m.mounts)
    }
    return mounts
  }
  ),
  syncfs: (function(populate, callback) {
    if (typeof populate === 'function') {
      callback = populate;
      populate = false
    }
    this.syncFSRequests++;
    if (this.syncFSRequests > 1) {
      console.log('warning: ' + this.syncFSRequests + ' this.syncfs operations in flight at once, probably just doing extra work')
    }
    var mounts = this.getMounts(this.root.mount);
    var completed = 0;
    function doCallback(err) {
      assert(this.syncFSRequests > 0);
      this.syncFSRequests--;
      return callback(err)
    }
    function done(err) {
      if (err) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(err)
        }
        return
      }
      if (++completed >= mounts.length) {
        doCallback(null)
      }
    }
    mounts.forEach((function(mount) {
      if (!mount.type.syncfs) {
        return done(null)
      }
      mount.type.syncfs(mount, populate, done)
    }
    ))
  }
  ),
  mount: (function(type, opts, mountpoint) {
    var root = mountpoint === '/';
    var pseudo = !mountpoint;
    var node;
    if (root && this.root) {
      throw new this.ErrnoError(ERRNO_CODES.EBUSY)
    } else if (!root && !pseudo) {
      var lookup = this.lookupPath(mountpoint, {
        follow_mount: false
      });
      mountpoint = lookup.path;
      node = lookup.node;
      if (this.isMountpoint(node)) {
        throw new this.ErrnoError(ERRNO_CODES.EBUSY)
      }
      if (!this.isDir(node.mode)) {
        throw new this.ErrnoError(ERRNO_CODES.ENOTDIR)
      }
    }
    var mount = {
      type: type,
      opts: opts,
      mountpoint: mountpoint,
      mounts: []
    };
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      this.root = mountRoot
    } else if (node) {
      node.mounted = mount;
      if (node.mount) {
        node.mount.mounts.push(mount)
      }
    }
    return mountRoot
  }
  ),
  unmount: (function(mountpoint) {
    var lookup = this.lookupPath(mountpoint, {
      follow_mount: false
    });
    if (!this.isMountpoint(lookup.node)) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = this.getMounts(mount);
    Object.keys(this.nameTable).forEach((function(hash) {
      var current = this.nameTable[hash];
      while (current) {
        var next = current.name_next;
        if (mounts.indexOf(current.mount) !== -1) {
          this.destroyNode(current)
        }
        current = next
      }
    }
    ));
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    assert(idx !== -1);
    node.mount.mounts.splice(idx, 1)
  }
  ),
  lookup: (function(parent, name) {
    return parent.node_ops.lookup(parent, name)
  }
  ),
  mknod: (function(path, mode, dev) {
    var lookup = this.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name || name === '.' || name === '..') {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    var err = this.mayCreate(parent, name);
    if (err) {
      throw new this.ErrnoError(err)
    }
    if (!parent.node_ops.mknod) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    return parent.node_ops.mknod(parent, name, mode, dev)
  }
  ),
  create: (function(path, mode) {
    mode = mode !== undefined ? mode : 438;
    mode &= 4095;
    mode |= 32768;
    return this.mknod(path, mode, 0)
  }
  ),
  mkdir: (function(path, mode) {
    mode = mode !== undefined ? mode : 511;
    mode &= 511 | 512;
    mode |= 16384;
    return this.mknod(path, mode, 0)
  }
  ),
  mkdirTree: (function(path, mode) {
    var dirs = path.split('/');
    var d = '';
    for (var i = 0; i < dirs.length; ++i) {
      if (!dirs[i])
        continue;
      d += '/' + dirs[i];
      try {
        this.mkdir(d, mode)
      } catch (e) {
        if (e.errno != ERRNO_CODES.EEXIST)
          throw e
      }
    }
  }
  ),
  mkdev: (function(path, mode, dev) {
    if (typeof dev === 'undefined') {
      dev = mode;
      mode = 438
    }
    mode |= 8192;
    return this.mknod(path, mode, dev)
  }
  ),
  symlink: (function(oldpath, newpath) {
    if (!PATH.resolve(oldpath)) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    var lookup = this.lookupPath(newpath, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    var newname = PATH.basename(newpath);
    var err = this.mayCreate(parent, newname);
    if (err) {
      throw new this.ErrnoError(err)
    }
    if (!parent.node_ops.symlink) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    return parent.node_ops.symlink(parent, newname, oldpath)
  }
  ),
  rename: (function(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    try {
      lookup = this.lookupPath(old_path, {
        parent: true
      });
      old_dir = lookup.node;
      lookup = this.lookupPath(new_path, {
        parent: true
      });
      new_dir = lookup.node
    } catch (e) {
      throw new this.ErrnoError(ERRNO_CODES.EBUSY)
    }
    if (!old_dir || !new_dir)
      throw new this.ErrnoError(ERRNO_CODES.ENOENT);
    if (old_dir.mount !== new_dir.mount) {
      throw new this.ErrnoError(ERRNO_CODES.EXDEV)
    }
    var old_node = this.lookupNode(old_dir, old_name);
    var relative = PATH.relative(old_path, new_dirname);
    if (relative.charAt(0) !== '.') {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    relative = PATH.relative(new_path, old_dirname);
    if (relative.charAt(0) !== '.') {
      throw new this.ErrnoError(ERRNO_CODES.ENOTEMPTY)
    }
    var new_node;
    try {
      new_node = this.lookupNode(new_dir, new_name)
    } catch (e) {}
    if (old_node === new_node) {
      return
    }
    var isdir = this.isDir(old_node.mode);
    var err = this.mayDelete(old_dir, old_name, isdir);
    if (err) {
      throw new this.ErrnoError(err)
    }
    err = new_node ? this.mayDelete(new_dir, new_name, isdir) : this.mayCreate(new_dir, new_name);
    if (err) {
      throw new this.ErrnoError(err)
    }
    if (!old_dir.node_ops.rename) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    if (this.isMountpoint(old_node) || new_node && this.isMountpoint(new_node)) {
      throw new this.ErrnoError(ERRNO_CODES.EBUSY)
    }
    if (new_dir !== old_dir) {
      err = this.nodePermissions(old_dir, 'w');
      if (err) {
        throw new this.ErrnoError(err)
      }
    }
    try {
      if (this.trackingDelegate['willMovePath']) {
        this.trackingDelegate['willMovePath'](old_path, new_path)
      }
    } catch (e) {
      console.log('this.trackingDelegate['willMovePath']('' + old_path + '', '' + new_path + '') threw an exception: ' + e.message)
    }
    this.hashRemoveNode(old_node);
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name)
    } catch (e) {
      throw e
    } finally {
      this.hashAddNode(old_node)
    }
    try {
      if (this.trackingDelegate['onMovePath'])
        this.trackingDelegate['onMovePath'](old_path, new_path)
    } catch (e) {
      console.log('this.trackingDelegate['onMovePath']('' + old_path + '', '' + new_path + '') threw an exception: ' + e.message)
    }
  }
  ),
  rmdir: (function(path) {
    var lookup = this.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = this.lookupNode(parent, name);
    var err = this.mayDelete(parent, name, true);
    if (err) {
      throw new this.ErrnoError(err)
    }
    if (!parent.node_ops.rmdir) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    if (this.isMountpoint(node)) {
      throw new this.ErrnoError(ERRNO_CODES.EBUSY)
    }
    try {
      if (this.trackingDelegate['willDeletePath']) {
        this.trackingDelegate['willDeletePath'](path)
      }
    } catch (e) {
      console.log('this.trackingDelegate['willDeletePath']('' + path + '') threw an exception: ' + e.message)
    }
    parent.node_ops.rmdir(parent, name);
    this.destroyNode(node);
    try {
      if (this.trackingDelegate['onDeletePath'])
        this.trackingDelegate['onDeletePath'](path)
    } catch (e) {
      console.log('this.trackingDelegate['onDeletePath']('' + path + '') threw an exception: ' + e.message)
    }
  }
  ),
  readdir: (function(path) {
    var lookup = this.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node.node_ops.readdir) {
      throw new this.ErrnoError(ERRNO_CODES.ENOTDIR)
    }
    return node.node_ops.readdir(node)
  }
  ),
  unlink: (function(path) {
    var lookup = this.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = this.lookupNode(parent, name);
    var err = this.mayDelete(parent, name, false);
    if (err) {
      throw new this.ErrnoError(err)
    }
    if (!parent.node_ops.unlink) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    if (this.isMountpoint(node)) {
      throw new this.ErrnoError(ERRNO_CODES.EBUSY)
    }
    try {
      if (this.trackingDelegate['willDeletePath']) {
        this.trackingDelegate['willDeletePath'](path)
      }
    } catch (e) {
      console.log('this.trackingDelegate['willDeletePath']('' + path + '') threw an exception: ' + e.message)
    }
    parent.node_ops.unlink(parent, name);
    this.destroyNode(node);
    try {
      if (this.trackingDelegate['onDeletePath'])
        this.trackingDelegate['onDeletePath'](path)
    } catch (e) {
      console.log('this.trackingDelegate['onDeletePath']('' + path + '') threw an exception: ' + e.message)
    }
  }
  ),
  readlink: (function(path) {
    var lookup = this.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    if (!link.node_ops.readlink) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    return PATH.resolve(this.getPath(link.parent), link.node_ops.readlink(link))
  }
  ),
  stat: (function(path, dontFollow) {
    var lookup = this.lookupPath(path, {
      follow: !dontFollow
    });
    var node = lookup.node;
    if (!node) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    if (!node.node_ops.getattr) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    return node.node_ops.getattr(node)
  }
  ),
  lstat: (function(path) {
    return this.stat(path, true)
  }
  ),
  chmod: (function(path, mode, dontFollow) {
    var node;
    if (typeof path === 'string') {
      var lookup = this.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    node.node_ops.setattr(node, {
      mode: mode & 4095 | node.mode & ~4095,
      timestamp: Date.now()
    })
  }
  ),
  lchmod: (function(path, mode) {
    this.chmod(path, mode, true)
  }
  ),
  fchmod: (function(fd, mode) {
    var stream = this.getStream(fd);
    if (!stream) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    this.chmod(stream.node, mode)
  }
  ),
  chown: (function(path, uid, gid, dontFollow) {
    var node;
    if (typeof path === 'string') {
      var lookup = this.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    node.node_ops.setattr(node, {
      timestamp: Date.now()
    })
  }
  ),
  lchown: (function(path, uid, gid) {
    this.chown(path, uid, gid, true)
  }
  ),
  fchown: (function(fd, uid, gid) {
    var stream = this.getStream(fd);
    if (!stream) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    this.chown(stream.node, uid, gid)
  }
  ),
  truncate: (function(path, len) {
    if (len < 0) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    var node;
    if (typeof path === 'string') {
      var lookup = this.lookupPath(path, {
        follow: true
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new this.ErrnoError(ERRNO_CODES.EPERM)
    }
    if (this.isDir(node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.EISDIR)
    }
    if (!this.isFile(node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    var err = this.nodePermissions(node, 'w');
    if (err) {
      throw new this.ErrnoError(err)
    }
    node.node_ops.setattr(node, {
      size: len,
      timestamp: Date.now()
    })
  }
  ),
  ftruncate: (function(fd, len) {
    var stream = this.getStream(fd);
    if (!stream) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    this.truncate(stream.node, len)
  }
  ),
  utime: (function(path, atime, mtime) {
    var lookup = this.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    node.node_ops.setattr(node, {
      timestamp: Math.max(atime, mtime)
    })
  }
  ),
  open: (function(path, flags, mode, fd_start, fd_end) {
    if (path === '') {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    flags = typeof flags === 'string' ? this.modeStringToFlags(flags) : flags;
    mode = typeof mode === 'undefined' ? 438 : mode;
    if (flags & 64) {
      mode = mode & 4095 | 32768
    } else {
      mode = 0
    }
    var node;
    if (typeof path === 'object') {
      node = path
    } else {
      path = PATH.normalize(path);
      try {
        var lookup = this.lookupPath(path, {
          follow: !(flags & 131072)
        });
        node = lookup.node
      } catch (e) {}
    }
    var created = false;
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new this.ErrnoError(ERRNO_CODES.EEXIST)
        }
      } else {
        node = this.mknod(path, mode, 0);
        created = true
      }
    }
    if (!node) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    if (this.isChrdev(node.mode)) {
      flags &= ~512
    }
    if (flags & 65536 && !this.isDir(node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.ENOTDIR)
    }
    if (!created) {
      var err = this.mayOpen(node, flags);
      if (err) {
        throw new this.ErrnoError(err)
      }
    }
    if (flags & 512) {
      this.truncate(node, 0)
    }
    flags &= ~(128 | 512);
    var stream = this.createStream({
      node: node,
      path: this.getPath(node),
      flags: flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      ungotten: [],
      error: false
    }, fd_start, fd_end);
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream)
    }
    if (Module['logReadFiles'] && !(flags & 1)) {
      if (!this.readFiles)
        this.readFiles = {};
      if (!(path in this.readFiles)) {
        this.readFiles[path] = 1;
        Module['printErr']('read file: ' + path)
      }
    }
    try {
      if (this.trackingDelegate['onOpenFile']) {
        var trackingFlags = 0;
        if ((flags & 2097155) !== 1) {
          trackingFlags |= this.tracking.openFlags.READ
        }
        if ((flags & 2097155) !== 0) {
          trackingFlags |= this.tracking.openFlags.WRITE
        }
        this.trackingDelegate['onOpenFile'](path, trackingFlags)
      }
    } catch (e) {
      console.log('this.trackingDelegate['onOpenFile']('' + path + '', flags) threw an exception: ' + e.message)
    }
    return stream
  }
  ),
  close: (function(stream) {
    if (stream.getdents)
      stream.getdents = null;
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream)
      }
    } catch (e) {
      throw e
    } finally {
      this.closeStream(stream.fd)
    }
  }
  ),
  llseek: (function(stream, offset, whence) {
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new this.ErrnoError(ERRNO_CODES.ESPIPE)
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position
  }
  ),
  read: (function(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    if ((stream.flags & 2097155) === 1) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    if (this.isDir(stream.node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.EISDIR)
    }
    if (!stream.stream_ops.read) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    var seeking = typeof position !== 'undefined';
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new this.ErrnoError(ERRNO_CODES.ESPIPE)
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking)
      stream.position += bytesRead;
    return bytesRead
  }
  ),
  write: (function(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    if (this.isDir(stream.node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.EISDIR)
    }
    if (!stream.stream_ops.write) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    if (stream.flags & 1024) {
      this.llseek(stream, 0, 2)
    }
    var seeking = typeof position !== 'undefined';
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new this.ErrnoError(ERRNO_CODES.ESPIPE)
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking)
      stream.position += bytesWritten;
    try {
      if (stream.path && this.trackingDelegate['onWriteToFile'])
        this.trackingDelegate['onWriteToFile'](stream.path)
    } catch (e) {
      console.log('this.trackingDelegate['onWriteToFile']('' + path + '') threw an exception: ' + e.message)
    }
    return bytesWritten
  }
  ),
  allocate: (function(stream, offset, length) {
    if (offset < 0 || length <= 0) {
      throw new this.ErrnoError(ERRNO_CODES.EINVAL)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new this.ErrnoError(ERRNO_CODES.EBADF)
    }
    if (!this.isFile(stream.node.mode) && !this.isDir(stream.node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.ENODEV)
    }
    if (!stream.stream_ops.allocate) {
      throw new this.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
    }
    stream.stream_ops.allocate(stream, offset, length)
  }
  ),
  mmap: (function(stream, buffer, offset, length, position, prot, flags) {
    if ((stream.flags & 2097155) === 1) {
      throw new this.ErrnoError(ERRNO_CODES.EACCES)
    }
    if (!stream.stream_ops.mmap) {
      throw new this.ErrnoError(ERRNO_CODES.ENODEV)
    }
    return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
  }
  ),
  msync: (function(stream, buffer, offset, length, mmapFlags) {
    if (!stream || !stream.stream_ops.msync) {
      return 0
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
  }
  ),
  munmap: (function(stream) {
    return 0
  }
  ),
  ioctl: (function(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new this.ErrnoError(ERRNO_CODES.ENOTTY)
    }
    return stream.stream_ops.ioctl(stream, cmd, arg)
  }
  ),
  readFile: (function(path, opts) {
    opts = opts || {};
    opts.flags = opts.flags || 'r';
    opts.encoding = opts.encoding || 'binary';
    if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
      throw new Error('Invalid encoding type '' + opts.encoding + ''')
    }
    var ret;
    var stream = this.open(path, opts.flags);
    var stat = this.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    this.read(stream, buf, 0, length, 0);
    if (opts.encoding === 'utf8') {
      ret = UTF8ArrayToString(buf, 0)
    } else if (opts.encoding === 'binary') {
      ret = buf
    }
    this.close(stream);
    return ret
  }
  ),
  writeFile: (function(path, data, opts) {
    opts = opts || {};
    opts.flags = opts.flags || 'w';
    var stream = this.open(path, opts.flags, opts.mode);
    if (typeof data === 'string') {
      var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
      var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
      this.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
    } else if (ArrayBuffer.isView(data)) {
      this.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
    } else {
      throw new Error('Unsupported data type')
    }
    this.close(stream)
  }
  ),
  cwd: (function() {
    return this.currentPath
  }
  ),
  chdir: (function(path) {
    var lookup = this.lookupPath(path, {
      follow: true
    });
    if (lookup.node === null) {
      throw new this.ErrnoError(ERRNO_CODES.ENOENT)
    }
    if (!this.isDir(lookup.node.mode)) {
      throw new this.ErrnoError(ERRNO_CODES.ENOTDIR)
    }
    var err = this.nodePermissions(lookup.node, 'x');
    if (err) {
      throw new this.ErrnoError(err)
    }
    this.currentPath = lookup.path
  }
  ),
  createDefaultDirectories: (function() {
    this.mkdir('/tmp');
    this.mkdir('/home');
    this.mkdir('/home/web_user')
  }
  ),
  createDefaultDevices: (function() {
    this.mkdir('/dev');
    this.registerDevice(this.makedev(1, 3), {
      read: (function() {
        return 0
      }
      ),
      write: (function(stream, buffer, offset, length, pos) {
        return length
      }
      )
    });
    this.mkdev('/dev/null', this.makedev(1, 3));
    TTY.register(this.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(this.makedev(6, 0), TTY.default_tty1_ops);
    this.mkdev('/dev/tty', this.makedev(5, 0));
    this.mkdev('/dev/tty1', this.makedev(6, 0));
    var random_device;
    if (typeof crypto !== 'undefined') {
      var randomBuffer = new Uint8Array(1);
      random_device = (function() {
        crypto.getRandomValues(randomBuffer);
        return randomBuffer[0]
      }
      )
    } else if (ENVIRONMENT_IS_NODE) {
      random_device = (function() {
        return require('crypto')['randomBytes'](1)[0]
      }
      )
    } else {
      random_device = (function() {
        return Math.random() * 256 | 0
      }
      )
    }
    this.createDevice('/dev', 'random', random_device);
    this.createDevice('/dev', 'urandom', random_device);
    this.mkdir('/dev/shm');
    this.mkdir('/dev/shm/tmp')
  }
  ),
  createSpecialDirectories: (function() {
    this.mkdir('/proc');
    this.mkdir('/proc/self');
    this.mkdir('/proc/self/fd');
    this.mount({
      mount: (function() {
        var node = this.createNode('/proc/self', 'fd', 16384 | 511, 73);
        node.node_ops = {
          lookup: (function(parent, name) {
            var fd = +name;
            var stream = this.getStream(fd);
            if (!stream)
              throw new this.ErrnoError(ERRNO_CODES.EBADF);
            var ret = {
              parent: null,
              mount: {
                mountpoint: 'fake'
              },
              node_ops: {
                readlink: (function() {
                  return stream.path
                }
                )
              }
            };
            ret.parent = ret;
            return ret
          }
          )
        };
        return node
      }
      )
    }, {}, '/proc/self/fd')
  }
  ),
  createStandardStreams: (function() {
    if (Module['stdin']) {
      this.createDevice('/dev', 'stdin', Module['stdin'])
    } else {
      this.symlink('/dev/tty', '/dev/stdin')
    }
    if (Module['stdout']) {
      this.createDevice('/dev', 'stdout', null, Module['stdout'])
    } else {
      this.symlink('/dev/tty', '/dev/stdout')
    }
    if (Module['stderr']) {
      this.createDevice('/dev', 'stderr', null, Module['stderr'])
    } else {
      this.symlink('/dev/tty1', '/dev/stderr')
    }
    var stdin = this.open('/dev/stdin', 'r');
    assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
    var stdout = this.open('/dev/stdout', 'w');
    assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
    var stderr = this.open('/dev/stderr', 'w');
    assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')')
  }
  ),
  ensureErrnoError: (function() {
    if (this.ErrnoError)
      return;
    this.ErrnoError = function ErrnoError(errno, node) {
      this.node = node;
      this.setErrno = (function(errno) {
        this.errno = errno;
        for (var key in ERRNO_CODES) {
          if (ERRNO_CODES[key] === errno) {
            this.code = key;
            break
          }
        }
      }
      );
      this.setErrno(errno);
      this.message = ERRNO_MESSAGES[errno];
      if (this.stack)
        Object.defineProperty(this, 'stack', {
          value: (new Error).stack,
          writable: true
        })
    }
    ;
    this.ErrnoError.prototype = new Error;
    this.ErrnoError.prototype.constructor = this.ErrnoError;
    [ERRNO_CODES.ENOENT].forEach((function(code) {
      this.genericErrors[code] = new this.ErrnoError(code);
      this.genericErrors[code].stack = '<generic error, no stack>'
    }
    ))
  }
  ),
  staticInit: (function() {
    this.ensureErrnoError();
    this.nameTable = new Array(4096);
    this.mount(MEMFS, {}, '/');
    this.createDefaultDirectories();
    this.createDefaultDevices();
    this.createSpecialDirectories();
    this.filesystems = {
      'MEMFS': MEMFS,
      'IDBFS': IDBFS,
      'NODEFS': NODEFS,
      'WORKERFS': WORKERFS
    }
  }
  ),
  init: (function(input, output, error) {
    assert(!this.init.initialized, 'this.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
    this.init.initialized = true;
    this.ensureErrnoError();
    Module['stdin'] = input || Module['stdin'];
    Module['stdout'] = output || Module['stdout'];
    Module['stderr'] = error || Module['stderr'];
    this.createStandardStreams()
  }
  ),
  quit: (function() {
    this.init.initialized = false;
    var fflush = Module['_fflush'];
    if (fflush)
      fflush(0);
    for (var i = 0; i < this.streams.length; i++) {
      var stream = this.streams[i];
      if (!stream) {
        continue
      }
      this.close(stream)
    }
  }
  ),
  getMode: (function(canRead, canWrite) {
    var mode = 0;
    if (canRead)
      mode |= 292 | 73;
    if (canWrite)
      mode |= 146;
    return mode
  }
  ),
  joinPath: (function(parts, forceRelative) {
    var path = PATH.join.apply(null, parts);
    if (forceRelative && path[0] == '/')
      path = path.substr(1);
    return path
  }
  ),
  absolutePath: (function(relative, base) {
    return PATH.resolve(base, relative)
  }
  ),
  standardizePath: (function(path) {
    return PATH.normalize(path)
  }
  ),
  findObject: (function(path, dontResolveLastLink) {
    var ret = this.analyzePath(path, dontResolveLastLink);
    if (ret.exists) {
      return ret.object
    } else {
      ___setErrNo(ret.error);
      return null
    }
  }
  ),
  analyzePath: (function(path, dontResolveLastLink) {
    try {
      var lookup = this.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      path = lookup.path
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = this.lookupPath(path, {
        parent: true
      });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = this.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === '/'
    } catch (e) {
      ret.error = e.errno
    }
    return ret
  }
  ),
  createFolder: (function(parent, name, canRead, canWrite) {
    var path = PATH.join2(typeof parent === 'string' ? parent : this.getPath(parent), name);
    var mode = this.getMode(canRead, canWrite);
    return this.mkdir(path, mode)
  }
  ),
  createPath: (function(parent, path, canRead, canWrite) {
    parent = typeof parent === 'string' ? parent : this.getPath(parent);
    var parts = path.split('/').reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part)
        continue;
      var current = PATH.join2(parent, part);
      try {
        this.mkdir(current)
      } catch (e) {}
      parent = current
    }
    return current
  }
  ),
  createFile: (function(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent === 'string' ? parent : this.getPath(parent), name);
    var mode = this.getMode(canRead, canWrite);
    return this.create(path, mode)
  }
  ),
  createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
    var path = name ? PATH.join2(typeof parent === 'string' ? parent : this.getPath(parent), name) : parent;
    var mode = this.getMode(canRead, canWrite);
    var node = this.create(path, mode);
    if (data) {
      if (typeof data === 'string') {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i)
          arr[i] = data.charCodeAt(i);
        data = arr
      }
      this.chmod(node, mode | 146);
      var stream = this.open(node, 'w');
      this.write(stream, data, 0, data.length, 0, canOwn);
      this.close(stream);
      this.chmod(node, mode)
    }
    return node
  }
  ),
  createDevice: (function(parent, name, input, output) {
    var path = PATH.join2(typeof parent === 'string' ? parent : this.getPath(parent), name);
    var mode = this.getMode(!!input, !!output);
    if (!this.createDevice.major)
      this.createDevice.major = 64;
    var dev = this.makedev(this.createDevice.major++, 0);
    this.registerDevice(dev, {
      open: (function(stream) {
        stream.seekable = false
      }
      ),
      close: (function(stream) {
        if (output && output.buffer && output.buffer.length) {
          output(10)
        }
      }
      ),
      read: (function(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input()
          } catch (e) {
            throw new this.ErrnoError(ERRNO_CODES.EIO)
          }
          if (result === undefined && bytesRead === 0) {
            throw new this.ErrnoError(ERRNO_CODES.EAGAIN)
          }
          if (result === null || result === undefined)
            break;
          bytesRead++;
          buffer[offset + i] = result
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now()
        }
        return bytesRead
      }
      ),
      write: (function(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i])
          } catch (e) {
            throw new this.ErrnoError(ERRNO_CODES.EIO)
          }
        }
        if (length) {
          stream.node.timestamp = Date.now()
        }
        return i
      }
      )
    });
    return this.mkdev(path, mode, dev)
  }
  ),
  createLink: (function(parent, name, target, canRead, canWrite) {
    var path = PATH.join2(typeof parent === 'string' ? parent : this.getPath(parent), name);
    return this.symlink(target, path)
  }
  ),
  forceLoadFile: (function(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
      return true;
    var success = true;
    if (typeof XMLHttpRequest !== 'undefined') {
      throw new Error('Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.')
    } else if (Module['read']) {
      try {
        obj.contents = intArrayFromString(Module['read'](obj.url), true);
        obj.usedBytes = obj.contents.length
      } catch (e) {
        success = false
      }
    } else {
      throw new Error('Cannot load without read() or XMLHttpRequest.')
    }
    if (!success)
      ___setErrNo(ERRNO_CODES.EIO);
    return success
  }
  ),
  createLazyFile: (function(parent, name, url, canRead, canWrite) {
    function LazyUint8Array() {
      this.lengthKnown = false;
      this.chunks = []
    }
    LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
      if (idx > this.length - 1 || idx < 0) {
        return undefined
      }
      var chunkOffset = idx % this.chunkSize;
      var chunkNum = idx / this.chunkSize | 0;
      return this.getter(chunkNum)[chunkOffset]
    }
    ;
    LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
      this.getter = getter
    }
    ;
    LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
      var xhr = new XMLHttpRequest;
      xhr.open('HEAD', url, false);
      xhr.send(null);
      if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
        throw new Error('Couldn't load ' + url + '. Status: ' + xhr.status);
      var datalength = Number(xhr.getResponseHeader('Content-length'));
      var header;
      var hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
      var usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
      var chunkSize = 1024 * 1024;
      if (!hasByteServing)
        chunkSize = datalength;
      var doXHR = (function(from, to) {
        if (from > to)
          throw new Error('invalid range (' + from + ', ' + to + ') or no bytes requested!');
        if (to > datalength - 1)
          throw new Error('only ' + datalength + ' bytes available! programmer error!');
        var xhr = new XMLHttpRequest;
        xhr.open('GET', url, false);
        if (datalength !== chunkSize)
          xhr.setRequestHeader('Range', 'bytes=' + from + '-' + to);
        if (typeof Uint8Array != 'undefined')
          xhr.responseType = 'arraybuffer';
        if (xhr.overrideMimeType) {
          xhr.overrideMimeType('text/plain; charset=x-user-defined')
        }
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
          throw new Error('Couldn't load ' + url + '. Status: ' + xhr.status);
        if (xhr.response !== undefined) {
          return new Uint8Array(xhr.response || [])
        } else {
          return intArrayFromString(xhr.responseText || '', true)
        }
      }
      );
      var lazyArray = this;
      lazyArray.setDataGetter((function(chunkNum) {
        var start = chunkNum * chunkSize;
        var end = (chunkNum + 1) * chunkSize - 1;
        end = Math.min(end, datalength - 1);
        if (typeof lazyArray.chunks[chunkNum] === 'undefined') {
          lazyArray.chunks[chunkNum] = doXHR(start, end)
        }
        if (typeof lazyArray.chunks[chunkNum] === 'undefined')
          throw new Error('doXHR failed!');
        return lazyArray.chunks[chunkNum]
      }
      ));
      if (usesGzip || !datalength) {
        chunkSize = datalength = 1;
        datalength = this.getter(0).length;
        chunkSize = datalength;
        console.log('LazyFiles on gzip forces download of the whole file when length is accessed')
      }
      this._length = datalength;
      this._chunkSize = chunkSize;
      this.lengthKnown = true
    }
    ;
    if (typeof XMLHttpRequest !== 'undefined') {
      if (!ENVIRONMENT_IS_WORKER)
        throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
      var lazyArray = new LazyUint8Array;
      Object.defineProperties(lazyArray, {
        length: {
          get: (function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._length
          }
          )
        },
        chunkSize: {
          get: (function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._chunkSize
          }
          )
        }
      });
      var properties = {
        isDevice: false,
        contents: lazyArray
      }
    } else {
      var properties = {
        isDevice: false,
        url: url
      }
    }
    var node = this.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {
      node.contents = properties.contents
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url
    }
    Object.defineProperties(node, {
      usedBytes: {
        get: (function() {
          return this.contents.length
        }
        )
      }
    });
    var stream_ops = {};
    var keys = Object.keys(node.stream_ops);
    keys.forEach((function(key) {
      var fn = node.stream_ops[key];
      stream_ops[key] = function forceLoadLazyFile() {
        if (!this.forceLoadFile(node)) {
          throw new this.ErrnoError(ERRNO_CODES.EIO)
        }
        return fn.apply(null, arguments)
      }
    }
    ));
    stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
      if (!this.forceLoadFile(node)) {
        throw new this.ErrnoError(ERRNO_CODES.EIO)
      }
      var contents = stream.node.contents;
      if (position >= contents.length)
        return 0;
      var size = Math.min(contents.length - position, length);
      assert(size >= 0);
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i]
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i)
        }
      }
      return size
    }
    ;
    node.stream_ops = stream_ops;
    return node
  }
  ),
  createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
    Browser.init();
    var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency('cp ' + fullname);
    function processData(byteArray) {
      function finish(byteArray) {
        if (preFinish)
          preFinish();
        if (!dontCreateFile) {
          this.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
        }
        if (onload)
          onload();
        removeRunDependency(dep)
      }
      var handled = false;
      Module['preloadPlugins'].forEach((function(plugin) {
        if (handled)
          return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, (function() {
            if (onerror)
              onerror();
            removeRunDependency(dep)
          }
          ));
          handled = true
        }
      }
      ));
      if (!handled)
        finish(byteArray)
    }
    addRunDependency(dep);
    if (typeof url == 'string') {
      Browser.asyncLoad(url, (function(byteArray) {
        processData(byteArray)
      }
      ), onerror)
    } else {
      processData(url)
    }
  }
  ),
  indexedDB: (function() {
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
  }
  ),
  DB_NAME: (function() {
    return 'EM_FS_' + window.location.pathname
  }
  ),
  DB_VERSION: 20,
  DB_STORE_NAME: 'FILE_DATA',
  saveFilesToDB: (function(paths, onload, onerror) {
    onload = onload || (function() {}
    );
    onerror = onerror || (function() {}
    );
    var indexedDB = this.indexedDB();
    try {
      var openRequest = indexedDB.open(this.DB_NAME(), this.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
      console.log('creating db');
      var db = openRequest.result;
      db.createObjectStore(this.DB_STORE_NAME)
    }
    ;
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result;
      var transaction = db.transaction([this.DB_STORE_NAME], 'readwrite');
      var files = transaction.objectStore(this.DB_STORE_NAME);
      var ok = 0
        , fail = 0
        , total = paths.length;
      function finish() {
        if (fail == 0)
          onload();
        else
          onerror()
      }
      paths.forEach((function(path) {
        var putRequest = files.put(this.analyzePath(path).object.contents, path);
        putRequest.onsuccess = function putRequest_onsuccess() {
          ok++;
          if (ok + fail == total)
            finish()
        }
        ;
        putRequest.onerror = function putRequest_onerror() {
          fail++;
          if (ok + fail == total)
            finish()
        }
      }
      ));
      transaction.onerror = onerror
    }
    ;
    openRequest.onerror = onerror
  }
  ),
  loadFilesFromDB: (function(paths, onload, onerror) {
    onload = onload || (function() {}
    );
    onerror = onerror || (function() {}
    );
    var indexedDB = this.indexedDB();
    try {
      var openRequest = indexedDB.open(this.DB_NAME(), this.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = onerror;
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result;
      try {
        var transaction = db.transaction([this.DB_STORE_NAME], 'readonly')
      } catch (e) {
        onerror(e);
        return
      }
      var files = transaction.objectStore(this.DB_STORE_NAME);
      var ok = 0
        , fail = 0
        , total = paths.length;
      function finish() {
        if (fail == 0)
          onload();
        else
          onerror()
      }
      paths.forEach((function(path) {
        var getRequest = files.get(path);
        getRequest.onsuccess = function getRequest_onsuccess() {
          if (this.analyzePath(path).exists) {
            this.unlink(path)
          }
          this.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
          ok++;
          if (ok + fail == total)
            finish()
        }
        ;
        getRequest.onerror = function getRequest_onerror() {
          fail++;
          if (ok + fail == total)
            finish()
        }
      }
      ));
      transaction.onerror = onerror
    }
    ;
    openRequest.onerror = onerror
  }
  )
};
var SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  mappings: {},
  umask: 511,
  calculateAt: (function(dirfd, path) {
    if (path[0] !== '/') {
      var dir;
      if (dirfd === -100) {
        dir = this.cwd()
      } else {
        var dirstream = this.getStream(dirfd);
        if (!dirstream)
          throw new this.ErrnoError(ERRNO_CODES.EBADF);
        dir = dirstream.path
      }
      path = PATH.join2(dir, path)
    }
    return path
  }
  ),
  doStat: (function(func, path, buf) {
    try {
      var stat = func(path)
    } catch (e) {
      if (e && e.node && PATH.normalize(path) !== PATH.normalize(this.getPath(e.node))) {
        return -ERRNO_CODES.ENOTDIR
      }
      throw e
    }
    HEAP32[buf >> 2] = stat.dev;
    HEAP32[buf + 4 >> 2] = 0;
    HEAP32[buf + 8 >> 2] = stat.ino;
    HEAP32[buf + 12 >> 2] = stat.mode;
    HEAP32[buf + 16 >> 2] = stat.nlink;
    HEAP32[buf + 20 >> 2] = stat.uid;
    HEAP32[buf + 24 >> 2] = stat.gid;
    HEAP32[buf + 28 >> 2] = stat.rdev;
    HEAP32[buf + 32 >> 2] = 0;
    HEAP32[buf + 36 >> 2] = stat.size;
    HEAP32[buf + 40 >> 2] = 4096;
    HEAP32[buf + 44 >> 2] = stat.blocks;
    HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
    HEAP32[buf + 52 >> 2] = 0;
    HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
    HEAP32[buf + 60 >> 2] = 0;
    HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
    HEAP32[buf + 68 >> 2] = 0;
    HEAP32[buf + 72 >> 2] = stat.ino;
    return 0
  }
  ),
  doMsync: (function(addr, stream, len, flags) {
    var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
    this.msync(stream, buffer, 0, len, flags)
  }
  ),
  doMkdir: (function(path, mode) {
    path = PATH.normalize(path);
    if (path[path.length - 1] === '/')
      path = path.substr(0, path.length - 1);
    this.mkdir(path, mode, 0);
    return 0
  }
  ),
  doMknod: (function(path, mode, dev) {
    switch (mode & 61440) {
    case 32768:
    case 8192:
    case 24576:
    case 4096:
    case 49152:
      break;
    default:
      return -ERRNO_CODES.EINVAL
    }
    this.mknod(path, mode, dev);
    return 0
  }
  ),
  doReadlink: (function(path, buf, bufsize) {
    if (bufsize <= 0)
      return -ERRNO_CODES.EINVAL;
    var ret = this.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = HEAP8[buf + len];
    stringToUTF8(ret, buf, bufsize + 1);
    HEAP8[buf + len] = endChar;
    return len
  }
  ),
  doAccess: (function(path, amode) {
    if (amode & ~7) {
      return -ERRNO_CODES.EINVAL
    }
    var node;
    var lookup = this.lookupPath(path, {
      follow: true
    });
    node = lookup.node;
    var perms = '';
    if (amode & 4)
      perms += 'r';
    if (amode & 2)
      perms += 'w';
    if (amode & 1)
      perms += 'x';
    if (perms && this.nodePermissions(node, perms)) {
      return -ERRNO_CODES.EACCES
    }
    return 0
  }
  ),
  doDup: (function(path, flags, suggestFD) {
    var suggest = this.getStream(suggestFD);
    if (suggest)
      this.close(suggest);
    return this.open(path, flags, 0, suggestFD, suggestFD).fd
  }
  ),
  doReadv: (function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = this.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0)
        return -1;
      ret += curr;
      if (curr < len)
        break
    }
    return ret
  }
  ),
  doWritev: (function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = this.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0)
        return -1;
      ret += curr
    }
    return ret
  }
  ),
  varargs: 0,
  get: (function(varargs) {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
    return ret
  }
  ),
  getStr: (function() {
    var ret = pointerStringify(SYSCALLS.get());
    return ret
  }
  ),
  getStreamFromFD: (function() {
    var stream = this.getStream(SYSCALLS.get());
    if (!stream)
      throw new this.ErrnoError(ERRNO_CODES.EBADF);
    return stream
  }
  ),
  getSocketFromFD: (function() {
    var socket = SOCKthis.getSocket(SYSCALLS.get());
    if (!socket)
      throw new this.ErrnoError(ERRNO_CODES.EBADF);
    return socket
  }
  ),
  getSocketAddress: (function(allowNull) {
    var addrp = SYSCALLS.get()
      , addrlen = SYSCALLS.get();
    if (allowNull && addrp === 0)
      return null;
    var info = __read_sockaddr(addrp, addrlen);
    if (info.errno)
      throw new this.ErrnoError(info.errno);
    info.addr = DNS.lookup_addr(info.addr) || info.addr;
    return info
  }
  ),
  get64: (function() {
    var low = SYSCALLS.get()
      , high = SYSCALLS.get();
    if (low >= 0)
      assert(high === 0);
    else
      assert(high === -1);
    return low
  }
  ),
  getZero: (function() {
    assert(SYSCALLS.get() === 0)
  }
  )
}

export interface FsNode {

}

interface LookupPathOpts extends Record<string, any> {
  follow_mount?: number;
  recurse_count?: number;
}
