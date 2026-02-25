import type { Disposable, IconPath, QuickInputButton, QuickPickItem } from 'vscode';
import { commands, ConfigurationTarget, env, LogLevel, ProgressLocation, QuickPickItemKind, Uri, window, workspace } from 'vscode';
import { MarkdownHandlers } from './codelens';
import { getSettings, SecretManager } from './config';
import type { GitHubRepo } from './remote';
import { fetchGitHubRepos } from './remote';
import type { SystemScriptItem } from './routeros';
import { RouterRestClient } from './routeros';
import { log } from './shared';

// MARK: types

interface QuickPickItemEx extends QuickPickItem {
  label: string
  kind?: QuickPickItemKind
  iconPath?: IconPath
  description?: string
  detail?: string
  picked?: boolean
  alwaysShow?: boolean
  buttons?: readonly QuickInputButton[]
  cmd?: string
  args?: (string | Record<string, string | boolean | string[]>)[]
  id?: number | string
  url?: string
  action?: (params: QuickPickItemEx) => QuickPickItemEx
}

function quickPickBack(where: string): QuickPickItemEx[] {
  return [
    {
      label: '',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(debug-step-back)  Go Back',
      cmd: where,
    },
  ]
}

// MARK: init

export function initializeMenus(): Disposable[] {
  return [
    commands.registerCommand('tikbook.show.menu.main', () => showMenuMain()),
    commands.registerCommand('tikbook.show.menu.new', () => showMenuNew()),
    commands.registerCommand('tikbook.show.menu.setup', () => showMenuConnection()),
    commands.registerCommand('tikbook.show.menu.setup.baseurl', _ => showSetupBaseUrl(_)),
    commands.registerCommand('tikbook.show.menu.setup.username', _ => showSetupUsername(_)),
    commands.registerCommand('tikbook.show.menu.setup.apitimeout', _ => showSetupApiTimeout(_)),
    commands.registerCommand('tikbook.show.menu.setup.sshcommand', _ => showSetupSshCommand(_)),
    commands.registerCommand('tikbook.show.menu.outputs', () => showMenuOutputs()),
    commands.registerCommand('tikbook.show.menu.router.admin', () => showRouterAdminMenu()),
    commands.registerCommand('tikbook.show.menu.router.scripts', () => showScriptListMenu()),
    commands.registerCommand('tikbook.show.menu.router.export', () => showConfigurationExportMenu()),
    commands.registerCommand('tikbook.browse.mikrotik.help', () => showHelpMenu()),
    commands.registerCommand('tikbook.show.menu.variables.global', () => showRouterVariableGlobalForClipboard()),
    commands.registerCommand('tikbook.menu.showTikociRepoPicker', (back, browse) => showTikociRepoPicker(back, browse)),
  ]
}

// MARK: main menu

async function showMenuMain(): Promise<void> {
  return window.showQuickPick<QuickPickItemEx>([{
    label: '$(mikrotik-icon-line)  New RouterOS Document',
    cmd: 'tikbook.show.menu.new',
  },
  {
    label: '$(gear)  Setup Connection',
    cmd: 'tikbook.show.menu.setup',
  },
  {
    label: '$(tools)  RouterOS Management',
    cmd: 'tikbook.show.menu.router.admin',
  },
  {
    label: '$(question)  Help Resources',
    cmd: 'tikbook.browse.mikrotik.help',
  },
  {
    label: '$(output)  Show TikBook Logs (Outputs)',
    description: 'including extension and run logs',
    cmd: 'tikbook.show.menu.outputs',
  },
  ], {
    title: 'RouterOS TikBook',
  }).then((pickedItem) => {
    if (pickedItem?.cmd) void commands.executeCommand(pickedItem.cmd)
    else log.debug('<menus.showMenuMain> Main menu has no command to run')
  })
};

// MARK: new doc

async function showMenuNew(): Promise<void> {
  return window.showQuickPick<QuickPickItemEx>(
    [
      {
        label: '$(mikrotik-icon-line)  New RouterOS Script File',
        description: 'normal .rsc file',
        id: 'routeros',
      },
      {
        label: '$(tikoci-tikbook)  New RouterOS Notebook',
        description: 'TikBook using RouterOS script file',
        id: 'tikbook',
      },
      {
        label: '$(markdown)  New Markdown Notebook',
        description: 'TikBook using Markdown with runnable RouterOS',
        id: 'markdown-routeros',
      },
      {
        label: '$(tikoci-tikbook)   Create Notebook from System Scripts',
        cmd: 'tikbook.new.notebook.router.scripts',
      },
      {
        label: '$(terminal-powershell)  Start Interactive REPL',
        cmd: 'tikbook.new.notebook.repl',
      },
      ...quickPickBack('tikbook.show.menu.main'),
    ], { title: 'New RouterOS Document' })
    .then((item) => {
      if (!item) return
      if (item.cmd) void commands.executeCommand(item.cmd)
      switch (item.id) {
        case 'tikbook':
          void workspace.openNotebookDocument('tikbook').then(e => window.showNotebookDocument(e))
          break
        case 'routeros':
          void commands.executeCommand('workbench.action.files.newUntitledFile', { languageId: 'routeros' }) // .then(e => window.showTextDocument(e))
          break
        case 'markdown-routeros':
          void workspace.openNotebookDocument('markdown-routeros').then(e => window.showNotebookDocument(e))
          break
        case undefined:
          break
        default:
          log.warn('<menus.showMenuNew> no command found to run')
      }
    })
}

// MARK: topsetep

function showMenuConnection(): Promise<void> {
  const settings = getSettings()
  return window.showQuickPick<QuickPickItemEx>(
    [
      {
        label: 'Authentication',
        kind: QuickPickItemKind.Separator,
      },
      {
        label: ' $(browser)  Set Base URL',
        description: `${settings.baseUrl}`,
        id: 'baseUrl',
        cmd: 'tikbook.show.menu.setup.baseurl',
      }, {
        label: ' $(account)  Set User',
        description: ` ${settings.username}`,
        id: 'username',
        cmd: 'tikbook.show.menu.setup.username',
      }, {
        label: ' $(key)  Set Password as Secret',
        description: ` ${workspace.getConfiguration('tikbook', null).get('passwordInfo')}`,
        cmd: 'tikoci.secrets.default.set',
      }, {
        label: 'Customize',
        kind: QuickPickItemKind.Separator,
      },
      {
        label: ' $(refresh)  Set HTTP Request Timeout',
        description: ` ${settings.apiTimeout}`,
        cmd: 'tikbook.show.menu.setup.apitimeout',
      },
      {
        label: ' $(terminal)  Set SSH Command',
        description: ` ${settings.sshCommand}`,
        cmd: 'tikbook.show.menu.setup.sshcommand',
      },
      {
        label: ' $(clear-all)  Clear Password Secret',
        description: `and use empty password or JSON settings`,
        cmd: 'tikoci.secrets.default.clear',
      },

      {
        label: ' $(settings)  Go to TikBook Settings',
        cmd: 'workbench.action.openSettings',
        args: ['@ext:tikoci.tikbook'],
      },
      {
        label: 'RouterOS LSP',
        kind: QuickPickItemKind.Separator,
      },
      {
        label: ' $(tasklist)  Test RouterOS LSP',
        cmd: 'routeroslsp.cmd.testConnection',
      },
      {
        label: ' $(settings)  Go to RouterOS LSP Settings',
        cmd: 'workbench.action.openSettings',
        args: ['@ext:tikoci.lsp-routeros-ts'],
      },
      ...quickPickBack('tikbook.show.menu.main'),
    ], { title: 'RouterOS Connection Settings' })
    .then((item) => {
      if (item?.cmd) void commands.executeCommand(item.cmd, (item.args && item.args.length > 0) ? item.args[0] : 'tikbook.show.menu.setup')
    }) as Promise<void>
}

// MARK: baseUrl

async function showSetupBaseUrl(back?: string): Promise<string | undefined> {
  const input = await window.showInputBox({
    value: getSettings().baseUrl,
    // valueSelection: [2, 4],
    title: 'RouterOS Connection URL',
    placeHolder: 'http://admin@192.168.88.1:80',
    ignoreFocusOut: true,
    prompt: 'Enter the base URL to RouterOS HTTP/S service. ',
    validateInput: (text) => {
      if (!URL.canParse(text)) {
        return 'Must be a valid URL, like https://192.168.88.1'
      }
      const parsedUrl = new URL(text)
      if (!parsedUrl) return 'Must be a valid URL, like https://192.168.88.1'
      log.trace(`<MinuteNumbers.showSetupBaseUrl> found url`, parsedUrl)
      const allowedProtocols = ['https:', 'http:']
      if (!allowedProtocols.includes(parsedUrl.protocol)) return `Protocol must be ${allowedProtocols.join(' or ')}`
      if (!parsedUrl.host) return `Host must be valid DNS or IP address`
      if (parsedUrl.pathname.match(/\/rest([/].*)?$/)) return `Do not include /rest in URL`
      if (parsedUrl.pathname.length > 1) return 'Do not include a path as /rest added automatically'
      return null
    },
  })

  if (!input) {
    if (back) void commands.executeCommand(back)
    return input
  }
  if (!URL.canParse(input)) {
    log.info(`<menus.showSetupBaseUrl> got bad url after validation using '${input}', user likely cancelled`)
    void window.showWarningMessage(` Nothing updated.  URL '${input}' is not valid.`)
    if (back) void commands.executeCommand(back)
    return input
  }
  const conf = workspace.getConfiguration('tikbook', null)
  const url = URL.parse(input)
  if (!url) {
    if (back) void commands.executeCommand(back)
    return input
  }
  const newSettings: { baseUrl?: string, username?: string, password?: string } = {}
  const nextBaseUrl = `${url.protocol}//${url.host}`
  if (conf.get('baseUrl') !== nextBaseUrl) newSettings.baseUrl = nextBaseUrl
  if (conf.get('username') !== url.username && url.username.length > 0) newSettings.username = url.username
  const secretPassword = await SecretManager.default.getPassword()
  if (conf.get('password') !== secretPassword && url.password.length > 0) newSettings.password = url.password

  const updatedAttributes = []
  if (newSettings.baseUrl) updatedAttributes.push('baseUrl')
  if (newSettings.username) updatedAttributes.push('username')
  if (newSettings.password) updatedAttributes.push('password')

  let msg: string
  const updateSettings = async (settingName: string, notice?: string): Promise<void> => {
    await conf.update(settingName, newSettings[settingName as keyof typeof newSettings], ConfigurationTarget.Global)
    if (notice) {
      void window.showInformationMessage(notice)
      log.debug(`<menus.showSetupBaseUrl> notified: ${notice}`)
    }
  }

  if (updatedAttributes.length > 0) {
    if (newSettings.baseUrl) {
      msg = `TikBook using RouterOS connection URL: ${newSettings.baseUrl}`
      await updateSettings('baseUrl', msg)
      if (updatedAttributes.length === 1 && back) {
        void commands.executeCommand(back)
      }
    }
    if (newSettings.username) {
      msg = `Updated TikBook's RouterOS username to '${newSettings.username}'`
      await updateSettings('username')
      if (newSettings.password) {
        await SecretManager.default.setPassword(newSettings.password)
        msg = msg + ' and password'
      }
      void window.showInformationMessage(msg)
      log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
      if (back) void commands.executeCommand(back)
    }
  }

  return input
}

// MARK: username

async function showSetupUsername(back?: string): Promise<string | undefined> {
  const input = await window.showInputBox({
    value: getSettings().username,
    // valueSelection: [2, 4],
    title: 'RouterOS Username',
    placeHolder: 'admin',
    ignoreFocusOut: true,
    prompt: 'Enter the username for RouterOS HTTP/S connection\n',
    validateInput: (text) => {
      if (text.match(/^[A-Za-z0-9-.]{1,64}$/)) return null
      else return `The provided username does not appear to be valid.`
    },
  })
  let msg: string
  const conf = workspace.getConfiguration('tikbook', null)
  if (input && input.length > 0 && conf.get('username') !== input) {
    await conf.update('username', input, ConfigurationTarget.Global)
    msg = `Updated TikBook's RouterOS username: ${input}`
    void window.showInformationMessage(msg)
    log.debug(`<menus.showSetupUsername> notified: ${msg}`)
    if (back) void commands.executeCommand(back)
  }
  else {
    msg = `Nothing to update for TikBook's RouterOS credentials`
    void window.showInformationMessage(msg)
    log.debug(`<menus.showSetupUsername> showed: ${msg}`)
    if (back) void commands.executeCommand(back)
  }
  return input
}

// MARK: apiTimeout

async function showSetupApiTimeout(back?: string): Promise<string | undefined> {
  const input = await window.showInputBox({
    value: getSettings().apiTimeout.toString(10),
    // valueSelection: [2, 4],
    title: 'HTTP Request Timeout (in Seconds)',
    placeHolder: '60',
    ignoreFocusOut: true,
    prompt: 'Enter the timeout for HTTP/S connections to RouterOS\n',
    validateInput: (text) => {
      const num = Number(text)
      if (!num) return 'Must be number, in seconds'
      if (num > 0 && num <= 120) return null
      if (num > 120) return 'Must be less than 120 seconds'
      if (num <= 0) return 'No time traveling allowed.  Must be > 0 seconds.'
    },
  })
  if (input) {
    await workspace.getConfiguration('tikbook', null).update('apiTimeout', Number(input), ConfigurationTarget.Global)
    const msg = `Updated timeout to ${Number(input).toPrecision(1)}s when connecting to RouterOS`
    void window.showInformationMessage(msg)
    log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
    if (back) void commands.executeCommand(back)
  }
  else if (back) {
    void commands.executeCommand(back)
  }
  // if (back) commands.executeCommand(back)
  return input
}

// MARK: ssh

async function showSetupSshCommand(back?: string): Promise<string | undefined> {
  const input = await window.showInputBox({
    value: getSettings().sshCommand,
    // valueSelection: [2, 4],
    title: 'Set SSH Command to Launch Terminal',
    placeHolder: 'ssh',
    ignoreFocusOut: true,
    prompt: `Unless you have custom configuration, use 'ssh'.\nDo not include user@address part as that is provided automatically\n`,
    validateInput: (text) => {
      if (!text) return `SSH command cannot be empty.  Use 'ssh' if unsure.`
      if (text.length > 128) return 'SSH command must be less than 128 characters'
    },
  })
  if (input) {
    await workspace.getConfiguration('tikbook', null).update('sshCommand', input, ConfigurationTarget.Global)
    const msg = `Updated SSH command used in Terminal to '${input}'`
    void window.showInformationMessage(msg)
    log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
    if (back) void commands.executeCommand(back)
  }
  else if (back) {
    void commands.executeCommand(back)
  }
  // if (!input && back) commands.executeCommand(back)
  return input
}

// MARK: logs

function showMenuOutputs(): Promise<void> {
  return window.showQuickPick<QuickPickItemEx>(
    [
      {
        label: '$(tikoci-tikbook) TikBook Logs',
        id: 'tikbook',
      }, {
        label: '$(markdown)  Markdown \'RouterOS Run\' Output',
        id: 'markdown-run',
      }, {
        label: '$(mikrotik-icon-line)  RouterOS LSP Logs',
        id: 'routeroslsp',
      },
      {
        label: '',
        kind: QuickPickItemKind.Separator,
      },
      {
        label: '$(settings)  Set Log Level',
        description: `currently ${LogLevel[log.logLevel]}`,
        cmd: 'workbench.action.setLogLevel',
      },
      ...quickPickBack('tikbook.show.menu.main'),
    ], { title: 'Show TikBook Logs (Outputs)' })
    .then((item) => {
      if (!item) return
      if (item.cmd) void commands.executeCommand(item.cmd)
      switch (item.id) {
        case 'tikbook':
          log.show()
          break
        case 'markdown-run':
          MarkdownHandlers.log.show()
          break
        case 'routeroslsp':
          void window.showWarningMessage('Unimplemented: cannot show RouterOS LSP logs yet.')
          log.debug('<menus.showMenuOutput> warned user about unimplemented show RouterOS LSP logs')
          break
        case undefined:
          break
        default:
          log.error('<menus.showMenuOutput> show output menu has no command to run')
      }
    }) as Promise<void>
}

// MARK:  topadmin

async function showRouterAdminMenu(): Promise<void> {
  return window.showQuickPick<QuickPickItemEx>([
    {
      label: 'Admin Tools',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(globe)  Launch RouterOS Web Admin',
      cmd: 'tikbook.browse.router.webfig',
    },
    {
      label: '$(remote)  Open SSH Terminal',
      cmd: 'tikbook.open.terminal.router',
    },
    {
      label: 'Configuration Files',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(export)  Show Configuration (:export)',
      cmd: 'tikbook.show.menu.router.export',
    },
    {
      label: '$(git-pull-request)  Show Default Configuration',
      cmd: 'tikbook.open.router.default-configuration.script',
    },
    {
      label: 'CSV Exports',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: `$(table)  Show Interfaces as CSV`,
      cmd: 'tikbook.open.router.csv',
      args: ['/interface/print detail', 'interface.ip'],
    },
    {
      label: `$(table)  Show Interface Statistics as CSV`,
      cmd: 'tikbook.open.router.csv',
      args: ['/interface/monitor-traffic [find] once', 'monitor-traffic.interface.ip'],
    },
    {
      label: `$(table)  Show IP Neighbors as CSV`,
      cmd: 'tikbook.open.router.csv',
      args: ['/ip/neighbor/print detail', 'neighbor.ip'],
    },
    {
      label: `$(table)  Show Firewall Connections as CSV`,
      cmd: 'tikbook.open.router.csv',
      args: ['/ip/firewall/connection/print detail', 'connection.firewall.ip'],
    },
    {
      label: `$(table)  Show DHCP Leases as CSV`,
      cmd: 'tikbook.open.router.csv',
      args: ['/ip/dhcp-server/lease/print detail', 'lease.dhcp-server.ip'],
    },
    {
      label: 'System Scripts',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(code)  View System Scripts',
      cmd: 'tikbook.show.menu.router.scripts',
    },
    {
      label: '$(tikoci-tikbook)   Create Notebook from System Scripts',
      cmd: 'tikbook.new.notebook.router.scripts',
    },
    {
      label: '$(variable-group)  View and Copy Variables (:global)',
      cmd: 'tikbook.show.menu.variables.global',
    },
    {
      label: '$(list-unordered)  Show Scripts as :global functions',
      cmd: 'tikbook.open.router.scripts.globals',
    },

    ...quickPickBack('tikbook.show.menu.main'),
  ], { title: 'RouterOS Management' })
    .then((item) => {
      if (!item) return
      if (item.cmd) {
        if (item.args && item.args.length > 0) void commands.executeCommand(item.cmd, ...item.args)
        else void commands.executeCommand(item.cmd)
      }
    })
}

// MARK: export

async function showConfigurationExportMenu(): Promise<void> {
  // let menuitems: QuickPickItemEx[]
  const exportTypes = [
    ['compact', 'without defaults'],
    ['verbose', 'include defaults'],
    ['terse', '\'flattened\' without default'],
  ]
  const menuitems: QuickPickItemEx[] = exportTypes.map((type) => {
    return {
      label: `$(export)  :export ${type[0]}`,
      description: ` ${type[1]}`,
      cmd: 'tikbook.open.router.export',
      args: [type[0]],
    }
  })
  menuitems.push(...quickPickBack('tikbook.show.menu.router.admin'))

  return window.showQuickPick<QuickPickItemEx>(menuitems, {})
    .then((item) => {
      if (!item) return
      if (item.cmd) void commands.executeCommand(item.cmd, ...(item.args ?? []))
    })
}

// MARK: scriptlist

async function showScriptListMenu(): Promise<void> {
  const scripts = await RouterRestClient.default.systemScripts
  let menuitems: QuickPickItemEx[] = []

  if (Array.isArray(scripts)) {
    menuitems = (scripts as unknown[]).map((item: unknown) => {
      const script = item as SystemScriptItem
      return {
        label: `${script.name ?? ''}`,
        id: `${script['.id'] ?? ''}`,
        description: ` ${script.comment ?? ''}`,
        cmd: 'tikbook.open.router.script',
      }
    })
  }
  else {
    log.error('<menus.showScriptListMenu> {_fetchSystemScripts}')
  }
  menuitems.push(...quickPickBack('tikbook.show.menu.router.admin'))
  void window.showQuickPick<QuickPickItemEx>(menuitems, { title: 'Show System Script as Text Document' })
    .then((item) => {
      if (!item) return
      if (item.cmd) void commands.executeCommand(item.cmd, item.label, item.id)
    })
}

// MARK: vars

async function showRouterVariableGlobalForClipboard(): Promise<void> {
  const keyValues = await RouterRestClient.default.scriptEnvironment()
  if (!Array.isArray(keyValues)) {
    const noVarsMsg = 'No RouterOS variables found to insert'
    void window.showWarningMessage(noVarsMsg)
    log.info(`[tikbook.show.menu.variables.global] warned '${noVarsMsg}`)
    return
  }

  const items: QuickPickItem[] = keyValues.map((envvar: { name: string, value: string }) => ({
    label: `${envvar.name}`,
    description: `  ${envvar.value.length > 64 ? envvar.value.substring(0, 64) + '...' : envvar.value}`,
  }))
  items.push(...quickPickBack('tikbook.show.menu.router.admin'))
  const selection = await window.showQuickPick(items, {
    title: 'Copy RouterOS :global Variable',
    canPickMany: false,
    placeHolder: 'Select variable name to copy to clipboard',
  })

  if (!selection) return // User cancelled

  const variable = `$${selection.label}`
  // const editor = null // disabled using window.activeTextEditor

  /*
  if (editor) {
    const edit = editor.edit((editBuilder: { replace: (arg0: never, arg1: string) => void, insert: (arg0: any, arg1: string) => void }) => {
      const { selection } = editor
      if (!selection.isEmpty) {
        // Replace selected text
        editBuilder.replace(selection, variable)
      }
      else {
        // Insert at cursor position
        editBuilder.insert(selection.active, variable)
      }
    })
    await edit
  }
  else { */
  // No editor — fallback to clipboard
  await env.clipboard.writeText(variable)
  const msg = `Copied RouterOS ${variable} to clipboard`
  void window.showInformationMessage(msg)
  log.debug(`[tikbook.show.menu.variables.global] notified user '${msg}'`)
  // }
}

// MARK: tophelp

async function showHelpMenu(): Promise<void> {
  const menuitems: QuickPickItemEx[] = []
  const mikrotikUrls = [
    ['https://forum.mikrotik.com', 'MikroTik Forum', 'comment-discussion'],
    ['https://help.mikrotik.com/servicedesk/servicedesk', 'MikroTik Issue Reporting', 'bug'],
    ['https://help.mikrotik.com/docs/x/XQDWAg', 'RouterOS Scripting Manual', 'code'],
    ['https://help.mikrotik.com/docs', 'MikroTik Documentation', 'mikrotik-icon-line'],
  ]
  const tikociUrls = [
    ['https://tikoci.github.io', 'TIKOCI Homepage', 'home'],
    ['https://tikoci.github.io/restraml/', 'RouterOS Schema Tools', 'diff-multiple', 'including diff tool'],
  ]

  menuitems.push({ kind: QuickPickItemKind.Separator, label: 'MikroTik' })
  menuitems.push(...mikrotikUrls.map((item) => {
    return {
      label: `$(${item[2]}) Browse ${item[1]}`,
      url: item[0],
    }
  }))

  menuitems.push({ kind: QuickPickItemKind.Separator, label: 'TIKOCI GitHub' })
  menuitems.push({
    label: `$(tikoci-tikbook) Browse TIKOCI Projects`,
    id: 'gitbrowse',
  })
  menuitems.push({
    label: `$(git-fetch) Git Clone TIKOCI Project`,
    id: 'gitclone',
  })
  menuitems.push(...tikociUrls.map((item) => {
    return {
      label: `$(${item[2]}) Browse ${item[1]}`,
      url: item[0],
      description: item[3] ?? undefined,
    }
  }))
  menuitems.push({ kind: QuickPickItemKind.Separator, label: 'TikTube Videos' })
  menuitems.push(
    {
      label: `$(device-camera-video)  Scripting: Basics, Part 1`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: 'Make_your_router_run_Scripts-[GJ-57ByVMWk]', group: 'test', chapters: true, languages: ['en', 'hu'] }],
    },
    {
      label: `$(device-camera-video)  Scripting: Basics, Part 2`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: 'Make_your_router_run_scripts_pt.2-[2WsFhkLVaMY]', group: 'test', chapters: false, languages: ['en'] }],
    },
    {
      label: `$(device-camera-video)  Scripting: Data Types`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: 'Scripting_-_variable_data_types-[9SeYC_s95rw]', group: 'test', chapters: true, languages: ['en'] }],
    },
    {
      label: `$(device-camera-video)  Scripting: Arrays`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: 'Scripting_-_working_with_Arrays-[eWCJw0uZ-lE]', group: 'test', chapters: true, languages: ['en', 'pl'] }],
    },
    {
      label: `$(device-camera-video)  RouterOS REST API Setup and Use`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: 'REST_API_in_RouterOS_v7-[dwEcUa2KXNc]', group: 'test', chapters: false, languages: [] }],
    }, /*
    {
      label: `$(device-camera-video)  Intro to RouterOS Low-Level API`,
      cmd: `tikbook.test.video.embedded`,
      args: [{ name: '', group: 'test', chapters: false, languages: [] }],
    } */
  )

  menuitems.push(...quickPickBack('tikbook.show.menu.main'))

  return window.showQuickPick<QuickPickItemEx>(menuitems, { title: 'Help Resources' })
    .then(async (item) => {
      if (!item) return
      if (item.cmd && item.args?.length) {
        await commands.executeCommand(item.cmd, ...item.args)
        return
      }
      else {
        if (item.cmd) {
          await commands.executeCommand(item.cmd, item.args)
          return
        }
      }
      if (item.url) {
        await env.openExternal(Uri.parse(item.url))
        return
      }
      switch (item.id) {
        case 'gitclone': {
          void commands.executeCommand('tikbook.menu.showTikociRepoPicker', 'tikbook.browse.mikrotik.help', false).then((e) => {
            if (e && typeof e === 'object' && 'git_url' in e) {
              void commands.executeCommand('git.clone', (e as { git_url: string }).git_url)
            }
          })
          break
        }
        case 'gitbrowse':
          void commands.executeCommand('tikbook.menu.showTikociRepoPicker', 'tikbook.browse.mikrotik.help', true)
          break
        case undefined:
          break
        default:
      }
    })
}

// MARK: github

async function showTikociRepoPicker(back: string, browse = true): Promise<GitHubRepo | undefined> {
  const organization = 'tikoci'

  try {
    return await window.withProgress({
      location: ProgressLocation.Notification,
      title: `Fetching repositories for ${organization}...`,
      cancellable: false,
    }, async () => {
      try {
        const repos = await fetchGitHubRepos(organization)

        if (repos.length === 0) {
          const msg = `No public repositories found for organization: ${organization}`
          void window.showWarningMessage(msg)
          log.debug(`[tikbook.menu.showTikociRepoPicker] warned user ${msg}`)
          return
        }

        const options: (QuickPickItemEx & { repo?: GitHubRepo })[] = repos.map(repo => ({
          label: `${repo.name}`,
          description: repo.language ? `${repo.language} • ⭐ ${repo.stargazers_count}` : `⭐ ${repo.stargazers_count}`,
          detail: repo.description ?? 'No description available',
          repo: repo,
        }))

        options.push(...quickPickBack(back))
        const selected = await window.showQuickPick(options, {
          placeHolder: `Select a repository from ${organization}`,
          matchOnDescription: true,
          matchOnDetail: true,
        })
        if (selected) {
          if (selected.cmd) {
            await commands.executeCommand(selected.cmd)
            return
          }
          const selectedRepo = selected.repo
          if (browse && selectedRepo) await env.openExternal(Uri.parse(selectedRepo.html_url))
          return selectedRepo
        }
      }
      catch (error) {
        const msg = `Menu skipped, failed to fetch repositories to show`
        void window.showWarningMessage(msg)
        log.warn(`[tikbook.menu.showTikociRepoPicker] warned user ${msg}`, error)
      }
    })
  }
  catch (error) {
    log.warn(`[tikbook.menu.showTikociRepoPicker] got exception`, error)
    void window.showWarningMessage(`Got an unexpected error trying to show menu. Check logs`)
  }
}
