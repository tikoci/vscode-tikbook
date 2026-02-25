import { DateTime } from 'luxon';
import type { CancellationToken, CodeLensProvider, ExtensionContext, OutputChannel, ProviderResult, TextDocument } from 'vscode';
import { CodeLens, commands, languages, Range, window } from 'vscode';
import { RouterRestClient } from './routeros';
import { log } from './shared';

export class MarkdownHandlers {
  static log: OutputChannel
  output: OutputChannel
  killswitch = new AbortController()
  constructor(context: ExtensionContext) {
    if (!MarkdownHandlers.log) {
      MarkdownHandlers.log = this.output = window.createOutputChannel('RouterOS Run', 'markdown')
    }
    else {
      this.output = MarkdownHandlers.log
    }
    context.subscriptions.push(
      languages.registerCodeLensProvider(
        { language: 'markdown' },
        new MarkdownCodeFenceCodeLensProvider(),
      ),
      commands.registerCommand('tikbook.markdown.routeros.run.block', async (codeContent: string, fileName: string, range: Range) => {
        log.info(`Run RouterOS from ${fileName}:${range.start.line}.  Check 'RouterOS Run' Output for results.`)
        const startTime = DateTime.now()
        this.output.appendLine(`## Run \`${fileName}\` ln ${range.start.line} at ${startTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}`)
        this.output.appendLine(`\`\`\`routeros`)
        this.output.appendLine(`${codeContent}`)
        this.output.appendLine(`\`\`\``)
        function timeTaken(): string {
          return DateTime.now().diff(startTime).toHuman({ unit: 'seconds', unitDisplay: 'short' })
        }
        try {
          const restout = (await RouterRestClient.default.run(codeContent, this.killswitch.signal))
          this.output.appendLine(`> Completed in ${timeTaken()}`)
          if (restout.trim().length > 0) {
            this.output.appendLine(`\`\`\``)
            restout.split('\n').forEach(e => this.output.appendLine(`  ${e}`))
            this.output.appendLine(`\`\`\``)
          }
          this.output.appendLine('')
        }
        catch (err) {
          const error = err as Error
          this.output.appendLine(`> ### **ERROR** in ${timeTaken()}`)
          if (error?.cause) this.output.appendLine(`**${error.cause}**`)
          error.toString()
            .split('\n')
            .forEach(e =>
              this.output.appendLine(`${e}`),
            )
          this.output.appendLine('')
        }
        this.output.show()
      }),
    )
  }

  dispose(): void {
    log.trace('<MarkdownHandlers> {dispose} invoked')
    this.killswitch.abort()
  }
}

// MARK: md provider

export class MarkdownCodeFenceCodeLensProvider implements CodeLensProvider {
  provideCodeLenses(document: TextDocument, _token: CancellationToken): ProviderResult<CodeLens[]> {
    const codeLenses: CodeLens[] = []
    const text = document.getText()
    const lines = text.split('\n')

    let inRunnableCodeBlock = false
    let codeBlockLanguage: string | null = null
    let codeBlockStartLine = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // ignore codelense for "embedded" in another code block
      // (to handle an "ignore" for blocks when running entire markdown)

      // Check for code fence start (e.g., ```routeros)
      const fenceStartMatch = line.match(/^\s*```(\S*)\s*$/)
      if (fenceStartMatch && !inRunnableCodeBlock) {
        const lang = fenceStartMatch[1]
        if (lang === 'routeros') { // Target specific language ID
          inRunnableCodeBlock = true
          codeBlockLanguage = lang
          codeBlockStartLine = i
        }
      }
      // Check for code fence end (```)
      else if (line.trim() === '```' && inRunnableCodeBlock) {
        if (codeBlockLanguage === 'routeros') {
          // We found a RouterOS code block
          // The CodeLens should appear at the start of the block
          const range = new Range(codeBlockStartLine, 0, codeBlockStartLine, line.length)

          // Extract the content of the code block
          const codeContentStartLine = codeBlockStartLine + 1
          const codeContentEndLine = i - 1 // The line before the closing fence
          const codeContentRange = new Range(codeContentStartLine, 0, codeContentEndLine, document.lineAt(codeContentEndLine).text.length) // Adjusted to correctly capture the end of the content
          const codeContent = document.getText(codeContentRange)

          codeLenses.push(new CodeLens(range, {
            title: '$(play) RouterOS Run',
            command: 'tikbook.markdown.routeros.run.block',
            arguments: [codeContent.trim(), document.fileName, range], // Pass the code content to the command
          }))
        }

        // Reset for the next potential code block
        inRunnableCodeBlock = false
        codeBlockLanguage = null
        codeBlockStartLine = -1
      }
    }
    return codeLenses
  }
}
