import axios, { AxiosError, AxiosResponse, GenericAbortSignal, InternalAxiosRequestConfig, isAxiosError } from 'axios'
import { log } from './shared'
import { getSettings, SecretManager } from './config'
import { EventEmitter, Event, env, UIKind } from 'vscode'

import * as https from 'https'
let _httpsNoCheckCertificates: https.Agent
export function getHttpsAgent() {
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

// MARK: REST lib

export class RouterRestClient {
  // get settings() {
  // log.trace('<RouterRestClient> {get settings}')
  //  return getSettings()
  // }

  static #default: RouterRestClient | undefined = undefined
  static get default() {
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

  public dispose() {
    log.info('<RouterRestClient> {dispose} invoked')
    this._onHttpResponseError.dispose()
    this._onHttpResponseSuccess.dispose()
    this._onHttpRequestError.dispose()
    this._onHttpRequestSuccess.dispose()
  }

  // MARK: client

  get httpClient() {
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
        password: password || settings.password || '',
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

  private pipelineRequestSuccess(req: InternalAxiosRequestConfig) {
    log.info('<RouterRestClient> request incoming', req.method, req.url)
    this._onHttpRequestSuccess.fire(req)
    return req
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pipelineRequestError(error: any) {
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

  private pipelineResponseSuccess(resp: AxiosResponse) {
    log.info('<RouterRestClient> done successfully', resp.config.url)
    this._onHttpResponseSuccess.fire(resp)
    return resp
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pipelineResponseError(error: any) {
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

  async _execute(cmd: string, signal?: GenericAbortSignal) {
    log.trace('<RouterRestClient> [_execute] ')
    return await this.httpClient.post<WrappedExecuteResponse>(
      '/execute', {
        'as-string': true,
        'script': cmd,
      }, signal ? { signal: signal } : {}).then(resp => resp?.data?.ret)
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
  async _inspect<T>(request: string, input: string, path?: string) {
    log.trace('<RouterRestClient> [_inspect] ')
    return await this.httpClient.post<T[]>(
      '/console/inspect', {
        request: request,
        input: input,
        path: path,
      }).then(resp => resp?.data)
  }

  // MARK: methods

  async run(cmd: string, signal: GenericAbortSignal): Promise<string> {
    return this._execute(cmd, signal)
  }

  inspectHighligh = (input: string, path?: string) => {
    return this._inspect<HighlightInspectResponseItem>('highlight', (new RouterScriptPreprocessor(input)).unicodeCharReplace('_'), path)
  }

  inspectSyntax = (input: string, path?: string) => {
    return this._inspect<SyntaxInspectResponseItem>('syntax', input, path)
  }

  inspectCompletion = (input: string, path?: string) => {
    return this._inspect<CompletionInspectResponseItem>('completion', input, path)
  }

  inspectChild = (input: string, path?: string) => {
    return this._inspect<ChildInspectResponseItem>('child', input, path)
  }

  exportConfig = (type: RouterOSExportType, token: GenericAbortSignal) => {
    // return this.run(`:put [:execute script=":export ${type || ''}" as-value]`, token)
    log.info(`<RouterRestClient> [exportConfig] ${type}`)
    return this.run(`:export ${type}`, token)
  }

  scriptEnvironment = () => {
    return this.httpClient.post('/system/script/environment/print', {}).then(resp => resp.data)
  }

  get systemScripts() {
    return this.httpClient.post('/system/script/print', {}).then(resp => resp.data)
  }

  get defaultConfiguration() {
    return this.httpClient.post('/system/default-configuration/print', {}).then(resp => resp.data?.[0])
  }

  getSystemScript = (name: string) => {
    return this.httpClient.get(`/system/script/${encodeURIComponent(name)}`).then(resp => resp.data)
  }

  getIdentity = (): Promise<string> => {
    return this.httpClient.get('/system/identity').then(resp => resp.data?.name)
  }

  getRawIdentity = () => {
    return this.httpClient.get<SystemIdentityGetResponse>('/system/identity')
  }

  getSystemResources(): Promise<object> {
    return this.httpClient.get('/system/resource').then(resp => resp.data)
  }

  getNeighbors(format = 'csv') {
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
