[//]: #!tikbook discourse-bookmark topic=176540

# Script Execution Error - Dynu.com 7.13 was fine 7.15 no bueno

- Source thread: [https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/1](https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 15 total (15 post bookmark(s))
- Posts included: 4
- First bookmarked: `2025-06-16 20:20:28 UTC`
- Last bookmarked: `2025-06-16 20:20:28 UTC`

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/5](https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/5)
- Created: `2024-06-08T16:55:39.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

You can save it as .rsc file to Files, then in CLI use ":import dnsscript.rsc verbose=yes".  (And 7.16beta has more options to verbose= to help troubleshoot scripts)

That would have shown an issues issue in the first lines:

```routeros
/system script
add name=Dynu
policy=read,write,test
```
while it should have been just "add name=Dynu policy=read,write,test".  There may be other issues but lines 2-3 should have been one be the first problem.

I suspect how line-ending are treated between and/or terminal size when cut-and-pasting is involved here.  RouterOS has been "doing stuff" with the line-ending in recent version, so perhaps when cut-and-pasting back line 2-3 did become just one before. Don't know.  I'd imagine Dynu (or someone) tested, but the translation to webpage something went wrong & recent RouterOS has gotten picker about line-ending/etc.  Anyway, a lot can go wrong in just the copy-and-paste part :wink:.

[//]: #.

## Post 8

- Original post: [https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/8](https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/8)
- Created: `2024-06-09T16:28:55.000Z`
- Likes on this post: 0

Fair enough.  I didn't get past the first line.

As I look beyond the 3rd line :wink:.  The policy is right.

My guess is the "src-path=" in the /tool/fetch line.  While that has historically work with HTTP, in V7 using url= is better plan.

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/9](https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/9)
- Created: `2024-06-09T21:49:03.000Z`
- Likes on this post: 0

I wrote a more modern version using a function.  This works in 7.16beta1 and 7.13.  Since it's a function, the parameters like username, password, WAN interface, and DDNS are at bottom:

```routeros
$updateDynu MYHOST.ddnsgeek.com user=MYUSER password=MYPASSWORD interface=ether1
```
You should be able to use it the command line or in a script, and both logs and ":put".  I'd recommend you cut-and-paste the function (without out the line above) to /system/script with same policy read,write,test policy, called "updateDynu".  To have it run as periodically, just add a /system/schedule script with same policy with the "on-event" simply being "updateDynu" (or SAME of /system/script with the Dynu DDNS update code below).

```routeros
:global updateDynu 
:set updateDynu do={
    # handle parameters to Dynu "cmd function"
    :local ddnshost $1
    :local theinterface $interface
    :local ddnsuser $user
    :local ddnspass $password
    :local dynuGetUpdateUrl "https://api.dynu.com/nic/update?hostname=$ddnshost"
    
    # helper functions to print help and log...
    :local printUsage do={
        :put " Usage"
        :put "\$updateDynu <ddns_hostname> user=<dynu_user> password=<dynupass> interface=<WAN> [force=yes]"
    }
    
    # check that DDNS name is provided as 1st argument, error if not
    :if ([:typeof $1]!="str") do={
        $printUsage
        :local errmsg "ERROR: \$updateDynu requires a DDNS hostname [$ddnshost]"
        /log error $errmsg 
        :error $errmsg 
    }

    # check that DDNS name is provided as 1st argument, error if not
    :if (([:typeof $user]!="str") || ([:typeof $password]!="str")) do={
        $printUsage
        :local errmsg "ERROR: \$updateDynu requires a username and password [$ddnshost]"
        /log error $errmsg 
        :error $errmsg 
    }

    # if "interface=ether1" is provided use that, do not detect 
    # get the WAN ip address (removing /xx prefix)
    :local wanip 
    :if ([:typeof $theinterface]="str") do={
        /log/debug [:put "$ddnshost update using WAN interface: $theinterface "]
        :local wanipid [/ip/address/find interface=($theinterface)]
        :if ([:len $wanipid]!=1) do={
           :local errmsg "ERROR: \$updateDynu invalid interface $theinterface, found $[:tostr $wanipid]"
            /log error $errmsg 
            :error $errmsg  
        }
        :local wanipprefix [/ip/address/get $wanipid address]
        :set wanip [:tostr [:pick $wanipprefix 0 [:find $wanipprefix "/" ]]]
        /log/debug [:put "$theinterface got ipprefix=$wanipprefix ip=$wanip updating $ddnshost"]
        :if ([:typeof [:toip $wanip]]!="ip") do={
            :local errmsg "ERROR: \$updateDynu invalid /ip/address. prefix=$[:tostr $wanipprefix] ip=$[:tostr $wanip]"
            /log error $errmsg 
            :error $errmsg 
        }
        :set dynuGetUpdateUrl "$dynuGetUpdateUrl&myip=$wanip" 
    } else={
        /log/info [:put "$ddnshost no interface= provided, auto-detected based on http request be used"]
    }

    # is update needed?
    :local doUpdate false
    :local cacheDns [:tostr [:resolve $ddnshost]]
    :local resolvedDns [:tostr [:resolve $ddnshost  server=[:resolve NS1.DYNU.COM]]]
    :if ($resolvedDns!=$wanip) do={
        /log/debug [:put "will attempt update, $resolvedDns does not equal $[:tostr $wanip]"]
        :set doUpdate true
    }
    :if ($force~"(yes|true|y|1)") do={
        /log/debug [:put "will attempt update, force=yes for $resolvedDns"]
        :set doUpdate true
    }
    #/log/debug [:put "DDNS update: $doUpdate <= resolve=$resolvedDns cache=$cacheDns force=$force ip=$wanip host=$ddnshost"]
    
    # update dynu
    :if ($doUpdate) do={
        :onerror err in={
            /log/debug [:put "DDNS HTTP update started, using $dynuGetUpdateUrl"]
            :local dynuHttp [/tool/fetch http-method=get user=$ddnsuser password=$ddnspass url=$dynuGetUpdateUrl as-value output=user]
            /log/debug [:put "DDNS HTTP update finished, got: $[:tostr $dynuHttp]"]
            :if (($dynuHttp->"data")~"good") do={
                /log info [:put "DDNS $ddnshost updated from $resolvedDns to $[:pick ($dynuHttp->"data") 5 32]"]
            } else={
                :if (($dynuHttp->"data")~"badauth") do={
                    :error "** failed due to auth issue, $($dynuHttp->"data")" 
                } 
                /log warning [:put "WARNING: $ddnshost update reported not $($dynuHttp->"data")"]
            }
        } do={
            :local errmsg "ERROR: $ddnshost from $resolvedDns had HTTP issue: $err"
            /log error [:put $errmsg]
            :return [:nothing] 
        }
    } else={
        /log/info [:put "no update of $ddnshost needed <= resolve=$resolvedDns cache=$cacheDns ip=$wanip"]
    }
    :return [:nothing]
}
```
```routeros
$updateDynu MYHOST.ddnsgeek.com user=MYUSER password=MYPASSWORD interface=ether1 
```
If things work at BOTH command line and script the same – which functions do.  It means if you cut-and-paste to command line, it will should the errors in Terminal in RED.  So you can edit, and try again.  Once things go to /system/script, it is hard to spot errors.  So Dynu having different scripts for the different cases is also not good – since you cannot test same code.

[//]: #.

## Post 14

- Original post: [https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/14](https://forum.mikrotik.com/t/script-execution-error-dynu-com-7-13-was-fine-7-15-no-bueno/176540/14)
- Created: `2024-06-12T16:53:55.000Z`
- Likes on this post: 0

Few notes about the "new" Dynu script above:

1. My script above is for NEWER RouterOS versions.  Specifically, it uses an ":onerror" built-in command which was added recently.  Since one way to deal with potential script error is more output on what a script is going... the newer ":onerror" is needed to capture any error message from /tool/fetch so it can go to the logs/console.

2. Some of the logging use "/log/debug" which is NOT enabled by default.  I do this since once it works... there is no need to clutter logs.  BUT... if something does go wrong with my script, you can enabled "debug" log topic using a "/system/logging add topics=debug" to see any "/log/debug" message if run from script/scheduler.  If run from the CLI, however, all logging is always shown since [:put] does not have a log level (and called before the /log).

3. Dynu seems to have a newer REST API, that uses an "API Key".  I don't use that here - since you have do stuff in your account to get the API key and different code.  But using an API key and REST method be better since the user/password wouldn't have to be stored on RouterOS.  And since recent RouterOS support JSON, it be possible.

On Mr. Rextended's comments...

> Quoted forum context omitted.

Perhaps.  I just use the "subject"/"noun" of the function's operation as an "positional parameter".  While things that _control_ a function's operation get named parameters with the user=syntax.  So "myhost.ddnsgeek.com" is kinda the noun/subject, it does not an attribute in my schemes...
But really just style....  It be easy to change script to take a "host=", as the $1 is used only two spots if someone wanted to...

But where $1 is does NOT actually matter.  It works before or after any "named arguments". For example,

```routeros
:global anyorder do={ 
    :put "\$1 is $1"
    :put "\$arg1 is $arg1"
    :put "\$arg2 is $arg2"
}
```
> $anyorder arg1=val1 arg2=val2 unnamedArg
>
> > $1 is unnamedArg
> $arg1 is val1
> $arg2 is val2
>

> $anyorder arg1=val1 unnamedArg arg2=val2
>
> > $1 is unnamedArg
> $arg1 is val1
> $arg2 is val2
>

> Quoted forum context omitted.

Perhaps.  Just it was already a long script.  And Dynu will report the name is not associated with the account back from /tool/fetch, so not end of world.  Andshould show up as some kinda of error in log/:put.

I actually did have a "[:convert from=raw to=url mydns.example.com]" in the code to deal with url-encoding... but since DNS names should NOT  have anything that needs escaping I removed it.  And username/password would be dealt with by /tool/fetch.
