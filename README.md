### **TikBook** -  _a_ literate _way to work with RouterOS scripts in VSCode..._
_Currently in early/conceptual stages — feedback welcome!_

![screenshot-desktop](https://raw.githubusercontent.com/tikoci/vscode-tikbook/refs/heads/main/.github/screenshot-vscode-desktop.png)

**TikBook** is a VSCode extension that introduces **Notebook support** for MikroTik RouterOS scripts, providing a "notebook" environment for working with `.rsc` scripts in a more readable and modular format — combining Markdown and code cells.  TikBook is fully compatible with RouterOS scripts: TikBook files are valid `.rsc` files with a few special comment conventions.  If you're not familiar with notebooks, it is a way of mixing runnable code and text in the same document, see examples from other languages, like [Python's Jupyter](https://jupyter.org), [Julia's Pluto](https://plutojl.org), or [JavaScript's Observable](https://observablehq.com).  

> [!TIP] 
>
> Use TikBook alongside the [RouterOS LSP](https://marketplace.visualstudio.com/items?itemName=TIKOCI.lsp-routeros-ts) VSCode Extension for full syntax highlighting and diagnostics.


### Features
- ✍️ **Literate RouterOS scripting** using Markdown cells (`#|`) - embedded in `.rsc` files.
- 📚 **Notebook interface** for RouterOS scripts (`*.tikbook.rsc`), - compatible with native `.rsc` syntax.
- 🚀 **Run code cells** directly via the RouterOS REST API (using - `:execute as-string`), from within VSCode.
- 💾 **compatible** since `.tikbook.rsc` files are still valid - RouterOS scripts.
- 🌐 **VSCode for Web** support (limited, see CORS note).

### Quick Start

1. Install [TikBook for RouterOS](https://marketplace.visualstudio.com/items?itemName=TIKOCI.tikbook) from the VSCode Marketplace.
2. _Optional_ install the [RouterOS LSP](https://marketplace.visualstudio.com/items?itemName=TIKOCI.lsp-routeros-ts) for syntax support.
3. _Optional_ Configure RouterOS REST API settings under Settings > Extensions > TikBook for RouterOS to allow execution of scripts:
    * Open VSCode Settings (`Ctrl+,` or `Cmd+,`)
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
> Works with VSCode for Web — like https://github.dev - and can be installed by searching Extensions for "TikBook for RouterOS".
>
> With the extension you can edit and save - in VSCode for Web just like Desktop:  
> ![screenshot-web](https://raw.githubusercontent.com/tikoci/vscode-tikbook/refs/heads/main/.github/screenshot-vscode-web.png)
>
> TikBook runs in [VSCode for Web](https://github.dev), but cannot **execute** cells due to CORS restrictions - only **editing**.  RouterOS does not support the required preflight (`OPTIONS`) headers to enable CORS to work in VSCode for Web.  One potential workaround is using a local reverse proxy (e.g. Traefik, see MikroTik Forum for details) to inject proper CORS headers when routing REST requests – but works to enable "Run" in VSCode for Web with TikBook.



> [!TIP]
>
> Both "Known Issues" and a per-version "Changelog" (as well as future feature tracking) are now in [`CHANGELOG.md`](https://github.com/tikoci/vscode-tikbook/blob/main/CHANGELOG.md) which tracks the _current_ state of affairs for `vscode-tikbook`.


### Available Features

#### RouterOS Quick Commander Menu
  - Provide a "menu tree" of TikBook features and help – many of other feature described here can be invoked from the "Quick Commander"
  - Built-in keymapping provide access via <kbd>**Shift**</kbd>+<kbd>**Option**</kbd>+<kbd>**M**</kbd> (with <kbd>Alt</kbd> `==` <kbd>Option</kbd>) _and customizable by user in VSCode Keymapping Settings_
  - Various website and are linked, including links to other TIKOCI projects on GitHub and Mikrotik-specific sites.

#### Take Actions on connected RouterOS device
  * Insert Global Variable
  * Insert Interface Name
  * Run System Script
  * Show (:export) Configuration
  * Show Default Configuration

#### Status Bar Watchdog
  - On bottom right of VS Code, a `StatusBar` item appears indicating the connection status to RouterOS.  `Error` state (typically "red" but follows VS Code theme) means disconnection a connection check failed, and will only get cleared by a success REST API call.  `Warning` (yellow) state indicates _some_ REST API error occurred
#### Using Keychain‡ for RouterOS Password
  - Technically, TikBook uses VSCode's `SecretStore` which indirect uses the OS-specific secure password storage.
  - The RouterOS password can be set using the Quick Commander menu, or in Setting by using "Set Secret" link.  
  - With multiple routers that use _different_ passwords, the secret must be set again for a new connected router.  Their is only one secret.

#### Markdown Integration
  - TikBook support using a plain `.md` file as a file format.  So you can use the TikBook Editor just as if it was a "regular" TikBook.  Any changes are save into ` ```routeros ` code blocks (described below).
  - When editing **any `markdown` file** in VSCode, a **Run RouterOS** option will appear above any ` ```routeros ` code blocks inside the normal editor.  When a Markdown ` ```routeros ` block is run, the results will be appear in the "Outputs" which is displayed automatically on first run.  Output is formatted  as `markdown` to allow for easy cut-and-paste back into a Markdown file.

#### Watch MikroTik Help Videos inside VSCode
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
/user/group add name=list policy=read,api,rest-api
/user add name=lsp password=changeme group=lsp
```

On the router, either the "www" or "www-ssl" service must be enabled, and accessible to any editor using the TikBook.  _Firewall configuration may need to be adjusted too, specific to your environment._

By default on RouterOS, only unsecured HTTP access is enabled.  To enable HTTPS if not already enabled, use:
```
/certificate/enable-ssl-certificate 
/ip/service enable www-ssl
```
_TikBook for RouterOS also defaults to plain HTTP, so TikBook configuration needs to change from http:// to https://_ too._

Also, when using "https://" (TLS), the certificate chain must be valid on the local system – self-signed certificates may not work.  And, TikBook has **no** "allow unsafe certificates" option, so the router TLS certificate (CAs and intermediates) must be installed via OS into the system's "keychain" (certificate store).

> [!TIP]
> A virtual machine can be used with the "free" version of RouterOS's "CHR" as the `baseUrl`.  This approach avoids storing any "real" router's password in the TikBook configuration.  
>
> For Mac, UTM can be used as the host, and tikoci's "mikropkl" has ready-to-use images that bring up RouterOS CHR in a few steps, see [tikoci/mikropkl](https://github.com/tikoci/mikropkl) for details. 

## _Draft_ Serialization Schemes

TikBook is built on plain `.rsc` files.  But exactly _how_ notebook content _could_ be rendered as RouterOS script file is a WIP.

The current version tries a new scheme, both appear identical in the VSCode's notebook interface.  But based on the file extension, the "saved" format be different.  This allows a "markup first" or "script first" rendering of the notebook for different needs.  For example, `.rsc.md` could be used to create a forum.mikrotik.com posting.  While `.md.rsc` could be used to document and test a script used to configuration a router.   

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


Notebooks support "metadata" and saving "outputs", neither are supported today. 

Concept for output of a code cell is to use `#=` at start of line to indicate the start of saved output, followed `>` for "well known" type like `json`.  Plain text is assumed so marker is just `#=>`.  For fully-qualified mime types,`#=>>data/random`.  Like `#.markdown`, output is assumed to start on column 3.  An example:
```
/system/identity/print
#=>
#  name: bigdude
#=>json
#  { "name": "bigdude" }
#=>>application/html
#  <span>name: <pre>bigdude</pre></span>
```

For metadata, current thinking is something like: `#<> attr1=val1 attr2=value`


### `.rsc.md`

This is the "reverse" format, so ` ```routeros ` marks a code cell - all other ` ```any-other-lang ` blocks and texts is assumed to be Markdown.  In a notebook, RouterOS code fence blocks are treated as a "Code" cell.  Markdown broken up into cell with any RouterOS script blocks being a divider.  

The only "special" support for a "Markdown First" TikBook notebook is the equivalent of the `#.` cell separator from `.md.rsc`/`.tikbook` file.  In Markdown, it uses the unofficial "comment", _or more specifically a fake footnote_ for this purpose:
```
[//]: #.
```
is will create a "cell break" when viewed as a TikBook.  _RouterOS code fence blocks automatically break the markdown text at the point of the RouterOS code.

While none today, any persisted metadata _could_ be encoded inside `( )` in same form as `#.` but the parenthesis are needed to be "compatible" with Markdown-It used by VSCode and Discourse.
```
[//]: #. (.. key=val .. key=value...)
```

Notebooks support a "Run All Cells" and **all** ` ```routeros ` block will get run.  If you wanted to exclude a block from consideration as a "runnable" cell.  You can move the code to a Markdown cell and use the alternative code block marker ` ~~~routeros `.

"Markdown First" TikBook have an additional feature where if you view the Markdown as a VS Code `TextDocument` – or any `.md` file – a "Run RouterOS" link will appear above any ` ```routeros ` code blocks.


### **Retiring** `*.tikbook.rsc` Spec

> [!NOTE]
>
> This is the original scheme/idea.  However, it's both a PITA to parse, nor flexible, nor easily to write _outside_ of notebook.  

| Prefix | Purpose |
|--------|---------|
| `#|`   | Markdown content (rendered as text cells) |
| `#.` | Cell break / metadata marker |
| `#>` | Output capture (future) |

All other content is treated as RouterOS script. Examples:

```rsc
#| ## Configure VLANs
#| This cell sets up **VLAN** interfaces.

/interface vlan
add name=vlan10 vlan-id=10 interface=ether1
add name=vlan20 vlan-id=20 interface=ether1

#. cell:metadata
```

TikBook files are UTF-8 encoded and use `\n` newlines (normalized on save).

The default extension is `*.tikbook.rsc`, which is used to trigger VSCode's Notebook interface and use this extension.  But the end `.rsc` allows the same script to work with "RouterOS LSP" and other syntax colorizers that recognize the `*.rsc` as RouterOS script — since a TikBook is still a valid `.rsc`. 

> Using `*.tikbook` as the extension - without `rsc` - is also accepted by the extensions.  However, the "two-level naming" allows editors, other than VSCode, to trigger on RouterOS syntax since most map `*.rsc` to RouterOS.

While starting from a single `rsc` script file, TikBook parses the script to break it up into individual "notebook cells".  The "trick" – and what makes a normal `.rsc` also a TikBook is it uses a few special `#` comments:
  * `#| ` at start of line is to store Markdown text in a regular `rsc` script since the marker is still a comment in RouterOS — but TikBook uses it to render Markdown in the VSCode Notebook.  There is always a space after `#| ` to keep `md` readable when viewed as a plain script file.
  * `#.` at start of line is used to separate a RouterOS script into two notebook cells.  `#|` automatically splits script code into cells, so the `#.` is **not** always needed since Markdown can be used. Text after `#.` is allowed, but reserved for use by TikBook to store notebook metadata.
  * `#>` at start of line is used to, optionally, store outputs from a notebook run - so the _results_ can be persisted and viewed later.  _Future_ 

With specific rules on formatting:
* Any whitespace is presumed to be part of a code cell, with either Markdown `#|` or Meta `#.` separating RouterOS script code into different cells.
* TikBook newlines are always use `\n`, even if original uses `\r\n` those are to preserved when saving.  `\r\n` is allowed as input, but on save they will converted to `\n`.
* TikBook files use UTF-8 encoding.  

> [!NOTE]
>
> "Rules" for serialization of whitespace get tricky and opinionated.  Currently, all whitespace is stored with code and presented as-in in Notebook.  But open question is whether whitespace be added before and after any "special comments" when serializing (saving) to allow "pretty" output in the `rsc` script.  But since when deserialized (loading) into Notebook, the same leading/ending whitespace is not "pretty" as there is already a bounding box and controls around the script code in Notebook.  So a `trim()` on loaded cells is likely desirable in the future while still keeping whitespace when saved.  

### TypeScript Implementation

The TikBook code is in [`tikoci/vscode-tikbook` on GitHub](https://github.com/tikoci/vscode-tikbook).  It uses Microsoft's [TypeScript library for VSCode extensions](https://code.visualstudio.com/api/get-started/your-first-extension).  These are then bundled by [`bun`](https://bun.sh) into "-web" and "-node" (desktop) targets since packaging TypeScript varies between normal VSCode and VSCode for Web.  The implementation is largely based on the framework from [RouterOS LSP project](https://github.com/tikoci/lsp-routeros-ts), and that project has more details on "developing" VS Code extensions.

TikBook is built using the official [VSCode Notebook API](https://code.visualstudio.com/api/extension-guides/notebook) and the TypeScript extension framework from [RouterOS LSP](https://github.com/tikoci/vscode-routeros-lsp).  See Microsoft's [Your First Extension]([TypeScript library for VSCode extensions](https://code.visualstudio.com/api/get-started/your-first-extension) for basic background on structure.


> #### Disclaimers
> **Not affiliated, associated, authorized, endorsed by, or in any way officially connected with MikroTik, Apple, nor UTM from Turing Software, LLC.**
> **Any trademarks and/or copyrights remain the property of their respective holders** unless specifically noted otherwise.
> Use of a term in this document should not be regarded as affecting the validity of any trademark or service mark. Naming of particular products or brands should not be seen as endorsements.
> MikroTik is a trademark of Mikrotikls SIA.
> Apple and macOS are trademarks of Apple Inc., registered in the U.S. and other countries and regions.
> **No liability can be accepted.** No representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information is offered.  Use the concepts, code, examples, and other content at your own risk. There may be errors and inaccuracies, that may of course be damaging to your system. Although this is highly unlikely, you should proceed with caution. The author(s) do not accept any responsibility for any damage incurred. 