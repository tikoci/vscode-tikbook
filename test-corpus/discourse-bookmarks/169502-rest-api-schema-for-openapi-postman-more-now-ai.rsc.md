[//]: #!tikbook discourse-bookmark topic=169502

# REST API schema for OpenAPI, Postman & more, now AI

- Source thread: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/1](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 12 total (topic bookmark)
- Posts included: 9
- First bookmarked: `2025-06-16 20:39:17 UTC`
- Last bookmarked: `2025-06-16 20:39:17 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/1](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/1)
- Created: `2023-09-11T03:20:42.000Z`
- Likes on this post: 0

While not "scripting",  I had a JavaScript implementation that using /system/console via REST to generate a [RAML 1.0 scheme](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md).  I just hadn't written it up here, so here it is.

It isn't exactly 100%, perhaps 90%.  e.g.
- especially the arguments – and like ChatGPT – it may make a few — but most should work, especially POST ones.
- in most cases, it it's NOT picky on types – most are marked an "any".
- there BUGS in /console/inspect using request=syntax – some crash so not a lot of "syntax" data is used
- has all packages, except calea
- return attributes are "inexact" – it just marked as "any" JSON
- arguments are generally list (perhaps not in all cases), but again types are "any"
- since it's automatically generated, there are no "examples" or "documentation" in schema – just endpoints and args
- GET is not fully specified for root commands (GET /ip/address) – it should show query params and array output
- some postman-defaults could be better, but unsure how to control via RAML...
- likely others...

Anyway still good start to a more formalized schema.  While not _directly_ OpenAPI/swagger, the RAML imports into postman just fine.

RAML Schema for Download
The generated RAML schema for import (~6MB, 250K lines of YAML) can be download from:
https://tikoci.github.io/restraml
**Check the website for new ones.**

**Newer version are on the GitHub project** but orginal files from time of this posting remain:
7.12 - https://tikoci.github.io/restraml/routeros.raml
7.13 - https://tikoci.github.io/restraml/routeros.7.13.raml

Using [Postman...](https://postman.com) (and other HTTP tools)

![](https://i.ibb.co/WvY94f7/Screenshot-2023-09-10-at-4-58-21-PM.png)

For use in Postman
1. Go to API section
2. Click "Import" button on near top of API section
3. Upload the RAML file from above:

![](https://i.ibb.co/GT9Fm0J/Screenshot-2023-09-10-at-3-01-24-PM.png)

4. Click "View import setting", selecting "Schema" – NOT the default "example" — as source for postman request/response data:

![](https://i.ibb.co/gJ22t8F/Screenshot-2023-09-10-at-3-01-41-PM.png)

5. Hit back icon in upper left, then click "Import"
6. Wait... (postman shows progress in status bar)
7. Go to "Collections" section on left side of Postman, and notice the new RouterOS one
8. Using postman is more up-to-you... at least the following need to be added by user for it call REST API on a RouterOS device:
- "Basic Auth" should be set either on collection (or elsewhere)
- {{baseUrl}} needs to be set to your router's IP using the environment variables in postman

Converting RAML to OpenAPI / swagger formats

This web site seem to take a RAML schema, and get then an OpenAPI schema from it:
https://mulesoft.github.io/oas-raml-converter/
which gets an OpenAPI formatted scheme from RAML.

Generated OpenAPI Schema
https://tikoci.github.io/restraml/routeros-openapi3.json
Although I didn't test it much, it does seems to load in Postman at least.

I'm sure there other CLI tools to do same, but RAML is support by postman which was concern.

JavaScript to generate RAML
Mainly for reference.  It takes ~30 minutes, to make 30K+ REST calls, on beefy MacBook....  JS source code is in a GitHub project:
https://github.com/tikoci/restraml
Not the pretty code, but works.   I'll leave containering for it for another day

_Note: I would have used RouterOS script, but the 4K chucks of 6MBs didn't sound fun – but yes a RSC script, or a container, theoretically work here too.  Just JS was easier/quicker since I'd done most of it a while back._

Postman in VSCode with RouterOS REST...
Using the VSCode extension for Postman also works, once the schema has been loaded:

![](https://i.ibb.co/5hgtMby/Screenshot-2023-09-11-at-9-32-55-AM.png)

Including postman's code generation from REST schema:

![](https://i.ibb.co/ZcHx9v6/Screenshot-2023-09-11-at-9-47-27-AM.png)

![](https://i.ibb.co/6mCb3mw/Screenshot-2023-09-11-at-9-45-45-AM.png)

edits:
- added TODO
- fixed references to use GH project instead of a git for RAML schema download
- add screenshot of VSCode with postman plugin
- updated URL to generate OpenAPI schema
- updated to reference GitHub project.

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/2](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/2)
- Created: `2023-09-11T14:36:49.000Z`
- Likes on this post: 0

I generated some HTML docs using the generated RAML scheme.

Generated REST API Docs
https://tikoci.github.io/restraml/
If you want to see what options are available from the REST API, this at at least shows the URL and most parameters for each endpoint.

Notes:
- descriptions are limited since "/console/inspect request=syntax" fails on some path='s.  If that's fixed, there be some descriptions.

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/4](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/4)
- Created: `2023-09-12T17:06:53.000Z`
- Likes on this post: 0

It's a start, but still needs some work... At some point I'll fix this up a bit more.  I'd only done POST originally...so the GET/PATCH/DELETE methods I just quickly hacked in, but got messy.

I did convert the RAML to OpenAPI, but didn't verify it, but might be helpful since more REST tools support OpenAPI.  The RAML converted to OpenAPI schema format it's here: https://tikoci.github.io/restraml/routeros-openapi3.json

In case it wasn't clear, schema shows all possible _**request**_ parameters for HTTP endpoints.  In most cases, you just a need a few & **providing ALL parameters may actually NOT be valid syntax**.  Since goal was to know the possible options...not provide ready-to-use examples.

The current scheme is pretty vague on possible JSON _**responses**_ JSON.  In theory, it be possible to extract possible responses (e.g. other than just it's an object or array as in current schema).  In particular for GET's it can likely know the attributes in the JSON response.  Similarly it probably can do more to pull out some descriptions.  Basically the "tree of commands" should be complete, at least for the router/version it was extracted.

But extracting "metadata" from "request=syntax ..." gets trickier since whole scheme in /console/inspect command is undocumented.  But all the data is based on /console/inspect... if curious on how that works, see: http://forum.mikrotik.com/t/new-command-in-routeros-7/169237/1 – I don't actually use all of the possible data in there today.

[//]: #.

## Post 6

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/6](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/6)
- Created: `2024-05-22T19:45:05.000Z`
- Likes on this post: 0

I automated schema generation on GitHub.  And added a new download page that shows schema/docs for a variety of versions from 7.9 to 7.15rc4:
**Downloads:**   https://tikoci.github.io/restraml

The source and other details are here:
**GitHub Project:**   https://github.com/tikoci/restraml
**VSCode Online View:**  https://github.dev/tikoci/restraml

_**Geeky Details...** The internals of the automation are kinda nifty (IMO) & likely useful other automation using GitHub+RouterOS needs.  Specifically, the GitHub Action that builds schemas/docs/etc, runs a CHR inside itself GitHub, that's used to make the need REST calls to /console/inspect.   The GitHub project, specifically "Actions" [shows all the gory details](https://github.com/tikoci/restraml/actions/runs/9195705843/job/25292107305) how the schemas are generated, with the [manual-docker-in-docker.yaml](https://github.com/tikoci/restraml/blob/main/.github/workflows/manual-using-docker-in-docker.yaml) doing the heavy lifting here._

> Quoted forum context omitted.

Very true.  When I started this mini-project... I just wanted to "diff" the command tree to see what changed in CLI between versions.  And... got needing to run Docker^2+QEMU+CHR somehow...

[//]: #.

## Post 7

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/7](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/7)
- Created: `2024-05-24T15:20:01.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I added a `diff` UI to the Schema Download page on GitHub, https://tikoci.github.io/restraml

It will show what commands/attributes have changed between RouterOS Versions:
Forum attachment omitted: Screenshot 2024-05-24 at 7.56.12 AM.png

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/9](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/9)
- Created: `2024-09-30T18:30:37.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Thanks!

[s]I recently created a [Postman "code generator"](https://github.com/tikoci/postman-code-generators/) to convert a Postman Request JSON, into the right /tool/fetch.  I'm still working on it & Postman needs to accept it.  But the project would allow RouterOS /tool/fetch "code snippets" to be generated from Postman App (and other tools). [/s]

But I added a webpage that use the RouterOS Postman "codegen"  to convert a `curl` command into a RouterOS /tool/fetch, as part the "Scheme Tools" series here :wink:.

## <mark>NEW VERSION</mark>

## **Website for cURL command line into /tool/fetch command**
https://tikoci.github.io/curl2rsc.html

_Use Case:_
Often SaaS/cloud/etc site have some curl example in there docs/UI... so above allow you can cut-and-paste the "curl version" & get a hopefully valid /tool/fetch command to use.  Internally it convert the curl to a Postman JSON object, and the my RouterOS codegen convert the JSON into a /tool/fetch (to the extent fetch support it), and in a few forms to add cut-and-paste to RouterOS.

[s]Feel to try to convert some `curl -X GET example.com`, and let me know here or in GitHub if something does not convert right.[/s]
Forum attachment omitted: curl2rsc.png

_Original screenshot, new site looks slightly different, and improved_

[//]: #.

## Post 10

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/10](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/10)
- Created: `2026-03-28T17:23:53.542Z`
- Likes on this post: 1

There is a new OpenAPI 3 schema available as of March 2026.  See this post for details:

### https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/17

**But** for Postman, the RAML scheme is still recommended since it always load.  The OpenAPI 3 format some times fails to load.  I think there is a timeout.  RAML takes several minutes and looks hung for 1-2 minutes of that after import.  Once imported, it's fine.  

Feel free to try the OpenAPI 3 in Postman... I've seen OpenAPI 3 load, but actually seems even slower to load than RAML when it does.  YMMV.

### <mark>NEW</mark> Web-based REST API Schema Viewer

The link above has more details.  But you can use that instead of load Postman if need is just to lookup a `curl` command for REST API...

[Forum attachment omitted: Screenshot 2026-03-28 at 8.29.51 AM
Forum attachment omitted: Screenshot 2026-03-28 at 8.19.47 AM](https://tikoci.github.io/restraml/openapi.html)

https://tikoci.github.io/restraml/openapi.html

[//]: #.

## Post 11

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/11](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/11)
- Created: `2026-04-09T19:00:59.994Z`
- Likes on this post: 0

# <mark>TEASER:</mark> RouterOS **Documentation** and **Schema** MCP `@tikoci/rosetta`

I should do a better writeup for forum - still working on concept and perhaps even naming.... More details are here in README.md:

### https://github.com/tikoci/rosetta

## TL;DR
To try the TUI interface, outside any AI, it's just:
```
# Install `bun` if not already, see https://bun.sh for details
curl -fsSL https://bun.sh/install | bash
# or Mac with Homebrew: `brew install bun`

# To launch, TUI this will get you the latest version and start it in TUI mode
bunx @tikoci/rosetta browse
```
> _**Note** the `browse` in CLI — without it, rosetta will run in MCP server mode_

## More to the story, but REST API now in SQLite...
Forum attachment omitted: Screenshot 2026-04-09 at 9.33.59 AM

And linked to documentation pages at help.mikrotik.com in the database (and eventually be incorporated into the OpenAPI schema).

Forum attachment omitted: Screenshot 2026-04-09 at 9.21.35 AM

> **Note** the commands have links back to MikroTik docs, and eventually this data will be feed back into the OpenAPI 3 scheme add content from help.mikrotik.com inside the OpenAPI 3 schema....

## Data Sources in SQLite...

The database combines multiple sources of MikroTik data:

- **HTML Documentation** — Confluence space export from help.mikrotik.com. Pages are broken into sections, callout boxes, and property tables (~515K words).

- **Command Tree** — `inspect.json` from [tikoci/restraml](https://github.com/tikoci/restraml), which runs `/console/inspect` against RouterOS CHR under QEMU for every version since 7.9 (46 versions tracked).

- **Product Matrix** — CSV export from mikrotik.com/products/matrix (144 products, 34 columns).

- **Test Results** — Ethernet and IPSec throughput benchmarks scraped from mikrotik.com product pages.

- **Changelogs** — Parsed per-entry from MikroTik download server.

- **YouTube Transcripts** — Auto-generated English transcripts from the official MikroTik YouTube channel (518 videos, ~1,890 transcript segments). Extracted via `yt-dlp`, cached as NDJSON in `transcripts/` for reproducible CI builds. See `make extract-videos` / `make extract-videos-from-cache`.

Documentation covers RouterOS **v7 only** and aligns with the long-term release (~7.22) at export time.

## But SQL is part of `tikoci/rosetta` "MCP Server" to provide MikroTik info to AI assistants...

To an AI assistant in a chat window, `@tikoci/rosetta` looks like this (CoPilot in VSCode), you can see the MCP tool is more like a function call, and the MCP what converts that into a SQL query to return the JSON with text version of MikroTik docs.  

Forum attachment omitted: Screenshot 2026-03-30 at 7.05.17 AM

> e.g. HTML tags waste a lot of "tokens", so less available are thinking/work if it has to read the Confluence page directly, so rosetta lets it get things in "chunks" based FTS keyword searches:

Forum attachment omitted: Screenshot 2026-04-07 at 11.14.43 AM

> **Rosetta MCP does **not** access your routers, or even have access to it – it just does SQL queries to its database, based HTTP requests from a chat session to extract chuck of data**

It important to note that **all information** comes either from MikroTik website, so the core database goes **well beyond** just the "schema in SQL" — but my _orginal_ need for a few of my https://tikoci.github.io projects was some ability to "link" to MikroTik docs (e.g. the OpenAPI schema, [RouterOS LSP](https://tikoci.github.io/p/lsp-routeros-ts), [TikBook](https://tikoci.github.io/p/vscode-tikbook), etc)

## Easy path to use "rosetta" DB as new /app for most AI assistants....
This acts as a MCP server for AI assistants to access Mikrotik info, so essentially use the `ui-url` in something like Claude or CoPilot or ChatGPT **Desktop** things.  See: https://github.com/tikoci/rosetta/tree/main?tab=readme-ov-file#install-on-mikrotik-app

```routeros
[admin@CHR] > /app/print where name=rosetta
Flags: R - RUNNING; c - CUSTOM
Columns: NAME, UI-URL, MEMORY-CURRENT, APP-SIZE, CATEGORY, DESCRIPTION
#    NAME     UI-URL                          MEMORY-CURRENT  APP-SIZE  CATEGORY     DESCRIPTION                                            
0 Rc rosetta  http://192.168.74.150:9803/mcp  58.7MiB         390.6MiB  development  RouterOS Docs for AI assistants - use URL as MCP server
[admin@CHR] > /app/print detail where name=rosetta
Flags: X - DISABLED, R - RUNNING; c - CUSTOM, s - FROM-APP-STORE 
 0 Rc app-store-url="" name="rosetta" description="RouterOS Docs for AI assistants - use URL as MCP server" container-command-lines=rosetta:app-rosetta:ghcr.io/tikoci/rosetta:latest 
      project-page="https://tikoci.github.io/p/rosetta" category="development" ui-url="http://192.168.74.150:9803/mcp" 
      default-credentials="none - just use 'ui-url' as the MCP server in your AI assistant" status="" auto-update=yes use-https=no default-network=internal network=default pvid=1 
      interface=veth-app-rosetta ip-address=172.18.0.7 firewall-redirects=9803:8080:tcp:web yaml=
        name: rosetta
        descr: "RouterOS Docs for AI assistants - use URL as MCP server"
        page: https://tikoci.github.io/p/rosetta
        category: development
        icon: https://tikoci.github.io/p/rosetta.svg
        default-credentials: "none - just use 'ui-url' as the MCP server in your AI assistant"
        url-path: /mcp
        auto-update: true
        services:
          rosetta:
            image: ghcr.io/tikoci/rosetta:latest
            container_name: mcp-server
            ports:
              - 9803:8080/tcp:web
      cmds=
        
        /interface set veth-app-rosetta name=veth-app-rosetta
        /interface bridge port add bridge=internal interface=veth-app-rosetta pvid=1
        /ip firewall nat add action=dst-nat chain=dstnat comment="app rosetta redirect to web" dst-address=192.168.74.150 dst-port=9803 protocol=tcp to-addresses=172.18.0.7 to-ports=8080
      memory-current=58.7MiB app-size=390.6MiB required-mounts="" extra-mounts="" environment="" secrets="" configs="" variables-to-use-in-environment=
        [containerIP]=172.18.0.7
        [containerInterface]=veth-app-rosett
        [routerIP]=192.168.74.150
        [accessIP]=192.168.74.150
        [accessPort]=9803
        [accessProto]=http
      required-hw-devices="" devices="" 
```
> And if you have a license CHR or any ARM64 device, the MCP connection use HTTPS — my output above has use-https=no since it needs `/ip/cloud`.  The `ui-url` for the /app will show what to use in your AI MCP server configuration.  The [README.md](https://tikoci.github.io/p/rosetta) has the setup details.

## As a "Card Catalog" of SQL DB — **no AI required**, just 1980s interface...

If you have `bun` installed, a TUI "card catalog" of database is available... no install, no container, just one command will bring it up (links work better in "modern" trerminal, so even MacOS detail will only work with http:// links, in other terminals especially on Linux, more stuff is "clickable".

The basic idea is you can just type a query (no keyword) and it will search MikroTik docs.  The `help` explains that you can search specifically catalogs of data using keywords, like `dev rb5009` to find the 3 models, and select 1-3 to view the spec, block diagram, and test results form website ... from the SQLite database (that is updated by GitHub on new HTML export from MikroTik's help.mikrotik.com).... so it sub seconds to search.

> The UI could be improved... it was designed to **test the MCP interface** so you are interacting with data more as a AI would than I'd design if goal use "human UX".... the 1980s library catalog system was my concept so it at least look more normal..._e.g. the AI figured out the ANSI codes and API calls, the TUI UX design was more me._

### `bunx run @tikoci/rosetta browse`

This is orginally was a "simple" debugging tool... since it actually models how an AI assistant would have interact with the system since the "commands" are mapped to MCP tools and output is what an LLM agent would see.  

But it mostly works as a 1980s library terminal to access MikroTik resources stored is the rosetta database.

> If you install rosetta as a `/app` based on the readme, you access the same TUI using `/container/shell`...
>
> ```
> [admin@CHR] > /container/shell app-rosetta 
> # /app/rosetta browse
> ╭─ rosetta  ──────────────────────────────────────────────────> ─────────────────╮
> │ RouterOS Documentation Browser  v"v0.5.0"                                    │
> │ 317 pages · 4,860 properties · 40,208 commands                               │
> │ 144 devices · 1,034 callouts · 43 versions                                   │
> │ 510 videos · 1,882 transcript segments                                       │
> │                                                                              │
> │ Type a search query, or help for commands.                                   │
> ╰────────────────────────────────────────────────> ──────────────────────────────╯
> 
> rosetta> quit
> # exit
> done
> [admin@CHR] > 
> ```

Forum attachment omitted: Screenshot 2026-04-09 at 7.40.43 AM

### Even YouTube videos...

Which extract the "chapters" and "[english] subtitles", links know the chapter (if any) where a keywords was found in the subtitles, so it goes _roughly_ that that spot in the video:

Forum attachment omitted: image

> Again, these all go to a AI assistant - the 1980s "browse" card catalog is just so demo what it has...  But AI agent it _could_ suggest "maybe watch this video at this spot" and/or read the transcript, since it might have subtle details not in the manual.

## Per device data... with "test results" and "block diagram"

Forum attachment omitted: Screenshot 2026-04-09 at 7.50.20 AM

> **Note the "Test Data" shown and "Block Diagram" is available, linked to device, done in milliseconds**

## But just JS scripts & SQLite at its core...

But it all just scripts that pull data and  SQL tables, and sophisticated FTS indexes - **the "card catalog" does **not** use any AI itself – it feed this same info to an AI _when asked_ via MCP protocol**

```sql
sqlite3 ros-help.db
SQLite version 3.51.0 2025-06-12 13:14:41
Enter ".help" for usage hints.
sqlite> .tables
callouts                    pages_fts_data            
callouts_fts                pages_fts_docsize         
callouts_fts_config         pages_fts_idx             
callouts_fts_data           properties                
callouts_fts_docsize        properties_fts            
callouts_fts_idx            properties_fts_config     
changelogs                  properties_fts_data       
changelogs_fts              properties_fts_docsize    
changelogs_fts_config       properties_fts_idx        
changelogs_fts_data         ros_versions              
changelogs_fts_docsize      schema_migrations         
changelogs_fts_idx          sections                  
command_versions            video_segments            
commands                    video_segments_fts        
device_test_results         video_segments_fts_config 
devices                     video_segments_fts_data   
devices_fts                 video_segments_fts_docsize
devices_fts_config          video_segments_fts_idx    
devices_fts_data            videos                    
devices_fts_docsize         videos_fts                
devices_fts_idx             videos_fts_config         
pages                       videos_fts_data           
pages_fts                   videos_fts_docsize        
pages_fts_config            videos_fts_idx            
```
## Even the CHANGELOG...

```
rosetta> cl 7.23beta2 iot
  Changelogs for 7.23beta2

  7.23beta2  2026-Mar-13 11:52
    iot            added Wiliot support;
    iot            improved LoRa Tx handling;
    iot            added LoRa Tx delay setting;
    iot            added MQTT subscribe message real-time monitoring option;
    iot            fixed LoRa LBT issues, which caused Tx packets not getting delivered;

  [cl breaking] breaking only  [cl <ver>] specific version   back

rosetta> cl breaking
  Changelogs (breaking only)

  7.22  2026-Mar-09 10:38
  ⚠ device-mode    added option to configure device-mode via Netinstall or FlashFig using a “mode script”;
  ⚠ certificate    added support for multiple ACME certificates (services that use a previously generated certificate need…

  7.22rc4  2026-Mar-04 15:06
  ⚠ device-mode    added option to configure device-mode via Netinstall or FlashFig using a “mode script” (additional fixe…
  ⚠ certificate    added support for multiple ACME certificates (services that use a previously generated certificate need…

  7.17  2025-Jan-16 10:19
  ⚠ device-mode    after upgrade, mode "enterprise" is renamed to "advanced" and traffic-gen, partition (command "repartit…
  ⚠ webfig         redesigned HTML, styling and functionality;
```
##  Command property are extracted from HTML, too.

This is what will eventually make into the schema since not all commands have `F1` help (which only source for text description of things in OpenAPI/RAML schema here).  
```
rosetta> p
  Properties for VRRP

  1  name  string
       VRRP interface name.
       VRRP  →

  2  group-authority  none | self | vrrp-interface  default: none
       Allows multiple VRRP interfaces to be grouped so they share the same VRRP state. Within a group, a single group autho…
       VRRP  →

  3  version  integer [2, 3]  default: 3
       Which VRRP version to use.
       VRRP  →

  4  backup
       The VRRP interface is in the backup state.
       VRRP  →

  5  disabled
       The VRRP interface is disabled by the user.
       VRRP  →

  6  master
       The VRRP interface is in the master state.
       VRRP  →

  7  grp-authority
       The VRRP interface is group-authority. It controls the state of the other group members and is the only interface tha…
       VRRP  →

  8  interface  string
       Interface name on which VRRP instance will be running.
       VRRP  →
```
## Long way to say the REST API is now available in SQL...

To tie the topic back to REST API, the `commands` and `commands_versions` (which know stores what version a command was seen similar to https://tikoci.github.io/restraml/lookup.html?path=ip%2Faddress&attr=add&version=7.22.1

## Updates when MikroTik update their HTML export of help.mikrotik.com

So currently the docs are from 2026-03-25, commands should be up 7.23beta5 since I just built another version.  The idea is there be a new database monthly, assuming MikroTik gets back on track on this:

Forum attachment omitted: image

...which is actually the underpinning of the entire rosetta KB system, since the HTML dump of Confluences is slice-and-diced by scripts to build the database.  Process is entirely repeatable as long as MikroTik does not change things, and updates the exports "monthly".

## Still "experimental" but "safe"

The main work left is "aligning" the MCP tools to what things an AI might need from RouterOS.  For example, there 14 tools offer to a "chat agent" to access the information... that is likely too many.  And some of the "slicing-and-dicing" of docs/etc could be improved in various places.  We do NOT modify or use AI generated content... but we do split up large HTML doc pages and YouTube transcripts  in to fragments, to allow an LLM to only get certain sections.

To be clear, it do NOT access your router configuration **at all**.  No password is required since all data is from publicly available sources.  The code is all published by GitHub so even the extract process is transparent (in [tikoci/rosetta GitHub Actions](https://github.com/tikoci/rosetta/actions))

> Anyway, still working on it in background. Tons of room for improvements, but it does "work", well, a many places, and LLM do use it if installed and start asking "RouterOS questions".  The "card catalog" is just experiment and "test hardness"... so it not designed to be "best search tool" - although it works surprising well (still some bugs, which are also likely in how I also works with AI agents... this is where TUI catalog app is useful, since _mimics_ how LLM interface with the database.

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/12](https://forum.mikrotik.com/t/rest-api-schema-for-openapi-postman-more-now-ai/169502/12)
- Created: `2026-04-14T20:03:30.290Z`
- Likes on this post: 0

# <mark>ENHANCED</mark>  `curl2rsc` web tool - converts any `curl` command to `/tool/fetch` @ [https://tikoci.github.io/curl2rsc.html](https://tikoci.github.io/curl2rsc.html)

# [color=green]**curl2rsc** is alive again![/color]

[Forum attachment omitted: image](https://tikoci.github.io/curl2rsc.html)

https://tikoci.github.io/curl2rsc.html 

I used have a tool `curl2rsc` that used Glitch.io but they shutdown, so my site went down with it.  Ported it a SPA (so everything runs in your browser — **no cloud, `curl` stays with your browser, not submitted anywhere**.  It uses a new WASM-based engine to parse the `curl`, and the original "Postman Code Generator" extension for RouterOS `/tool/fetch`, so conversion is **same as before**.  Ran some test generally works with new `curl` parsing library.  

If you find any issue, please report in this thread, or in [GitHub Issues](https://github.com/tikoci/tikoci.github.io/issues) – but it should work for most common cases.    Keep in mind: `curl2rsc` may limited with some `curl` options that  **`/tool/fetch` does **not** support**... those _should_ have warning shown.  

> _There also new "help" info on how to get a URL from a browser (that could be improved) and seeing the JSON from the parsed `curl` commend _before_ conversion to `/tool/fetch`.  The new "`curl` parser" comes from https://curlconverter.com which supports doing same for other languages, so thanks to them since that curl parser is actually **better** than the old postman2curl project I was using._
