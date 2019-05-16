import {
  FS,
} from './FS';
import {
  getGlobalValue,
} from './getGlobalValue';
import {
  MEMFS,
} from './MEMFS';
import {
  PATH,
} from './PATH';
import {
  assertValid,
} from 'ts-assertions';

const BaseIdbFs = getGlobalValue('IDBFS') || {};

export class IdbFsClass extends BaseIdbFs {
  /* No clue what the purpose of this is but it's here to shut the types up. */
  public error = new Error('If you see this, something went wrong.');

  public readonly dbs: Record<string, IDBDatabase> = {};
  public readonly indexedDB = () => {
    if (indexedDB !== undefined) {
      return indexedDB;
    }

    let ret = null;
    if (typeof window === 'object') {
      // @ts-ignore
      ret = window.indexedDB ||
        // @ts-ignore
        window.mozIndexedDB ||
        // @ts-ignore
        window.webkitIndexedDB ||
        // @ts-ignore
        window.msIndexedDB;
    }

    return assertValid<IDBFactory>(
      ret,
      'IndexedDB was selected but is not supported.',
    );
  };

  public readonly DB_VERSION = 21;
  public readonly DB_STORE_NAME = 'FILE_DATA';

  public readonly mount = (arg: never) => void MEMFS.mount(arg);

  public readonly syncfs = (
    mount: never,
    populate: unknown,
    callback: Function,
  ) => this.getLocalSet(mount, (err: Error, local: never) => {
    if (err) {
      return callback(err);
    }

    this.getRemoteSet(mount, (err: Error, remote: never) => {
      if (err) {
        return callback(err);
      }

      const src = populate ? remote : local;
      const dest = populate ? local : remote;
      this.reconcile(src, dest, callback);
    });
  });

  public readonly getDB = (name: string, callback: Function) => {
    const db = this.dbs[name];
    if (db) {
      return callback(null, db);
    }

    let req: IDBOpenDBRequest;
    try {
      req = this.indexedDB().open(name, this.DB_VERSION)
    } catch (e) {
      return callback(e)
    }

    if (!req) {
      return callback('Unable to connect to IndexedDB')
    }

    req.onupgradeneeded = ({ target }) => {
      // @ts-ignore
      let db = target.result;
      let fileStore;
      if (db.objectStoreNames.contains(this.DB_STORE_NAME)) {
        // @ts-ignore
        fileStore = target.transaction.objectStore(this.DB_STORE_NAME);
      } else {
        fileStore = db.createObjectStore(this.DB_STORE_NAME);
      }

      if (!fileStore.indexNames.contains('timestamp')) {
        fileStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      return null;
    };

    req.onsuccess = () => {
      const db = req.result;
      this.dbs[name] = db;
      callback(null, db);
    };

    req.onerror = (e: Event) => {
      callback(this.error);
      e.preventDefault();
    };
  };

  public readonly getLocalSet = (mount: { mountpoint: any }, callback: Function) => {
    const entries: Record<string, { timestamp: number }> = {};
    const isRealDir = (_path: string) => _path !== '.' && _path !== '..';
    const toAbsolute = (root: string) => (_path: string) => (
      PATH.join2(root, _path)
    );

    const check = FS.readdir(mount.mountpoint).filter(isRealDir).map(
      toAbsolute(mount.mountpoint)
    );

    while (check.length) {
      const path = check.pop();
      let stat;
      try {
        stat = FS.stat(path)
      } catch (e) {
        return callback(e)
      }

      if (FS.isDir(stat.mode)) {
        check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
      }

      entries[path] = { timestamp: stat.mtime };
    }

    return callback(null, {
      type: 'local',
      entries: entries,
    });
  };

  public readonly getRemoteSet = (mount: { mountpoint: string }, callback: Function) => {
    const entries: Record<string, any> = {};
    this.getDB(mount.mountpoint, (err: Error, db: IDBDatabase) => {
      if (err) {
        return callback(err);
      }

      try {
        let transaction = db.transaction([ this.DB_STORE_NAME ], 'readonly');
        transaction.onerror = (e: Event) => {
          callback(this.error);
          e.preventDefault();
        };

        let store = transaction.objectStore(this.DB_STORE_NAME);
        let index = store.index('timestamp');
        index.openKeyCursor().onsuccess = (e: Event) => {
          // @ts-ignore
          let cursor = e.target.result;
          if (!cursor) {
            return callback(null, {
              entries,
              type: 'remote',
              db: db,
            });
          }

          entries[cursor.primaryKey] = { timestamp: cursor.key };
          cursor.continue();
        }
      } catch (e) {
        return callback(e);
      }
    });
  };

  public readonly loadLocalEntry = (path: string, callback: Function) => {
    let stat;
    let node;
    try {
      let lookup = FS.lookupPath(path);
      node = lookup.node;
      stat = FS.stat(path)
    } catch (e) {
      return callback(e)
    }

    if (FS.isDir(stat.mode)) {
      return callback(null, {
        timestamp: stat.mtime,
        mode: stat.mode
      });
    } else if (FS.isFile(stat.mode)) {
      node.contents = MEMFS.getFileDataAsTypedArray(node);
      return callback(null, {
        timestamp: stat.mtime,
        mode: stat.mode,
        contents: node.contents,
      });
    } else {
      return callback(new Error('Node type not supported.'));
    }
  };

  public readonly storeLocalEntry = (
    path: string,
    entry: any,
    callback: Function,
  ) => {
    try {
      if (FS.isDir(entry.mode)) {
        FS.mkdir(path, entry.mode)
      } else if (FS.isFile(entry.mode)) {
        FS.writeFile(path, entry.contents, { canOwn: true });
      } else {
        return callback(new Error('Node type not supported.'));
      }

      FS.chmod(path, entry.mode);
      FS.utime(path, entry.timestamp, entry.timestamp);
    } catch (e) {
      return callback(e)
    }
    callback(null)
  };

  removeLocalEntry = (path: string, callback: Function) => {
    try {
      let lookup = FS.lookupPath(path);
      let stat = FS.stat(path);
      if (FS.isDir(stat.mode)) {
        FS.rmdir(path);
      } else if (FS.isFile(stat.mode)) {
        FS.unlink(path);
      }
    } catch (e) {
      return callback(e)
    }

    callback(null);
  };

  loadRemoteEntry = (store: IDBObjectStore, path: string, callback: Function) => {
    let req = store.get(path);
    req.onsuccess = (event: any) => callback(null, event.target.result);

    req.onerror = ({ preventDefault }: Event) => {
      callback(this.error);
      preventDefault();
    };
  };

  public readonly storeRemoteEntry = (store: IDBObjectStore, path: string, entry: any, callback: Function) => {
    const req = store.put(entry, path);
    req.onsuccess = () => callback(null);
    req.onerror = ({ preventDefault }: Event) => {
      callback(this.error);
      preventDefault();
    };
  };

  public readonly removeRemoteEntry = (
    store: IDBObjectStore,
    path: string,
    callback: Function,
  ) => {
    const req = store.delete(path);
    req.onsuccess = () => callback(null);

    req.onerror = ({ preventDefault }: Event) => {
      callback(this.error);
      preventDefault();
    };
  };

  public readonly reconcile = (
    src: {
      db: IDBDatabase,
      entries: Record<string, any>,
      type: string,
    },

    dst: {
      db: IDBDatabase,
      entries: Record<string, any>,
      type: string,
    },

    callback: Function,
  ) => {
    const create: string[] = [];
    let total = 0;
    Object.keys(src.entries).forEach((key) => {
      const e = src.entries[key];
      const e2 = dst.entries[key];
      if (!e2 || e.timestamp > e2.timestamp) {
        create.push(key);
        total += 1;
      }
    });

    const remove: string[] = [];
    Object.keys(dst.entries).forEach((key) => {
      let e = dst.entries[key];
      const e2 = src.entries[key];
      if (!e2) {
        remove.push(key);
        total += 1;
      }
    });

    if (!total) {
      return callback(null);
    }

    let completed = 0;
    const db = src.type === 'remote' ? src.db : dst.db;
    const transaction = db.transaction([ this.DB_STORE_NAME ], 'readwrite');
    const store = transaction.objectStore(this.DB_STORE_NAME);

    const done = (err: Error) => {
      if (err) {
        // @ts-ignore
        if (!done.errored) {
          // @ts-ignore
          done.errored = true;
          return callback(err);
        }

        return;
      }

      if (++completed >= total) {
        return callback(null);
      }
    };

    transaction.onerror = ({ preventDefault }: Event) => {
      done(this.error);
      preventDefault();
    };
   
    create.sort().forEach((path) => {
      if (dst.type === 'local') {
        this.loadRemoteEntry(store, path, (err: Error, entry: any) => {
          if (err) {
            return done(err);
          }

          this.storeLocalEntry(path, entry, done);
        });
      } else {
        this.loadLocalEntry(path, (err: Error, entry: any) => {
          if (err) {
            return done(err);
          }

          this.storeRemoteEntry(store, path, entry, done)
        });
      }
    });

    remove.sort().reverse().forEach((path) => {
      if (dst.type === 'local') {
        this.removeLocalEntry(path, done)
      } else {
        this.removeRemoteEntry(store, path, done)
      }
    });
  };
}
