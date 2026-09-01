import fs from 'node:fs'
import path from 'node:path'

export class JsonStore<K extends string, V> {
  private map = new Map<K, V>()
  private file: string

  constructor(filename: string) {
    this.file = path.join(process.cwd(), '.next', 'cache', filename)
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf-8')
        const data = JSON.parse(raw) as Record<string, V>
        this.map.clear()
        for (const [k, v] of Object.entries(data)) this.map.set(k as K, v)
      }
    } catch {
      /* ignore */
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      const obj: Record<string, V> = {}
      for (const [k, v] of this.map.entries()) obj[k as string] = v
      fs.writeFileSync(this.file, JSON.stringify(obj), 'utf-8')
    } catch {
      /* ignore */
    }
  }

  get(key: K): V | undefined {
    return this.map.get(key)
  }

  set(key: K, value: V): void {
    this.map.set(key, value)
    this.persist()
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  delete(key: K): boolean {
    const existed = this.map.delete(key)
    if (existed) this.persist()
    return existed
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries()
  }

  values(): IterableIterator<V> {
    return this.map.values()
  }

  keys(): IterableIterator<K> {
    return this.map.keys()
  }
}
