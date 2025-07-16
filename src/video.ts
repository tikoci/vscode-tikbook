import * as axios from 'axios'
import * as vscode from 'vscode'
import { ExtensionContext, Uri } from 'vscode'
import { log } from './shared'

export class VideoViewer {
  context: ExtensionContext

  static videoViewer
  static default(context) {
    if (VideoViewer.videoViewer) {
      log.trace('<VideoViewer> {default} accessed using cache')
      return VideoViewer.videoViewer
    }
    VideoViewer.videoViewer = new VideoViewer(context)
    log.trace('<VideoViewer> {default} created')
    return VideoViewer.videoViewer
  }

  constructor(context) {
    this.context = context
    this.activate()
  }

  activate() {
    log.trace('<VideoViewer> [activate]')
    this.context.subscriptions.push(
      vscode.commands.registerCommand('tikbook.test.video.embedded', async () => {
        log.trace('<VideoViewer> [tikbook.test.video.embedded] start')
        const panel = vscode.window.createWebviewPanel(
          'tikbookVideoViwer',
          'TikBook Video',
          vscode.ViewColumn.Two,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          },
        )
        const cspSource = panel.webview.cspSource

        async function makeWebviewUrl(url: string, raw = true) {
          if (raw) return panel.webview.asWebviewUri(Uri.parse(url))
          else {
            // unused, semi-avoided CORS, but not fully in VSCodeWeb
            const vtttext = (await axios.default.get(url)).data
            return Uri.parse(`data:text/vtt;charset=utf-8,${encodeURIComponent(vtttext)}`)
          }
        }

        const jsUrl = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.context.extensionUri, 'media', 'web', 'video.js'),
        )
        const video = panel.webview.asWebviewUri(vscode.Uri.parse('https://tikoci.github.io/media/videos/test/video.vscode.mp4'))
        const subtitles = await makeWebviewUrl('https://tikoci.github.io/media/videos/test/video.subtitles.en.vtt')
        const chapters = await makeWebviewUrl('https://tikoci.github.io/media/videos/test/video.chapters.en.vtt')
        const csp = `default-src data: 'self' ${cspSource} vscode-resource:; style-src 'unsafe-inline'; img-src 'self' ${cspSource} https: vscode-resource:; script-src ${cspSource} 'self' vscode-resource: https:; media-src data: 'self' ${cspSource} https: vscode-resource:;`
        panel.webview.html = this.generateHtmlPage(csp, jsUrl, video, subtitles, chapters)
        log.trace('<VideoViewer> [tikbook.test.video.embedded] done')
      },
      ),
    )
  }

  dispose() {
    log.trace('<VideoViewer> {dispose}')
  }

  generateHtmlPage(csp, jsUrl, videoUrl, subtitlesUrl, chaptersUrl) {
    log.trace('<VideoViewer> {generateHtmlPage}')
    log.trace(`<VideoViewer> .csp ${csp}`)
    log.trace(`<VideoViewer> .jsUrl ${jsUrl}`)
    log.trace(`<VideoViewer> .videoUrl ${videoUrl}`)
    log.trace(`<VideoViewer> .subtitlesUrl ${subtitlesUrl}`)
    log.trace(`<VideoViewer> .chaptersUrl ${chaptersUrl}`)
    return `<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MikroTik Player</title>
  <style>
  :root {
      /* Use VSCode's theme colors */
      --bg-color: var(--vscode-editor-background);
      --text-color: var(--vscode-editor-foreground);
      --accent-color: var(--vscode-textLink-foreground);
      --secondary-text: var(--vscode-descriptionForeground);
      --hover-color: var(--vscode-textLink-activeForeground);
      --font-mono: var(--vscode-editor-font-family);
      
      /* Fallbacks for older VSCode versions */
      --bg-color: var(--vscode-editor-background, #1e1e1e);
      --text-color: var(--vscode-editor-foreground, #cccccc);
      --accent-color: var(--vscode-textLink-foreground, #4fc3f7);
      --secondary-text: var(--vscode-descriptionForeground, #808080);
      --hover-color: var(--vscode-textLink-activeForeground, #74b9ff);
    }
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: var(--bg-color);
      color: var(--text-color);
      font-family: var(--font-mono);
    }

    videoold {
      position: absolute;
      top: 50%;
      left: 50%;
      max-width: 100%;
      max-height: 100%;
      transform: translate(-50%, -50%);
    }

    video {
      position: absolute;
      top: 0;                           /* Changed from 50% */
      left: 50%;
      max-width: 100%;
      max-height: 100%;
      transform: translate(-50%, 0);    /* Changed from translate(-50%, -50%) */
      background: var(--bg-color);
    }

    /* Subtitle styling */
    video::cue {
      font-family: var(--font-mono);
      font-size: 0.8em;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      padding: 0.2em 0.4em;
      border-radius: 2px;
    }

    video::cue(.narrator) {
      font-style: italic;
      color: #ccc;
    }

    .title,
    .chapter-selector {
      position: fixed;
      top: 16px;
      font-family: var(--font-mono);
      color: var(--text-color);
      font-size: 0.9em;
    }

    .title {
      left: 16px;
      text-align: center;
    }

    .chapter-selector {
      right: 16px;
    }

    .activeChapter {
      color: var(--accent-color) !important;
      font-weight: bold !important;
    }

    a {
      color: inherit;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    a:hover {
      color: var(--accent-color);
    }

    .videoStatsFooter {
      text-align: right;
      margin-top: 0.5em;
    }

    /* Ensure consistent styling across browsers */
    details summary {
      cursor: pointer;
      user-select: none;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 0.2em 0;
    }
  </style>
</head>

<body>
<div class="video-container">
  <video id="video" crossorigin=anonymous controls preload="metadata">
    <source src="${videoUrl}" type="video/mp4">
    <track type="subtitles" src="${subtitlesUrl}" srclang="en"
      label="Subtitles" default>
    <track id="chapters" type="chapters" src="${chaptersUrl}"
      srclang="en" label="Chapters">
  </video>
  <div class="title">
    <span><small>Scripting & APIs:</small> Trigger scripts with SMS</span>
  </div>
  <div class="chapter-selector">
    <details class="dropdown">
      <summary id="activeChapter" class="outline">...</summary>
      <ul id="chaptersList"></ul>
      <footer>
        <div class="videoStatsFooter">
          <small>
            <i>pos </i><span id="currentTime"></span><br>
            <span id="nextChapterTime"><i>next </i><span id="nextChapterTimeDiff"></span></span>
          </small>
        </div>
      </footer>
    </details>
  </div>
  </div>
</div>
<script src="${jsUrl}"/>
</body>

</html>`
  }
}
