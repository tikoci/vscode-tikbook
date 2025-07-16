import { commands, env, IconPath, LogLevel, ProgressLocation, QuickInputButton, QuickPickItem, QuickPickItemKind, Uri, window, workspace } from 'vscode'
import { log } from './shared'
import { MarkdownHandlers } from './codelens'
import { getSettings, SecretManager } from './config'
import { RouterRestClient } from './routeros'
import { fetchGitHubRepos, GitHubRepo } from './scmquery'

export const mikrotikUrls = [
  ['https://forum.mikrotik.com', 'MikroTik Forum', 'comment-discussion'],
  ['https://help.mikrotik.com/servicedesk/servicedesk', 'MikroTik Issue Reporting', 'bug'],
  ['https://help.mikrotik.com/docs/x/XQDWAg', 'RouterOS Scripting Manual', 'debug-continue'],
  ['https://help.mikrotik.com/docs', 'MikroTik Documentation', 'mikrotik-icon-line'],
]
export const tikociUrls = [
  ['https://tikoci.github.io', 'TIKOCI Homepage', 'home'],
  ['https://github.com/orgs/tikoci', 'TIKOCI GitHub Repos', 'github'],
]

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
  id?: number | string
  action?: (params: QuickPickItemEx) => QuickPickItemEx
}

function quickPickBack(where) {
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

export function initializeMenus() {
  return [
    commands.registerCommand('tikbook.show.menu.main', _ => showMenuMain(_)),
    commands.registerCommand('tikbook.show.menu.new', _ => showMenuNew(_)),
    commands.registerCommand('tikbook.show.menu.setup', _ => showMenuConnection(_)),
    commands.registerCommand('tikbook.show.menu.setup.baseurl', _ => showSetupBaseUrl(_)),
    commands.registerCommand('tikbook.show.menu.setup.username', _ => showSetupUsername(_)),
    commands.registerCommand('tikbook.show.menu.setup.apitimeout', _ => showSetupApiTimeout(_)),
    commands.registerCommand('tikbook.show.menu.setup.sshcommand', _ => showSetupSshCommand(_)),
    commands.registerCommand('tikbook.show.menu.outputs', _ => showMenuOutputs(_)),
    commands.registerCommand('tikbook.show.menu.router.admin', _ => showRouterAdminMenu(_)),
    commands.registerCommand('tikbook.show.menu.router.scripts', _ => showScriptListMenu(_)),
    commands.registerCommand('tikbook.show.msg.todo', (e) => {
      window.showWarningMessage(`Not Implemented: ${e.label}`)
      log.error(`[tikbook.show.msg.todo] unimplemented command called`)
    }),
    commands.registerCommand('tikbook.show.menu.variables.global', async (_keyValues: Record<string, string>) => {
      const keyValues = await RouterRestClient.default.scriptEnvironment()
      if (!keyValues || typeof keyValues !== 'object') {
        const msg = 'No RouterOS variables found to insert'
        window.showWarningMessage(msg)
        log.info(`[tikbook.show.menu.variables.global] warned '${msg}`)
        return
      }

      const items: QuickPickItem[] = keyValues.map(envvar => ({
        label: `${envvar.name}`,
        description: `  ${envvar.value.length > 64 ? envvar.value.substring(0, 64) + '...' : envvar.value}`,
      }))

      const selection = await window.showQuickPick(items, {
        title: 'Copy RouterOS :global Variable',
        canPickMany: false,
        placeHolder: 'Select variable name to copy to clipboard',
      })

      if (!selection) return // User cancelled

      const variable = `$${selection.label}`
      const editor = null // disabled using window.activeTextEditor

      if (editor) {
        const edit = editor.edit((editBuilder) => {
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
      else {
        // No editor — fallback to clipboard
        await env.clipboard.writeText(variable)
        const msg = `Copied RouterOs ${variable} to clipboard`
        window.showInformationMessage(msg)
        log.debug(`[tikbook.show.menu.variables.global] notified user '${msg}'`)
      }
    }),
    commands.registerCommand('tikbook.menu.showTikociRepoPicker', async () => {
      const organization = 'tikoci'

      try {
        // Show loading message
        await window.withProgress({
          location: ProgressLocation.Notification,
          title: `Fetching repositories for ${organization}...`,
          cancellable: false,
        }, async () => {
          try {
            // Fetch repositories from GitHub API
            const repos = await fetchGitHubRepos(organization)

            if (repos.length === 0) {
              const msg = `No public repositories found for organization: ${organization}`
              window.showWarningMessage(msg)
              log.debug(`[tikbook.menu.showTikociRepoPicker] warned user ${msg}`)
              return
            }

            // Convert repos to QuickPickItems
            const options: QuickPickItem[] = repos.map(repo => ({
              label: `${repo.name}`,
              description: repo.language ? `${repo.language} • ⭐ ${repo.stargazers_count}` : `⭐ ${repo.stargazers_count}`,
              detail: repo.description || 'No description available',
              // Store the repo data for later use
              repo: repo,
            } as QuickPickItem & { repo: GitHubRepo }))

            // Show the QuickPick
            const selected = await window.showQuickPick(options, {
              placeHolder: `Select a repository from ${organization}`,
              matchOnDescription: true,
              matchOnDetail: true,
            })
            // type GitHubRepo = { repo: string }
            if (selected) {
              const selectedRepo = (selected as QuickPickItem & { repo: GitHubRepo }).repo
              env.openExternal(Uri.parse(selectedRepo.html_url))
            }
          }
          catch (error) {
            const msg = `Menu skipped, failed to fetch repositories to show`
            window.showWarningMessage(msg)
            log.warn(`[tikbook.menu.showTikociRepoPicker] warned user ${msg}`, error)
          }
        })
      }
      catch (error) {
        log.warn(`[tikbook.menu.showTikociRepoPicker] got exception`, error)
        window.showWarningMessage(`Got an unexpected error trying to show menu. Check logs`)
      }
    }),
  ]
}

// MARK: main menu

async function showMenuMain(_) {
  return window.showQuickPick<QuickPickItemEx>([{
    label: '$(mikrotik-icon-line)  New RouterOS Document',
    cmd: 'tikbook.show.menu.new',
  },
  {
    label: '$(gear)  Setup RouterOS Connection',
    cmd: 'tikbook.show.menu.setup',
  },
  {
    label: '$(tools)  RouterOS Scripting Tools',
    cmd: 'tikbook.show.menu.router.admin',
  },
  {
    label: '$(question)  Help Resources',
    cmd: 'tikbook.browse.mikrotik.docs',
  },
  {
    label: '$(output)  Show Outputs',
    description: 'including extension and run logs',
    cmd: 'tikbook.show.menu.outputs',
  },
  ], {
    title: 'RouterOS TikBook',
  }).then((pickedItem) => {
    if (pickedItem.cmd) commands.executeCommand(pickedItem.cmd)
    else log.warn('<menus.showMenuMain> Main menu has no command to run')
  })
};

// MARK: new doc

async function showMenuNew(_) {
  return window.showQuickPick<QuickPickItemEx>(
    [
      {
        label: '$(tikoci-tikbook)  RouterOS Notebook',
        description: 'TikBook using RouterOS script file',
        id: 'tikbook',
      }, {
        label: '$(mikrotik-icon-line)  RouterOS Script File',
        description: 'normal .rsc file',
        id: 'routeros',
      }, {
        label: '$(markdown)  Markdown Notebook',
        description: 'TikBook using Markdown with runnable RouterOS',
        id: 'markdown-routeros',
      },
      {
        label: 'Start Interactive REPL',
        cmd: 'tikbook.new.notebook.repl',
        id: 'repl',
      },
      ...quickPickBack('tikbook.show.menu.main'),
    ], { title: 'New RouterOS Document' })
    .then((item) => {
      if (item.cmd) commands.executeCommand(item.cmd)
      switch (item.id) {
        case 'tikbook':
          workspace.openNotebookDocument('tikbook').then(e => window.showNotebookDocument(e))
          break
        case 'routeros':
          workspace.openTextDocument('routeros').then(e => window.showTextDocument(e))
          break
        case 'markdown-routeros':
          workspace.openNotebookDocument('markdown-routeros').then(e => window.showNotebookDocument(e))
          break
        case 'repl':
          commands.executeCommand(item.cmd)
          break
        default:
          log.warn('<menus.showMenuNew> no command found to run')
      }
    })
}

// MARK: topsetep

function showMenuConnection(_) {
  const settings = getSettings()
  window.showQuickPick<QuickPickItemEx>(
    [
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
        label: '',
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
      ...quickPickBack('tikbook.show.menu.main'),
    ], { title: 'RouterOS Connection Settings' })
    .then((item) => {
      if (item.cmd) commands.executeCommand(item.cmd, 'tikbook.show.menu.setup')
    })
}

// MARK: baseUrl

async function showSetupBaseUrl(back) {
  const input = window.showInputBox({
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
      const url = new URL(text)
      if (!url) return 'Must be a valid URL, like https://192.168.88.1'
      log.trace(`<MinuteNumbers.showSetupBaseUrl> found url`, url)
      const allowedProtocols = ['https:', 'http:']
      if (!allowedProtocols.includes(url.protocol)) return `Protocol must be ${allowedProtocols.join(' or ')}`
      if (!url.host) return `Host must be valid DNS or IP address`
      if (url.pathname.match(/\/rest([/].*)?$/)) return `Do not include /rest in URL`
      if (url.pathname.length > 1) return 'Do not include a path as /rest added automatically'
      return null
    },
  }).then((urlString) => {
    if (!URL.canParse(urlString)) {
      log.info(`<menus.showSetupBaseUrl> got bad url after validation using '${urlString}', user likely cancelled`)
      window.showWarningMessage(` Nothing updated.  URL '${urlString}' is not valid.`)
    }
    const conf = workspace.getConfiguration('tikbook', null)
    const url = URL.parse(urlString)
    const newSettings: { baseUrl?: string, username?: string, password?: string } = {}
    if (conf.get('baseUrl') !== newSettings.baseUrl) newSettings.baseUrl = `${url.protocol}//${url.host}`
    if (conf.get('username') !== newSettings.username && url.username.length > 0) newSettings.username = url.username
    if (conf.get('password') !== SecretManager.default.getPassword() && url.password.length > 0) newSettings.password = url.password

    const updatedAttributes = []
    if (newSettings.baseUrl) updatedAttributes.push('baseUrl')
    if (newSettings.username) updatedAttributes.push('username')
    if (newSettings.password) updatedAttributes.push('password')

    let msg: string
    const updateSettings = (settingName, msg?: string) => {
      return conf.update(settingName, newSettings[settingName]).then(() => {
        if (msg) {
          window.showInformationMessage(msg)
          log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
        }
      })
    }

    if (updatedAttributes.length > 0) {
      if (newSettings.baseUrl) {
        msg = `TikBook using RouterOS connection URL: ${newSettings.baseUrl}`
        updateSettings('baseUrl', msg).then(() => {
          if (updatedAttributes.length === 1) {
            commands.executeCommand(back)
          }
        })
      }
      if (newSettings.username) {
        msg = `Updated TikBook's RouterOS username to '${newSettings.username}'`
        updateSettings('username').then(() => {
          if (newSettings.password) {
            SecretManager.default.setPassword(newSettings.password)
            msg = msg + ' and password'
          }
          window.showInformationMessage(msg)
          log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
          commands.executeCommand(back)
        })
      }
    }
  })
  if (!input && back) commands.executeCommand(back)
  return input
}

// MARK: username

async function showSetupUsername(back?) {
  const input = window.showInputBox({
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
  }).then((username) => {
    let msg: string
    const conf = workspace.getConfiguration('tikbook', null)
    if (conf.get('username') !== username && username.length > 0) {
      conf.update('username', username).then(() => {
        msg = `Updated TikBook's RouterOS username: ${username}`
        window.showInformationMessage(msg)
        log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
        if (back) commands.executeCommand(back)
      })
    }
    else {
      msg = `Nothing to update for TikBook's RouterOS credentials`
      window.showInformationMessage(msg)
      log.debug(`<menus.showSetupBaseUrl> showed: ${msg}`)
      if (back) commands.executeCommand(back)
    }
  })
  if (!input && back) commands.executeCommand(back)
  return input
}

// MARK: apiTimeout

async function showSetupApiTimeout(back?) {
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
  }).then((timeout) => {
    workspace.getConfiguration('tikbook', null).update('apiTimeout', Number(timeout))
      .then(() => {
        const msg = `Updated timeout to ${Number(timeout).toPrecision(1)}s when connecting to RouterOS`
        window.showInformationMessage(msg)
        log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
        if (back) commands.executeCommand(back)
      })
  })
  // if (back) commands.executeCommand(back)
  return input
}

// MARK: ssh

async function showSetupSshCommand(back?) {
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
  }).then((text) => {
    workspace.getConfiguration('tikbook', null).update('sshCommand', text)
      .then(() => {
        const msg = `Updated SSH command used in Terminal to '${text}'`
        window.showInformationMessage(msg)
        log.debug(`<menus.showSetupBaseUrl> notified: ${msg}`)
        if (back) commands.executeCommand(back)
      })
  })
  // if (!input && back) commands.executeCommand(back)
  return input
}

// MARK: logs

function showMenuOutputs(_) {
  window.showQuickPick<QuickPickItemEx>(
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
    ], { title: 'Show Output (Log)' })
    .then((item) => {
      if (item.cmd) commands.executeCommand(item.cmd)
      switch (item.id) {
        case 'tikbook':
          log.show()
          break
        case 'markdown-run':
          MarkdownHandlers.log.show()
          break
        case 'routeroslsp':
          window.showWarningMessage('Unimplemented: cannot show RouterOS LSP logs yet.')
          log.debug('<menus.showMenuOutput> warned user about unimplemented show RouterOS LSP logs')
          break
        default:
          log.error('<menus.showMenuOutput> show output menu has no command to run')
      }
    })
}

// MARK:  topadmin

async function showRouterAdminMenu(_) {
  return window.showQuickPick<QuickPickItemEx>([
    {
      label: '$(globe)  Launch RouterOS Web Admin',
      cmd: 'tikbook.browse.router.webfig',
    },
    {
      label: '$(remote)  Open SSH Terminal',
      cmd: 'tikbook.open.terminal.router',
    },
    {
      label: '',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(export)  Show Configuration (:export)',
      cmd: 'tikbook.open.router.export',
    },
    {
      label: '$(git-pull-request)  Show Default Configuration',
      cmd: 'tikbook.open.router.default-configuration.script',
    },
    {
      label: '',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(tikoci-tikbook)   New Notebook from System Scripts',
      cmd: 'tikbook.new.notebook.router.scripts',
    },
    {
      label: '$(code)  View System Scripts',
      cmd: 'tikbook.show.menu.router.scripts',
    },
    {
      label: '$(variable-group)  View Variables (:global)',
      cmd: 'tikbook.show.menu.variables.global',
    },
    {
      label: '$(list-unordered)  Show Scripts as :global variables',
      cmd: 'tikbook.open.router.scripts.globals',
    },

    ...quickPickBack('tikbook.show.menu.main'),
  ])
    .then((item) => {
      if (item.cmd) commands.executeCommand(item.cmd)
    })
}

// MARK: scriptlist

async function showScriptListMenu(_) {
  const scripts = await RouterRestClient.default.systemScripts
  let menuitems: QuickPickItemEx[] = []

  if (scripts) {
    menuitems = scripts.map((item) => {
      return {
        label: `${item.name}`,
        id: `${item['.id']}`,
        description: ` ${item.comment}`,
        cmd: 'tikbook.open.router.script',
      }
    })
  }
  else {
    log.error('<menus.showScriptListMenu> {_fetchSystemScripts}')
    return []
  }
  window.showQuickPick<QuickPickItemEx>(menuitems, {})
    .then((item) => {
      commands.executeCommand(item.cmd, item.label, item.id)
    })
}

// MARK: tophelp
