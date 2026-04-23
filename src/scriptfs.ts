import type { Disposable, FileChangeEvent, FileStat, FileSystemProvider } from 'vscode';
import { commands, EventEmitter, FileChangeType, FilePermission, FileSystemError, FileType, languages, Uri, window, workspace } from 'vscode';
import { getSettings } from './config';
import { getTikBookChannel } from './output-channels';
import { RouterRestClient } from './routeros';
import SchemaMapper from './schema-mapper';
import type { SchemaEntry } from './scriptfs-schema';
import scriptfsSchema from './scriptfs-schema';

const SCHEME = 'rscfile'
const getVirtualFileSystemChannel = getTikBookChannel

class InMemoryStat implements FileStat {
  constructor(
    public type: FileType,
    public ctime: number,
    public mtime: number,
    public size: number,
    public permissions?: FilePermission,
  ) {}
}

function createDirectoryStat(mtime: number): InMemoryStat {
  return new InMemoryStat(FileType.Directory, 0, mtime, 0, FilePermission.Readonly)
}

export function findSchemaForParts(parts: string[]): { schema: SchemaEntry, relParts: string[] } | undefined {
  for (const s of scriptfsSchema) {
    const segs = s.path.split('/').filter(Boolean)
    if (parts.length < segs.length) continue
    let ok = true
    for (let i = 0; i < segs.length; i++) {
      if (parts[i] !== segs[i]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const rel = parts.slice(segs.length)
    return { schema: s, relParts: rel }
  }
  return undefined
}

/**
 * Get child directories/segments for a given path based on schema entries
 * Only shows immediate schema paths or first-level items within a schema
 * Prevents showing intermediate non-schema directories like "v6" under "ip"
 */
export function getSchemaChildPaths(parts: string[]): Set<string> {
  const children = new Set<string>()
  const currentPath = parts.length === 0 ? '' : '/' + parts.join('/')

  for (const schema of scriptfsSchema) {
    const schemaPath = schema.path
    // Check if this schema path extends/matches the current path
    if (schemaPath === currentPath) {
      // Exact match: this is a schema root, don't add children here (handled by readDirectory)
      continue
    }
    if (schemaPath.startsWith(currentPath + '/')) {
      // Schema extends from current path
      const remainder = schemaPath.substring(currentPath.length + 1)
      const segments = remainder.split('/').filter(Boolean)
      if (segments.length >= 1) {
        // Add direct children; root needs the first segment even when deeper paths exist
        if (currentPath === '' || segments.length === 1) children.add(segments[0])
      }
    }
  }

  return children
}

function getSchemaChildPathsFromAvailable(parts: string[], availablePaths: Set<string>): Set<string> {
  const children = new Set<string>()
  const currentPath = parts.length === 0 ? '' : '/' + parts.join('/')

  for (const schemaPath of availablePaths) {
    if (schemaPath === currentPath) continue
    if (schemaPath.startsWith(currentPath + '/')) {
      const remainder = schemaPath.substring(currentPath.length + 1)
      const segments = remainder.split('/').filter(Boolean)
      if (segments.length >= 1) {
        if (currentPath === '' || segments.length === 1) children.add(segments[0])
      }
    }
  }

  return children
}

function normalizeItemName(schema: SchemaEntry, rawName: string): string {
  if (!rawName) return rawName
  if (schema.filenameTemplate?.endsWith('.rsc') && rawName.endsWith('.rsc')) {
    return rawName.slice(0, -4)
  }
  return rawName
}

function renderFilename(schema: SchemaEntry, item: Record<string, unknown>): string {
  const template = schema.filenameTemplate ?? '${name}'
  return template.replace(/\$\{([^}]+)\}/g, (_match, key: string) => {
    if (key === 'name') {
      const value = item[schema.nameAttr ?? 'name'] ?? item['.id'] ?? item.id
      return value ? String(value) : ''
    }
    const itemValue = item[key]
    return itemValue ? String(itemValue) : ''
  })
}

function deriveItemName(schema: SchemaEntry, rawName: string): string {
  const normalized = normalizeItemName(schema, rawName)
  const template = schema.filenameTemplate
  if (!template?.includes('${')) return normalized

  const matches = Array.from(template.matchAll(/\$\{([^}]+)\}/g))
  if (matches.length !== 1) return normalized

  const match = matches[0]
  const placeholder = match[0]
  const start = match.index ?? 0
  const prefix = template.slice(0, start)
  const suffix = template.slice(start + placeholder.length)

  if (!normalized.startsWith(prefix) || !normalized.endsWith(suffix)) return normalized
  const core = normalized.slice(prefix.length, normalized.length - suffix.length)
  return core.length > 0 ? core : normalized
}

function looksLikeId(name: string): boolean {
  return name.startsWith('*') || name.startsWith('.')
}

function hashString(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

function logCompareMismatch(label: string, tracked: string, remote: string): void {
  getTikBookChannel().debug(
    `<SystemScriptFS.writeFile> compare-mismatch ${label} trackedLen=${tracked.length} remoteLen=${remote.length} trackedHash=${hashString(tracked)} remoteHash=${hashString(remote)}`,
  )
}

async function resolveItemIdByFileName(mapper: SchemaMapper, schema: SchemaEntry, itemName: string): Promise<string | undefined> {
  const direct = await mapper.resolveIdByName(itemName)
  if (direct) return direct
  if (looksLikeId(itemName)) return itemName

  try {
    const items = await mapper.listItems()
    for (const it of items) {
      const rec = it as Record<string, unknown>
      const id = getItemId(rec)
      const name = rec[schema.nameAttr ?? 'name'] ?? id
      if (!name) continue
      const normalized = normalizeItemName(schema, String(name))
      if (normalized === itemName) return id
    }
  }
  catch {
    return undefined
  }
  return undefined
}

function getItemId(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined
  return (item['.id'] as string | undefined) ?? (item.id as string | undefined)
}

function mapNetwatchAttr(attr: string): string {
  if (attr === 'on-up') return 'up-script'
  if (attr === 'on-down') return 'down-script'
  if (attr === 'on-test') return 'test-script'
  return attr
}

function getMultiFileItemName(schema: SchemaEntry, relParts: string[]): string {
  if (schema.singleton) return String(relParts[0] ?? '')
  return decodeURIComponent(relParts[0] ?? '')
}

function getRequestedSchemaChildName(schema: SchemaEntry, relParts: string[]): string {
  if (schema.singleton) return String(relParts[0] ?? '')
  return decodeURIComponent(relParts[0] ?? '')
}

function getAllowedMultiFileAttrs(schema: SchemaEntry): Set<string> {
  if (schema.singleton) return new Set(['on-event'])
  return new Set((schema.scriptAttrs ?? []).map(String))
}

export class SystemScriptFS implements FileSystemProvider {
  private onDidChangeEmitter = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile = this.onDidChangeEmitter.event
  private watchers = new Map<string, number>()
  // track opened files: key = uri.toString()
  private openFiles = new Map<string, { id?: string, original?: string, mtime?: number }>()
  // Generic item cache: path -> Set<itemName>
  private itemsCache = new Map<string, { names: Set<string>, timestamp: number }>()
  private pathExistsCache = new Map<string, { exists: boolean, timestamp: number }>()
  private pathCheckTimeout = 5 * 60 * 1000 // 5 minutes
  private itemsCacheTimeout = 10 * 1000 // 10 seconds for item cache

  constructor() {
    getTikBookChannel().trace('<SystemScriptFS> {constructor} initialized')
  }

  watch(_uri: Uri, _options: { recursive: boolean, excludes: string[] }): Disposable { return { dispose: () => { } } }

  private async pathExists(path: string): Promise<boolean> {
    const cached = this.pathExistsCache.get(path)
    if (cached && Date.now() - cached.timestamp < this.pathCheckTimeout) {
      return cached.exists
    }

    try {
      const mapper = new SchemaMapper(RouterRestClient.default, { path, scriptAttrs: [] } as SchemaEntry)
      const exists = await mapper.inspectPathExists()
      this.pathExistsCache.set(path, { exists, timestamp: Date.now() })
      return exists
    }
    catch {
      this.pathExistsCache.set(path, { exists: false, timestamp: Date.now() })
      return false
    }
  }

  private async getAvailableSchemaPaths(): Promise<Set<string>> {
    const available = new Set<string>()
    for (const schema of scriptfsSchema) {
      if (await this.pathExists(schema.path)) {
        available.add(schema.path)
      }
    }
    return available
  }

  private getCachedItemNames(schemaPath: string): Set<string> | undefined {
    const cached = this.itemsCache.get(schemaPath)
    if (cached && Date.now() - cached.timestamp < this.itemsCacheTimeout) {
      return cached.names
    }
    return undefined
  }

  private setCachedItemNames(schemaPath: string, names: Set<string>): void {
    this.itemsCache.set(schemaPath, { names, timestamp: Date.now() })
  }

  private updateItemInCache(schemaPath: string, itemName: string, deleted = false): void {
    const cached = this.itemsCache.get(schemaPath)
    if (!cached) return
    if (deleted) {
      cached.names.delete(itemName)
    }
    else {
      cached.names.add(itemName)
    }
    cached.timestamp = Date.now()
  }

  private isPathKnownMissing(path: string): boolean {
    const cached = this.pathExistsCache.get(path)
    if (!cached) return false
    if (Date.now() - cached.timestamp >= this.pathCheckTimeout) return false
    return !cached.exists
  }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    const parts = uri.path.split('/').filter(Boolean)
    getTikBookChannel().debug(`<SystemScriptFS.stat> uri=${uri.path}, parts=[${parts.join(', ')}]`)

    // Root directory
    if (parts.length === 0) {
      getTikBookChannel().debug(`<SystemScriptFS.stat> ROOT -> Directory`)
      return createDirectoryStat(0)
    }

    // Try schema-driven stat
    const schemaMatch = findSchemaForParts(parts)
    if (schemaMatch) {
      const { schema, relParts } = schemaMatch
      if (this.isPathKnownMissing(schema.path)) {
        throw FileSystemError.FileNotFound(uri)
      }
      getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> schema match: path=${schema.path}, relParts=[${relParts.join(', ')}]`)

      // Exactly at schema root (e.g., /ppp/profile or /system/routerboard)
      if (relParts.length === 0) {
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> at schema root -> Directory`)
        return createDirectoryStat(Date.now())
      }

      if (!schema.singleton && schema.isList) {
        const cachedNames = this.getCachedItemNames(schema.path)
        const requestedName = getRequestedSchemaChildName(schema, relParts)
        if (cachedNames && !cachedNames.has(requestedName)) {
          throw FileSystemError.FileNotFound(uri)
        }
      }

      if (schema.multiFilePerItem) {
        const itemName = getMultiFileItemName(schema, relParts)
        if (itemName.startsWith('.')) {
          throw FileSystemError.FileNotFound(uri)
        }

        if (schema.singleton) {
          if (!schema.scriptAttrs.includes(itemName)) {
            throw FileSystemError.FileNotFound(uri)
          }
        }
        else {
          const cachedNames = this.getCachedItemNames(schema.path)
          if (cachedNames && !cachedNames.has(itemName)) {
            throw FileSystemError.FileNotFound(uri)
          }
        }

        if (relParts.length === 1) {
          getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> multiFilePerItem item -> Directory`)
          return createDirectoryStat(Date.now())
        }

        if (relParts.length !== 2 || !getAllowedMultiFileAttrs(schema).has(String(relParts[1]))) {
          throw FileSystemError.FileNotFound(uri)
        }
      }

      if (!schema.multiFilePerItem && relParts.length !== 1) {
        throw FileSystemError.FileNotFound(uri)
      }

      // Otherwise it's a file (attribute or single-file item)
      const key = uri.toString()
      let entry = this.openFiles.get(key)
      if (!entry) {
        entry = { mtime: Date.now() }
        this.openFiles.set(key, entry)
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> schema file cached mtime=${entry.mtime}`)
      }
      const size = entry.original ? Buffer.byteLength(entry.original, 'utf8') : 0
      const mtime = entry.mtime ?? Date.now()
      getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> schema file tracked=${entry.original !== undefined ? 'yes' : 'no'} mtime=${mtime} size=${size}`)
      getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> attribute/file -> File (size=${size})`)
      return new InMemoryStat(FileType.File, 0, mtime, size)
    }

    // Check if it's an intermediate directory
    const childPaths = getSchemaChildPaths(parts)
    if (childPaths.size > 0) {
      getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> intermediate directory with ${childPaths.size} children -> Directory`)
      return createDirectoryStat(Date.now())
    }

    getVirtualFileSystemChannel().debug(`<SystemScriptFS.stat> NOT FOUND`)
    throw FileSystemError.FileNotFound(uri)
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    const parts = uri.path.split('/').filter(Boolean)
    getVirtualFileSystemChannel().debug(`<SystemScriptFS.readDirectory> uri=${uri.path}, parts=[${parts.join(', ')}]`)

    // Use schema-driven logic for all paths (including /system/script which now uses multiFilePerItem)
    const schemaMatch = findSchemaForParts(parts)
    if (schemaMatch) {
      const { schema, relParts } = schemaMatch
      const mapper = new SchemaMapper(RouterRestClient.default, schema)

      if (this.isPathKnownMissing(schema.path)) {
        throw FileSystemError.FileNotFound(uri)
      }

      // If we're exactly at the schema root (e.g., /ppp/profile or /tool/netwatch)
      if (relParts.length === 0) {
        const exists = await this.pathExists(schema.path)
        if (!exists) {
          throw FileSystemError.FileNotFound(uri)
        }
        if (schema.isList) {
          const items = await mapper.listItems()

          // Cache item names for this schema path
          const itemNames = new Set<string>()
          if (schema.multiFilePerItem) {
            items.forEach((it: unknown) => {
              const rec = it as Record<string, unknown>
              const name = rec[schema.nameAttr ?? 'name'] ?? (rec['.id'] ?? rec.id)
              itemNames.add(String(name))
            })
            this.setCachedItemNames(schema.path, itemNames)
            return items.map((it: unknown) => {
              const rec = it as Record<string, unknown>
              const name = rec[schema.nameAttr ?? 'name'] ?? (rec['.id'] ?? rec.id)
              return [String(name), FileType.Directory]
            })
          }
          else {
            items.forEach((it: unknown) => {
              const rec = it as Record<string, unknown>
              const filename = renderFilename(schema, rec)
              itemNames.add(filename)
            })
            this.setCachedItemNames(schema.path, itemNames)
            return items.map((it: unknown) => {
              const rec = it as Record<string, unknown>
              const filename = renderFilename(schema, rec)
              return [filename, FileType.File]
            })
          }
        }
        // singleton: list script attributes as files or directories
        if (schema.multiFilePerItem) {
          // Buttons/properties shown as directories
          return (schema.scriptAttrs ?? []).map(a => [String(a), FileType.Directory])
        }
        else {
          // Singleton properties shown as files
          return (schema.scriptAttrs ?? []).map(a => [String(a), FileType.File])
        }
      }

      // inside an item directory for multiFilePerItem
      if (schema.multiFilePerItem && relParts.length === 1) {
        if (schema.singleton) {
          return [['on-event', FileType.File]]
        }
        return (schema.scriptAttrs ?? []).map(a => [String(a), FileType.File])
      }
    }

    // Otherwise, show child directories from available schema paths
    const availablePaths = await this.getAvailableSchemaPaths()
    getVirtualFileSystemChannel().debug(`<SystemScriptFS.readDirectory> available schema paths=${availablePaths.size}`)
    let childPaths = getSchemaChildPathsFromAvailable(parts, availablePaths)
    getVirtualFileSystemChannel().debug(`<SystemScriptFS.readDirectory> child paths (available)=${Array.from(childPaths).join(', ')}`)
    if (childPaths.size === 0) {
      // Fallback: show schema paths even if /console/inspect is restricted
      childPaths = getSchemaChildPaths(parts)
      if (childPaths.size > 0) {
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.readDirectory> fallback to schema paths for ${uri.path}`)
      }
    }
    if (childPaths.size > 0) {
      return Array.from(childPaths).map(child => [child, FileType.Directory])
    }

    throw FileSystemError.FileNotADirectory(uri)
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const parts = uri.path.split('/').filter(Boolean)

    // Use schema-driven logic for all paths (including /system/script with multiFilePerItem)
    const schemaMatch = findSchemaForParts(parts)
    if (!schemaMatch) throw FileSystemError.FileNotFound(uri)
    const { schema, relParts } = schemaMatch
    const mapper = new SchemaMapper(RouterRestClient.default, schema)

    // Special handling for singletons with multiFilePerItem (like routerboard buttons)
    if (schema.singleton && schema.multiFilePerItem) {
      if (relParts.length >= 2) {
        const buttonName = decodeURIComponent(relParts[0])
        const attr = relParts[1]
        const items = await mapper.listItems()
        const item = items[0] as Record<string, unknown> | undefined
        const dotted = `${buttonName}.${attr}`
        const button = item?.[buttonName] as Record<string, unknown> | undefined
        const content = String(item?.[dotted] ?? button?.[attr] ?? '')
        const key = uri.toString()
        const existing = this.openFiles.get(key)
        const mtime = existing?.mtime ?? Date.now()
        this.openFiles.set(key, { id: getItemId(item), original: content, mtime })
        return new TextEncoder().encode(content)
      }
      throw FileSystemError.FileNotFound(uri)
    }

    if (schema.multiFilePerItem) {
      if (relParts.length >= 2) {
        const itemName = decodeURIComponent(relParts[0])
        const attr = relParts[1]
        const item = await mapper.getItem(itemName)
        const mappedAttr = schema.path === '/tool/netwatch' ? mapNetwatchAttr(attr) : attr
        const content = String(item?.[attr] ?? item?.[mappedAttr] ?? '')
        const key = uri.toString()
        const existing = this.openFiles.get(key)
        const mtime = existing?.mtime ?? Date.now()
        this.openFiles.set(key, { id: getItemId(item), original: content, mtime })
        return new TextEncoder().encode(content)
      }
      throw FileSystemError.FileNotFound(uri)
    }
    // single-file-per-item: relParts[0] is the name
    if (relParts.length >= 1) {
      const itemName = deriveItemName(schema, decodeURIComponent(relParts[0]))
      const item = await mapper.getItem(itemName)
      let content: string
      if ((schema.scriptAttrs ?? []).length === 1) {
        if (schema.path === '/system/logging/action' && schema.scriptAttrs[0] === 'script') {
          const scriptName = String(item?.[schema.scriptAttrs[0]] ?? '')
          if (scriptName) {
            const script = await RouterRestClient.default.getSystemScript(scriptName)
            content = String(script?.source ?? '')
          }
          else {
            content = ''
          }
        }
        else {
          content = String(item?.[schema.scriptAttrs[0]] ?? '')
        }
      }
      else content = (schema.scriptAttrs ?? []).map(a => `# ${a}\n${String(item?.[a] ?? '')}`).join('\n\n')
      const key = uri.toString()
      const existing = this.openFiles.get(key)
      const mtime = existing?.mtime ?? Date.now()
      this.openFiles.set(key, { id: getItemId(item), original: content, mtime })
      return new TextEncoder().encode(content)
    }
    throw FileSystemError.FileNotFound(uri)
  }

  async writeFile(uri: Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {

    const parts = uri.path.split('/').filter(Boolean)
    const newSource = new TextDecoder().decode(content)
    getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> uri=${uri.path}, create=${options.create}, overwrite=${options.overwrite}`)

    // schema-driven write
    const schemaMatch = findSchemaForParts(parts)
    if (!schemaMatch) throw FileSystemError.FileNotFound(uri)
    const { schema, relParts } = schemaMatch
    const mapper = new SchemaMapper(RouterRestClient.default, schema)
    getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> schema=${schema.path}, relParts=[${relParts.join(', ')}]`)

    if (options.create) {
      throw FileSystemError.NoPermissions('RouterOS VFS does not support creating new items from VS Code yet. Edit an existing RouterOS attribute instead.')
    }

    if (schema.singleton && schema.multiFilePerItem) {
      if (relParts.length >= 2) {
        const buttonName = decodeURIComponent(relParts[0])
        const attr = relParts[1]
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> singleton multiFile update ${schema.path}/${buttonName}/${attr} len=${newSource.length}`)

        // For routerboard, fetch current state and merge to avoid nested field issues
        const items = await mapper.listItems()
        const item = items[0] as Record<string, unknown> | undefined
        const id = getItemId(item)

        // Build the full state by merging new content for this button/attr
        const update: Record<string, unknown> = {}
        for (const attr2 of (schema.scriptAttrs ?? [])) {
          const currentValue = item?.[`${buttonName}.${attr2}`]
          update[`${buttonName}.${attr2}`] = attr2 === attr ? newSource : currentValue
        }

        // Update via PATCH
        await RouterRestClient.default.update(schema.path, id ?? '*0', update)
        this.openFiles.set(uri.toString(), { id, original: newSource, mtime: Date.now() })
        this.onDidChangeEmitter.fire([{ type: FileChangeType.Changed, uri }])
        return
      }
      throw FileSystemError.FileNotFound(uri)
    }

    if (schema.multiFilePerItem) {
      if (relParts.length >= 2) {
        const itemName = deriveItemName(schema, decodeURIComponent(relParts[0]))
        const attr = relParts[1]
        const mappedAttr = schema.path === '/tool/netwatch' ? mapNetwatchAttr(attr) : attr
        const tracked = this.openFiles.get(uri.toString())
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> tracked=${tracked ? 'yes' : 'no'} path=${schema.path} item=${itemName} attr=${mappedAttr} len=${newSource.length}`)
        const id = await resolveItemIdByFileName(mapper, schema, itemName)
        if (!id) {
          if (!options.create || !schema.createSupported) throw FileSystemError.FileNotFound(uri)
          const payload: Record<string, unknown> = {}
          payload[schema.nameAttr ?? 'name'] = itemName
          payload[mappedAttr] = newSource
          getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> create ${schema.path} item=${itemName} attr=${mappedAttr} len=${newSource.length}`)
          await mapper.createItem(payload)
          this.updateItemInCache(schema.path, itemName, false)
          this.openFiles.set(uri.toString(), { original: newSource, mtime: Date.now() })
          this.onDidChangeEmitter.fire([{ type: FileChangeType.Created, uri }])
          return
        }
        if (tracked?.original !== undefined) {
          const compareKey = id ?? itemName
          const remote = await mapper.getItem(compareKey)
          const remoteSource = String(remote?.[attr] ?? remote?.[mappedAttr] ?? '')
          if (remoteSource !== tracked.original) {
            logCompareMismatch(`${schema.path}/${itemName}/${attr}`, tracked.original, remoteSource)
            throw new Error('Remote file changed since opened - aborting save')
          }
        }
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> update ${schema.path} id=${id} attr=${mappedAttr} len=${newSource.length}`)
        await mapper.updateItem(id, { [mappedAttr]: newSource })
        this.openFiles.set(uri.toString(), { id, original: newSource, mtime: Date.now() })
        this.onDidChangeEmitter.fire([{ type: FileChangeType.Changed, uri }])
        return
      }
      throw FileSystemError.FileNotFound(uri)
    }
    else {
      if (relParts.length >= 1) {
        const itemName = normalizeItemName(schema, decodeURIComponent(relParts[0]))
        const attr = (schema.scriptAttrs ?? [])[0]
        const tracked = this.openFiles.get(uri.toString())
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> tracked=${tracked ? 'yes' : 'no'} path=${schema.path} item=${itemName} attr=${attr ?? ''} len=${newSource.length}`)
        const id = await resolveItemIdByFileName(mapper, schema, itemName)
        if (!id) {
          if (!options.create || !schema.createSupported) throw FileSystemError.FileNotFound(uri)
          if (schema.path === '/system/logging/action' && attr === 'script') {
            const client = RouterRestClient.default
            const scriptId = await client.resolveScriptIdByName(itemName)
            if (!scriptId) {
              await client.createSystemScript({ name: itemName, source: newSource })
            }
            else {
              await client.updateSystemScript(scriptId, { source: newSource })
            }
            getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> create ${schema.path} item=${itemName} attr=${attr} len=${newSource.length}`)
            await mapper.createItem({ [schema.nameAttr ?? 'name']: itemName, [attr]: itemName })
          }
          else {
            const payload: Record<string, unknown> = {}
            payload[schema.nameAttr ?? 'name'] = itemName
            if (attr) payload[attr] = newSource
            getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> create ${schema.path} item=${itemName} attr=${attr ?? ''} len=${newSource.length}`)
            await mapper.createItem(payload)
          }
          this.updateItemInCache(schema.path, itemName, false)
          this.openFiles.set(uri.toString(), { original: newSource, mtime: Date.now() })
          this.onDidChangeEmitter.fire([{ type: FileChangeType.Created, uri }])
          return
        }
        if (schema.path === '/system/logging/action' && attr === 'script') {
          const action = await mapper.getItem(itemName)
          const actionId = getItemId(action)
          let scriptName = String(action?.[attr] ?? '')
          if (!scriptName) {
            scriptName = itemName
            if (actionId) await mapper.updateItem(actionId, { [attr]: scriptName })
          }
          const client = RouterRestClient.default
          const scriptId = await client.resolveScriptIdByName(scriptName)
          if (!scriptId) {
            await client.createSystemScript({ name: scriptName, source: newSource })
          }
          else {
            await client.updateSystemScript(scriptId, { source: newSource })
          }
          this.openFiles.set(uri.toString(), { id, original: newSource, mtime: Date.now() })
          this.onDidChangeEmitter.fire([{ type: FileChangeType.Changed, uri }])
          return
        }
        if (tracked?.original !== undefined) {
          const compareKey = id ?? itemName
          const remote = await mapper.getItem(compareKey)
          const remoteSource = attr ? String(remote?.[attr] ?? '') : ''
          if (remoteSource !== tracked.original) {
            logCompareMismatch(`${schema.path}/${itemName}`, tracked.original, remoteSource)
            throw new Error('Remote file changed since opened - aborting save')
          }
        }
        getVirtualFileSystemChannel().debug(`<SystemScriptFS.writeFile> update ${schema.path} id=${id} attr=${attr ?? ''} len=${newSource.length}`)
        await mapper.updateItem(id, { [attr]: newSource })
        this.openFiles.set(uri.toString(), { id, original: newSource, mtime: Date.now() })
        this.onDidChangeEmitter.fire([{ type: FileChangeType.Changed, uri }])
        return
      }
      throw FileSystemError.FileNotFound(uri)
    }
  }

  async rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): Promise<void> {
    const oldParts = oldUri.path.split('/').filter(Boolean)
    const newParts = newUri.path.split('/').filter(Boolean)

    // schema-driven rename: create new then delete old
    const oldMatch = findSchemaForParts(oldParts)
    const newMatch = findSchemaForParts(newParts)
    if (!oldMatch || !newMatch) throw FileSystemError.FileNotFound(oldUri)
    const { schema: oldSchema, relParts: oldRel } = oldMatch
    const { schema: newSchema, relParts: newRel } = newMatch
    if (oldSchema.path !== newSchema.path) throw FileSystemError.FileNotFound(oldUri)
    const mapper = new SchemaMapper(RouterRestClient.default, oldSchema)
    if (oldSchema.multiFilePerItem) {
      // only allow renaming items (directories), not individual attr files
      if (oldRel.length !== 1 || newRel.length !== 1) throw FileSystemError.FileNotFound(oldUri)
      const oldName = normalizeItemName(oldSchema, decodeURIComponent(oldRel[0]))
      const newName = normalizeItemName(oldSchema, decodeURIComponent(newRel[0]))
      const targetId = await mapper.resolveIdByName(newName)
      if (targetId && !options.overwrite) throw FileSystemError.FileExists(newUri)
      const oldId = await mapper.resolveIdByName(oldName)
      if (!oldId) throw FileSystemError.FileNotFound(oldUri)
      const item = await mapper.getItem(oldName)
      const payload: Record<string, unknown> = { ...(item as Record<string, unknown> ?? {}) }
      payload[oldSchema.nameAttr ?? 'name'] = newName
      // create new then delete old
      await mapper.createItem(payload)
      await mapper.deleteItem(oldId)
      this.updateItemInCache(oldSchema.path, oldName, true)
      this.updateItemInCache(oldSchema.path, newName, false)
      this.openFiles.delete(oldUri.toString())
      const itemId = getItemId(item as Record<string, unknown>)
      this.openFiles.set(newUri.toString(), { id: itemId, original: JSON.stringify(item), mtime: Date.now() })
      this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri: oldUri }, { type: FileChangeType.Created, uri: newUri }])
      return
    }
    else {
      // single-file-per-item: rename item resource
      if (oldRel.length < 1 || newRel.length < 1) throw FileSystemError.FileNotFound(oldUri)
      const oldName = normalizeItemName(oldSchema, decodeURIComponent(oldRel[0]))
      const newName = normalizeItemName(oldSchema, decodeURIComponent(newRel[0]))
      const targetId = await mapper.resolveIdByName(newName)
      if (targetId && !options.overwrite) throw FileSystemError.FileExists(newUri)
      const oldId = await mapper.resolveIdByName(oldName)
      if (!oldId) throw FileSystemError.FileNotFound(oldUri)
      const item = await mapper.getItem(oldName)
      const payload: Record<string, unknown> = { ...(item as Record<string, unknown> ?? {}) }
      payload[oldSchema.nameAttr ?? 'name'] = newName
      await mapper.createItem(payload)
      await mapper.deleteItem(oldId)
      this.updateItemInCache(oldSchema.path, oldName, true)
      this.updateItemInCache(oldSchema.path, newName, false)
      this.openFiles.delete(oldUri.toString())
      const itemId = getItemId(item as Record<string, unknown>)
      this.openFiles.set(newUri.toString(), { id: itemId, original: JSON.stringify(item), mtime: Date.now() })
      this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri: oldUri }, { type: FileChangeType.Created, uri: newUri }])
      return
    }
  }

  async delete(uri: Uri): Promise<void> {
    const parts = uri.path.split('/').filter(Boolean)

    // schema-driven delete
    const schemaMatch = findSchemaForParts(parts)
    if (schemaMatch) {
      const { schema, relParts } = schemaMatch
      const mapper = new SchemaMapper(RouterRestClient.default, schema)
      if (schema.multiFilePerItem) {
        if (relParts.length === 1) {
          const name = normalizeItemName(schema, decodeURIComponent(relParts[0]))
          const id = await mapper.resolveIdByName(name)
          if (!id) throw FileSystemError.FileNotFound(uri)
          await mapper.deleteItem(id)
          this.updateItemInCache(schema.path, name, true)
          this.openFiles.delete(uri.toString())
          this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri }])
          return
        }
        throw FileSystemError.FileNotFound(uri)
      }
      else {
        if (relParts.length >= 1) {
          const name = normalizeItemName(schema, decodeURIComponent(relParts[0]))
          const id = await mapper.resolveIdByName(name)
          if (!id) throw FileSystemError.FileNotFound(uri)
          await mapper.deleteItem(id)
          this.updateItemInCache(schema.path, name, true)
          this.openFiles.delete(uri.toString())
          this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri }])
          return
        }
        throw FileSystemError.FileNotFound(uri)
      }
    }

    throw FileSystemError.FileNotFound(uri)
  }

  createDirectory(uri: Uri): void | Thenable<void> {
    throw FileSystemError.NoPermissions(`RouterOS VFS does not support creating folders here. '${uri.path}' is derived from router configuration.`)
  }

  dispose(): void {
    getVirtualFileSystemChannel().trace('<SystemScriptFS> {dispose} invoked')
    this.onDidChangeEmitter.dispose()
  }
}

export function initializeSystemScriptFileSystem(): Disposable[] {
  const provider = new SystemScriptFS()
  const reg = workspace.registerFileSystemProvider(SCHEME, provider, { isCaseSensitive: true })
  const cmd = commands.registerCommand('tikbook.mount.system.scripts', () => {
    const base = getSettings().baseUrl ?? ''
    if (!base) {
      getVirtualFileSystemChannel().debug('<mount> tikbook.baseUrl missing')
      void window.showErrorMessage('tikbook.baseUrl is not configured; set it in settings to mount router scripts')
      return
    }
    const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
    getVirtualFileSystemChannel().debug(`<mount> requested for host=${host}`)
    mountScriptsToExplorer(host)
  })

  // Set language ID to "RouterOS" for all files opened from the rscfile scheme
  const docOpenListener = workspace.onDidOpenTextDocument((doc) => {
    if (doc.uri.scheme === SCHEME) {
        // Set RouterOS language ID for syntax highlighting and package.json when-clauses
        languages.setTextDocumentLanguage(doc, 'routeros').then(() => {
        // Success
      }, () => {
        // Silently ignore if language setting fails (e.g., RouterOS language not registered)
      })
    }
  })

  return [provider, reg, cmd, docOpenListener]
}

export function mountScriptsToExplorer(host: string): void {
  const uri = Uri.parse(`${SCHEME}://${host}/`)
  getVirtualFileSystemChannel().debug(`<mount> creating workspace folder uri=${uri.toString()}`)
  const ok = workspace.updateWorkspaceFolders(0, 0, { uri, name: `Router ${host} scripts` })
  getVirtualFileSystemChannel().debug(`<mount> updateWorkspaceFolders returned=${ok}`)
  void window.showInformationMessage(`Mounted router scripts from ${host}`)
}
