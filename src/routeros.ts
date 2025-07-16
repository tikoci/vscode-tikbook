import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig, isAxiosError } from 'axios'
import { EventEmitter, Event, log } from './shared'
import { getSettings, SecretManager } from './config'

export interface WrappedExecuteResponse {
  ret: string
}
export type ExecuteResponse = string

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

/*
const routerDefaultInitialization = {
    //baseUrl: "http://192.168.74.144:7080",
    // username: "lsp",
    // password: "changeme",
    apiTimeout: 30
};
*/

export interface RouterOSInitialization {
  baseUrl: string
  username: string
  password: string | Promise<string>
  apiTimeout: number
}

export class RouterRestClient {
  // #settings;
  // get settings() { return this.#settings; }
  // set settings(newValue) { this.#settings = newValue; }
  get settings() {
    log.trace('<RouterRestClient> {get settings}')
    return getSettings()
  }

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

  get httpClient() {
    log.trace('<RouterRestClient> {httpClient}')
    const client = axios.create({
      // baseURL: `${this.#settings.baseUrl}/rest`,
      // timeout: this.#settings.apiTimeout * 1000, // in ms, settings uses seconds
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })

    // update from setting per request
    client.interceptors.request.use(async (req) => {
      const password = await SecretManager.default.getPassword()
      const settings = this.settings
      req.auth = {
        username: settings.username,
        password: password || settings.password || '',
      }
      req.baseURL = `${settings.baseUrl}/rest`
      req.timeout = settings.apiTimeout * 1000
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
      log.warn('<RouterRestClient> axios error _before_ sending', error.toJSON())
    }
    this._onHttpRequestError.fire(error as AxiosError)
    log.error('<RouterRestClient> cannot send request', error)
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
      log.warn('<RouterRestClient> axios error _before_ sending', error.toJSON())
    }
    this._onHttpRequestError.fire(error as AxiosError)
    log.error('<RouterRestClient> request failed', error)
    // return Promise.reject(error);
  }

  async _execute(cmd: string, signal?) {
    log.trace('<RouterRestClient> [_execute] ')
    return await this.httpClient.post<WrappedExecuteResponse>(
      '/execute', {
        'as-string': true,
        'script': cmd,
      }, signal ? { signal: signal } : {}).then(resp => resp?.data?.ret)
  }

  async run(cmd: string, signal): Promise<string> {
    return this._execute(cmd, signal)
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

  inspectHighligh = (input: string, path?: string) => {
    return this._inspect<HighlightInspectResponseItem>('highlight', (new RouterScriptPreprocessor(input)).unicodeCharReplace('?'), path)
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

  exportConfig = (type: RouterOSExportType, token) => {
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

  getSystemScript = (name) => {
    return this.httpClient.get(`/system/script/${encodeURIComponent(name)}`).then(resp => resp.data)
  }

  getIdentity = (): Promise<string> => {
    return this.httpClient.get('/system/identity').then(resp => resp.data?.name)
  }

  getSystemResources(): Promise<object> {
    return this.httpClient.get('/system/resource').then(resp => resp.data)
  }
}

export class RouterOSScriptParser {
  source = ''
  device: RouterRestClient
  constructor(source: string, device: RouterRestClient) {
    this.source = source
    this.device = device
  }
}

export class RouterScriptPreprocessor {
  text = ''

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
