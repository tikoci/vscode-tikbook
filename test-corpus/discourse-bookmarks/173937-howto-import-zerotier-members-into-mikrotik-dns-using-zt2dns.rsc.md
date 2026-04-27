[//]: #!tikbook discourse-bookmark topic=173937

# HOWTO:  Import ZeroTier Members into Mikrotik DNS using $ZT2DNS

- Source thread: [https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/1](https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 7 total (topic bookmark)
- Posts included: 4
- First bookmarked: `2025-06-16 20:34:15 UTC`
- Last bookmarked: `2025-06-16 20:34:15 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/1](https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/1)
- Created: `2024-02-27T05:20:18.000Z`
- Likes on this post: 0

I have a bash scripts that used `jq` and `awk` to create DNS host files using the ZeroTier API to extract ZT member name and IPs (see bottom).  I "ported" the linux-style one to Mikrotik script today, thought I share since imagine other have similar need to get hostname from the list of zerotier members, automatically.

Calling ZeroTier's API is actually now possible with the new JSON support in RouterOS 7.13+ – older versions will NOT work with script.  The code uses /tool/fetch with a user's API token to get a JSON array of ZeroTier members.  That's converted to an scripting array using new ":deserialize from=json", and then looped to add static DNS entries to Mikrotik, checking if name already exists.

**First**, to use ZeroTier API, you need to **create a "API Access Tokens"** at bottom of https://my.zerotier.com/account . You'll want to keep this someplace safe, but you'll need to use that in the "token=" variable in the script below.  You'll also need the ZeroTier "Network ID" for the network you want to "export" DNS entries from.  Only one network can be extracted at a time.  If network= is not provided, the first running ZeroTier interface is used.

To use it... next add the following function to /system/scripts or scheduler or **cut-and-paste it to test**:

```routeros
:global ZT2DNS do={
    :if ($1="help") do={
        :put "\$ZT2DNS - updates static DNS on Mikrotik from a ZeroTier network"
        :put "  usage: \$ZT2DNS token=<api_token> [network=<network_id>] [suffix=<dns_domain>]"
        :put "     <api_token> is 'API Access Tokens' from https://my.zerotier.com/account "
        :put "     <network_id> is ZeroTier network ID to use. Default: first running ZT interface"
        :put "     <suffix> added to name= in DNS entries, must include any leading dot. Default: \"\""
        :return [:nothing]
    }
    :if ([:typeof $token]!="str") do={:error "token= must be specific with a ZeroTier API token"}
    :local ztnet $token 
    :if ([:typeof $network]="str") do={
        :set ztnet $network
    } else={:set ztnet [/zerotier/interface/get ([/zerotier/interface/find running]->0) network]} 
    :local dnssuffix $suffix
    :local ztmembers [:deserialize from=json ([/tool/fetch url="https://api.zerotier.com/api/v1/network/$ztnet/member" http-header-field="Authorization: token $token" as-value output=user]->"data")]
    :foreach k,v in=$ztmembers do={
        :foreach ip in=($v->"config"->"ipAssignments") do={
            :if ([:len [/ip/dns/static/find name="$($v->"name")$dnssuffix"]]=0) do={
                /ip/dns/static/add address=$ip name="$($v->"name")$dnssuffix"
                :put "/ip/dns/static add address=$ip name=$($v->"name")$dnssuffix"
            } else={:put "# skip: $ip with name $($v->"name")$dnssuffix"}
        } 
    }
}
# v1.2
```
And full example to call function is:

```routeros
$ZT2DNS token="OcKJlkasdkjaasdfSDFASD"  suffix=".example.com" network="123abc456cba"
```
This last line can be **added after the script if used script/scheduler** with **your ZeroTier network id and token** – but it's this last line that actually "calls" the above function to fetch DNS records from ZeroTier.

There is a help screen using "$ZT2DNS help" that described the parameters – only token= is required strictly required:

> [admin@Mikrotik] > > **$ZT2DNS help**
>
> $ZT2DNS - updates static DNS on Mikrotik from a ZeroTier network
>
> usage: $ZT2DNS token=<api_token> [network=<network_id>] [suffix=<dns_domain>]
> <api_token> is 'API Access Tokens' from > https://my.zerotier.com/account >
> <network_id> is ZeroTier network ID to use. Default: first running ZT interface
> <suffix> is appended to name= in DNS entries, must include any leading dot (optional)

LMK if you have problem/issues.  My old script below has worked, but with new JSON support in 7.13...it's now possible to easily do on Mikrotik itself.

---
_FWIW, my less sophisticated version using Linux tools almost makes Mikrotik scripting look friendly (and requires jq [& awk] packages), but this has worked for me to get DNS records for Mikrotik from a ZeroTier network.  I manually run it as needed but above Mikrotik script could be /system/scheduler on the Mikrotik itself to update periodically._

```routeros
ZT_TOKEN=zerotier-API-token-FROM-my.zerotier.com-AccountPage
ZT_NET=zt-network-id
curl -X GET -H "Authorization: token $ZT_TOKEN" https://api.zerotier.com/api/v1/network/$ZT_NET/member |
jq -r '(.[] | [.config.ipAssignments[], .name]) | @tsv' |
awk 'length($1)>0 && length($2)>0 { print "/ip/dns/static add address="$1" name="$2".zt" } '
```

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/3](https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/3)
- Created: `2024-05-30T19:30:29.000Z`
- Likes on this post: 0

I created an updated script (below)  that supports at least the 6PLANE part of IPv6 from ZT.  I cheated with the 6PLANE stuff.  I just make the 6PLANE address a parameter —  so you cut-and-paste the "base" one, and the $ZT2DNS will just substitute into that one.

I have not done much testing, but this should be working.  The new full command line using 6PLANE look like:

```routeros
$ZT2DNS token="$token" suffix=".zt" network="$network" ipv6="6plane" zt6plane="fcae:42c9:c1
__:____:____:0000:0000:0001" replace=yes dry=no debug=no
```
To add AAAA for the 6PLANE, there are two more parameters.
**ipv6="6plane" zt6plane="fcae:42c9:c1__:____:____:0000:0000:0001"** - the first one can only be "6plane" not RFC-style - but thinking ahead.  And the zt6plane= can be cut-and-paste from ZT's website for the network as the solution today.

I add a few new options, notably a **replace=yes**.  But also **debug=yes** and **dry=yes** – all "default" to no.  The dry=yes does not run any commands, but will output the commands need (or close proximate).  These are also in the help.

> **$ZT2DNS token="$zttoken" suffix=".zttest" network="ebe7fbd445a53215" 
> ipv6="6plane" zt6plane="fcae:42c9:c1__:____:____:0000:0000:0001" 
> replace=no dry=yes debug=no**
>
> 6PLANE AAAA DNS enabled using template: fcae:42c9:c1__:____:____:0000:0000:0001
> ```
> ### DRY MODE - NOT RUN ###
> /ip/dns/static add address=172.23.13.229 name=me.zttest
> # in $mkplane template=fcae:42c9:c1__:____:____:0000:0000:0001 (str) ztid=1fceb9a1b0 (str)
> # got 6PLANE fcae:42c9:c11f:ceb9:a1b0:0000:0000:0001 from 1fceb9a1b0
> ### DRY MODE - NOT RUN ###
> /ip/dns/static add address=fcae:42c9:c11f:ceb9:a1b0:0000:0000:0001 name=me.zttest

But a "beta" version of a newer script with 6PLANE is here for anyone to try:

```routeros
:global ZT2DNS do={
    :if ($1="help") do={
        :put "\$ZT2DNS - updates static DNS on Mikrotik from a ZeroTier network"
        :put "  usage: \$ZT2DNS token=<api_token> [network=<network_id>] [suffix=<dns_domain>]"
        :put "     <api_token> is 'API Access Tokens' from https://my.zerotier.com/account "
        :put "     <network_id> is ZeroTier network ID to use. Default: first running ZT interface"
        :put "     <suffix> added to name= in DNS entries, must include any leading dot. Default: \"\""
        :put "  advanced usage: (all optional)"
        :put "     replace=<yes|no> if record exists, update it"
        :put "     debug=<yes|no> adds debug output. Default: no"
        :put "     dry=<yes|no> does NOT modify DNS. Default: no"
        :put "     ipv6=<6plane|none> calculates 6PLANE address"
        :put "     zt6plane=<from-zt-central> calculates 6PLANE address. Default:\r\n\t\tfca00:0000:00__:____:____:0000:0000:0001"
        :return [:nothing]
    }
    # handle options
    :if ([:typeof $token]!="str") do={:error "token= must be specific with a ZeroTier API token"}
    :local ztnet $token 
    :if ([:typeof $network]="str") do={
        :set ztnet $network
    } else={:set ztnet [/zerotier/interface/get ([/zerotier/interface/find running]->0) network]} 
    :local dnssuffix $suffix

    # handle 6PLANE

    :local ex6plane "fc00:0000:00__:____:____:0000:0000:0001"
    :if ([:typeof $zt6plane]="str") do={:set ex6plane $zt6plane}
    :local use6plane false
    :if ($ipv6="6plane") do={ 
        :set use6plane true
        :put "\t # 6PLANE AAAA DNS enabled using template: $ex6plane" 
    }
    :local mk6plane do={
        #:set template [:tostr $template]
        #:set ztid [:tostr $ztid]
        :local ztid $memberid
        :put "\t\t# in \$mkplane template=$template ($[:typeof $template]) ztid=$ztid ($[:typeof $ztid])"
        
        :return "$[:pick $template 0 12]$[:pick $ztid 0 2]:$[:pick $ztid 2 6]:$[:pick $ztid 6 10]:$[:pick $template 25 39 ]"
    }

    # get data from ZT Central API via REST
    :local ztmembers [:deserialize from=json ([/tool/fetch url="https://api.zerotier.com/api/v1/network/$ztnet/member" http-header-field="Authorization: token $token" as-value output=user]->"data")]
    :if ($debug~"[yY]" ) do={
            :put "### JSON FROM ZEROTIER ###"
            :put [:serialize to=json $ztmembers]
    }

    # process members for DNS
    :foreach k,v in=$ztmembers do={
        :if ($debug~"[yY]" ) do={
            :put "\r\n### PROCESSING ZT MEMBER \"$($v->"name")\" ###"
            :foreach kc,vc in=($v->"config") do={:put "   $($v->"name") -- $kc = $[:tostr $vc] ($[:typeof $vc])"}
        }
        :foreach ip in=($v->"config"->"ipAssignments") do={
            :if ([:len [/ip/dns/static/find type!=AAAA name="$($v->"name")$dnssuffix"]]=0) do={
                :if ($dry~"[Yy]" = false) do={
                    /ip/dns/static/add type=A address=$ip name="$($v->"name")$dnssuffix"
                } else={ :put "\t\t### DRY MODE - NOT RUN ###" }
                :put "/ip/dns/static add address=$ip name=$($v->"name")$dnssuffix"
            } else={
                :if ($replace~"[Yy]") do={
                    :if ($dry~"[Yy]" = false) do={
                        /ip/dns/static/set [find type!=AAAA name="$($v->"name")$dnssuffix]"] address=$ip 
                    } else={ :put "\t\t### DRY MODE - NOT RUN ###" }
                    :put "/ip/dns/static set $[/ip/dns/static/find type!="AAAA" name="$($v->"name")$dnssuffix"] address=$ip"
                } else={
                    :put "# skip: $ip with name $($v->"name")$dnssuffix"
                }
            }
        } 
        :if ($use6plane) do={
            :local aaaa [$mk6plane template=$ex6plane memberid=($v->"config"->"address")]
            :put "\t\t# got 6PLANE $aaaa from $($v->"config"->"address")"   
            :if ([:len [/ip/dns/static/find type=AAAA name="$($v->"name")$dnssuffix"]]=0) do={
                :if ($dry~"[Yy]" = false) do={
                    /ip/dns/static/add type=AAAA address=$aaaa name="$($v->"name")$dnssuffix"
                } else={ :put "\t\t### DRY MODE - NOT RUN ###" }
                :put "/ip/dns/static add address=$aaaa name=$($v->"name")$dnssuffix"
            } else={
                 :if ($replace~"[Yy]") do={
                    :if ($dry~"[Yy]" = false) do={
                        /ip/dns/static/set [find type=AAAA name="$($v->"name")$dnssuffix]"] address=$aaaa 
                    } else={ :put "\t\t### DRY MODE - NOT RUN ###" }
                    :put "/ip/dns/static set $[/ip/dns/static/find type=AAAA name="$($v->"name")$dnssuffix"] address=$aaaa"
                } else={
                    :put "# skip: 6PLANE for $($v->"name")$dnssuffix using $aaaa"
                }
            } 
        }

    }
}
```
**n.b.**
_The 6PLANE value is NOT in the ZT's REST API, so you do needed to the do the math to divine the "magic prefix" from network id. And... it actually be an even more code in what was to be a simple script. And also a small protest since new [:convert] ideally be get me a hexstring from a number type, but cannot.
But here is a "semi-manually" method to calculate ZeroTier's 6PLANE "magic prefix" - just a bunch of work tedious work to add to the $ZT2DNS._

```routeros
{
	# For "toss away" network I created to test this... 
	# 6PLANE in ZT Central show as "fcae:42c9:c1__:____:____:0000:0000:0001"
	# Network ID is:
:local net "ebe7fbd445a53215"
	# So doing the XOR as the docs explain, in RouterOS form:
:put [([:tonum "0x$[:pick $net 8 16]"]^[:tonum "0x$[:pick $net 0 8]"])]
# 2923612609

	# Since the "fc" is always the prefix for experimental, the relevant part is "ae:42c9:c1"
	# (should be calculated, so cheat to get it as a number from that str)
:put [:tonum "0xae42c9c1"] 
# 2923612609

# == it the same, so it the bits are same - just not in right format...

# ISSUE is new [:convert] cannot get a "hexstring" from a number...
# see @rextended's http://forum.mikrotik.com/t/how-to-covert-int-to-hex-type-value-and-save-it-in-a-string/52654/1 - so possible but a fair amount of other code is needed
# thus... cut-and-paste 6PLANE into command line, same as network=
}
```

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/4](https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/4)
- Created: `2024-05-31T15:28:27.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

To be honest, ZT really should just have the 6PLANE address available from their REST API.   But below is RouterOS function that does should follow the logic of https://docs.zerotier.com/docker-6plane .  I'd add to the my script, but I don't have time to test it and only have one network with 6PLANE enabled to test this even.

If you/someone want to try this and it works to get the right address, I'll add it to the $ZT2DNS code above instead of the "6PLANE cut-and-paste template"  method.

```routeros
:global get6plane do={
    :local net $network
    :local mem $memberid
    :local ip6prefix "fc"

    # get the "magic" ZT network part of the 6PLANE adddress 
    :local xornet [([:tonum "0x$[:pick $net 8 16]"]^[:tonum "0x$[:pick $net 0 8]"])]

    # it's a number type, but to get build an IPv6 type, the hexstring is needed
    # num2hex converter (credit @rextended, http://forum.mikrotik.com/t/how-to-covert-int-to-hex-type-value-and-save-it-in-a-string/52654/1 )
    :local num2hex do={
        :local number  [:tonum $1]
        :local hexadec "0"
        :local remainder 0
        :local hexChars "0123456789ABCDEF"
        :if ($number > 0) do={:set hexadec ""}
        :while ( $number > 0 ) do={
                :set remainder ($number % 16)
                :set number (($number-$remainder) / 16)
                :set hexadec ([:pick $hexChars $remainder].$hexadec)
        } 
        :if ([:len $hexadec] = 1) do={:set hexadec "0$hexadec"}
        # return "0x$hexadec" - changed to remove "0x" part...
        :return "$hexadec"
    }

    :local rawnetpart [$num2hex $xornet]
    :put "\t\t# debug: network XOR 'magic' - $rawnetpart"
    :put "\t\t# testing: network=ebe7fbd445a53215 should get 2923612609"
    
    # build the IPv6 address prefix as long hexstring, without colons
    :local rawaddr "fc$($rawnetpart)$($memberid)"
    :put "\t\t# debug: combined with memberid - $rawaddr"
    
    # add the IPv6 colons in middle of hex
    :local addrstr ""
    :for i from=0 to=20 step=4 do={
        :set addrstr "$addrstr$[:pick $rawaddr $i ($i+4)]:"
    }
    :put "\t\t# debug: network part with colons - $addrstr"
    
    # convert the str, with ZT default host of ::1
    :local ip6plane [:toip6 "$($addrstr)1"]
    :put "\t\t# info: ZT 6PLANE IPv6 as ip6 type: $ip6plane $[:typeof $ip6plane]"

    # if not an IPv6 type, fail script to find any bugs
    :if ([:typeof $ip6plane]!="ip6") do={:error "stopping!  6PLANE not calculated, using network=$network memberid=$memberid"}

    :return $ip6plane
}

:put [$get6plane network="ebe7fbd445a53215" memberid="078f1823b5"]
```
_version 1_

```routeros
:put [$get6plane network="ebe7fbd445a53215" memberid="078f1823b5"]
# fcae:42c9:c107:8f18:23b5:1
```
edit: in RouterOS, the function can be shorten a bit using new `convert` method that come in at least a year ago now.

So this part can be retired:
```routeros
    # it's a number type, but to get build an IPv6 type, the hexstring is needed
    # num2hex converter (credit @rextended, http://forum.mikrotik.com/t/how-to-covert-int-to-hex-type-value-and-save-it-in-a-string/52654/1 )
 :local num2hex do={
        :local number  [:tonum $1]
        :local hexadec "0"
        :local remainder 0
        :local hexChars "0123456789ABCDEF"
        :if ($number > 0) do={:set hexadec ""}
        :while ( $number > 0 ) do={
                :set remainder ($number % 16)
                :set number (($number-$remainder) / 16)
                :set hexadec ([:pick $hexChars $remainder].$hexadec)
        } 
        :if ([:len $hexadec] = 1) do={:set hexadec "0$hexadec"}
        # return "0x$hexadec" - changed to remove "0x" part...
        :return "$hexadec"
    }
```
since in newer RouterOS versions have `:convert from=num`:
```routeros
:local rawnetpart [:convert from=num to=hex [:tonum $xornet]]
```
So new updated version be:
```routeros
:global get6plane do={
    :local net $network
    :local mem $memberid
    :local ip6prefix "fc"

    # get the "magic" ZT network part of the 6PLANE adddress 
    :local xornet [([:tonum "0x$[:pick $net 8 16]"]^[:tonum "0x$[:pick $net 0 8]"])]
    :local rawnetpart [:convert from=num to=hex [:tonum $xornet]]
    :put "\t\t# debug: network XOR 'magic' - $rawnetpart"
    :put "\t\t# testing: network=ebe7fbd445a53215 should get 2923612609"
    
    # build the IPv6 address prefix as long hexstring, without colons
    :local rawaddr "fc$($rawnetpart)$($memberid)"
    :put "\t\t# debug: combined with memberid - $rawaddr"
    
    # add the IPv6 colons in middle of hex
    :local addrstr ""
    :for i from=0 to=20 step=4 do={
        :set addrstr "$addrstr$[:pick $rawaddr $i ($i+4)]:"
    }
    :put "\t\t# debug: network part with colons - $addrstr"
    
    # convert the str, with ZT default host of ::1
    :local ip6plane [:toip6 "$($addrstr)1"]
    :put "\t\t# info: ZT 6PLANE IPv6 as ip6 type: $ip6plane $[:typeof $ip6plane]"

    # if not an IPv6 type, fail script to find any bugs
    :if ([:typeof $ip6plane]!="ip6") do={:error "stopping!  6PLANE not calculated, using network=$network memberid=$memberid"}

    :return $ip6plane
}

:put [$get6plane network="ebe7fbd445a53215" memberid="078f1823b5"]
```
_version 2_

[//]: #.

## Post 6

- Original post: [https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/6](https://forum.mikrotik.com/t/howto-import-zerotier-members-into-mikrotik-dns-using-zt2dns/173937/6)
- Created: `2026-01-16T19:44:05.726Z`
- Likes on this post: 0

I suspect the issue is permissions.  Newer RouterOS restricts `/tool/fetch` in system scripts.  You can try setting "Do Not Require Permissions" on the script if it's run from scheduler.  But how to import "global functions" has gotten harder in recent versions...
