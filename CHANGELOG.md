
## Known Issues

* Early builds & conceptional to get feedback on _some_ "RouterOS Notebook" format. 
* After a notebook "cell run", errors are detected using regular expressions.  Problem is _full_ set of error strings is _unknown_.  As a result, some error may be shown as successful in UI, but not.
* In a `markdown-routeros` notebook ("Markdown First", _i.e._ TikBook serialized to markdown using ` ```routeros `  for code view), syntax coloring does not work.
* Typically, a notebook allow saving each cell's "outputs" to the notebook file on disk.  Currently saving outputs is unimplemented; however, is planned as an option.  
* More user settings needed to control internal and enable/disable UI elements.  Currently hardcoded.

## Changelog

### 0.5.0

_Same as 0.4.0.  To enable future development without breaking "stable".  Added "Preview" and "Pre Release" flags_

### 0.4.0

_Bumped v0.3.3. Removed "Preview" and "Pre Release" flags in Extension Marketplace_

#### Fixes

* Minor dependancy changes, including `axios`

### 0.3.3

#### Changes

* Updated dependencies based on `bun audit` failures

#### Fixes

* Minor lint fixes to provide original exception when re-throwing

### 0.3.2

#### Changes

* Rewritten README.md to better cover features and setup/troubleshooting
* Add titles and corrected verbage in a few "Quick Commander" menus
* Corrected preview/open-as icons to match between `.md` and `.rsc`

#### Fixes
* Set max value for `apiTimeout` to 60 to match RouterOS
* Updated deps to fix npm audit issues 


### 0.3.1

> New "TikBook" file formats.  Previous `0.3.x` and before will need to be manually updated to support the new notebook formats. _Open GitHub [issue](https://github.com/tikoci/vscode-tikbook/issues) if you need help._

#### Changes

* New **serialization schemes**: `tikbook` and `markdown-routeros` – both present same notebook view.  However, when open/saved the file format is different.  If a file ends in `.rsc.md` (or `.rscmd`), the notebook is samed as a "normal" markdown files, using ` ```routeros ` to store code blocks.  If a file ends in `.md.rsc` (or `.tikbook`), the file is saved a normal `.rsc` that usable on RouterOS as-is (just with `#.markdown` sections with notebook markup text).
* RouterOS can use **VS Code's `SecretStore`** for the RouterOS password, as alternative to `settings.json`.  Settings UI provides links to control it, which uses the command bar to provide it to VS Code's built-in secrets support.  If there is no secret, the plain text password in `settings.json` is used.  `username` and `baseUrl` remain as normal Settings in all cases.
* New **VS Code Status Bar** as a "watchdog" to show "connected" status, router details, as well invoking "command menu" and alerting (VS Code's "notifications") on issues.  Overall, error handling is substantially improved.
* In _any_ `markdown` file, TikBook adds _RouterOS Run_ above any markdown code blocks marked with ` ```routeros `. This will run the "code fence block" using the connected router.  When run, it uses an VS Code "Output" panel, _Markdown RouterOS_, to show the results.  Output is formatted as `markdown` to allow testing and "cut-and-paste" output.  
  * _see "Known Issues" with syntax coloring and markdown preview.
* Content menu for `JSON` file to "Copy as RouterOS Array" - which converts selected JSON in VS Code to RouterOS array type and adds to clipboard.
* Context menu for any text file to copy text and escape any unicode or disallowed characters to form a RouterOS string type and adds to clipboard.
* Add support to launch SSH session to connected router and appear in VS Code's Terminal panel.  Authentication is handled by `ssh`, the extension merely launches it, so if you have private key configurated, than it should just connect; otherwise, you may get prompted for `ssh` password (if allowed by RouterOS settings).
* Experimental: Added VS Code video player with full WebVTT support (chapters, subtitles, metadata) to test concept and compatibility
* `rscena:` Virtual read-only text documents support.  Used to present a read-only view of `:export`, `/system/scripts`, as well as previewing various notebook formats. _`rscena:` is the URI protocol for TikBook's virtual document generator, with `-ena` stem meaning "shadow" in Latvian_
* Removed non-functional "walkthrough", plan to re-introduce later with better content


#### Fixes
* Added ESLint, changed tsconfig.json to match RouterOS LSP, workspace extension recommenations, cleanup of debugger tasks, modularized main extension initialization
* Added many commands and menus (see changes)
* CodeLens support for "RouterOS Run" in markdown 
* Uses `context.secret` to override the password in `settings.json` using VS Code's built-in secret storage (which is backed by OS credential storage like Apple Keychain)

>  **_REST-able commands_**
>
> One subtle feature is some cells will make a "direct" REST API call to get JSON data, plus the "normal" text output of a command. All cells are run using RouterOS's `:execute as-string script="<notebook-cell-code>"`, but if the last command is `print`, that "special" today.  And, the use of a `print` will add an  _additional_ cell output, in JSON, that VSCode "Renderers" to present tables or other UI to manipulate the returned RouterOS data.  The command path must be "fully qualified", like `/ip/address/print`, **not** complex expressions (e.g. `/ip/address { ...some code...; print })` for this to work.  But idea is _more_ expressions could be completed with a "standard" REST in future — just the code/logic belongs in [RouterOS LSP](https://github.com/tikoci/lsp-routeros-ts).  For example, if a cell was **only** a "path", notebook could execute it as a `GET`, similar for _some_ `POST` like `print` and `monitor` – which get JSON output.  _Or potentially an `:execute` with a `:put [:serialize to=<json|dsv>  [<notebook-cell-code>]]`_



> 0.2.x skipped, preserving "even minor" versions for versions **not** marked `--prerelease` 

### 0.1.9

#### Changes
* Add "RouterOS LSP" and "Data Table Renderers" as recommended associated extensions.

#### Fixes
* Cleanup of TikBook parsing code to avoid extra newlines being generated on save

### 0.1.8

#### Changes
* With a CORS proxy setup _somewhere_, VSCode for Web can run script.

#### Fixes
* [VSCode for Web] Use withCredentials in Axios calls to REST API 

### 0.1.7

#### Changes
* Allow TikBook to work on fully on desktop, including run scripting (introduced 0.1.5) but _all_ work in "VSCode for Web"

#### Fixes
* Build and publish "web" target separate from "all others", to allow `--target node` to be used for desktop, which bypasses CORS on desktop


### 0.1.6
_Ephemeral_

### 0.1.5

#### Changes
* Extension is listed and installs on _VSCode for Web_ but will not run in desktop nor web (see CORS below)

#### Fixes
* _Attempted_ fix, using `--target=browser` not `--target=node` in `package.json`
  * Which mean changes to build, since --target=node if desired on desktop, CORS is enforced.
* Remove nascent `package-lock.json`

### 0.1.4

#### Changes
* Initial to enabled for "VSCode for Web"

#### Fixes
* Add `browser` to `package.json` & removed `main`

### 0.1.3

#### Changes
* Checkin and build in GitHub

#### Fixes
* Copied base code and infra from `tikoci/lsp-routeros-ts`

> Prior builds were not on GitHub


## Technical Debt
* Some functionality should move to [RouterOS LSP] to avoid **both** avoid duplication, allow non-VSCode LSP clients to use "RouterOS Notebook" features.  e.g.:
  * `workspace/executeCommand` should run cells, via LSP
  * Diagnostic "Hints" from LSP could be used to detect _REST-able commands_, and TikBook _could_ get JSON or CSV from a cell. Currently TikBook has it own sloppy/incomplete logic looking for a `print` with RegEx – but the LSP already has token to calculate. 
* VSCode for Web will load/save TikBook, but it will not be able to run any scripts — this requires CORS support, which RouterOS lacks.  Possible to use "CORS Proxy", but not documented.
* LSP works for completion and highlighting errors on "routeros notebook cells", however it does not add any found errors to the "Problems" panel - but should.
* `markdown-routeros` needs LSP support for "embedded languages"
 Some minor issues – with syntax colors – however...
  * No RouterOS syntax coloring when in markdown editor, so `.md` file will show it uncolored.
    > RouterOS LSP needs support for "embedded languages".  This is more complex, since VS Code does not "automatically" wireup the blocks to an LSP server. Basically RouterOS LSP extension client, needs both grammars and custom "proxy" to wireup the grammars to LSP.  See VS Code docs on [embedded languages]().
  * While colors are present in Markdown's "Preview" window for ` ```routeros ` blocks, the coloring does not use **any** VS Code provided.  Instead, it uses _some_ JS library to do coloring.
    > So even if with "embedded RouterOS" support, the coloring in preview _still_ be wrong.  More research needed, but there are schemes to "hook" the preview window to "fix" the colors.
* Support internalization files for string.  While only English is planned, having all the strings in one places just makes editing text easier & code cleaner.  _And, if community members wanted to translate, it be easy to support alterative languages — although not many user strings & RouterOS is still only English_
* VS Code custom `when` context needed to know if connected, this allow different wording/menus/etc. based on if RouterOS is online.  For example, menu could hide "show" options in menus.
