import type { AxiosError, AxiosInstance, AxiosResponse, GenericAbortSignal, InternalAxiosRequestConfig } from 'axios';
import axios, { isAxiosError } from 'axios';
import type { Event } from 'vscode';
import { env, EventEmitter, UIKind } from 'vscode';
import { getSettings, SecretManager } from './config';
import { log } from './shared';

import * as https from 'https';
let _httpsNoCheckCertificates: https.Agent
export function getHttpsAgent(): https.Agent | undefined {
  const shouldCheckCertificates = getSettings().checkCertificates
  if (env.uiKind === UIKind.Web) return undefined
  if (shouldCheckCertificates) return undefined
  if (_httpsNoCheckCertificates) return _httpsNoCheckCertificates
  return _httpsNoCheckCertificates = new https.Agent({
    rejectUnauthorized: false,
  })
}

// MARK: types

export interface WrappedExecuteResponse {
  ret: string
}
export type ExecuteResponse = string

export interface SystemIdentityGetResponse {
  name: string
}

export interface InspectRequest {
  'input'?: string | undefined
  'path'?: string | string[] | undefined
  'request': string
  // not useful but present
  '.proplist'?: string | string[] | undefined | null
  '.query'?: string[] | undefined | null
  'as-value'?: boolean | string | undefined | null
  'without-paging'?: boolean | string | undefined | null
}

export type InspectResponse = HighlightInspectResponseItem[] | SyntaxInspectResponseItem[] | CompletionInspectResponseItem[] | ChildInspectResponseItem[]

export interface HighlightInspectResponseItem {
  highlight: string
  type: string
}

export interface SyntaxInspectResponseItem {
  'nested': number | string | undefined
  'nonorm': boolean | string | undefined
  'symbol': string | undefined
  'symbol-type': string | undefined
  'text': string | undefined
  'type': string
}

export type RouterOSExportType = 'compact' | 'verbose' | 'terse' | undefined

export interface CompletionInspectResponseItem {
  completion: string | undefined
  offset: number | string | undefined
  preference: number | string | undefined
  show: boolean | string | undefined
  style: number | string | undefined
  text: string | undefined
  type: string
}

export interface ChildInspectResponseItem {
  'name': string
  'node-type': string
  'type': string
}

export interface RouterOSInitialization {
  baseUrl: string
  username: string
  password: string | Promise<string>
  apiTimeout: number
}

/**
 * Base interface for RouterOS API items.
 * 
 * Supports:
 * - Standard properties via Record<string, unknown>
 * - Dotted properties like '.id' via index signature
 * - Future API extensibility without needing 'any'
 */
export interface RouterOSItem extends Record<string, unknown> {
  '.id'?: string
}

export interface SystemScriptItem extends RouterOSItem {
  name?: string
  source?: string
  comment?: string
  owner?: string
  policy?: string[]
  ['dont-require-permissions']?: string
}

// MARK: REST lib

export class RouterRestClient {
  // get settings() {
  // log.trace('<RouterRestClient> {get settings}')
  //  return getSettings()
  // }

  static #default: RouterRestClient | undefined = undefined
  static get default(): RouterRestClient {
    log.trace('<RouterRestClient> {{get default}}')
    if (RouterRestClient.#default) {
      return RouterRestClient.#default
    }
    else {
      log.info('<RouterRestClient> created NEW {{default}} client')
      RouterRestClient.#default = new RouterRestClient()
      return RouterRestClient.#default
    }
  }

  private _onHttpResponseSuccess = new EventEmitter<AxiosResponse>()
  private _onHttpResponseError = new EventEmitter<AxiosError>()
  private _onHttpRequestSuccess = new EventEmitter<InternalAxiosRequestConfig>()
  private _onHttpRequestError = new EventEmitter<AxiosError>()
  public readonly onHttpResponseSuccess: Event<AxiosResponse> = this._onHttpResponseSuccess.event
  public readonly onHttpResponseError: Event<AxiosError> = this._onHttpResponseError.event
  public readonly onHttpRequestSuccess: Event<InternalAxiosRequestConfig> = this._onHttpRequestSuccess.event
  public readonly onHttpRequestError: Event<AxiosError> = this._onHttpRequestError.event

  constructor() {
    log.trace('<RouterRestClient> {constructor} noop')
  }

  public dispose(): void {
    log.info('<RouterRestClient> {dispose} invoked')
    this._onHttpResponseError.dispose()
    this._onHttpResponseSuccess.dispose()
    this._onHttpRequestError.dispose()
    this._onHttpRequestSuccess.dispose()
  }

  // MARK: client

  get httpClient(): AxiosInstance {
    log.trace('<RouterRestClient> {httpClient}')
    // const settings = getSettings()
    const client = axios.create({
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })

    // update from setting per request
    client.interceptors.request.use(async (req) => {
      const password = await SecretManager.default.getPassword()
      const settings = getSettings()
      req.auth = {
        username: settings.username,
        password: password ?? settings.password ?? '',
      }
      req.baseURL = `${settings.baseUrl}/rest`
      req.timeout = settings.apiTimeout * 1000
      if (env.uiKind === UIKind.Desktop) req.httpsAgent = getHttpsAgent()
      return req
    })

    client.interceptors.request.use(
      req => this.pipelineRequestSuccess(req),
      error => this.pipelineRequestError(error))

    client.interceptors.response.use(
      resp => this.pipelineResponseSuccess(resp),
      error => this.pipelineResponseError(error),
    )
    return client
  }

  private pipelineRequestSuccess(req: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    log.info('<RouterRestClient> request incoming', req.method, req.url)
    this._onHttpRequestSuccess.fire(req)
    return req
  }

   
  private pipelineRequestError(error: unknown): Promise<never> {
    if (isAxiosError(error)) {
      log.warn('<RouterRestClient> axios error _before_ sending', `${error.config?.url} ${error.code} '${error.message}' baseUrl ${error.config?.baseURL} user ${error.config?.auth?.username}`)
      this._onHttpRequestError.fire(error as AxiosError)
    }
    else {
      log.error('<RouterRestClient> cannot send request', error)
    }
    return Promise.reject(error)
    // return Promise.reject(error);
  }

  private pipelineResponseSuccess(resp: AxiosResponse): AxiosResponse {
    log.info('<RouterRestClient> done successfully', resp.config.url)
    this._onHttpResponseSuccess.fire(resp)
    return resp
  }

   
  private pipelineResponseError(error: unknown): Promise<never> {
    if (isAxiosError(error)) {
      log.warn('<RouterRestClient> axios error _before_ sending', `${error.config?.url} ${error.code} '${error.message}' baseUrl ${error.config?.baseURL} user ${error.config?.auth?.username}`)
      this._onHttpRequestError.fire(error as AxiosError)
    }
    else {
      log.error('<RouterRestClient> request failed', error)
    }
    return Promise.reject(error)
  }

  // MARK: wrappers

  async _execute(cmd: string, signal?: GenericAbortSignal): Promise<string> {
    log.trace('<RouterRestClient> [_execute] ')
    return this.httpClient.post<WrappedExecuteResponse>(
      '/execute', {
        'as-string': true,
        'script': cmd,
      }, signal ? { signal: signal } : {}).then(resp => resp.data?.ret ?? '')
  }

  async _asCSV(cmd: string, signal?: GenericAbortSignal, _options?: string[]): Promise<string> {
    return this._execute(
      `:put [:serialize to=dsv delimiter=, options=dsv.remap [${cmd} as-value]]`,
      signal)
  }

  async _asJSON(cmd: string, signal?: GenericAbortSignal, _pretty?: boolean): Promise<string> {
    return this._execute(
      `:put [:serialize to=json [${cmd} as-value]]`,
      signal)
  }

  // async execute(cmd: string, wrapperType: "json"|"csv"|"rest"|undefined){}
  async _inspect<T>(request: string, input: string, path?: string): Promise<T[]> {
    log.trace('<RouterRestClient> [_inspect] ')
    return this.httpClient.post<T[]>(
      '/console/inspect', {
        request: request,
        input: input,
        path: path,
      }).then(resp => resp.data)
  }

  // MARK: methods

  async run(cmd: string, signal: GenericAbortSignal): Promise<string> {
    return this._execute(cmd, signal)
  }

  inspectHighligh = (input: string, path?: string): Promise<HighlightInspectResponseItem[]> => {
    return this._inspect<HighlightInspectResponseItem>('highlight', (new RouterScriptPreprocessor(input)).unicodeCharReplace('_'), path)
  }

  inspectSyntax = (input: string, path?: string): Promise<SyntaxInspectResponseItem[]> => {
    return this._inspect<SyntaxInspectResponseItem>('syntax', input, path)
  }

  inspectCompletion = (input: string, path?: string): Promise<CompletionInspectResponseItem[]> => {
    return this._inspect<CompletionInspectResponseItem>('completion', input, path)
  }

  inspectChild = (input: string, path?: string): Promise<ChildInspectResponseItem[]> => {
    return this._inspect<ChildInspectResponseItem>('child', input, path)
  }

  exportConfig = (type: RouterOSExportType, token: GenericAbortSignal): Promise<string> => {
    // return this.run(`:put [:execute script=":export ${type || ''}" as-value]`, token)
    log.info(`<RouterRestClient> [exportConfig] ${type}`)
    return this.run(`:export ${type}`, token)
  }

  scriptEnvironment = (): Promise<unknown> => {
    return this.httpClient.post('/system/script/environment/print', {}).then(resp => resp.data)
  }

  get systemScripts(): Promise<SystemScriptItem[]> {
    return this.httpClient.post('/system/script/print', {}).then(resp => resp.data as SystemScriptItem[])
  }

  get defaultConfiguration(): Promise<Record<string, unknown> | undefined> {
    return this.httpClient.post('/system/default-configuration/print', {}).then(resp => resp.data?.[0] as Record<string, unknown> | undefined)
  }

  getSystemScript = (name: string): Promise<SystemScriptItem> => {
    return this.httpClient.get(`/system/script/${encodeURIComponent(name)}`).then(resp => resp.data)
  }

  async createSystemScript(script: { name?: string, source: string, comment?: string, policy?: string[] }): Promise<unknown> {
    log.info('<RouterRestClient> createSystemScript', script.name)
    try {
      const result = await this.httpClient.put('/system/script', script).then(resp => resp.data)
      log.debug(`<RouterRestClient> createSystemScript success: ${script.name}`)
      return result
    }
    catch (err) {
      log.error(`<RouterRestClient> createSystemScript failed for '${script.name}': ${err}`)
      throw err
    }
  }

  async updateSystemScript(id: string, patch: Record<string, unknown>): Promise<unknown> {
    log.info('<RouterRestClient> updateSystemScript', id)
    try {
      const result = await this.httpClient.patch(`/system/script/${encodeURIComponent(id)}`, patch).then(resp => resp.data)
      log.debug(`<RouterRestClient> updateSystemScript success for ${id}`)
      return result
    }
    catch (err) {
      log.error(`<RouterRestClient> updateSystemScript failed for ${id}: ${err}`)
      throw err
    }
  }

  async deleteSystemScript(id: string): Promise<unknown> {
    log.info('<RouterRestClient> deleteSystemScript', id)
    try {
      const result = await this.httpClient.delete(`/system/script/${encodeURIComponent(id)}`).then(resp => resp.data)
      log.debug(`<RouterRestClient> deleteSystemScript success for ${id}`)
      return result
    }
    catch (err) {
      log.error(`<RouterRestClient> deleteSystemScript failed for ${id}: ${err}`)
      throw err
    }
  }

  async resolveScriptIdByName(name: string): Promise<string | undefined> {
    log.debug(`<RouterRestClient> resolveScriptIdByName: looking up '${name}'`)
    try {
      const scripts = await this.systemScripts
      for (const s of scripts) {
        const id = (s['.id'] ?? s.id) as string | undefined
        if (s.name === name) {
          log.debug(`<RouterRestClient> resolveScriptIdByName: found '${name}' -> ${id}`)
          return id
        }
      }
      log.debug(`<RouterRestClient> resolveScriptIdByName: '${name}' not found`)
      return undefined
    }
    catch (err) {
      log.error(`<RouterRestClient> resolveScriptIdByName failed for '${name}': ${err}`)
      throw err
    }
  }

  // Generic REST helpers to support schema-driven filesystem mapping
  async list<T = unknown>(path: string, body?: object): Promise<T[]> {
    log.debug(`<RouterRestClient.list> POST ${path}/print with body: ${JSON.stringify(body)}`)
    try {
      const resp = await this.httpClient.post<T[]>(`${path}/print`, body ?? {})
      log.debug(`<RouterRestClient.list> SUCCESS: got ${Array.isArray(resp.data) ? resp.data.length : '?'} items`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.list> FAILED for ${path}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async get(path: string, idOrName: string): Promise<unknown> {
    log.debug(`<RouterRestClient.get> GET ${path}/${encodeURIComponent(idOrName)}`)
    try {
      const resp = await this.httpClient.get(`${path}/${encodeURIComponent(idOrName)}`)
      log.debug(`<RouterRestClient.get> SUCCESS: ${typeof resp.data}`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.get> FAILED for ${path}/${idOrName}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async create(path: string, payload: object): Promise<unknown> {
    log.debug(`<RouterRestClient.create> PUT ${path} with payload: ${JSON.stringify(payload)}`)
    try {
      const resp = await this.httpClient.put(path, payload)
      log.debug(`<RouterRestClient.create> SUCCESS: got response`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.create> FAILED for ${path}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async update(path: string, id: string, patch: object): Promise<unknown> {
    log.debug(`<RouterRestClient.update> PATCH ${path}/${encodeURIComponent(id)} with patch: ${JSON.stringify(patch)}`)
    try {
      const resp = await this.httpClient.patch(`${path}/${encodeURIComponent(id)}`, patch)
      log.debug(`<RouterRestClient.update> SUCCESS: got response`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.update> FAILED for ${path}/${id}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async remove(path: string, id: string): Promise<unknown> {
    log.debug(`<RouterRestClient.remove> DELETE ${path}/${encodeURIComponent(id)}`)
    try {
      const resp = await this.httpClient.delete(`${path}/${encodeURIComponent(id)}`)
      log.debug(`<RouterRestClient.remove> SUCCESS: got response`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.remove> FAILED for ${path}/${id}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async post(path: string, body?: object): Promise<unknown> {
    log.debug(`<RouterRestClient.post> POST ${path} with body: ${JSON.stringify(body)}`)
    try {
      const resp = await this.httpClient.post(path, body ?? {})
      log.debug(`<RouterRestClient.post> SUCCESS: got response`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.post> FAILED for ${path}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async patch(path: string, patch: object): Promise<unknown> {
    log.debug(`<RouterRestClient.patch> PATCH ${path} with patch: ${JSON.stringify(patch)}`)
    try {
      const resp = await this.httpClient.patch(path, patch)
      log.debug(`<RouterRestClient.patch> SUCCESS: got response`)
      return resp.data
    }
    catch (err) {
      log.error(`<RouterRestClient.patch> FAILED for ${path}: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  async resolveIdByName(path: string, name: string, nameAttr = 'name'): Promise<string | undefined> {
    log.debug(`<RouterRestClient> resolveIdByName: ${path} -> '${name}'`)
    try {
      const items = await this.list<RouterOSItem>(path)
      for (const item of items) {
        const id = item['.id'] ?? (item as Record<string, unknown>).id
        if (item[nameAttr] === name) return id as string | undefined
      }
      return undefined
    }
    catch (err) {
      log.error(`<RouterRestClient> resolveIdByName failed for '${path}'/'${name}': ${err}`)
      throw err
    }
  }

  getIdentity = (): Promise<string> => {
    return this.httpClient.get('/system/identity').then(resp => resp.data?.name ?? '')
  }

  getRawIdentity = (): Promise<AxiosResponse<SystemIdentityGetResponse>> => {
    return this.httpClient.get<SystemIdentityGetResponse>('/system/identity')
  }

  getSystemResources(): Promise<object> {
    return this.httpClient.get('/system/resource').then(resp => resp.data)
  }

  getNeighbors(format = 'csv'): Promise<string> {
    if (format !== 'csv') throw new Error('not implemented')
    return this._asCSV('/ip/neighbor print detail')
  }
}

// MARK: preprocessor

export class RouterScriptPreprocessor {
  text = ''
  /*
  findRestableCommand() {
    // "print" is special to enable renders
    const restableCommands = this.text.split('\n').map(e =>
      // eslint-disable-next-line no-useless-escape
      /^[\s]*(?<path>[\/]([a-z]+[\/ ])+)(?<cmd>(print|get))[\s]*(?<args>(([\S]+=[\S]+|([a-z\-]+))[\s]*)*)/
        .exec(e))
      .filter(e => e?.groups)
    log.debug('<TikbookControllerBase> {_doExecution} processing any REST-able commands', restableCommands)
    // log.trace(JSON.stringify(restableCommands, null, 2))
    restableCommands.forEach((e) => {
      if (e && e.groups && e.groups.args && e.groups.args.length > 0) {
        const args = e.groups.args.split(/[\s]+/).reduce((m, e) => {
          e = e.trim()
          if (e.match(/[\S]+=[\S]+/)) {
            const attr = e.split('=')
            attr[1].replace(/^["]/, '').replace(/["]$/, '')
            if (Number.isInteger(Number(attr[1]))) m[attr[0]] = Number(attr[1])
            else m[attr[0]] = attr[1]
          }
          else if (e.match(/[A-z-.]+/)) {
            m[e] = true
          }
          return m
        }, {})
        log.trace(`<TikbookControllerBase> {_doExecution} REST-able args`, args)
      }
    })
    return restableCommands
  }
    */

  unicodeCharReplace(replace = '_'): string {
    let result = ''
    for (let i = 0; i < this.text.length; i++) {
      const charCode = this.text.charCodeAt(i)
      if (charCode >= 0 && charCode <= 127) {
        result += this.text.charAt(i)
      }
      else {
        result += replace
      }
    }
    return result
  }

  constructor(text: string) {
    this.text = text
  }
}
