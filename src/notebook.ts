import type { CancellationToken, Disposable, NotebookCell, NotebookController, NotebookDocument, NotebookSerializer } from 'vscode';
import { CancellationTokenSource, commands, LogLevel, NotebookCellData, NotebookCellKind, NotebookCellOutput, NotebookCellOutputItem, NotebookData, notebooks, Uri, ViewColumn, window, workspace } from 'vscode';
import { RouterRestClient as client } from './routeros';
import { log } from './shared';
import { getActiveNotebook } from './vscode-compat';

const encoding = 'utf-8'

// MARK: init

export function initializeNotebookEngines(): Disposable[] {
  const killswitch = new CancellationTokenSource()
  return [
    workspace.registerNotebookSerializer('tikbook', new ScriptSerializer(), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    workspace.registerNotebookSerializer('routeros', new ScriptSerializer(), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    workspace.registerNotebookSerializer('markdown-routeros', new MarkdownSerializer(), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    workspace.registerNotebookSerializer('interactive', new ScriptSerializer(), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    new TikbookController(),
    new RscController(),
    new ReplController(),
    new MarkdownController(),
    commands.registerCommand('tikbook.new.notebook.markdown', async () => {
      const nb = await workspace.openNotebookDocument('markdown-routeros', new NotebookData([]))
      await window.showNotebookDocument(nb)
    }),
    commands.registerCommand('tikbook.new.notebook', async () => {
      const nb = await workspace.openNotebookDocument('tikbook', new NotebookData([]))
      await window.showNotebookDocument(nb)
    }),
    commands.registerCommand('tikbook.new.notebook.repl', async () => {
      await commands.executeCommand('interactive.open',
        undefined,
        undefined,
        `TIKOCI.tikbook/interactive-tikbook`,
        undefined,
      )
    },
    ),
    commands.registerCommand('tikbook.notebook.clone.routeros', async (uri?) => {
      let nb
      if (uri) {
        await workspace.openNotebookDocument(
          'tikbook',
          await commands.executeCommand(
            'vscode.executeDataToNotebook',
            'routeros-markdown',
            (new TextEncoder()).encode(
              (await workspace.openTextDocument(uri)).getText()),
          ),
        )
      }
      else {
        nb = getActiveNotebook()
      }
      if (nb) {
        void copyNotebookAs(nb, 'tikbook')
      }
      else {
        log.error(`<notebook> [tikbook.notebook.clone.routeros] got no notebook`)
      }
    }),
    commands.registerCommand('tikbook.notebook.clone.markdown', async (uri?) => {
      let nb
      if (uri) {
        await workspace.openNotebookDocument(
          'markdown-routeros',
          await commands.executeCommand(
            'vscode.executeDataToNotebook',
            'tikbook',
            (new TextEncoder()).encode(
              (await workspace.openTextDocument(uri)).getText()),
          ),
        )
      }
      else {
        nb = getActiveNotebook()
      }
      if (nb) {
        void copyNotebookAs(nb, 'markdown-routeros')
      }
      else {
        log.error(`<notebook> [tikbook.notebook.clone.markdown] got no notebook`)
      }
    }),
    commands.registerCommand('tikbook.new.notebook.router.scripts', async () => {
      const uri = Uri.parse('rscena:all-scripts.md.rsc?scripts.tikbook')
      const textDocument = await workspace.openTextDocument(uri)
      const content = textDocument.getText()
      const buffer = new TextEncoder().encode(content)
      const notebookData = await Promise.resolve((new ScriptSerializer()).deserializeNotebook(buffer, killswitch.token))
      await window.showNotebookDocument((await workspace.openNotebookDocument('tikbook', notebookData)))
    }),
    commands.registerCommand('tikbook.notebook.markdown.preview.markdown', (_uri?: Uri) => {
      void commands.executeCommand('markdown.showPreviewToSide', _uri)
    }),
    commands.registerCommand('tikbook.notebook.reopen.routeros', async (uri?: Uri) => {
      const targetUri = uri
      if (!targetUri) {
        void window.showWarningMessage('No document is found to open in [tikbook.notebook.reopen.routeros] command')
        log.warn(`[tikbook.notebook.reopen.routeros] found no uri for vscode.openWith`)
        return
      }
      const activeNotebook = getActiveNotebook()
      if (activeNotebook?.isUntitled || window.activeTextEditor?.document.isUntitled) {
        void window.showWarningMessage(`Untitled documents cannot previewed. Save file to enable RouterOS script view.`, 'Save As...', 'Cancel')
          .then((selection) => {
            if (selection === 'Save As...') {
              void commands.executeCommand('workbench.action.files.save').then(e => log.info(JSON.stringify(e)))
            }
          })
        return
      }
      try {
        await commands.executeCommand('vscode.openWith', uri, 'default', ViewColumn.Beside)
        log.debug(`[tikbook.notebook.reopen.routeros] vscode.openWith ${uri.toString(true)} called`)
      }
      catch (error) {
        log.warn('[tikbook.notebook.reopen.routeros] Error opening with notebook:', error)
        void window.showWarningMessage(`Exception opening text document from notebook using ${uri.toString()}`)
      }
    }),
    /*
    notebooks.registerNotebookCellStatusBarItemProvider('tikbook', new (class implements NotebookCellStatusBarItemProvider {
      onDidChangeCellStatusBarItems?: Event<void>
      provideCellStatusBarItems(cell: NotebookCell, _: CancellationToken): ProviderResult<NotebookCellStatusBarItem | NotebookCellStatusBarItem[]> {
        return [{
          alignment: NotebookCellStatusBarAlignment.Right,
          text: 'JSON$(attach)',
          tooltip: `${cell.index}`,
          command: 'tikbook.show.menu.variables.global',
        }]
      }
    })()),
    */
  ]
}

// MARK: convert

export async function convertNotebookFormat(nb: NotebookDocument, newFormat: string): Promise<NotebookDocument | null> {
  const scriptSerializer = new ScriptSerializer()
  const markdownSerializer = new MarkdownSerializer()
  if (nb.isDirty || nb.isUntitled) {
    const msg = 'Document must be saved before copy to new notebook format.'
    void window.showWarningMessage(msg)
    log.info(`<notebook.convertNotebookFormat> warned '${msg}'`, nb.uri.toString(), newFormat)
    return null
  }
  const text = (await workspace.openTextDocument(nb.uri)).getText()
  if (nb.notebookType === newFormat) return nb
  const serializer = newFormat === 'markdown-routeros'
    ? scriptSerializer
    : markdownSerializer
  const killswitch = new CancellationTokenSource()
  const notebookData = await Promise.resolve(serializer.deserializeNotebook(new TextEncoder().encode(text), killswitch.token))
  return workspace.openNotebookDocument(newFormat, { cells: notebookData.cells, metadata: notebookData.metadata })
}

export function copyNotebookAs(notebook: NotebookDocument, newNotebookType: string): void {
  if (notebook?.notebookType) {
    log.debug('<notebook.copyNotebookAs> has notebook, prompting user to create copy', notebook.uri.toString(), newNotebookType)
    void window.showInformationMessage(`Create new copy in '${newNotebookType}' notebook format?`, { modal: true, detail: 'Note: Future changes are not synced between notebook formats.' }, 'Create Copy')
      .then(async (e) => {
        if (e === 'Create Copy') {
          log.debug('<notebook.copyNotebookAs> attempting file copy+show after user confirm')
          const newNotebook = await convertNotebookFormat(notebook, newNotebookType)
          if (newNotebook) await window.showNotebookDocument(newNotebook)
        }
        else {
          log.debug('<notebook.createNotebookCopy> skipped', notebook.uri.toString(), newNotebookType)
        }
      })
  }
  else {
    const msg = 'No notebook found to copy'
    void window.showWarningMessage(msg)
    log.debug(`<notebook.copyNotebookAs> warned user '${msg}'`, notebook.uri.toString(), newNotebookType)
  }
}

// MARK: md serialize

export class MarkdownSerializer implements NotebookSerializer {
  serializeNotebook(data: NotebookData, _: CancellationToken): Uint8Array | Thenable<Uint8Array> {
    return new TextEncoder().encode('[//]: #!tikbook\n\n' + data.cells.map((c, i, a) => {
      switch (c.kind) {
        case NotebookCellKind.Code: {
          const code = c.value.trim()
          if (code.match(/^[\s]+$/)) return ''
          return `\`\`\`routeros\n${code}\n\`\`\`\n\n`
        }
        case NotebookCellKind.Markup: {
          const md = c.value.trim()
          if (md.match(/^[\s]+$/)) return ''
          if (a[i - 1]?.kind === NotebookCellKind.Markup) {
            return `[//]: #.\n\n${md}\n\n`
          }
          return `${md}\n\n`
        }
      }
    }).join(''))
  }

  deserializeNotebook(
    content: Uint8Array,
    _token: CancellationToken,
  ): NotebookData {
    const lines = new TextDecoder(encoding).decode(content).split('\n')
    const notebookCellData: NotebookCellData[] = []
    let pending = ''
    const metadata: { shebang: boolean | string } = { shebang: false }
    let cellType = NotebookCellKind.Markup
    const commitPending = (lang: string, cellMetadata?: Record<string, unknown>): void => {
      if (pending) {
        const text = pending.trimEnd()
        if (text.length > 0) {
          const cellData = new NotebookCellData(cellType, `${text}`, lang)
          if (cellMetadata) cellData.metadata = cellMetadata
          notebookCellData.push(cellData)
        }
        pending = ''
      }
    }
    lines.forEach((c) => {
      c = c.trimEnd()
      const shebangParsed = c.match(/^[[][/][/][\]]: #!tikbook[ ]*(.*)$/)
      if (shebangParsed) {
        metadata.shebang = shebangParsed.groups?.[0] ?? true
        return
      }
      if (c.match(/^```routeros/)) {
        commitPending('markdown')
        cellType = NotebookCellKind.Code
        return
      }
      if (c.match(/^```/) && cellType === NotebookCellKind.Code) {
        commitPending('routeros')
        cellType = NotebookCellKind.Markup
        return
      }
      // uses a markdown comment hack to break markdown cells... have to find it...
      // eslint-disable-next-line no-useless-escape
      const rawMetadataParsed = c.match(/^([\[][\/][\/][\]]: #[.])([ ][(](.*)[)])?/)
      if (rawMetadataParsed && cellType !== NotebookCellKind.Code) {
        // commitPending('markdown', rawMetadataParsed.groups?.[3])
        commitPending('markdown')
      }
      pending += `${c.trimEnd()}\n`
    })
    commitPending(cellType === NotebookCellKind.Markup ? 'markdown' : 'routeros')
    const notebookData = new NotebookData(notebookCellData)
    notebookData.metadata = metadata
    return notebookData
  }
}

// MARK: rsc serialize

export class ScriptSerializer implements NotebookSerializer {
  serializeNotebook(data: NotebookData, _: CancellationToken): Uint8Array | Thenable<Uint8Array> {
    return new TextEncoder().encode(data.cells.reduce((M, V, I, A): string => {
      if (V.value.trim().length === 0) {
        return M
      }
      switch (V.kind) {
        case NotebookCellKind.Code: {
          if (A[I - 1]?.kind === NotebookCellKind.Code) {
            M += '#.\n\n'
          }
          return `${M}${V.value.trim()}\n\n`
        }
        case NotebookCellKind.Markup: {
          return `${M}` + V.value.split('\n').reduce((m, v) => {
            return `${m}#  ${v.trim()}\n`
          }, '#.markdown\n') + `#.\n\n`
        }
      }
    }, '#!tikbook\n\n'))
  }

  deserializeNotebook(content: Uint8Array, _: CancellationToken): NotebookData | Thenable<NotebookData> {
    const lines = new TextDecoder(encoding).decode(content).split('\n')
    const notebookCellData: NotebookCellData[] = []
    let pending = ''
    let cellKind: NotebookCellKind = NotebookCellKind.Code
    const commitPending = (pendingKind: NotebookCellKind): void => {
      if (pending) {
        const text = pending.trim()
        if (text.length > 0) {
          notebookCellData.push(new NotebookCellData(pendingKind, `${text}`, pendingKind === NotebookCellKind.Markup ? 'markdown' : 'routeros'))
        }
        pending = ''
      }
    }
    lines.forEach((C) => {
      const c = C.trimEnd()
      // eslint-disable-next-line no-useless-escape
      if (c.match(/^#!([\/].*)?tikbook/)) {
        return
      }
      if (c.match(/^#.markdown/)) {
        commitPending(cellKind)
        cellKind = NotebookCellKind.Markup
        return
      }
      if (c.match(/^#[.]/)) {
        commitPending(cellKind)
        cellKind = NotebookCellKind.Code
        return
      }
      pending += cellKind === NotebookCellKind.Markup ? `${c.substring(3).trimEnd()}\n` : `${c.trimEnd()}\n`
    })
    commitPending(cellKind)
    return new NotebookData(notebookCellData)
  }
}

// MARK: kernel base

export abstract class TikbookControllerBase {
  controllerId: string // = 'tikbook';
  notebookType: string // = 'tikbook';
  label: string// = 'RouterOS (TikBook)';
  supportedLanguages = ['routeros']

  private readonly _controller: NotebookController
  private _executionOrder = 0
  dispose(): void {
    this._controller.dispose()
  }

  constructor(id: string, type: string, label: string) {
    this.controllerId = id
    this.notebookType = type
    this.label = label
    this._controller = notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label,
    )

    this._controller.supportedLanguages = this.supportedLanguages
    this._controller.supportsExecutionOrder = true
    this._controller.description = `RouterOS kernel with '${this.notebookType}' serializer`
    this._controller.executeHandler = this._execute.bind(this)
  }

  private async _execute(
    cells: NotebookCell[],
    _notebook: NotebookDocument,
    _controller: NotebookController,
  ): Promise<void> {
    let hasError = false
    for (const cell of cells) {
      if (hasError) {
        const execution = _controller.createNotebookCellExecution(cell)
        execution.start(Date.now())
        execution.end(false, Date.now())
        continue
      }
      const success = await this._doExecution(cell)
      if (!success) hasError = true
    }
  }

  private async _doExecution(cell: NotebookCell): Promise<boolean> {
    const execution = this._controller.createNotebookCellExecution(cell)
    execution.executionOrder = ++this._executionOrder
    execution.start(Date.now()) // Keep track of elapsed time to execute cell.

    const codeText = cell.document.getText()
    const outputItems: NotebookCellOutputItem[] = []

    try {
      /*
      const diagnostics = languages.getDiagnostics()
      diagnostics.map((alldiags) => {
        log.info(`Got ${alldiags[1].length} diags for '${alldiags[0]}`)
        alldiags[1].map((diag) => {
          log.info(`\t${diag.code}\t${diag.message}`)
          log.debug(`${diag}`)
        })
      })
      */

      // "print" is special to enable renders
      /*
      const restableCommands = codeText.split('\n').map(e =>
        // eslint-disable-next-line no-useless-escape
        /^[\s]*(?<path>[\/]([a-z]+[\/ ])+)(?<cmd>(print|get))[\s]*(?<args>(([\S]+=[\S]+|([a-z\-]+))[\s]*)*)/
          .exec(e))
        .filter(e => e?.groups)
      log.debug('<TikbookControllerBase> {_doExecution} processing any REST-able commands', restableCommands)
      // log.trace(JSON.stringify(restableCommands, null, 2))
      restableCommands.forEach((e) => {
        if (e.groups && e.groups?.args && e.groups.args.length > 0) {
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
      */

      const killswitch = new AbortController()
      let aborted = false
      execution.token.onCancellationRequested((e) => {
        killswitch.abort(e)
        aborted = true
        void execution.replaceOutput([
          new NotebookCellOutput([
            log.logLevel === LogLevel.Trace ? NotebookCellOutputItem.error(Error(e)) : NotebookCellOutputItem.stderr('request cancelled'),
          ]),
        ])
        execution.end(false, Date.now())
      },
      )
      const response = await client.default.run(codeText, killswitch.signal)

      // promote to JSON, if JSON
      let json
      try {
        json = JSON.parse(response)
      }
      catch { ; }
      if (typeof json === 'object') {
        outputItems.push(NotebookCellOutputItem.json(json))
      }
      else {
        if (response) {
          if (response.match(/^bad command.*/)
            || response.match(/^no such item.*/)
            || response.match(/^value of.*out of range.*/)
            || response.match(/^invalid value for argument.*/)
            || response.match(/^Script Error: .*/)
            || response.match(/^syntax error/)
            || response.match(/^expected end of command.*/)) {
            outputItems.push(NotebookCellOutputItem.stderr(response))
          }
          outputItems.push(NotebookCellOutputItem.text(response))
        }
      }
      if (outputItems.length > 0) {
        await execution.replaceOutput(new NotebookCellOutput(outputItems))
      }
      else {
        await execution.clearOutput()
      }
      let success = true
      if (outputItems.filter(e => e.mime.match(/application\/vnd.code.notebook.(stderr|error)/g)).length > 0) {
        success = false
      }
      if (!aborted) execution.end(success, Date.now())
      return success
    }
    catch (error) {
      log.error(`<TikbookControllerBase> {_doExecution} got exception`, error)
      await execution.replaceOutput([
        new NotebookCellOutput([
          NotebookCellOutputItem.error(error as Error),
        ]),
      ])
      if (!execution.token.isCancellationRequested) execution.end(false, Date.now())
      return false
    }
  }
}

// MARK: kernels

export class TikbookController extends TikbookControllerBase {
  static controllerId = 'tikbook'
  static notebookType = 'tikbook'
  static label = 'RouterOS TikBook'
  constructor() {
    super(TikbookController.controllerId, TikbookController.notebookType, TikbookController.label)
  }
}

export class RscController extends TikbookControllerBase {
  static controllerId = 'routeros'
  static notebookType = 'routeros'
  static label = 'RouterOS Script'
  constructor() {
    super(RscController.controllerId, RscController.notebookType, RscController.label)
  }
}

export class MarkdownController extends TikbookControllerBase {
  static controllerId = 'markdown-routeros'
  static notebookType = 'markdown-routeros'
  static label = 'Markdown RouterOS'
  constructor() {
    super(MarkdownController.controllerId, MarkdownController.notebookType, MarkdownController.label)
  }
}

export class ReplController extends TikbookControllerBase {
  static controllerId = 'interactive-tikbook'
  static notebookType = 'interactive'
  static label = 'RouterOS REPL'
  constructor() {
    super(ReplController.controllerId, ReplController.notebookType, ReplController.label)
  }
}

// "old" logic
// const markdownMark = "|";
// const codeEndMark = ".";
// const markdownMark = "|";
// const langid = "routeros";
// export class TikbookSerializer0 implements NotebookSerializer {
//   async deserializeNotebook(
//     content: Uint8Array,
//     _token: CancellationToken
//   ): Promise<NotebookData> {
//     const decoded: string[] | null = new TextDecoder(encoding)
//       .decode(content)
//       .replace('\r\n', '\n')
//       .replace(/^[\s\n]*/, '')  // Remove empty lines at start
//       .replace(/[\s\n]*$/, '')  // Remove empty lines at end
//       .replace(/[ \t]+$/gm, '') // Remove trailing whitespace from each line
//       .replace(/\n$/, '')      // Remove final newline
//       .split('\n');
//
//     const cells: NotebookCellData[] = [];
//     let pendingMarkup = "";
//     let pendingCode = "";
//
//     decoded.forEach((item, index) => {
//       const isMarkdown = item[0] === '#' && item[1] === markdownMark;
//       const isCodeEndMark = item[0] === '#' && item[1] === codeEndMark;
//       const isLast = index === decoded?.length - 1;
//
//       if (isCodeEndMark) {
//         cells.push(new NotebookCellData(NotebookCellKind.Code, pendingCode.trim(), langid));
//         pendingCode = "";
//         return;
//       }
//       if (isMarkdown) {
//         if (pendingCode.length > 0) {
//           cells.push(new NotebookCellData(NotebookCellKind.Code, pendingCode.trim(), langid));
//           pendingCode = "";
//         }
//         pendingMarkup += `${item.substring(3)}\n`;
//       } else { // isCode
//         if (pendingMarkup.length > 0) {
//           cells.push(new NotebookCellData(NotebookCellKind.Markup, pendingMarkup.trim(), "markdown"));
//           pendingMarkup = "";
//         }
//         pendingCode += `${item}\n`;
//       }
//       if (isLast) {
//         if (pendingMarkup.length > 0) {
//           cells.push(new NotebookCellData(NotebookCellKind.Markup, pendingMarkup.trim(), "markdown"));
//         }
//         if (pendingCode.length > 0) {
//           cells.push(new NotebookCellData(NotebookCellKind.Code, pendingCode.trim(), langid));
//         }
//       }
//     });
//     return new NotebookData(cells);
//   }
//   // ^(?'solmark'[#][\|])([ ](?'md'.*))?$ - find markdown
//   // (?'markup'^[#][\|][\s](?'md'.*$)?|$)|(^(?'eoc'[#][.]).*$)|^(?<!$[#][\|.])(?'code'^.*$)?$
//   async serializeNotebook(
//     data: NotebookData,
//     _token: CancellationToken
//   ): Promise<Uint8Array> {
//     const contents: string[] = [];
//     let lastCellType;
//     for (const cell of data.cells) {
//       cell.value = cell.value
//         .replace(/\r\n/, '\n')    // Convert Windows line endings
//         .replace(/^[\s\n]*/, '')  // Remove empty lines at start
//         .replace(/[\s\n]*$/, '')  // Remove empty lines at end
//         .replace(/[ \t]+$/gm, '') // Remove trailing whitespace from each line
//         .replace(/\n$/, '');      // Remove final newline
//       if (cell.kind == NotebookCellKind.Markup) {
//         cell.value
//           .split('\n')
//           .forEach(item => {
//             contents.push(`#${markdownMark} ${item}`);
//           });
//         contents.push('\n');
//         lastCellType = NotebookCellKind.Markup;
//       }
//       else {
//         if (lastCellType == cell.kind) {
//           contents.push(`#${codeEndMark}\n`);
//           contents.push(cell.value);
//         } else {
//           contents.push(cell.value);
//           lastCellType = cell.kind;
//           //contents.push('\n');
//         }
//       }
//     }
//
//     return new TextEncoder().encode(contents.join('\n').trim());
//   }
// }
