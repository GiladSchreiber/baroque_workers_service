export class LocalStore<T extends { id: string }> {
  private key: string

  constructor(key: string, seed: T[] = []) {
    this.key = key
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(seed))
    }
  }

  getAll(): T[] {
    return JSON.parse(localStorage.getItem(this.key) ?? '[]')
  }

  getById(id: string): T | null {
    return this.getAll().find(item => item.id === id) ?? null
  }

  create(item: T): T {
    const items = this.getAll()
    items.push(item)
    localStorage.setItem(this.key, JSON.stringify(items))
    return item
  }

  update(id: string, data: Partial<T>): T {
    const items = this.getAll()
    const index = items.findIndex(item => item.id === id)
    if (index === -1) throw new Error(`Item ${id} not found`)
    items[index] = { ...items[index], ...data }
    localStorage.setItem(this.key, JSON.stringify(items))
    return items[index]
  }

  delete(id: string): void {
    const items = this.getAll().filter(item => item.id !== id)
    localStorage.setItem(this.key, JSON.stringify(items))
  }
}
