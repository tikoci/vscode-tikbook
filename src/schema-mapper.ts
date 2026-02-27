import { getTikBookChannel } from './output-channels';
import type { RouterRestClient } from './routeros';
import type { SchemaEntry } from './scriptfs-schema';

export class SchemaMapper {
  constructor(private client: RouterRestClient, private schema: SchemaEntry) {}

  async listItems(): Promise<unknown[]> {
    getTikBookChannel().debug(`<SchemaMapper.listItems> path=${this.schema.path}, filter=${JSON.stringify(this.schema.printBody)}`)
    try {
      const items = await this.client.list(this.schema.path, this.schema.printBody)
      getTikBookChannel().debug(`<SchemaMapper.listItems> SUCCESS: ${items.length} items from ${this.schema.path}`)
      return items
    }
    catch (err) {
      getTikBookChannel().error(`<SchemaMapper.listItems> FAILED for ${this.schema.path}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async getItem(idOrName: string): Promise<Record<string, unknown> | undefined> {
    getTikBookChannel().debug(`<SchemaMapper.getItem> path=${this.schema.path}, idOrName='${idOrName}', nameAttr='${this.schema.nameAttr}'`)
    try {
      const item = await this.client.get(this.schema.path, idOrName) as Record<string, unknown>
      getTikBookChannel().debug(`<SchemaMapper.getItem> SUCCESS: got item with keys: ${Object.keys(item).join(', ')}`)
      return item
    }
    catch (err) {
      getTikBookChannel().debug(`<SchemaMapper.getItem> get() failed, trying fallback list+match: ${err instanceof Error ? err.message : String(err)}`)
      return this.getItemFallback(idOrName)
    }
  }

  private async getItemFallback(idOrName: string): Promise<Record<string, unknown> | undefined> {
    try {
      const items = await this.listItems()
      const found = (items).find((it) => {
        const rec = it as Record<string, unknown>
        return rec[this.schema.nameAttr ?? 'name'] === idOrName || rec['.id'] === idOrName || rec.id === idOrName
      }) as Record<string, unknown> | undefined
      if (found) {
        getTikBookChannel().debug(`<SchemaMapper.getItem> FALLBACK SUCCESS: found in list`)
      }
      else {
        getTikBookChannel().debug(`<SchemaMapper.getItem> FALLBACK FAILED: not found in list (searched ${items.length} items)`)
      }
      return found
    }
    catch (fallbackErr) {
      getTikBookChannel().error(`<SchemaMapper.getItem> fallback also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`)
      throw fallbackErr
    }
  }

  async createItem(payload: Record<string, unknown>): Promise<unknown> {
    return this.client.create(this.schema.path, payload)
  }

  async updateItem(id: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.client.update(this.schema.path, id, patch)
  }

  async deleteItem(id: string): Promise<unknown> {
    return this.client.remove(this.schema.path, id)
  }

  async resolveIdByName(name: string): Promise<string | undefined> {
    return this.client.resolveIdByName(this.schema.path, name, this.schema.nameAttr)
  }

  // Verify that router exposes the given path via console inspect
  async inspectPathExists(): Promise<boolean> {
    try {
      // /console/inspect expects a comma-separated path or array; use path segments
      const parts = this.schema.path.split('/').filter(Boolean)
      const resp = await this.client._inspect('child', '', parts.join(','))
      return Array.isArray(resp) && resp.length > 0
    }
    catch {
      return false
    }
  }
}

export default SchemaMapper
