import { Disposable, EventEmitter, FileChangeEvent, FileType, FileSystemProvider, FileStat, FileSystemError, Uri, workspace, window, commands, FileChangeType } from 'vscode'
import { RouterRestClient, SystemScriptItem } from './routeros'
import { TextEncoder, TextDecoder } from 'util'
import { getSettings } from './config'

const SCHEME = 'rscfile'

class InMemoryStat implements FileStat {
  constructor(public type: FileType, public ctime: number, public mtime: number, public size: number) {}
}

export class SystemScriptFS implements FileSystemProvider {
  private onDidChangeEmitter = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile = this.onDidChangeEmitter.event
  private watchers = new Map<string, number>()
  // track opened files: key = uri.toString()
  private openFiles = new Map<string, { id?: string, original?: string }>()
  private scriptsDirMtime = 0

  watch(_uri: Uri, _options: { recursive: boolean, excludes: string[] }): Disposable { return { dispose: () => { } } }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    const parts = uri.path.split('/').filter(Boolean)
    if (parts.length === 0) return new InMemoryStat(FileType.Directory, 0, 0, 0)
    if (parts.length === 1 && parts[0] === 'system') return new InMemoryStat(FileType.Directory, 0, 0, 0)
    if (parts.length === 2 && parts[0] === 'system' && parts[1] === 'script') return new InMemoryStat(FileType.Directory, 0, this.scriptsDirMtime, 0)
    // file under /system/script
    if (parts.length >= 3 && parts[0] === 'system' && parts[1] === 'script') {
      const key = uri.toString()
      const entry = this.openFiles.get(key)
      const size = entry?.original ? Buffer.byteLength(entry.original, 'utf8') : 0
      const mtime = entry?.id ? this.scriptsDirMtime : Date.now()
      return new InMemoryStat(FileType.File, 0, mtime, size)
    }
    throw FileSystemError.FileNotFound(uri)
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    const parts = uri.path.split('/').filter(Boolean)
    if (parts.length === 0) return [['system', FileType.Directory]]
    if (parts.length === 1 && parts[0] === 'system') return [['script', FileType.Directory]]
    if (parts.length === 2 && parts[0] === 'system' && parts[1] === 'script') {
      const client = RouterRestClient.default
      const scripts = await client.systemScripts as SystemScriptItem[]
      this.scriptsDirMtime = Date.now()
      return scripts.map(s => [String(s.name), FileType.File])
    }
    throw FileSystemError.FileNotADirectory(uri)
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    const parts = uri.path.split('/').filter(Boolean)
    if (!(parts.length >= 3 && parts[0] === 'system' && parts[1] === 'script')) throw FileSystemError.FileNotFound(uri)
    const rawName = parts.slice(2).join('/')
    const name = decodeURIComponent(rawName)
    const client = RouterRestClient.default
    const script = await client.getSystemScript(name) as SystemScriptItem
    const source = script?.source || ''
    this.openFiles.set(uri.toString(), { id: script['.id'] || script.id, original: source })
    return new TextEncoder().encode(source)
  }

  async writeFile(uri: Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
    const parts = uri.path.split('/').filter(Boolean)
    if (!(parts.length >= 3 && parts[0] === 'system' && parts[1] === 'script')) throw FileSystemError.FileNotFound(uri)
    const rawName = parts.slice(2).join('/')
    const name = decodeURIComponent(rawName)
    const client = RouterRestClient.default
    const newSource = new TextDecoder().decode(content)

    const existingId = await client.resolveScriptIdByName(name)
    if (!existingId) {
      if (!options.create) throw FileSystemError.FileNotFound(uri)
      await client.createSystemScript({ name, source: newSource })
      this.openFiles.set(uri.toString(), { original: newSource })
      this.onDidChangeEmitter.fire([{ type: FileChangeType.Created, uri }])
      return
    }

    const tracked = this.openFiles.get(uri.toString())
    if (tracked && tracked.original !== undefined) {
      const remote = await client.getSystemScript(name)
      const remoteSource = remote?.source || ''
      if (remoteSource !== tracked.original) {
        throw new Error('Remote file changed since opened - aborting save')
      }
    }

    await client.updateSystemScript(existingId, { source: newSource })
    this.openFiles.set(uri.toString(), { id: existingId, original: newSource })
    this.onDidChangeEmitter.fire([{ type: FileChangeType.Changed, uri }])
  }

  async rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): Promise<void> {
    const oldParts = oldUri.path.split('/').filter(Boolean)
    const newParts = newUri.path.split('/').filter(Boolean)
    if (!(oldParts.length >= 3 && oldParts[0] === 'system' && oldParts[1] === 'script')) throw FileSystemError.FileNotFound(oldUri)
    if (!(newParts.length >= 3 && newParts[0] === 'system' && newParts[1] === 'script')) throw FileSystemError.FileNotADirectory(newUri)
    const oldName = decodeURIComponent(oldParts.slice(2).join('/'))
    const newName = decodeURIComponent(newParts.slice(2).join('/'))
    const client = RouterRestClient.default
    const targetId = await client.resolveScriptIdByName(newName)
    if (targetId && !options.overwrite) throw FileSystemError.FileExists(newUri)
    const oldId = await client.resolveScriptIdByName(oldName)
    if (!oldId) throw FileSystemError.FileNotFound(oldUri)
    const script = await client.getSystemScript(oldName) as SystemScriptItem
    const source = script?.source || ''
    await client.createSystemScript({ name: newName, source })
    await client.deleteSystemScript(oldId)
    this.openFiles.delete(oldUri.toString())
    this.openFiles.set(newUri.toString(), { id: script['.id'] || script.id, original: source })
    this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri: oldUri }, { type: FileChangeType.Created, uri: newUri }])
  }

  async delete(uri: Uri): Promise<void> {
    const parts = uri.path.split('/').filter(Boolean)
    if (!(parts.length >= 3 && parts[0] === 'system' && parts[1] === 'script')) throw FileSystemError.FileNotFound(uri)
    const name = decodeURIComponent(parts.slice(2).join('/'))
    const client = RouterRestClient.default
    const id = await client.resolveScriptIdByName(name)
    if (!id) throw FileSystemError.FileNotFound(uri)
    await client.deleteSystemScript(id)
    this.openFiles.delete(uri.toString())
    this.onDidChangeEmitter.fire([{ type: FileChangeType.Deleted, uri }])
  }

  createDirectory(_uri: Uri): void | Thenable<void> { throw FileSystemError.NoPermissions('Cannot create directories in RouterOS FS') }

  dispose(): void {}
}

export function initializeSystemScriptFileSystem(): Disposable[] {
  const provider = new SystemScriptFS()
  const reg = workspace.registerFileSystemProvider(SCHEME, provider, { isCaseSensitive: true })
  const cmd = commands.registerCommand('tikbook.mount.system.scripts', async () => {
    const base = getSettings().baseUrl || ''
    if (!base) {
      window.showErrorMessage('tikbook.baseUrl is not configured; set it in settings to mount router scripts')
      return
    }
    const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
    await mountScriptsToExplorer(host)
  })
  return [reg, cmd]
}

export async function mountScriptsToExplorer(host: string) {
  const uri = Uri.parse(`${SCHEME}://${host}/system/script`)
  workspace.updateWorkspaceFolders(0, 0, { uri, name: `Router ${host} scripts` })
  window.showInformationMessage(`Mounted router scripts from ${host}`)
}
