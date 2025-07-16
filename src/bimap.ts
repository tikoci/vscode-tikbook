export class BiMap<K, V> {
  private keyToValue = new Map<K, V>()
  private valueToKey = new Map<V, K>()

  set(key: K, value: V): void {
    // Remove old mappings if they exist
    if (this.keyToValue.has(key)) {
      this.valueToKey.delete(this.keyToValue.get(key)!)
    }
    if (this.valueToKey.has(value)) {
      this.keyToValue.delete(this.valueToKey.get(value)!)
    }
    this.keyToValue.set(key, value)
    this.valueToKey.set(value, key)
  }

  getValue(key: K): V | undefined {
    return this.keyToValue.get(key)
  }

  getKey(value: V): K | undefined {
    return this.valueToKey.get(value)
  }

  deleteByKey(key: K): boolean {
    const value = this.keyToValue.get(key)
    const deleted = this.keyToValue.delete(key)
    if (value !== undefined) {
      this.valueToKey.delete(value)
    }
    return deleted
  }

  deleteByValue(value: V): boolean {
    const key = this.valueToKey.get(value)
    const deleted = this.valueToKey.delete(value)
    if (key !== undefined) {
      this.keyToValue.delete(key)
    }
    return deleted
  }

  hasKey(key: K): boolean {
    return this.keyToValue.has(key)
  }

  hasValue(value: V): boolean {
    return this.valueToKey.has(value)
  }

  keys(): IterableIterator<K> {
    return this.keyToValue.keys()
  }

  values(): IterableIterator<V> {
    return this.keyToValue.values()
  }

  clear(): void {
    this.keyToValue.clear()
    this.valueToKey.clear()
  }

  get size(): number {
    return this.keyToValue.size
  }
}
