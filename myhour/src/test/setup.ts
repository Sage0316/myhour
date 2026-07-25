import 'fake-indexeddb/auto';

class ObjectUrlRegistry {
  private counter = 0;

  create(): string {
    this.counter += 1;
    return `blob:hakku-test-${this.counter}`;
  }
}

const registry = new ObjectUrlRegistry();

if (!URL.createObjectURL) {
  URL.createObjectURL = () => registry.create();
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}

// node 환경에는 localStorage가 없어서, 저장 계층 테스트용 최소 구현을 깐다
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: key => store.get(String(key)) ?? null,
    key: index => [...store.keys()][index] ?? null,
    removeItem: key => { store.delete(String(key)); },
    setItem: (key, value) => { store.set(String(key), String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
}
