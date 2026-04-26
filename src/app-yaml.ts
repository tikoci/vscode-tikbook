import type {
  CancellationToken,
  CompletionContext,
  CompletionItemProvider,
  Disposable,
  ExtensionContext,
  HoverProvider,
  InlayHintsProvider,
  TextDocument,
} from 'vscode'
import {
  commands,
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  InlayHint,
  InlayHintKind,
  languages,
  MarkdownString,
  Position,
  Range,
  SnippetString,
  Uri,
  window,
  workspace,
} from 'vscode'
import { log } from './shared'

const APP_SCHEMA_FILE = 'routeros-app-yaml-schema.editor.json'
const STORE_SCHEMA_FILE = 'routeros-app-yaml-store-schema.editor.json'
const APP_SCHEMA_URL = 'https://tikoci.github.io/restraml/routeros-app-yaml-schema.editor.json'
const STORE_SCHEMA_URL = 'https://tikoci.github.io/restraml/routeros-app-yaml-store-schema.editor.json'

type AppYamlKind = 'app' | 'store'
type JsonScalar = string | number | boolean | null

interface JsonSchemaNode extends Record<string, unknown> {
  $ref?: string
  title?: string
  description?: string
  type?: string | string[]
  properties?: Record<string, JsonSchemaNode>
  patternProperties?: Record<string, JsonSchemaNode>
  additionalProperties?: boolean | JsonSchemaNode
  items?: JsonSchemaNode
  required?: string[]
  enum?: JsonScalar[]
  examples?: JsonScalar[]
  allOf?: JsonSchemaNode[]
  anyOf?: JsonSchemaNode[]
  oneOf?: JsonSchemaNode[]
}

interface SchemaBundle {
  app: JsonSchemaNode
  store: JsonSchemaNode
}

interface CompletionPathContext {
  parentKeys: string[]
  indent: number
  range: Range
}

let schemaBundlePromise: Promise<SchemaBundle> | undefined

export function initializeAppYamlSupport(context: ExtensionContext): Disposable[] {
  const diagnostics = languages.createDiagnosticCollection('tikbook-routeros-app-yaml')
  const refreshDiagnostics = (document: TextDocument): void => {
    diagnostics.set(document.uri, getAppYamlDiagnostics(document))
  }
  for (const document of workspace.textDocuments) refreshDiagnostics(document)

  return [
    diagnostics,
    languages.registerCompletionItemProvider(
      [{ language: 'yaml' }],
      createAppYamlCompletionProvider(context),
      ' ',
      '-',
      ':',
      '\n',
    ),
    languages.registerHoverProvider([{ language: 'yaml' }], createAppYamlHoverProvider(context)),
    languages.registerInlayHintsProvider([{ language: 'yaml' }], createAppYamlInlayHintsProvider(context)),
    commands.registerCommand('tikbook.appYaml.newManifest', async () => {
      await openAppYamlScaffold(context, false)
    }),
    commands.registerCommand('tikbook.appYaml.newStoreManifest', async () => {
      await openAppYamlScaffold(context, true)
    }),
    workspace.onDidOpenTextDocument(refreshDiagnostics),
    workspace.onDidChangeTextDocument(event => refreshDiagnostics(event.document)),
    workspace.onDidCloseTextDocument(document => diagnostics.delete(document.uri)),
    window.onDidChangeActiveTextEditor(editor => {
      if (editor) refreshDiagnostics(editor.document)
    }),
  ]
}

export function classifyAppYamlPath(path: string): AppYamlKind | undefined {
  const normalized = path.replace(/\\/g, '/').toLowerCase()
  const fileName = normalized.split('/').pop() ?? ''

  if (
    fileName.endsWith('.tikappstore.yaml') ||
    fileName.endsWith('.tikappstore.yml') ||
    fileName.endsWith('.appstore.yaml') ||
    fileName.endsWith('.appstore.yml')
  ) {
    return 'store'
  }

  if (
    fileName.endsWith('.tikapp.yaml') ||
    fileName.endsWith('.tikapp.yml') ||
    fileName.endsWith('.app.yaml') ||
    fileName.endsWith('.app.yml')
  ) {
    return 'app'
  }

  const pathSegments = normalized.split('/').filter(Boolean)
  const parent = pathSegments.length >= 2 ? pathSegments[pathSegments.length - 2] : ''
  const isAppDirectory = parent === 'app' || parent === 'apps' || parent === 'tikapp'

  if (isAppDirectory && (fileName === 'app-store.yaml' || fileName === 'app-store.yml')) return 'store'
  if (isAppDirectory && (fileName === 'app.yaml' || fileName === 'app.yml')) return 'app'

  return undefined
}

export function getAppYamlDiagnostics(document: TextDocument): Diagnostic[] {
  const kind = classifyAppYamlDocument(document)
  if (!kind) return []

  const diagnostics: Diagnostic[] = []
  const lines = document.getText().split(/\r?\n/)
  const root = findFirstYamlContentLine(lines)

  if (root) {
    const rootShape = root.text.startsWith('-') ? 'array' : root.text.match(/^[\w-]+\s*:/) ? 'object' : undefined
    if (kind === 'app' && rootShape === 'array') {
      diagnostics.push(new Diagnostic(
        lineRange(root.line, lines[root.line]),
        'RouterOS single /app YAML expects one object. Use a .tikappstore.yaml file for app-store-urls= arrays.',
        DiagnosticSeverity.Warning,
      ))
    }
    if (kind === 'store' && rootShape === 'object') {
      diagnostics.push(new Diagnostic(
        lineRange(root.line, lines[root.line]),
        'RouterOS app-store YAML expects a top-level array. Use a .tikapp.yaml file for a single /app object.',
        DiagnosticSeverity.Warning,
      ))
    }
  }

  let warnedAboutDevices = false
  for (let line = 0; line < lines.length; line++) {
    const text = lines[line]
    const trimmed = text.trim()
    if (/^version\s*:/.test(trimmed)) {
      diagnostics.push(new Diagnostic(
        lineRange(line, text),
        'RouterOS /app YAML does not use a top-level version key.',
        DiagnosticSeverity.Warning,
      ))
    }

    if (!warnedAboutDevices && /^devices\s*:/.test(trimmed)) {
      diagnostics.push(new Diagnostic(
        lineRange(line, text),
        'Container device mappings require RouterOS container device-mode to be enabled and physically confirmed on the router.',
        DiagnosticSeverity.Information,
      ))
      warnedAboutDevices = true
    }

    const portValue = extractYamlStringListValue(trimmed)
    if (portValue && hasMixedPortProtocolStyles(portValue)) {
      diagnostics.push(new Diagnostic(
        lineRange(line, text),
        'Do not mix OCI-style /tcp or /udp with RouterOS 7.23+ :tcp or :udp in the same port mapping.',
        DiagnosticSeverity.Warning,
      ))
    }
  }

  return diagnostics
}

export function hasMixedPortProtocolStyles(value: string): boolean {
  const hasSlashProtocol = /\/(?:tcp|udp)(?::|$)/i.test(value)
  const hasColonProtocol = /:(?:tcp|udp)$/i.test(value)
  return hasSlashProtocol && hasColonProtocol
}

function createAppYamlCompletionProvider(context: ExtensionContext): CompletionItemProvider {
  return {
    async provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _completionContext: CompletionContext): Promise<CompletionItem[] | undefined> {
      const kind = classifyAppYamlDocument(document)
      if (!kind) return undefined

      const root = await getAppSchemaRoot(context)
      if (!root) return undefined

      const line = document.lineAt(position.line).text
      const lineBefore = line.slice(0, position.character)
      const indent = lineBefore.match(/^(\s*)/)?.[1].length ?? 0
      const trimmed = lineBefore.trim()
      const arrayItemContext = lineBefore.match(/^(\s*)-\s*([\w-]*)$/)

      const valueMatch = lineBefore.match(/^(\s*(?:-\s+)?)([\w-]+):\s*(.*)$/)
      if (valueMatch) {
        const completionContext = buildCompletionPathContext(document, position, indent)
        const valueNode = schemaAtPath(root, [...completionContext.parentKeys, valueMatch[2]])
        if (valueNode) {
          const suggestions = collectScalarCompletionItems(root, valueNode, completionContext.range)
          if (suggestions.length > 0) return suggestions
        }
      }

      if (!arrayItemContext && trimmed !== '' && !/^[\w-]*$/.test(trimmed)) return undefined

      const completionContext = buildCompletionPathContext(document, position, indent)
      let node = schemaAtPath(root, completionContext.parentKeys)
      const rootResolved = resolveRef(root, root)

      if (arrayItemContext) {
        const arrayNode = node || (completionContext.parentKeys.length === 0 && kind === 'store' ? { type: 'array', items: rootResolved } : null)
        const arrayMerged = mergeSchema(root, arrayNode)
        if (arrayMerged?.type === 'array' && arrayMerged.items) node = resolveRef(root, arrayMerged.items)
      }

      if (!node && completionContext.parentKeys.length === 0) node = rootResolved

      const merged = mergeSchema(root, node)
      const props = merged?.properties ?? {}
      const required = new Set(merged?.required ?? [])
      const usedKeys = collectUsedKeysAtIndent(document, position.line, completionContext.indent)

      const suggestions = [
        ...(arrayItemContext ? collectScalarCompletionItems(root, node, completionContext.range) : []),
        ...Object.entries(props)
          .filter(([key]) => !usedKeys.has(key))
          .map(([key, propDef]) => buildPropertyCompletion(root, key, propDef, required.has(key), completionContext)),
        ...buildDynamicKeySuggestions(root, merged, completionContext),
      ]

      return suggestions.length > 0 ? suggestions : undefined
    },
  }
}

function createAppYamlHoverProvider(context: ExtensionContext): HoverProvider {
  return {
    async provideHover(document: TextDocument, position: Position): Promise<Hover | undefined> {
      if (!classifyAppYamlDocument(document)) return undefined
      const root = await getAppSchemaRoot(context)
      if (!root) return undefined

      const line = document.lineAt(position.line).text
      const keyMatch = line.match(/^(\s*(?:-\s+)?)([\w-]+)\s*:/)
      if (!keyMatch) return undefined

      const keyStart = keyMatch[1].length
      const keyEnd = keyStart + keyMatch[2].length
      if (position.character < keyStart || position.character > keyEnd) return undefined

      const rawIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      const indent = keyMatch[1].includes('-') ? rawIndent + 2 : rawIndent
      const parentKeys = getYamlParentKeys(document, position.line, indent)
      const key = keyMatch[2]
      const node = schemaAtPath(root, [...parentKeys, key])
      const merged = mergeSchema(root, node)
      if (!merged) return undefined

      const markdown = schemaMarkdown(root, merged, parentKeys, key)
      if (!markdown) return undefined

      return new Hover(markdown, new Range(position.line, keyStart, position.line, keyEnd))
    },
  }
}

function createAppYamlInlayHintsProvider(context: ExtensionContext): InlayHintsProvider {
  return {
    async provideInlayHints(document: TextDocument, range: Range): Promise<InlayHint[]> {
      if (!classifyAppYamlDocument(document)) return []
      const root = await getAppSchemaRoot(context)
      if (!root) return []

      const hints: InlayHint[] = []
      for (let lineNumber = range.start.line; lineNumber <= Math.min(range.end.line, document.lineCount - 1); lineNumber++) {
        const line = document.lineAt(lineNumber).text
        const keyMatch = line.match(/^(\s*(?:-\s+)?)([\w-]+)\s*:(.*)$/)
        if (!keyMatch || keyMatch[3].includes('#')) continue

        const rawIndent = line.match(/^(\s*)/)?.[1].length ?? 0
        const indent = keyMatch[1].includes('-') ? rawIndent + 2 : rawIndent
        const parentKeys = getYamlParentKeys(document, lineNumber, indent)
        const node = schemaAtPath(root, [...parentKeys, keyMatch[2]])
        const merged = mergeSchema(root, node)
        const label = schemaInlayLabel(merged)
        if (!label) continue

        const hint = new InlayHint(new Position(lineNumber, line.length), `  ${label}`, InlayHintKind.Type)
        hint.paddingLeft = true
        hint.tooltip = merged?.description ?? ''
        hints.push(hint)
      }

      return hints
    },
  }
}

async function openAppYamlScaffold(context: ExtensionContext, storeMode: boolean): Promise<void> {
  const root = await getAppSchemaRoot(context)
  if (!root) {
    void window.showErrorMessage('RouterOS /app YAML schema is not available in this TikBook install.')
    return
  }

  const schemaHeader = storeMode ? STORE_SCHEMA_URL : APP_SCHEMA_URL
  const content = `# yaml-language-server: $schema=${schemaHeader}\n${generateScaffold(root, storeMode)}\n`
  const document = await workspace.openTextDocument({ language: 'yaml', content })
  await window.showTextDocument(document)
}

async function getAppSchemaRoot(context: ExtensionContext): Promise<JsonSchemaNode | undefined> {
  try {
    const bundle = await getSchemaBundle(context)
    return bundle.app
  } catch (error) {
    log.warn(`[app-yaml] failed to load bundled schema: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

function getSchemaBundle(context: ExtensionContext): Promise<SchemaBundle> {
  schemaBundlePromise ??= loadSchemaBundle(context)
  return schemaBundlePromise
}

async function loadSchemaBundle(context: ExtensionContext): Promise<SchemaBundle> {
  const [app, store] = await Promise.all([
    readSchemaFile(context, APP_SCHEMA_FILE),
    readSchemaFile(context, STORE_SCHEMA_FILE),
  ])
  return { app, store }
}

async function readSchemaFile(context: ExtensionContext, fileName: string): Promise<JsonSchemaNode> {
  const uri = Uri.joinPath(context.extensionUri, 'resources', 'schemas', fileName)
  const bytes = await workspace.fs.readFile(uri)
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!isRecord(parsed)) throw new Error(`Schema ${fileName} did not parse as a JSON object`)
  return parsed
}

function classifyAppYamlDocument(document: TextDocument): AppYamlKind | undefined {
  return classifyAppYamlPath(document.uri.path) ?? classifyAppYamlHeader(document)
}

function classifyAppYamlHeader(document: TextDocument): AppYamlKind | undefined {
  const maxLines = Math.min(5, document.lineCount)
  for (let i = 0; i < maxLines; i++) {
    const line = document.lineAt(i).text
    if (line.includes('routeros-app-yaml-store-schema')) return 'store'
    if (line.includes('routeros-app-yaml-schema')) return 'app'
  }
  return undefined
}

function resolveRef(root: JsonSchemaNode, node: JsonSchemaNode | undefined | null): JsonSchemaNode | undefined {
  if (!node) return undefined
  if (node.$ref) {
    if (!node.$ref.startsWith('#/')) return undefined
    const parts = node.$ref.replace(/^#\//, '').split('/')
    let current: unknown = root
    for (const part of parts) {
      if (!isRecord(current)) return undefined
      current = current[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))]
    }
    return isRecord(current) ? resolveRef(root, current) : undefined
  }
  return node
}

function schemaAtPath(root: JsonSchemaNode, pathKeys: string[]): JsonSchemaNode | undefined {
  let node: JsonSchemaNode | undefined = resolveRef(root, root)
  for (const key of pathKeys) {
    const merged = mergeSchema(root, node)
    if (!merged) return undefined
    const props = merged.properties ?? {}
    if (props[key]) {
      node = resolveRef(root, props[key])
    } else if (merged.patternProperties) {
      const entries = Object.entries(merged.patternProperties)
      const match = entries.find(([pattern]) => safeRegexTest(pattern, key))
      node = resolveRef(root, (match ?? entries[0])?.[1])
    } else if (isRecord(merged.additionalProperties)) {
      node = resolveRef(root, merged.additionalProperties)
    } else if (merged.items) {
      const items = resolveRef(root, merged.items)
      const itemProps = mergeSchema(root, items)?.properties ?? {}
      node = itemProps[key] ? resolveRef(root, itemProps[key]) : undefined
    } else {
      node = undefined
    }
  }
  return resolveRef(root, node)
}

function mergeSchema(root: JsonSchemaNode, node: JsonSchemaNode | undefined | null): JsonSchemaNode | undefined {
  const resolved = resolveRef(root, node)
  if (!resolved) return undefined
  const branches = [
    ...(resolved.allOf ?? []),
    ...(resolved.anyOf ?? []),
    ...(resolved.oneOf ?? []),
  ]
  if (branches.length === 0) return resolved

  const merged: JsonSchemaNode = { ...resolved }
  for (const branch of branches) {
    const resolvedBranch = resolveRef(root, branch)
    if (!resolvedBranch) continue
    if (resolvedBranch.properties) merged.properties = { ...(merged.properties ?? {}), ...resolvedBranch.properties }
    if (resolvedBranch.required) merged.required = [...(merged.required ?? []), ...resolvedBranch.required]
    if (resolvedBranch.patternProperties) {
      merged.patternProperties = { ...(merged.patternProperties ?? {}), ...resolvedBranch.patternProperties }
    }
    if (merged.additionalProperties === undefined && resolvedBranch.additionalProperties !== undefined) {
      merged.additionalProperties = resolvedBranch.additionalProperties
    }
    merged.items ??= resolvedBranch.items
    merged.description ??= resolvedBranch.description
    merged.title ??= resolvedBranch.title
    merged.examples ??= resolvedBranch.examples
  }
  return merged
}

function collectScalarCompletionItems(root: JsonSchemaNode, node: JsonSchemaNode | undefined, range: Range): CompletionItem[] {
  const suggestions: CompletionItem[] = []
  const seen = new Set<string>()
  for (const variant of collectSchemaVariants(root, node)) {
    for (const enumValue of variant.enum ?? []) addScalarSuggestion(suggestions, seen, enumValue, 'enum', range, '0')
    for (const example of variant.examples ?? []) addScalarSuggestion(suggestions, seen, example, 'example', range, '1')
    const types = Array.isArray(variant.type) ? variant.type : [variant.type]
    if (types.includes('boolean')) {
      addScalarSuggestion(suggestions, seen, true, 'boolean', range, '0')
      addScalarSuggestion(suggestions, seen, false, 'boolean', range, '0')
    }
    if (types.includes('null')) addScalarSuggestion(suggestions, seen, null, 'null', range, '0')
  }
  return suggestions
}

function collectSchemaVariants(root: JsonSchemaNode, node: JsonSchemaNode | undefined): JsonSchemaNode[] {
  const resolved = resolveRef(root, node)
  if (!resolved) return []
  return [
    resolved,
    ...(resolved.allOf ?? []).map(branch => resolveRef(root, branch)),
    ...(resolved.anyOf ?? []).map(branch => resolveRef(root, branch)),
    ...(resolved.oneOf ?? []).map(branch => resolveRef(root, branch)),
  ].filter((variant): variant is JsonSchemaNode => !!variant)
}

function addScalarSuggestion(items: CompletionItem[], seen: Set<string>, value: JsonScalar, detail: string, range: Range, group: string): void {
  const text = value === null ? 'null' : String(value)
  if (!text || seen.has(text)) return
  seen.add(text)
  const item = new CompletionItem(text, CompletionItemKind.Value)
  item.detail = detail
  item.insertText = text
  item.range = range
  item.sortText = `${group}${text}`
  items.push(item)
}

function buildPropertyCompletion(
  root: JsonSchemaNode,
  key: string,
  propDef: JsonSchemaNode,
  required: boolean,
  context: CompletionPathContext,
): CompletionItem {
  const resolved = resolveRef(root, propDef)
  const merged = mergeSchema(root, resolved)
  const rawType = merged?.type
  const type = rawType || (merged?.properties || merged?.patternProperties ? 'object' : undefined)
  const item = new CompletionItem(key, required ? CompletionItemKind.Keyword : CompletionItemKind.Property)
  const description = merged?.description || merged?.title || ''
  item.detail = [required ? '(required)' : '', Array.isArray(type) ? type.join(' | ') : type].filter(Boolean).join(' ')
  if (description) item.documentation = new MarkdownString(description)
  item.insertText = new SnippetString(buildPropertySnippet(key, merged, context.indent))
  item.range = context.range
  item.sortText = required ? `0${key}` : `1${key}`
  item.preselect = required
  if (!required && key === 'version') item.tags = [CompletionItemTag.Deprecated]
  return item
}

function buildPropertySnippet(key: string, schema: JsonSchemaNode | undefined, indent: number): string {
  const rawType = schema?.type
  const type = rawType || (schema?.properties || schema?.patternProperties ? 'object' : undefined)
  if (type === 'object') return `${key}:\n${' '.repeat(indent + 2)}$1`
  if (type === 'array') return `${key}:\n${' '.repeat(indent + 2)}- $1`
  if (schema?.enum) return `${key}: \${1|${schema.enum.map(value => String(value)).join(',')}|}`
  const types = Array.isArray(rawType) ? rawType : [rawType]
  if (types.includes('boolean')) return `${key}: \${1|true,false|}`
  if (types.includes('null') && types.length === 1) return `${key}: null`
  return `${key}: $1`
}

function buildDynamicKeySuggestions(root: JsonSchemaNode, schema: JsonSchemaNode | undefined, context: CompletionPathContext): CompletionItem[] {
  if (!schema?.patternProperties || Object.keys(schema.patternProperties).length === 0) return []
  const placeholder = dynamicKeyPlaceholder(context.parentKeys)
  const firstSchema = resolveRef(root, Object.values(schema.patternProperties)[0])
  const inner = firstSchema ? scaffoldObject(root, firstSchema, context.indent + 2) : ''
  const item = new CompletionItem(placeholder, CompletionItemKind.Snippet)
  item.detail = 'named entry'
  item.documentation = schema.description ? new MarkdownString(`${schema.description}\n\nCreate a named entry and fill in required fields.`) : undefined
  item.insertText = new SnippetString(inner ? `${placeholder}:\n${toSnippetScaffold(inner)}` : `${placeholder}: $1`)
  item.range = context.range
  item.sortText = `05${placeholder}`
  return [item]
}

function dynamicKeyPlaceholder(pathKeys: string[]): string {
  switch (pathKeys[pathKeys.length - 1]) {
    case 'services':
      return 'my-service'
    case 'volumes':
      return 'my-volume'
    case 'configs':
      return 'my-config'
    case 'networks':
      return 'my-network'
    case 'environment':
      return 'MY_ENV'
    default:
      return 'my-key'
  }
}

function toSnippetScaffold(text: string): string {
  if (!text) return '$1'
  if (text.includes('""')) return text.replace('""', '$1')
  return `${text}\n${' '.repeat(2)}$0`
}

function buildCompletionPathContext(document: TextDocument, position: Position, indent: number): CompletionPathContext {
  return {
    parentKeys: getYamlParentKeys(document, position.line, indent),
    indent,
    range: currentWordRange(document, position),
  }
}

function currentWordRange(document: TextDocument, position: Position): Range {
  const line = document.lineAt(position.line).text.slice(0, position.character)
  const match = line.match(/[\w-]*$/)
  const length = match?.[0].length ?? 0
  return new Range(position.line, position.character - length, position.line, position.character)
}

function getYamlParentKeys(document: TextDocument, beforeLine: number, indent: number): string[] {
  const parentKeys: string[] = []
  let targetIndent = indent - 2
  for (let lineNumber = beforeLine - 1; lineNumber >= 0 && targetIndent >= 0; lineNumber--) {
    const line = document.lineAt(lineNumber).text
    const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
    const trimmed = line.trim()
    if (lineIndent === targetIndent) {
      const match = trimmed.match(/^([\w-]+):\s*(?:#.*)?$/)
      if (match) {
        parentKeys.unshift(match[1])
        targetIndent -= 2
      } else if (trimmed.startsWith('- ') || trimmed === '-') {
        targetIndent -= 2
      }
    } else if (lineIndent === targetIndent - 2) {
      const arrayKeyMatch = trimmed.match(/^-\s+([\w-]+):/)
      if (arrayKeyMatch) {
        parentKeys.unshift(arrayKeyMatch[1])
        targetIndent = lineIndent - 2
      }
    }
  }
  return parentKeys
}

function collectUsedKeysAtIndent(document: TextDocument, currentLine: number, indent: number): Set<string> {
  const used = new Set<string>()
  for (let lineNumber = currentLine - 1; lineNumber >= 0; lineNumber--) {
    const line = document.lineAt(lineNumber).text
    const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
    if (lineIndent < indent) break
    collectYamlKeyAtIndent(used, line, lineIndent, indent)
  }
  for (let lineNumber = currentLine + 1; lineNumber < document.lineCount; lineNumber++) {
    const line = document.lineAt(lineNumber).text
    const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
    if (lineIndent < indent) break
    collectYamlKeyAtIndent(used, line, lineIndent, indent)
  }
  return used
}

function collectYamlKeyAtIndent(used: Set<string>, line: string, lineIndent: number, indent: number): void {
  if (lineIndent !== indent && lineIndent !== indent - 2) return
  const keyMatch = line.trim().match(/^(?:-\s+)?([\w-]+):/)
  if (keyMatch) used.add(keyMatch[1])
}

function schemaMarkdown(root: JsonSchemaNode, schema: JsonSchemaNode, parentKeys: string[], key: string): MarkdownString | undefined {
  const parts: string[] = []
  if (schema.description) parts.push(schema.description)
  const type = schema.type || (schema.properties || schema.patternProperties ? 'object' : '')
  if (type) parts.push(`**Type:** \`${Array.isArray(type) ? type.join(' | ') : type}\``)
  if (schema.enum) parts.push(`**Values:** ${schema.enum.map(value => `\`${String(value)}\``).join(', ')}`)
  if (schema.examples?.length) parts.push(`**Example:** \`${String(schema.examples[0])}\``)
  const parentSchema = mergeSchema(root, schemaAtPath(root, parentKeys))
  if (parentSchema?.required?.includes(key)) parts.push('**Required**')
  if (parts.length === 0) return undefined
  const markdown = new MarkdownString(parts.join('\n\n'))
  markdown.isTrusted = true
  return markdown
}

function schemaInlayLabel(schema: JsonSchemaNode | undefined): string {
  if (!schema) return ''
  const parts: string[] = []
  const type = schema.type || (schema.properties || schema.patternProperties ? 'object' : '')
  if (schema.enum) {
    parts.push(schema.enum.map(value => String(value)).join(' | '))
  } else if (type && type !== 'object') {
    parts.push(Array.isArray(type) ? type.join(' | ') : type)
  }
  if (schema.description) parts.push(schema.description.length > 120 ? `${schema.description.slice(0, 117)}...` : schema.description)
  return parts.join(' - ')
}

function generateScaffold(root: JsonSchemaNode, storeMode: boolean): string {
  if (!storeMode) return scaffoldObject(root, root, 0)
  const inner = scaffoldObject(root, root, 2)
  const lines = inner.split('\n')
  if (lines.length > 0) lines[0] = `- ${lines[0].slice(2)}`
  return [
    '# RouterOS /app store - array of /app definitions',
    '# Each entry defines one container application',
    lines.join('\n'),
  ].join('\n')
}

function scaffoldObject(root: JsonSchemaNode, node: JsonSchemaNode, indent: number): string {
  const merged = mergeSchema(root, node)
  if (!merged?.properties) return ''
  const required = new Set(merged.required ?? [])
  const pad = ' '.repeat(indent)
  const lines: string[] = []
  const keys = Object.keys(merged.properties).sort((a, b) => {
    const requiredA = required.has(a)
    const requiredB = required.has(b)
    if (requiredA !== requiredB) return requiredA ? -1 : 1
    return a.localeCompare(b)
  })

  for (const key of keys) {
    const prop = resolveRef(root, merged.properties[key])
    const propMerged = mergeSchema(root, prop)
    const type = propMerged?.type || (propMerged?.properties || propMerged?.patternProperties ? 'object' : undefined)
    const isRequired = required.has(key)
    if (type === 'object' && (propMerged?.properties || propMerged?.patternProperties)) {
      if (isRequired || key === 'services') {
        lines.push(`${pad}${key}:`)
        if (propMerged.patternProperties) {
          const patternSchema = resolveRef(root, Object.values(propMerged.patternProperties)[0])
          const placeholder = key === 'services' ? 'my-service' : `my-${key.replace(/s$/, '')}`
          lines.push(`${pad}  ${placeholder}:`)
          if (patternSchema) {
            const inner = scaffoldObject(root, patternSchema, indent + 4)
            if (inner) lines.push(inner)
          }
        } else if (prop) {
          const inner = scaffoldObject(root, prop, indent + 2)
          if (inner) lines.push(inner)
        }
      } else {
        lines.push(`${pad}# ${key}:`)
      }
    } else if (type === 'array') {
      if (isRequired) {
        lines.push(`${pad}${key}:`)
        lines.push(`${pad}  - ""`)
      } else {
        lines.push(`${pad}# ${key}:`)
      }
    } else if (isRequired) {
      if (propMerged?.enum) lines.push(`${pad}${key}: ${String(propMerged.enum[0])}`)
      else if (propMerged?.examples?.length) lines.push(`${pad}${key}: ${String(propMerged.examples[0])}`)
      else lines.push(`${pad}${key}: ""`)
    } else {
      lines.push(`${pad}# ${key}:`)
    }
  }
  return lines.join('\n')
}

function findFirstYamlContentLine(lines: string[]): { line: number, text: string } | undefined {
  for (let line = 0; line < lines.length; line++) {
    const text = lines[line].trim()
    if (!text || text.startsWith('#') || text === '---') continue
    return { line, text }
  }
  return undefined
}

function lineRange(line: number, text: string): Range {
  return new Range(line, 0, line, Math.max(text.length, 1))
}

function extractYamlStringListValue(trimmedLine: string): string | undefined {
  const match = trimmedLine.match(/^-\s+['"]([^'"]+)['"]\s*(?:#.*)?$/)
  return match?.[1]
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value)
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is JsonSchemaNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
