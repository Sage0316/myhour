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
