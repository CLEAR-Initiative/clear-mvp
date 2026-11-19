/**
 * Just enough Cache Storage for the service-worker cache tests: open, keys,
 * delete, and match with a `cacheName`. Like the real one, `open` creates a
 * cache and `match` does not.
 */
type Key = string | Request;

const keyOf = (key: Key) => (typeof key === "string" ? key : key.url);

export class FakeCacheStorage {
  readonly stores = new Map<string, Map<string, Response>>();

  open(name: string) {
    let store = this.stores.get(name);
    if (!store) {
      store = new Map();
      this.stores.set(name, store);
    }
    const s = store;
    return Promise.resolve({
      put: (key: Key, response: Response) => {
        s.set(keyOf(key), response);
        return Promise.resolve();
      },
      delete: (key: Key) => Promise.resolve(s.delete(keyOf(key))),
      match: (key: Key) => Promise.resolve(s.get(keyOf(key))?.clone()),
    });
  }

  keys() {
    return Promise.resolve([...this.stores.keys()]);
  }

  delete(name: string) {
    return Promise.resolve(this.stores.delete(name));
  }

  match(key: Key, options?: { cacheName?: string }) {
    const store = options?.cacheName ? this.stores.get(options.cacheName) : undefined;
    return Promise.resolve(store?.get(keyOf(key))?.clone());
  }

  /** Names of the entries in one cache, or undefined when it does not exist. */
  entries(name: string): string[] | undefined {
    const store = this.stores.get(name);
    return store ? [...store.keys()] : undefined;
  }
}
