### **TikBook** -  _a_ literate _way to work with RouterOS scripts in Visual Studio Code..._
_Currently in early/conceptual stages — feedback welcome!_

![screenshot-desktop](https://raw.githubusercontent.com/tikoci/vscode-tikbook/refs/heads/main/.github/screenshot-vscode-desktop.png)

**TikBook** is a Visual Studio Code extension that introduces **Notebook support** for MikroTik RouterOS scripts, providing a "notebook" environment for working with `.rsc` scripts in a more readable and modular format — combining Markdown and code cells.  TikBook is fully compatible with RouterOS scripts: TikBook files are valid `.rsc` files with a few special comment conventions.  If you're not familiar with notebooks, it is a way of mixing runnable code and text in the same document, see examples from other languages, like [Python's Jupyter](https://jupyter.org), [Julia's Pluto](https://plutojl.org), or [JavaScript's Observable](https://observablehq.com).  

> [!TIP] 
>
> Use TikBook alongside the [RouterOS LSP](https://marketplace.visualstudio.com/items?itemName=TIKOCI.lsp-routeros-ts) VS Code Extension for full syntax highlighting and diagnostics.  The RouterOS LSP will be installed along with TikBook automatically.


### Quick Start

1. Install [TikBook for RouterOS](https://marketplace.visualstudio.com/items?itemName=TIKOCI.tikbook) from the Visual Studio Code Marketplace.
2. _Optional_ install the [RouterOS LSP](https://marketplace.visualstudio.com/items?itemName=TIKOCI.lsp-routeros-ts) for syntax support.
3. _Optional_ Configure RouterOS REST API settings under Settings > Extensions > TikBook for RouterOS to allow execution of scripts:
    * Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
    * Search for “TikBook for RouterOS”
    * Set:
      * _Base URL_ - like `http://192.168.88.1` - no trailing `/` or paths - or use `https://192.168.88.1:12345` for non-standard port
      * _Username_ - with at least `read,api,rest-api` permissions
      * _Password_ 
    > _No RouterOS REST API configuration or access is needed for only editing/saving — only for cell execution ("Run").  See Security Consideration below for more details on setup._
4. Create a new file with the `.tikbook.rsc` extension — Notebook UI will appear.
5. Run code cells or edit Markdown descriptions as desired.




> [!TIP]
>
> Works with VS Code for the Web — like https://github.dev - and can be installed by searching Extensions for "TikBook for RouterOS".
>
> With the extension you can edit and save - in VS Code for the Web just like Desktop:  
> ![screenshot-web](https://raw.githubusercontent.com/tikoci/vscode-tikbook/refs/heads/main/.github/screenshot-vscode-web.png)
>
> TikBook runs in [Visual Studio Code for the Web](https://github.dev), but cannot **execute** cells due to CORS restrictions - only **editing**.  RouterOS does not support the required preflight (`OPTIONS`) headers to enable CORS to work in VS Code for the Web.  One potential workaround is using a local reverse proxy (e.g. Traefik, see MikroTik Forum for details) to inject proper CORS headers when routing REST requests – but works to enable "Run" in VS Code for the Web with TikBook.



> [!TIP]
>
> Both "Known Issues" and a per-version "Changelog" (as well as future feature tracking) are now in [`CHANGELOG.md`](https://github.com/tikoci/vscode-tikbook/blob/main/CHANGELOG.md) which tracks the _current_ state of affairs for `vscode-tikbook`.


### Available Features

#### One notebook interface, two formats

TikBook works with **both** `.rsc` files and `.md` files.  Both render into same Visual Studio Code Notebook interface, mixing RouterOS code with Markdown text, with ability to run "cells" individually, or "Run All.  TikBook offers various converts to between the `.rsc.md` and `.rsc.md` file formats, including view notebook as plain RouterOS script or Markdown preview.  


#### RouterOS Quick Commander Menu
  - Provide a "menu tree" of TikBook features and help – many of other feature described here can be invoked from the "Quick Commander"
  - Built-in keymapping provide access via <kbd>**Shift**</kbd>+<kbd>**Option**</kbd>+<kbd>**M**</kbd> (with <kbd>Alt</kbd> `==` <kbd>Option</kbd>) _and customizable by user in VS Code Keymapping Settings_
  - Various website and are linked, including links to other TIKOCI projects on GitHub and Mikrotik-specific sites.

#### Take Actions on connected RouterOS device
  * Run System Script
  * Show (:export) Configuration
  * Insert Global Variable
  * Show Default Configuration
  * Export interface, connection, and DHCP leases as CSV

#### Status Bar Watchdog
  - On bottom right of VS Code, a `StatusBar` item appears indicating the connection status to RouterOS.  `Error` state (typically "red" but follows VS Code theme) means disconnection a connection check failed, and will only get cleared by a success REST API call.  `Warning` (yellow) state indicates _some_ REST API error occurred

#### Using Keychain‡ for RouterOS Password
  - Technically, TikBook uses VSCode's `SecretStore` which indirect uses the OS-specific secure password storage.
  - The RouterOS password can be set using the Quick Commander menu, or in Setting by using "Set Secret" link.  
  - With multiple routers that use _different_ passwords, the secret must be set again for a new connected router.  Their is only one secret.

#### Markdown Integration
  - TikBook support using a plain `.md` file as a file format.  So you can use the TikBook Editor just as if it was a "regular" TikBook.  Any changes are save into ` ```routeros ` code blocks (described below).
  - When editing **any `markdown` file** in VSCode, a **Run RouterOS** option will appear above any ` ```routeros ` code blocks inside the normal editor.  When a Markdown ` ```routeros ` block is run, the results will be appear in the "Outputs" which is displayed automatically on first run.  Output is formatted  as `markdown` to allow for easy cut-and-paste back into a Markdown file.

#### Watch MikroTik Help Videos inside VS Code
  - Experimental and basic but shows a few videos _[specifically ones using MP3 for audio stream in MP4 container]_ from _[CORS-enabled]_ web server as window in VSCode. 
  - While not implemented, their are variety of "interactive" things possible with VSCode embedded video possible.  Currently, video player has a "chapter selector" as an early test on the mechanics and verify the plumbing.

#### JSON to RouterOS Array Conversion
  - In **any** `JSON` file that's loaded, a button will appear in editor's to bar.  The button can be used to convert JSON into RouterOS array for use in a script.  If nothing is selected, the entire `JSON` document will be copied to the clipboard as a RouterOS array.  If only a portion is select, only that part will be put on to the clipboard.
  - Only strings and numbers are supported for conversion currently, but not RouterOS connection is needed for the conversion. 
  - Conversion **to JSON** is one-way.  There is **no** _direct_ RouterOS Array to JSON but their is `[:serialize to=json]` available to notebooks that be more exact and consistent.  

### Security Considerations

If you do not want to "Run" a TikBook, you technically do not need a RouterOS account configured.  In this mode, scripts are still visualized in Markdown in the Notebook interface and be edited and saved too.  


TikBook for RouterOS does not strictly need "write" or "sensitive" policies.  To create one with the minimum, use:
```
/user/group add name=restread policy=read,api,rest-api
/user add name=tikbook password=changeme group=restread
```

On the router, either the "www" or "www-ssl" service must be enabled, and accessible to any editor using the TikBook.  _Firewall configuration may need to be adjusted too, specific to your environment._

By default on RouterOS, only unsecured HTTP access is enabled.  To enable HTTPS if not already enabled, use:
```
/certificate/enable-ssl-certificate 
/ip/service enable www-ssl
```
_TikBook for RouterOS also defaults to plain HTTP, so TikBook configuration needs to change from http:// to https://_ too._

Also, when using "https://" (TLS), the certificate chain must be valid on the local system.  TikBook has an option to allow untrusted certificates, if needed.  This requires using `fallback` in VS Code's `http.proxySupport` setting to work, see TikBook Settings in VS Code.

> [!TIP]
> A virtual machine can be used with the "free" version of RouterOS's "CHR" as the `baseUrl`.  This approach avoids storing any "real" router's password in the TikBook configuration.  
>
> For Mac, UTM can be used as the host, and tikoci's "mikropkl" has ready-to-use images that bring up RouterOS CHR in a few steps, see [tikoci/mikropkl](https://github.com/tikoci/mikropkl) for details. 

## _Draft_ Serialization Schemes

TikBook is built on plain `.rsc`, and supports `.md` too, files – so there are **two** serialization schemes in use.  One for RouterOS script, which use comments to store Markdown, with all other lines assumed to be script.  The other serializer is for Markdown, which looks for code block. 

Both serialization format appear **identical** in the VS Code's notebook interface.  But based on the file extension, the "saved" format be different.  This allows a "markup first" or "script first" rendering of the notebook for different needs.  For example, `.rsc.md` could be used to create a forum.mikrotik.com posting.  While `.md.rsc` could be used to document and test a script used to configuration a router.   

### `.md.rsc`

All text is assumed to be RouterOS script, with any markup or output encoded into a RouterOS comment.  

`#.\n` token is used to separate code, markup, or output different cells.

`#.`_<type>_ on a line indicate the _start_ of "markup" cell, with _<type>_ `=== markdown` today.   

Non-script content also begins on column 3 with a preceding comment to keep it valid `rsc`:
```
#.markdown
#  # TikBook `.md.rsc` Example
#.
/ip/address/print
#.
/ip/route/print
#.markdown
#  > In a notebook, the output of a "print" is also rendered as JSON
#.
```

> Notebooks support "metadata" and saving "outputs", neither are supported today.  Both saving outputs and metadata are not specified nor implemented.


### `.rsc.md`

This is the "reverse" format, so ` ```routeros ` marks a code cell - all other ` ```any-other-lang ` blocks and texts is assumed to be Markdown.  In a notebook, RouterOS code fence blocks are treated as a "Code" cell.  Markdown broken up into cell with any RouterOS script blocks being a divider.  

The only "special" support for a "Markdown First" TikBook notebook is the equivalent of the `#.` cell separator from `.md.rsc`/`.tikbook` file.  In Markdown, it uses the unofficial "comment", _or more specifically a fake footnote_ for this purpose:
```
[//]: #.
```
is will create a "cell break" when viewed as a TikBook.  _RouterOS code fence blocks automatically break the markdown text at the point of the RouterOS code.

While none today, any persisted metadata _could_ be encoded inside `( )` in same form as `#.` but the parenthesis are needed to be "compatible" with Markdown-It used by VS Code and Discourse.
```
[//]: #. (.. key=val .. key=value...)
```

Notebooks support a "Run All Cells" and **all** ` ```routeros ` block will get run.  If you wanted to exclude a block from consideration as a "runnable" cell.  You can move the code to a Markdown cell and use the alternative code block marker ` ~~~routeros `.

"Markdown First" TikBook have an additional feature where if you view the Markdown as a VS Code `TextDocument` – or any `.md` file – a "Run RouterOS" link will appear above any ` ```routeros ` code blocks.


### TypeScript Implementation

The TikBook code is in [`tikoci/vscode-tikbook` on GitHub](https://github.com/tikoci/vscode-tikbook).  It uses Microsoft's [TypeScript library for VS Code extensions](https://code.visualstudio.com/api/get-started/your-first-extension).  These are then bundled by [`bun`](https://bun.sh) into "-web" and "-node" (desktop) targets since packaging TypeScript varies between VS Code for Desktop and VS Code for the Web.  The implementation is largely based on the framework from [RouterOS LSP project](https://github.com/tikoci/lsp-routeros-ts), and that project has more details on "developing" VS Code extensions.

TikBook is built using the official [Visual Studio Code Notebook API](https://code.visualstudio.com/api/extension-guides/notebook) and the TypeScript extension framework from [RouterOS LSP](https://github.com/tikoci/vscode-routeros-lsp).  See Microsoft's [Your First Extension]([TypeScript library for VS Code extensions](https://code.visualstudio.com/api/get-started/your-first-extension) for basic background on structure.

Internally, it use two libraries `axios-http` (REST client) and `luxon` (for human dates).


> #### Disclaimers
> **Not affiliated, associated, authorized, endorsed by, or in any way officially connected with MikroTik, Apple, nor UTM from Turing Software, LLC.**
> **Any trademarks and/or copyrights remain the property of their respective holders** unless specifically noted otherwise.
> Use of a term in this document should not be regarded as affecting the validity of any trademark or service mark. Naming of particular products or brands should not be seen as endorsements.
> MikroTik is a trademark of Mikrotikls SIA.
> Apple and macOS are trademarks of Apple Inc., registered in the U.S. and other countries and regions.
> **No liability can be accepted.** No representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information is offered.  Use the concepts, code, examples, and other content at your own risk. There may be errors and inaccuracies, that may of course be damaging to your system. Although this is highly unlikely, you should proceed with caution. The author(s) do not accept any responsibility for any damage incurred. 