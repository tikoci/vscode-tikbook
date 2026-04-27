[//]: #!tikbook discourse-bookmark topic=149360

# Feature Request : OpenAPI for REST API

- Source thread: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/1](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 17 total (topic bookmark)
- Posts included: 9
- First bookmarked: `2025-06-16 20:38:42 UTC`
- Last bookmarked: `2025-06-16 20:38:42 UTC`

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/2](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/2)
- Created: `2022-02-28T17:34:01.000Z`
- Likes on this post: 0

Did you ever find one OpenAPI or swagger doc for the REST API?  Has someone already built one already?

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/5](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/5)
- Created: `2022-11-08T15:43:04.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Thanks @mrz – that's useful.  More so for pragmatically creating skins (since /webfig/list seems to match values that go in the a "skin" file).

But it's a bit away from being usable in REST tools like Postman, etc.....

Still helpful however: the files referenced by the /webfig/list actually list all the attributes, which is useful. But the JG file output seems to use the "Webfig" names (make sense given context), but doesn't seem to contain anywhere the equivalent CLI/REST name (e.g. "DHCP Client"  vs. "dhcp-client") so any transformation need to map those, somehow. That seems like a big project.

If this helps anyone, I wrote some JavaScript code to parse the output – since /webfig/list doesn't seem to be modern JSON (but similar to the "webfig skin JSON" format) you need eval() to parse the output.  I don't do anything with it, but you can at least view it more reasonably. _OR, perhaps collect some from various versions to compare the schema deltas release to release._

![](https://i.ibb.co/d7qhYWY/Screenshot-2022-11-08-at-6-31-19-AM.png)

```text
function webfiglist(ip) {
  if (typeof window === "object" && !ip) {
    ip = (new URL(window.location.href)).host
  }
  return new Promise((done) => {
    fetch(`http://${ip}/webfig/list`)
      .then((req) => req.text())
      .then((txt) => {
        var results = {};
        /* this is critical... 
               the /webfig/list is not valid JSON document, it's a JS "fragment" 
               ...so we need eval() to "convert it" to a variable to then return */
        eval(`results = [${txt}]`);
        done(results);
      });
  });
}

function webfigschemas(ip) {
    if (typeof window === "object" && !ip) {
        ip = (new URL(window.location.href)).host
   }  
   return webfiglist(ip).then((list) =>
    Promise.all(
      list
        .filter((i) => i.unique)
        .map((i) => {
          return new Promise((done) => {
            let file = i.name
            fetch(`http://${ip}/webfig/${file}`)
              .then((req) => req.text())
              .then((txt) => {
                /* same eval() trick as the webfiglist, except return a "tuple" with [filename, data] */
                var results
                eval(`results = ${txt}`)
                done([ file, results ])
              })
          })
        })
    )
  )
}

webfiglist().then(console.log)
webfigschemas().then(console.log)

// NODE.JS save to file
// let ip = "192.168.88.1"
// const fs = require('fs');
// webfigschemas(ip).then(d => fs.writeFileSync("./webfig-list-schema.json", JSON.stringify(d)))
```
If you paste that into JavaScript console from a browser "Inspect" option while on webfig page, it should show the "schema data" in the console output.  If you use nodeJS, you should be able pass an ip address to the webfiglist("192.168.88.1") to get it from any RouterOS device (might be possible in browser, but cross-site scripting checks would need tweaks).

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/9](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/9)
- Created: `2022-11-09T13:47:00.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Except now we can find them :wink:

It's not critical for my needs, but I wrote some code to pull out all the "chicks" ( request=child) in the /console/inspect.

It uses recursion with a ROS function to walk the tree of "child" and returns a ROS ::array (& shoves it into a :global variable called "$ast" too).  Surprisingly this DOES NOT get ANY stack overflow or memory limits, at least in v7.6.  In fact, after walking the tree, even on a little cAP ac, there are 4329 unique "cmd", "args", and "path" branches, with a few leafs each.

```routeros
:global ast [:toarray ""]

:global mkast do={
    :global mkast
    :global ast
    :local path "" 
    :if ([:typeof $1] ~ "str|array") do={ :set path $1 }
    :local pchild [/console/inspect as-value request=child path=$path]
    :foreach k,v in=$pchild do={
        :if (($v->"type") = "child") do={
            :local astkey ""
            :local arrpath [:toarray $path]
            :foreach part in=$arrpath do={
                :set astkey "$astkey/$part"
            }
            :set ($ast->$astkey->($v->"name")) $v
            :put "Processing: $astkey $($v->"name") $($v->"node-type")"
            :local newpath "$($path),$($v->"name")"
    		# TODO use [/console/inspect as-value request=syntax path=$path]
            [$mkast $newpath]
        }
    }
    return $ast
}

# & this call start the recursion 
:put [$mkast]
```
$ast will also contain the schema as an nested array, reflecting the parent/child relationships... so can use like this:

```routeros
 :put ($ast->"/ip/address")
 
add=.id=*2;name=add;node-type=cmd;type=child;comment=.id=*3;name=comment;node-type
=cmd;type=child;disable=.id=*4;name=disable;node-type=cmd;type=child;edit=.id=*5;n
ame=edit;node-type=cmd;type=child;enable=.id=*6;name=enable;node-type=cmd;type=chi
ld;export=.id=*7;name=export;node-type=cmd;type=child;find=.id=*8;name=find;node-t
ype=cmd;type=child;get=.id=*9;name=get;node-type=cmd;type=child;print=.id=*a;name=
print;node-type=cmd;type=child;remove=.id=*b;name=remove;node-type=cmd;type=child;
reset=.id=*c;name=reset;node-type=cmd;type=child;set=.id=*d;name=set;node-type=cmd
;type=child
```
Another example, this is one part of the output $ast array above in YAML-ized style output:

```routeros
/zerotier/edit:
    number:
      .id: *2
      name: number
      node-type: arg
      type: child
    value-name:
      .id: *3
      name: value-name
      node-type: arg
      type: child
  /zerotier/enable:
    numbers:
      .id: *2
      name: numbers
      node-type: arg
      type: child
```
I don't do it here, but adding another call to "/console/inspect  request=syntax ..." for each child with same path would get a description (e.g. type of "explanation").  With that you'd have all the info for a REST schema.  My thought is [RAML](https://raml.org) might be easier to generate from ROS script, since it uses "YAML format", not JSON, and YAML is easier to _generate_ in ROS script.  I think the keys from my code are close to the REST POST things, so that be easiest to model into RAML.   And I believe some tools can use or convert from the RAML schema format to swagger / OpenAPI.

But /console/inspect does seem to have the info for a REST schema, now converting is still more work.

One note is /console/inspect seems to know about ALL of the packages (e.g. "extra-packages"), even if not installed – so you'll see child entries for calea, iot, etc. even if not available.

[//]: #.

## Post 11

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/11](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/11)
- Created: `2022-11-13T22:34:31.000Z`
- Likes on this post: 0

Took another look at this today, thought it be easy to get the "explanation".

While "request=child" works with issue, some "request=syntax" (e.g. "path=ip,address,add,interface", see below), cause the entire terminal to terminate ("Console has crashed; please log in again.") – most things seem to work with request=syntax.

```text
[user@router] > /console/inspect request=syntax path=ip,address,add
Columns: TYPE, SYMBOL, SYMBOL-TYPE, NESTED, NONORM, TEXT
TYPE    SYMBOL     SYMBOL-TYPE  NESTED  NONORM  TEXT                                   
syntax             collection        0  yes                                            
syntax  address    explanation       1  no      Local IP address                       
syntax  broadcast  explanation       1  no      Broadcast address                      
syntax  comment    explanation       1  no      Short description of the item          
syntax  copy-from  explanation       1  no      Item number                            
syntax  disabled   explanation       1  no      Defines whether item is ignored or used
syntax  interface  explanation       1  no      Interface name                         
syntax  netmask    explanation       1  no      Network mask                           
syntax  network    explanation       1  no      Network prefix                         
[user@router] > /console/inspect request=syntax path=ip,address,add,address
Columns: TYPE, SYMBOL, SYMBOL-TYPE, NESTED, NONORM, TEXT
TYPE    SYMBOL   SYMBOL-TYPE  NESTED  NONORM  TEXT                   
syntax  Address  definition        0  no      A.B.C.D    (IP address)
[user@router] > /console/inspect request=syntax path=ip,address,add,interface

Console has crashed; please log in again.
```
Even wrapping it a ":do {} on-error={}" does NOT catch the crash so that didn't work to avoid the issue.

```routeros
:do {
   /console/inspect request=syntax path=ip,address,add,interface
} on-error={:put "got error"}
```
While that would not be critical for schema per-se, it does have a description to set, and there is some "collection" node-type that likely indicates an possible array (instead of just string) as JSON param.

FWIW you can call the same /console/inspect via REST API too. But the same params in REST "{ "request": "syntax",  "path": "ip,address,add,interface" } while don't "crash" it timeouts with no data (empty JSON array).

In fact, here the RAML for just the /console/inspect:

```routeros
#%RAML 1.0
title: ROS.RAML sample
version: 7.6
protocols: [HTTPS]
mediaType: [application/json]
securitySchemes:
  basic:
    description: |
      Mikrotik REST API only supports Basic Authentication, secured by HTTPS
    type: Basic Authentication
securedBy: [basic]
baseUri: https://{host}:{port}/rest
baseUriParameters:
  host:
    description: RouterOS device IP or host name
    default: "192.168.88.1"
  port:
    description: RouterOS https port to use
    default: "443"
documentation:
  - title: RouterOS RAML Schema
    content: |
      Schema is generated using `/console/inspect` on a RouterOS devices and
      interpreted into a schema based on the rules in
      [Mikrotik REST documentation](https://help.mikrotik.com)
  - title: Demo Only
    content: We just try a few commands 

/console:
  /inspect:
    post:
      description: Inspects the RouterOS AST
      body:
        application/json:
          type: object
          properties:
            .proplist?:
              type: string
              description: List of properties to return (see RouterOS docs)
            .query?:
              type: string
              description: List of properties to return (see RouterOS docs)
            path?:
              type: string
              description: Comma-seperated string of RouterOS path
              example: 
            input?:
              type: string
            request:
              type: string
              enum: [self|child|completion|highlight|syntax|error]
          example:
              path: "ip,address,add,interface"
              request: syntax
      responses:
        200:
          body:
            application/json:
              type: array
```

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/12](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/12)
- Created: `2023-09-11T03:00:18.000Z`
- Likes on this post: 0

I kinda forgot about this one.  But I do have a JavaScript implementation that using /system/console via REST, and generate a [RAML 1.0 scheme](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md).

See https://forum.mikrotik.com/viewtopic.php?t=199476 for RAML-based alternative.

_edit: I noticed this was the beta forum, so moved the RAML approach to new thread in Scripting topic_

[//]: #.

## Post 13

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/13](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/13)
- Created: `2023-09-11T17:49:55.000Z`
- Likes on this post: 0

[s]Here is an OpenAPI schema I generated from above RAML schema.[/s]

**[s]OpenAPI 3.0 / swagger schema[/s]**
[s]https://tikoci.github.io/restraml/routeros-openapi3.json
It may have some calls that aren't allowed, and other things may not have translated perfectly.  But it loads:[/s]

**Mar 2026 Edit**  "Retired" as a one-off and built per-version.  It was not actually validate OAS3.  Some tools like Postman could load it, but not all.  See https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/17 for new version of OpenAPI 3 schema.

[//]: #.

## Post 15

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/15](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/15)
- Created: `2024-05-27T12:21:01.000Z`
- Likes on this post: 0

> ### OpenAPI 2.0 schema "Retired"  
OAS2 was published for most RouterOS versions in past, but new version will **only have OpenAPI 3 schema**.  See https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/17 below

[s]I recently automated building the schema files  at GitHub, including OpenAPI 2.0 (OAS2).  So newer (and older) versions of the RAML and OpenAPI schemas are available at:[/s]

https://tikoci.github.io/restraml

The same page has a nifty "diff" tool, to compare RouterOS versions.

> Quoted forum context omitted.

Except now we can find them :wink:
[/quote]

So you can more easily see changes between versions...
Forum attachment omitted: screen-diff-dark.png

[//]: #.

## Post 16

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/16](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/16)
- Created: `2025-07-10T19:01:38.577Z`
- Likes on this post: 0

> Quoted forum context omitted.

Come a long way with the `/console/inspect`.  In fact, between [restraml schemas+diff](https://tikoci.github.io/restraml/) (using `request=syntax` & `request=child`), which has RAML and OpenAPI schemas, and an [RouterOS LSP](https://forum.mikrotik.com/t/routeros-lsp-for-better-syntax-checking-command-completion-in-editors-like-vscode-neovim/184067) for syntax colors/errors/completion (using `request=completion` & `request=highlight`) — using most what `/console/inspect` has to offer.

While the LSP gets pretty far with inspect's completion and highlight data.  RouterOS LSP does gets limited since I have not been able to figure out, reliably, what the "current working directory" is when using any `/console/inspect request=... input="some code"` things.  The LSP's view of RouterOS script is only "highlight" tokens associated with text position in an LSP client editor (VSCode, `nvim`, etc).  But Inspect's tokenizer knows definitively the current `path=` (in the `ip,address` sense) since it resolve subshells like `[find]` and other syntax which inherent some path perfectly.  While in some cases path could be inferred like `/ip/address/add...` where it's "fully qualified". This limited the possibility to a `request=syntax` in the LSP to offer editor the "signature" (i.e. CLI's F1 help).

> Quoted forum context omitted.

So if you had a new "easter eggs" for this `cwd` problem, be good to know.  The full set of issues where `/console/inspect` is limited is here:
https://forum.mikrotik.com/t/routeros-lsp-for-better-syntax-checking-command-completion-in-editors-like-vscode-neovim/184067/14

 
With the added question/mystery... `/console/inspect request=error` is one I not been able to figure out what it does.  Any new clues?  It's always `nil` regardless of what is provided (both valid or all sorts of invalid syntax)
```routeros
:put [:typeof [/console/inspect request=error input=":put [/system/identity/get name]"]]
# nil
:put [:typeof [/console/inspect request=error input="/somebadcommand"]]                                
# nil
```
But guessing it does something, just don't know what.  Right now it's riddle in within in the easter egg inspection.

[//]: #.

## Post 17

- Original post: [https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/17](https://forum.mikrotik.com/t/feature-request-openapi-for-rest-api/149360/17)
- Created: `2026-03-28T16:40:13.812Z`
- Likes on this post: 0

Finally, years after topic was opened, there is a proper OpenAPI 3.0 schema for REST API using our friend `/console/inspect`.  

[https://tikoci.github.io/restraml/7.22.1/openapi.json]() (`routeros.npk` only)
[https://tikoci.github.io/restraml/7.22.1/extra/openapi.json]() (with all extra-packages for CHR, so _most_ of them)

Only versions newer than 7.22.1 will have OpenAPI 3 schemes, RAML remains for older versions, and still be built.  All new beta/rc and releases will include OpenAPI, so you can change the URL above to match versions (within ~24 hours of a new public RouterOS build).

> RAML really only works in Postman, and slowly.  Modern tools want OpenAPI format.  Now OpenAPI 3 schema is still big (11MB, 5000+ methods)... so it takes most visual tools a while to render still.  _CLI / CI validation using the OAS3 schema works better, since it not 5000_ x _x UI controls to track/draw._
 
### <mark>NEW</mark> REST API Explorer Webpage

There is also new Scalar-based web viewer of the schema.  

[Forum attachment omitted: Screenshot 2026-03-28 at 8.29.51 AM
Forum attachment omitted: Screenshot 2026-03-28 at 8.21.58 AM](https://tikoci.github.io/restraml/openapi.html)

>  ### "Test Request" requires CORS Proxy
>
> You cannot "run" anything since RouterOS does not support "CORS" in REST API.  You can setup a "CORS Proxy" to allow using the "Test Request" control.  Search forum, you can use ngnix, Traefik, or Caddy server - all should work with the new "API Explorer".  I tested Traefik as CORS Proxy, and webpage works with the requests.

 ### Doc Links Included

The OpenAPI 3 version adds doc links to help.mikrotik.com in selected spots.  It just contains links and it pretty conservative in matching them, so should generally be right... but many elements do have some doc page that could be links.  This is a work in progress.

The doc links here from a SQLite database after converting the help.mikrotik.com's "monthly" PDF/HTML offline to FTS5-enabled SQLite tables, breaking out fragments, "callout", and attribute tables.

> The database used is actual built in [tikoci/rosetta](https://tikoci.github.io/p/rosetta), which is also an MCP Server that allows LLM agents can more easily consume MikrotTik's help.mikrotik.com docs. See https://github.com/tikoci/rosetta for details.
> 
> **NOTE** OpenAPI schema generation does **not** use an LLM for the docs.  Rather it shares the same database as the MCP Server.  The doc links come the table generated by Python scripts that parse Confluence HTML into SQLite.

### How REST schemas are made?

For every RouterOS build, the following process essentially calls `/console/inspect` with ~50K request.  The exact process was captured by CoPilot in GraphViz (which forum supports via `[graphviz]` BBtags). 

[graphviz]
digraph "How a RouterOS OpenAPI Schema Is Made" {
    rankdir=TB;
    fontname="Helvetica";
    fontsize=13;
    compound=true;
    newrank=true;
    nodesep=0.4;
    ranksep=0.6;
    bgcolor="white";
    label=<<FONT POINT-SIZE="18">How a RouterOS OpenAPI Schema Is Made</FONT>>;
    labelloc=t;
    labeljust=c;

    node [fontname="Helvetica", fontsize=11, style="filled,rounded", shape=box, margin="0.15,0.1"];
    edge [fontname="Helvetica", fontsize=9, color="#546e7a", arrowsize=0.8];

    subgraph cluster_trigger {
        label=<⏰ 1 · VERSION DETECTION
<FONT POINT-SIZE="9">Daily at 4 AM UTC</FONT>>;
        style="rounded,filled"; fillcolor="#fff3e0"; color="#e65100"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        cron [label=<🕐 auto.yaml
Cron Trigger>, fillcolor="#ff6d00", fontcolor=white, color="#e65100"];
        channels [label=<Query 4 MikroTik Channels
stable · testing · development · long-term
<FONT POINT-SIZE="9">upgrade.mikrotik.com/routeros/NEWESTa7.*</FONT>>, fillcolor="#ff6d00", fontcolor=white, color="#e65100"];
        check [label=<Version
already built?>, shape=diamond, fillcolor="#ff6d00", fontcolor=white, color="#e65100", width=1.5];
        skip [label="✓ Skip", fillcolor="#fff9c4", fontcolor="#333", color="#f9a825", style="filled,rounded,dashed"];
        dispatch [label=<Dispatch
Build Workflow>, fillcolor="#ff6d00", fontcolor=white, color="#e65100"];

        cron -> channels -> check;
        check -> skip [label="openapi.json\nexists", fontsize=8];
        check -> dispatch [label="Missing", fontsize=8, penwidth=2];
    }

    subgraph cluster_infra {
        label=<🖥️ 2 · SPIN UP VIRTUAL ROUTER
<FONT POINT-SIZE="9">GitHub Actions Runner + QEMU/KVM</FONT>>;
        style="rounded,filled"; fillcolor="#e3f2fd"; color="#0d47a1"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        qemu_install [label=<Install QEMU
<FONT FACE="Courier" POINT-SIZE="9">apt install qemu-system-x86 qemu-utils</FONT>>, fillcolor="#1565c0", fontcolor=white, color="#0d47a1"];
        kvm [label=<Enable KVM
Hardware acceleration
<FONT POINT-SIZE="9">GitHub runners have /dev/kvm</FONT>>, fillcolor="#1565c0", fontcolor=white, color="#0d47a1"];
        dl_chr [label=<Download CHR Disk Image
<FONT FACE="Courier" POINT-SIZE="9">chr-{ver}.vdi.zip</FONT>
<FONT POINT-SIZE="9">download.mikrotik.com → cdn.mikrotik.com</FONT>>, fillcolor="#1565c0", fontcolor=white, color="#0d47a1"];
        convert [label=<Convert VDI → QCOW2
<FONT FACE="Courier" POINT-SIZE="9">qemu-img convert -f vdi -O qcow2</FONT>>, fillcolor="#1565c0", fontcolor=white, color="#0d47a1"];
        launch [label=<Launch RouterOS in QEMU
256 MB RAM · virtio disk · user-mode net
<FONT POINT-SIZE="9">Port 9180→80 (REST) · Port 9122→22 (SSH)</FONT>>, fillcolor="#1565c0", fontcolor=white, color="#0d47a1"];
        wait [label=<⏳ Wait for REST API
up to 5 min>, shape=diamond, fillcolor="#1565c0", fontcolor=white, color="#0d47a1", width=1.8];
        ready [label=<✅ RouterOS REST API Ready
<FONT FACE="Courier" POINT-SIZE="9">http://localhost:9180/rest</FONT>>, fillcolor="#d32f2f", fontcolor=white, color="#b71c1c"];

        qemu_install -> kvm -> dl_chr -> convert -> launch -> wait;
        wait -> ready [label="curl succeeds", fontsize=8];
    }

    subgraph cluster_crawl {
        label=<🔍 3 · CRAWL THE ENTIRE API TREE
<FONT POINT-SIZE="9">rest2raml.js (Bun runtime)</FONT>>;
        style="rounded,filled"; fillcolor="#e8f5e9"; color="#1b5e20"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        start_crawl [label=<Start at Root Path
<FONT FACE="Courier" POINT-SIZE="9">POST /rest/console/inspect</FONT>
<FONT FACE="Courier" POINT-SIZE="9">{request: "child", path: ""}</FONT>>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];

        subgraph cluster_loop {
            label=<🔄 Recursive Tree Walk
<FONT POINT-SIZE="9">Every command, every argument</FONT>>;
            style="rounded,dashed"; fillcolor="#c8e6c9"; color="#1565c0"; penwidth=2;
            fontname="Helvetica"; fontsize=10;

            fetch [label=<Fetch Children
<FONT FACE="Courier" POINT-SIZE="9">{request: "child", path: "ip,address,..."}</FONT>
Returns: name + node-type (dir│cmd│arg)>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
            checktype [label=<Node Type?>, shape=diamond, fillcolor=white, fontcolor="#1565c0", color="#1565c0", style="filled,dashed", width=1.2];
            recurse [label=<📁 Directory
Recurse deeper>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
            syntax [label=<⚡ Command / Argument
<FONT FACE="Courier" POINT-SIZE="9">{request: "syntax"}</FONT>
Returns type info:
<FONT POINT-SIZE="9">"0..65535" · "IP address"
"string, max length 45"</FONT>>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
            crashwarn [label=<⚠️ Skip Crash Paths
where · do · else · rule
command · on-error>, fillcolor="#fff9c4", fontcolor="#333", color="#f9a825", style="filled,rounded,dashed"];

            fetch -> checktype;
            checktype -> recurse [label="dir", fontsize=8];
            checktype -> syntax [label="cmd / arg", fontsize=8];
            recurse -> fetch [label="~2000+ paths", fontsize=8, style=dashed, constraint=false];
            syntax -> fetch [style=dashed, constraint=false];
            crashwarn -> recurse [style=dotted, arrowhead=none, color="#f9a825"];
        }

        inspect_json [label=<💾 inspect.json
Complete API tree
<FONT POINT-SIZE="9">~5000 nodes</FONT>>, shape=cylinder, fillcolor="#37474f", fontcolor=white, color="#263238"];
        raml_out [label=<📄 schema.raml
RAML 1.0 schema>, shape=cylinder, fillcolor="#37474f", fontcolor=white, color="#263238"];

        start_crawl -> fetch;
        syntax -> inspect_json [style=bold];
        syntax -> raml_out [style=bold];
    }

    raml_validate [label=<✔️ Validate RAML 1.0
<FONT FACE="Courier" POINT-SIZE="9">node validraml.cjs</FONT>
webapi-parser>, fillcolor="#6a1b9a", fontcolor=white, color="#4a148c"];

    subgraph cluster_openapi {
        label=<⚙️ 4 · GENERATE OpenAPI 3.0
<FONT POINT-SIZE="9">deep-inspect.ts (Bun runtime)</FONT>>;
        style="rounded,filled"; fillcolor="#e8f5e9"; color="#1b5e20"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        parse_tree [label=<Parse Inspect Tree
Map RouterOS commands
→ REST operations>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
        map_ops [label=<Map Commands → HTTP Methods
<FONT FACE="Courier" POINT-SIZE="10">get → GET  · set → PATCH</FONT>
<FONT FACE="Courier" POINT-SIZE="10">add → PUT  · remove → DELETE</FONT>>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
        parse_types [label=<Parse Type Descriptions
<FONT POINT-SIZE="9">"0..4294967295" → integer min/max</FONT>
<FONT POINT-SIZE="9">"IP address" → string format:ipv4</FONT>
<FONT POINT-SIZE="9">"time interval" → string (duration)</FONT>>, fillcolor="#2e7d32", fontcolor=white, color="#1b5e20"];
        openapi_raw [label=<📋 openapi.json
OpenAPI 3.0 schema
<FONT POINT-SIZE="9">~1800 paths · ~3400 params</FONT>>, shape=cylinder, fillcolor="#37474f", fontcolor=white, color="#263238"];

        parse_tree -> map_ops -> parse_types -> openapi_raw;
    }

    openapi_validate [label=<✔️ Validate OpenAPI 3.0
<FONT FACE="Courier" POINT-SIZE="9">bun validate-openapi.ts</FONT>
swagger-parser>, fillcolor="#6a1b9a", fontcolor=white, color="#4a148c"];

    subgraph cluster_enrich {
        label=<📚 5 · ENRICH WITH DOCUMENTATION
<FONT POINT-SIZE="9">enrich-openapi.ts + Rosetta SQLite DB</FONT>>;
        style="rounded,filled"; fillcolor="#fbe9e7"; color="#bf360c"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        rosetta_dl [label=<Download Rosetta SQLite DB
<FONT FACE="Courier" POINT-SIZE="9">ros-help.db.gz</FONT>
Parsed from help.mikrotik.com
<FONT POINT-SIZE="9">Official RouterOS manual pages</FONT>>, fillcolor="#e65100", fontcolor=white, color="#bf360c"];
        match_paths [label=<Match API Paths → Manual Pages
<FONT POINT-SIZE="9">/ip/address → "IP Address" page</FONT>
<FONT POINT-SIZE="9">/interface/bridge → "Bridge" page</FONT>
Multi-strategy: path · title · abbreviation>, fillcolor="#e65100", fontcolor=white, color="#bf360c"];
        add_docs [label=<Add externalDocs Links
Each operation gets a link to
help.mikrotik.com documentation>, fillcolor="#e65100", fontcolor=white, color="#bf360c"];
        add_descs [label=<Enrich Property Descriptions
Merge manual descriptions with
RouterOS syntax type info>, fillcolor="#e65100", fontcolor=white, color="#bf360c"];
        enriched [label=<📋 openapi.json ✨
Enriched with docs links
<FONT POINT-SIZE="9">~40% operations linked
~36% args described</FONT>>, shape=cylinder, fillcolor="#37474f", fontcolor=white, color="#263238"];

        rosetta_dl -> match_paths -> add_docs -> add_descs -> enriched;
    }

    subgraph cluster_publish {
        label=<🚀 6 · PUBLISH TO GITHUB PAGES>;
        style="rounded,filled"; fillcolor="#e0f2f1"; color="#004d40"; penwidth=2;
        fontname="Helvetica"; fontsize=12;

        commit [label=<Git Commit to main
<FONT FACE="Courier" POINT-SIZE="9">docs/{version}/</FONT>
schema.raml · inspect.json · openapi.json>, fillcolor="#00695c", fontcolor=white, color="#004d40"];
        push [label=<Push with Retry + Rebase
Handles concurrent builds
<FONT POINT-SIZE="9">(base + extra packages in parallel)</FONT>>, fillcolor="#00695c", fontcolor=white, color="#004d40"];
        pages [label=<🌐 GitHub Pages
tikoci.github.io/restraml
Interactive schema explorer
Diff tool · Command lookup>, fillcolor="#00695c", fontcolor=white, color="#004d40", penwidth=2];

        commit -> push -> pages;
    }

    dispatch -> qemu_install [lhead=cluster_infra, penwidth=2, color="#546e7a"];
    ready -> start_crawl [lhead=cluster_crawl, penwidth=2, color="#546e7a"];
    raml_out -> raml_validate [penwidth=1.5];
    inspect_json -> parse_tree [lhead=cluster_openapi, penwidth=2, color="#546e7a"];
    raml_validate -> parse_tree [lhead=cluster_openapi, style=dashed, color="#6a1b9a"];
    openapi_raw -> openapi_validate [penwidth=1.5];
    openapi_validate -> rosetta_dl [lhead=cluster_enrich, penwidth=2, color="#546e7a"];
    enriched -> commit [lhead=cluster_publish, penwidth=2, color="#546e7a"];
}
[/graphviz]

And that whole process essentially ends up back in GitHub here: [https://github.com/tikoci/restraml/tree/main/docs]() which is "raw" downloads for all the schemas produced.
(GitHub Pages serves same directory as normal HTTPS that download link and API Explorer use)

> ### OpenAPI 3 and other schemas are also downloadable from the main "Schema Download" page on my TIKOCI site:
>
> ### [https://tikoci.github.io/restraml/]()
