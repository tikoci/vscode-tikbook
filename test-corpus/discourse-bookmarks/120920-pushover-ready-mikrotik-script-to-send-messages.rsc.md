[//]: #!tikbook discourse-bookmark topic=120920

# PUSHOVER - ready MikroTik script to send messages

- Source thread: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/1](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 30 total (30 post bookmark(s))
- Posts included: 7
- First bookmarked: `2025-06-28 17:27:38 UTC`
- Last bookmarked: `2025-06-28 17:27:38 UTC`

[//]: #.

## Post 16

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/16](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/16)
- Created: `2024-07-01T20:47:57.000Z`
- Likes on this post: 0

Pushover also support JSON as an input.  And in 5 years since the OP, Mikrotik added JSON support RouterOS scripting (7.13+).

While I'm sure the existing script is fine, I re-wrote to take an RouterOS array with ANY of the allowed by pushover's API.  Since new [:serialize] will deal with types and escaping when converting the RouterOS array into JSON needed by pushover... the code gets dramatically simplier:
```routeros
:global npushover do={
    :local url "https://api.pushover.net/1/messages.json"
    :local headers "Content-Type: application/json"
    :local reqdata [:toarray ""]
    :if ([:typeof $1]="array") do={:set reqdata $1} else={
        :error "\$$0 requires an array of values to set, see https://pushover.net/api"
    }
    :local json [:serialize to=json $reqdata]
    :local resp [/tool/fetch url=$url http-data=$json http-header-field=$headers output=user as-value]
    :local respdata [:deserialize from=json ($resp->"data")]
    :if (($respdata->"status")=1) do={
        /log/debug "$0 $[:put "successfully sent request $($respdata->"request")"]"
    } else={
        /log/warning "$0 failed, got: $[:tostr $resp]"
        :error $resp
    }
}
```
To send a message using pushover using the **$npushover <array>** above, and using an array allows any of the attributes supports like url or priority:

```routeros
$npushover ({ 
        user="u8xxxxxxxxxxx"
        token="acyqxxxxxxxxxxxxxxx"
        message="Perhaps some HTML"
        title="Test Message"
        html=1
        sound="magic"
        priority=0
        url="https://router.lan/rest/system/resource"
        "url_title"="/system/resources"
})
```
See https://pushover.net/api for possible/allowed values.  No validation is provided, kinda by design.  Errors should be output and logged, likely giving a clue as the right values.  And stuff like "priority" has additional allowed attributes like "retry", so validation might block that (or get very complex).

[//]: #.

## Post 19

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/19](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/19)
- Created: `2024-07-09T01:02:57.000Z`
- Likes on this post: 0

```routeros
:global npushover
$npushover ({ 
        user="private"
        token="private"
        message="Mikrotik SXT Rebooted nPushover $[interface/lte/monitor lte1 duration=2]"
        title="MikroTik SXTR"
        html=1
        sound="magic"
        priority=0
        url="https://192.168.x.1"
        "url_title"="MikroTik"
})
```
>
> .. and it executes, but no info from the LTE is included in the message. Any pointers appreciated.

All of the commands with "monitor" are tricky, since it's like a "for loop"...  So you need to remove "duration" and use "once" instead.

```routeros
:global npushover
$npushover ({ 
        user="private"
        token="private"
        message="Mikrotik SXT Rebooted nPushover $[interface/lte/monitor lte1 once as-value]"
        title="MikroTik SXTR"
        html=1
        sound="magic"
        priority=0
        url="https://192.168.x.1"
        "url_title"="MikroTik"
})
```
The "once" cause the /interface/lte/monitor to only return **one set** of value to insert into the message.  You could use a duration, but that requires collecting the LTE monitor data into a new variable, and then using the new variable in the message.

[//]: #.

## Post 21

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/21](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/21)
- Created: `2024-07-09T19:40:18.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

My bad.  I forgot to add the "as-value" — that's critical to returning the data for the string.  So it should be "$[/interface/lte/monitor lte1 once as-value]".

[//]: #.

## Post 23

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/23](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/23)
- Created: `2024-07-13T18:42:59.000Z`
- Likes on this post: 0

It's not the multi-line output per se.  It the data type returned by "monitor" is a RouterOS array type.  And one rule (which I forgot in my quick example of LTE monitor) is array cannot be interpolated, so a ":tostr" is needed.  This will get rather ugly output, but should work:

```routeros
$npushover ({ 
        user="private"
        token="private"
        message="Mikrotik SXT Rebooted nPushover
<pre> $[:tostr [/interface/lte/monitor lte1 once as-value]]</pre>"
        title="MikroTik SXTR"
        html=1
        sound="magic"
        priority=0
        url="https://192.168.x.1"
        "url_title"="MikroTik"
})
```
Alternatively, you can collect the LTE monitor BEFORE build the PUSHOVER message, and use invidudual data items from LTE monitor in the string, like this:

```routeros
{
:global npushover
:local mdata [/interface/lte/monitor lte1 once as-value]
$npushover ({ 
        user="private"
        token="private"
        message="Mikrotik SXT Rebooted nPushover
<pre>$($mdata->"primary-band") sinr: $($mdata->"sinr") rsrq: $($mdata->"rsrq") rsrp: $($mdata->"rsrp")</pre>"
        title="MikroTik SXTR"
        html=1
        sound="magic"
        priority=0
        url="https://192.168.x.1"
        "url_title"="MikroTik"
})
}
```

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/26](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/26)
- Created: `2024-10-21T01:52:00.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I wrote for 7.15 that a bit cleaner, see [npushover above](https://forum.mikrotik.com/posting.php?mode=quote&p=1104316#postingbox).

But your issue may be permissions on RouterOS side....  You likely have put the script in /system/script with "Do not require permissions" with "policy" and "test" rights to run /tool/fetch.  I believe there should be some log about it but perhaps not.

> policy - policy that grants user management rights. Should be used together with the write policy. > **Allows also to see global variables created by other users (requires also 'test' policy)**> .
> test - policy that grants rights to run ping, traceroute, bandwidth-test, wireless scan, snooper, > **fetch**> , email and other test commands

(from https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User), which is linked from Scripting, referring to "etc" to mean Dude)

> **Note:** > Only scripts (including schedulers, netwatch, > **etc**> ) with equal or higher permission rights can execute other scripts.

(from: https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting#Scripting-Scriptrepository)

But permissions is what's changed from 7.6.

[//]: #.

## Post 28

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/28](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/28)
- Created: `2024-10-21T15:04:25.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Well I do not use notification with Dude, so IDK.  But I'm not sure your Terminal test is exactly same user context as Dude running a notification.  I cannot say for sure, but when Dude run calls RouterOS... that's more similar to netwatch (which uses a *sys user), than Terminal from a logged in admin user.

Best you can do is add debug logging and perhaps something shows up when Dude call pushover.  Because if it works in Terminal it ain't the script code itself, thus the theory on permissions - since there are not a lot of other options...

Does calling a more basic script work from Dude? i.e. one that does not use /tool/fetch or global variables...

[//]: #.

## Post 30

- Original post: [https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/30](https://forum.mikrotik.com/t/pushover-ready-mikrotik-script-to-send-messages/120920/30)
- Created: `2024-10-21T16:57:59.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

In this form it works and that's enough for me. Thank you.

> /tool fetch mode=https url="> https://api.pushover.net/1/messages.json> " http-method=post http-data="token=axxxxxxx&user=uxxxxx1&message=Service [Probe.Name] on [Device.Name] is now [Service.Status]" output=none;
[/quote]

No :global variables maybe...  glad it works.
