[//]: #!tikbook discourse-bookmark topic=181480

# 🧐 example of automating VLAN creation/removal/inspecting using $mkvlan & friends...

- Source thread: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/1](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 49 total (topic bookmark)
- Posts included: 21
- First bookmarked: `2025-06-16 20:16:05 UTC`
- Last bookmarked: `2025-06-16 20:16:05 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/1](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/1)
- Created: `2025-01-25T00:43:58.000Z`
- Likes on this post: 0

## Index to **VLAN Automation Scripts** _in thread_
_This thread has grown to include a collection of scripts, posted at random points....  Since some post deal with troubleshooting/bugs/commentary.  I'll try to maintain this index to the relevant "sub-topics" here._

Please note that all scripts here **require at least 7.17+ or some case 7.18+** to work as-is.   Some script be adapted to work on older versions. But the goal here was to have "some example" of scripting VLAN stuff.  For example, in my uses cases, it's lab/automated testing — generally when needing a lot of VLANs quick.   To be clear, it is NOT the goal to be a formal "script library" for VLANs in a live data center, but feel free to take-and-adapt as needed from here.

[$mkvlan/$rmvlan/$catvlan](%5Burl=#!)... (just below here)
These script deal generally deal with "adding a VLAN" to fresh RouterOS, including mapping IP subnets to VLAN IDs in orderly fashion and adding DHCP stuff.  Showing nothing adding, as well as "debugging" in $catvlan, and removal in $rmvlan.  There are pretty simple example of "script functions for config" - which easily means you can use function as "macros" for more complex commands, since function can take parameter and other-wise "act like" built-in commands same approach can work for other areas than VLANs.

> _**Hint:**
Even if you don't use these scripts, please take it as my strong advice to > **have some "IP addressing plan"** > when using VLAN (and VRRP, etc .etc).  I'm not sure this advice is well captured in the various VLAN guides._

[$mktrunk & $rmtrunk](https://forum.mikrotik.com/viewtopic.php?t=214189#p1123226)...
These script functions will "tag" (or untag) bridge port <interface> with a provided <vlan-id> & vice versa with vlan-id= too. Note, there is no "access port" script, see below, but $mkvlan already has example of how to make an "access port" by setting PVID on /interface/bridge/port, using the "real" command seems appropriate, i.e.

> EX: So to make 'ether3' an access point, only the following additional command is:
> /interface/bridge/port set [find interface=ether3] pvid=123 frame-types=allow-only-untagged

_i.e. IMO no need to wrap something if just one command, so above makes an a bridge port an "access port", at least in 7.16+.  The UI allow same change using PVID under VLAN section of dialog for a port under Bridge > Port.  Prior version would also require the bridge port be marked as tagged= too, so for "setting an access port" it's may be more than one command prior to 7.16+._

> _**Note:** 
> There is no $lsvlan in the UNIX® naming style for this collection.  This is the "missing script" since that show summary of IP address/routing/etc for all VLANs, basically the missing $lsvlan be the Layer 3 compliment to the $lsbridge's Layer 2 view.  I have some version of one that I'll get around to posting, but it won't be as pretty as $lsbridge as my idea for $lsvlan is as a way to "export VLANs to Excel"._

[$lsbridge for "inspecting" VLAN bridging](https://forum.mikrotik.com/viewtopic.php?t=214189#p1123276)...
To use this one, please see the instructions listed in [Post #33](https://forum.mikrotik.com/viewtopic.php?t=214189#p1128707) which has more details.  But here is what $lsbridge will visualize for a simple bridge on KNOT:

Forum attachment omitted: 7.18 on KNOT one-vlan defconf with $lsbridge .png

**$mkvlan/$rmvlan/$catvlan Examples**

First, these **function will only work on 7.17+**, and must have a /interface/bridge with vlan-filtering=yes enabled.

The "functions" below wrap operations around VLANs – including DHCP server, interface list, address-list, etc.   They employ a few "scripting tricks" internally (including [<%% operator](http://forum.mikrotik.com/t/a-few-undocumented-operators-that-are-kind-of-neat/163557/1) ) and other newer syntax features for example (:grep, :convert, :serialize, export where, etc).

For example, to create a new VLAN:
**$mkvlan <vlan-id>**
...and working VLAN should be added and you simply pvid= on a port in /interface/bridge/port

To "dump" the various config:
**$catvlan <vlan-id>**
...which will do various "print" to output the running state.

And to remove a VLAN that was created using $mkvlan:
**$rmvlan <vlan-id>**

It will automatically assign a unique IPv4 subnet based the PVID provided. So as part of the operation, another function name **$pvid2array <vlan-id>** is used to calculate the various IP things needed to create things.  It can be used separately to  "calculate" unique subnets – but have some known scheme to generate the various IP prefix/address/pool/etc things.  Another function **$prettyprint** , included in code below, is used to format the output.  In all case, $pvid2array will always generated the SAME subnet from SAME PVID/vlan-id, so it's safe to call multiple times to get same data.

For example, **$prettyprint [$pvid2array 18]** will generate the following (which is used internally by $mkvlan):

> ```json
> {
> "basename": "vlan18",
> "cidraddr": "192.168.18.1/24",
> "cidrnet": "192.168.18.0/24",
> "commenttag": "#autovlan 18",
> "dhcpdns": "192.168.18.1",
> "dhcpgw": "192.168.18.1",
> "dhcppool": "192.168.18.10-192.168.18.249",
> "ipprefix": "192.168.18",
> "routerip": "192.168.18.1",
> "vlanbridge": "bridge",
> "vlanid": 18
> }
> ```

Internally $pvid2array generates a 172.x.y.0/24 address for PVID > 256... So picking a random vlan-id above 256, you can see the difference.
**$prettyprint [$pvid2array [:rndnum from=257 to=4094]]**

> ```json
> {
> "basename": "vlan2668",
> "cidraddr": "172.25.108.1/24",
> "cidrnet": "172.25.108.0/24",
> "commenttag": "#autovlan 2668",
> "dhcpdns": "172.25.108.1",
> "dhcpgw": "172.25.108.1",
> "dhcppool": "172.25.108.10-172.25.108.249",
> "ipprefix": "172.25.108",
> "routerip": "172.25.108.1",
> "vlanbridge": "bridge",
> "vlanid": 2668
> }
> ```

To use them, you need add /system/script named "autovlan" with a cut-and-paste of following code to the source= & then from Terminal run "/system/script run autovlan" which will allow $mkvlan, $catvlan, $rmvlan, $prettyprint, and $pvid2array function from the Terminal:

# VLAN Script — $mkvlan & friend

```routeros
# USER SETTINGS
# autovlanstyle - overrides the default IP addressing scheme,
#                 valid values: "bytes", "bytes10", or "split10"
:global autovlanstyle
#       i.e. by adding a valid style to end of above, like this: 
# :global autovlanstyle "split10"

# FUNCTIONS AND CODE
:global pvid2array do={
    # process formating
    :global autovlanstyle
    :local schema "bytes"
    :if ([:typeof $style] = "str") do={
        :if ($style~"bytes|bytes10|split10") do={} else={
            :error "$0 style= must be either bytes | bytes10 | split10 "
        }
        :set schema $style
    } 
    :if ([:typeof $autovlanstyle] = "str") do={
        :if ($autovlanstyle~"bytes|bytes10|split10") do={
            :set schema $autovlanstyle
        }
    }

    # move first argument to function, the PVID, to a variable
    :local vlanid [:tonum $1]
    
    # check it PVID is valid, if not show help and error (which exits script)
    :if ([:typeof $vlanid] != "num" || $vlanid < 2 || $vlanid > 4094) do={
        :error "PVID must be valid as first argument to command function" 
    }
    
    # find the bridge interface ...
    :local bridgeid [/interface bridge find vlan-filtering=yes]
    :if ([:len $bridgeid] != 1) do={
        :error "A bridge with vlan-filtering=yes is required, and there can be only one for this script."
    }

    # uses :convert to break pvid into array with 2 elements between 0-256
    :local vlanbytes [:convert from=num to=byte-array $vlanid]  
    :local lowbits ($vlanbytes->0)
    :local highbits ($vlanbytes->1)

    # UGLY workaround for MIPSBE/other, detected when we don't get two parts from the vlan-id
    :if ([:len $vlanbytes]>2) do={
        :if ($vlanid > 255) do={
            # even worse workaround, normalize to 8 bytes - ros wrongly trims leading 0
            :if ([:len $vlanbytes]=7) do={ 
                # make it len=8 by pre-pending a 0 - so the swap below is correct
                :set vlanbytes (0,$vlanbytes) 
            }
            # now swap the high and low bytes
            :set lowbits ($vlanbytes->1)
            :set highbits ($vlanbytes->0)  
        } 
        # lowbits is right if under 256
    }

    :local ipprefix "0.0.0"
    :if ($schema = "bytes") do={
        # for pvid below 257, use 192.168.<pvid>.0/24 as base IP prefix
        # for others map pvid into unique /24 with 172.<lowbits+15>.<highbits>.0/24
        :if ($vlanid < 256) do={
            :set ipprefix "192.168.$vlanid"
        } else={
            :set ipprefix "172.$($lowbits + 15).$highbits" 
        }
    }
    :if ($schema = "bytes10") do={
        # map pvid into unique /24 with 10.<lowbits>.<highbits>.0/24
        :if ($vlanid < 256) do={
            :set ipprefix "10.0.$vlanid"
        } else={
            :set ipprefix "10.$($lowbits+1).$highbits" 
        }
    }
    :if ($schema = "split10") do={
        :if ($vlanid < 100) do={
            :set ipprefix "10.0.$vlanid" 
        } else={
            :set ipprefix "10.$[:tonum [:pick $vlanid 0 ([:len $vlanid]-2)]].$[:tonum [:pick $vlanid ([:len $vlanid]-2) [:len $vlanid]]]"
        }
    }

    # now calculate the various "formats" of a prefix for use in other scripts
    :return {
        "vlanid"="$vlanid";
        "basename"="vlan$vlanid";
        "commenttag"="mkvlan $vlanid";
        "vlanbridge"="$[/interface/bridge get $bridgeid name]";
        "ipprefix"="$ipprefix";
        "cidrnet"="$ipprefix.0/24";
        "cidraddr"="$ipprefix.1/24";
        "routerip"="$ipprefix.1"; 
        "dhcppool"="$ipprefix.10-$ipprefix.249"; 
        "dhcpgw"="$ipprefix.1"; 
        "dhcpdns"="$ipprefix.1"
    }
}

:global prettyprint do={
    :if ([:typeof $1]="nothing") do={
        :put "usage: $0 <data> - print provided <data>, including arrays, in a pretty format"
        :put "example: $0 {\"num\"=1;\"str\"=\"text\";\"float\"=\"0.123\"}"
        :error
    }
    :put [:serialize to=json options=json.pretty $1]
    :return $1
}

:global mkvlan do={
    :global pvid2array
    :global mkvlan

    :if ([:typeof [:tonum $1]]="num") do={
        :global mkvlan 
        :return ($mkvlan <%% [$pvid2array [:tonum $1]])
    }

    :put "starting VLAN network creation for $cidrnet using id $vlanid ..."
    
    :put " - adding $basename interface on $vlanbridge using vlan-id=$vlanid"
    /interface vlan add vlan-id=$vlanid interface=$vlanbridge name=$basename comment=$commenttag

    :put " - assigning IP address of $cidraddr for $basename"
    /ip address add interface=$basename address=$cidraddr comment=$commenttag

    :put " - adding IP address pool $dhcppool for DHCP"
    /ip pool add name=$basename ranges=$dhcppool comment=$commenttag

    :put " - adding dhcp-server $basename "
    /ip dhcp-server add address-pool=$basename disabled=no interface=$basename name=$basename comment=$commenttag 

    :put " - adding DHCP /24 network using gateway=$dhcpgw and dns-server=$dhcpdns"
    /ip dhcp-server network add address=$cidrnet gateway=$dhcpgw dns-server=$dhcpdns comment=$commenttag 

    :put " - add VLAN network to interface LAN list"
    :if ([:len [/interface list find name=LAN]] = 1) do={
        /interface list member add list=LAN interface=$basename comment=$commenttag 
    }

    :put " - create FW address-list for VLAN network for $cidrnet"
    /ip firewall address-list add list=$basename address=$cidrnet comment=$commenttag  

    :put " * NOTE: in 7.16+, the VLAN $vlanid is dynamically added to /interface/bridge/vlans with tagged=$vlanbridge "
    :put "         thus making an access port ONLY involves setting pvid=$vlanid on a /interface/bridge/port"
    :put " * EX:   So to make 'ether3' an access point, only the following additional command is:"
    :put "           /interface/bridge/port set [find interface=ether3] pvid=$vlanid frame-types=allow-only-untagged"

    /log info [:put "VLAN network created for $cidrnet for vlan-id=$vlanid"]
}

:global rmvlan do={
    :global pvid2array
    :global rmvlan
    :local tag "INVALID"
    :if ([:typeof [:tonum $1]]="num") do={
        :global rmvlan 
        :return ($rmvlan <%% [$pvid2array [:tonum $1]])
    }
    :if ([:typeof $comment]="str") do={
        :set tag $comment
    } else={
        :if ([:typeof $commenttag]="str") do={
            :set tag $commenttag 
        } else={
            :error "$0 requires with an tag provided by '$0 comment=mytag' or via '($0 <%% [$pvid2array 1001]"
        }
    }

    :put "starting VLAN network removal for comment=$tag"
    :put " - remove $basename interface on $vlanbridge using vlan-id=$vlanid"
    /interface vlan remove [find comment=$tag]

    :put " - remove IP address of $cidraddr for $basename"
    /ip address remove [find comment=$tag]

    :put " - remove IP address pool $dhcppool for DHCP"
    /ip pool remove [find comment=$tag]

    :put " - removing dhcp-server $basename "
    /ip dhcp-server remove [find comment=$tag] 

    :put " - remove DHCP /24 network using gateway=$dhcpgw and dns-server=$dhcpdns"
    /ip dhcp-server network remove [find comment=$tag] 

    :put " - remove VLAN network to interface LAN list"
    /interface list member remove [find comment=$tag] 

    :put " - create FW address-list for VLAN network for $cidrnet"
    /ip firewall address-list remove [find comment=$tag]  

    /log info [:put "VLAN network removed for comment=$tag"]
}

:global catvlan do={
    :global pvid2array
    :global catvlan
    :global prettyprint
    :local tag "INVALID"
    :local json [:toarray ""]
    :if ([:typeof [:tonum $1]]="num") do={
        :return [($catvlan <%% [$pvid2array [:tonum $1]])]
    }
    :if ([:typeof $comment]="str") do={
        :set tag $comment
    } else={
        :if ([:typeof $commenttag]="str") do={
            :set tag $commenttag 
        } else={
            :error "$0 requires with an tag provided by '$0 comment=mytag' or via '($0 <%% [$pvid2array 1001]"
        }
    }

    :set ($json->"/interface/vlan") [/interface vlan print detail as-value where comment=$tag]
    :set ($json->"/ip/address") [/ip address print detail as-value where comment=$tag]
    :set ($json->"/ip/pool") [/ip pool print detail as-value where comment=$tag]
    :set ($json->"/ip/dhcp-server") [/ip dhcp-server print detail as-value where comment=$tag] 
    :set ($json->"/ip/dhcp-server/network") [/ip dhcp-server network print detail as-value where comment=$tag] 
    :set ($json->"/interface/list/member") [/interface list member print detail as-value where comment=$tag]
    :set ($json->"/ip/firewall/address-list") [/ip firewall address-list print detail as-value where comment=$tag] 
    

    # This logic to use "export where" does not work, and causes wierd bug - disabling for now
    #:put "VLAN network config..."
    #:put ""
    #[:parse ":grep pattern=\"^/\" script={/interface/vlan/export terse where comment=\"$tag\"} "];
    #[:parse ":grep pattern=\"^/\" script={/ip/address/export terse where comment=\"$tag\"} "];
    #[:parse ":grep pattern=\"^/\" script={/ip/pool/export terse where comment=\"$tag\"} "];
    #[:parse ":grep pattern=\"^/\" script={:grep pattern=\"lease-time\" script={/ip/dhcp-server/export terse where comment=\"$tag\"}} "];
    #[[:parse ":grep pattern=\"^/\" script={/ip/dhcp-server/network/export terse where comment=\"$tag\"} "]]; 
    #[[:parse ":grep pattern=\"^/\" script={/interface/list/member/export terse where comment=\"$tag\"} "]];
    #[[:parse ":grep pattern=\"^/\" script={/ip firewall address-list/export terse where comment=\"$tag\"} "]]; 
    #:put ""

    :return [$prettyprint $json]
}
```
So after adding the "autovlan" functions above to a /system/script...you can use them like so

```routeros
/system/script/run autovlan
$mkvlan 123
```
> #### output
> ```text
> starting VLAN network creation for 192.168.123.0/24 using id 123 ...
> - adding vlan123 interface on bridge using vlan-id=123
> - assigning IP address of 192.168.123.1/24 for vlan123
> - adding IP address pool 192.168.123.10-192.168.123.249 for DHCP
> - adding dhcp-server vlan123
> - adding DHCP /24 network using gateway=192.168.123.1 and dns-server=192.168.123.1
> - add VLAN network to interface LAN list
> - create FW address-list for VLAN network for 192.168.123.0/24
> * NOTE: in 7.16+, the VLAN 123 is dynamically added to /interface/bridge/vlans with tagged=bridge
> thus making an access port ONLY involves setting pvid=123 on a /interface/bridge/port
> * EX:   So to make 'ether3' an access point, only the following additional command is:
> /interface/bridge/port set [find interface=ether3] pvid=123 frame-types=allow-only-untagged
> VLAN network created for 192.168.123.0/24 for vlan-id=123
> ```

To confirm it created it use:

```routeros
$catvlan 123
```
> #### VLAN network debugging...
> ```json
> - /interface/vlan
> [
> {
> ".id": "*138",
> "arp": "enabled",
> "arp-timeout": "auto",
> "comment": "mkvlan 123",
> "interface": "bridge",
> "l2mtu": 1588,
> "loop-protect": "default",
> "loop-protect-disable-time": "1970-01-01 00:05:00",
> "loop-protect-send-interval": "1970-01-01 00:00:05",
> "loop-protect-status": "off",
> "mac-address": "74:4D:28:38:B3:CD",
> "mtu": 1500,
> "mvrp": false,
> "name": "vlan123",
> "use-service-tag": false,
> "vlan-id": 123
> }
> ]
> - /ip/address
> [
> {
> ".id": "*120",
> "actual-interface": "vlan123",
> "address": "192.168.123.1/24",
> "comment": "mkvlan 123",
> "interface": "vlan123",
> "network": "192.168.123.0"
> }
> ]
> - /ip/pool
> [
> {
> ".id": "*13",
> "comment": "mkvlan 123",
> "name": "vlan123",
> "ranges": [
> "192.168.123.10-192.168.123.249"
> ]
> }
> ]
> - /ip/dhcp-server
> [
> {
> ".id": "*F",
> "address-lists": [],
> "address-pool": "vlan123",
> "comment": "mkvlan 123",
> "interface": "vlan123",
> "lease-script": "",
> "lease-time": "1970-01-01 00:30:00",
> "name": "vlan123",
> "use-radius": "no"
> }
> ]
> - /ip/dhcp-server/network
> [
> {
> ".id": "*F",
> "address": "192.168.123.0/24",
> "caps-manager": [],
> "comment": "mkvlan 123",
> "dhcp-option": [],
> "dns-server": "192.168.123.1",
> "gateway": [
> "192.168.123.1"
> ],
> "ntp-server": [],
> "wins-server": []
> }
> ]
> - /interface/list/member
> [
> {
> ".id": "*6F",
> "comment": "mkvlan 123",
> "dynamic": false,
> "interface": "vlan123",
> "list": "LAN"
> }
> ]
> - /ip firewall address-list
> [
> {
> ".id": "*1D",
> "address": "192.168.123.0/24",
> "comment": "mkvlan 123",
> "creation-time": "2025-01-24 16:31:46",
> "dynamic": false,
> "list": "vlan123"
> }
> ]
> ```

> ### VLAN network config...
>```routeros
> /interface vlan add comment="mkvlan 123" interface=bridge name=vlan123 vlan-id=123
> /ip address add address=192.168.123.1/24 comment="mkvlan 123" disabled=no interface=vlan123 network=192.168.123.0
> /ip pool add comment="mkvlan 123" name=vlan123 ranges=192.168.123.10-192.168.123.249
> /ip dhcp-server add address-lists="" address-pool=vlan123 comment="mkvlan 123" disabled=no interface=vlan123 lease-script="" lease-time=30m n
> ame=vlan123 use-radius=no
> /ip dhcp-server network add address=192.168.123.0/24 caps-manager="" comment="mkvlan 123" dhcp-option="" dns-server=192.168.123.1 gateway=192
> .168.123.1 !next-server ntp-server="" wins-server=""
> /interface list member add comment="mkvlan 123" disabled=no interface=vlan123 list=LAN
> /ip firewall address-list add address=192.168.123.0/24 comment="mkvlan 123" disabled=no dynamic=no list=vlan123
> ```

And to remove it,

```routeros
$rmvlan 123
```
> ####  output
> ```text
> starting VLAN network removal for comment=mkvlan 123
> - remove vlan123 interface on bridge using vlan-id=123
> - remove IP address of 192.168.123.1/24 for vlan123
> - remove IP address pool 192.168.123.10-192.168.123.249 for DHCP
> - removing dhcp-server vlan123
> - remove DHCP /24 network using gateway=192.168.123.1 and dns-server=192.168.123.1
> - remove VLAN network to interface LAN list
> - create FW address-list for VLAN network for 192.168.123.0/24
> VLAN network removed for comment=mkvlan 123
> ```

And to confirm it's deleted another **$catvlan 123** would show this after removal:

> #### VLAN network debugging...
> ```text
> - /interface/vlan
> []
> - /ip/address
> []
> - /ip/pool
> []
> - /ip/dhcp-server
> []
> - /ip/dhcp-server/network
> []
> - /interface/list/member
> []
> - /ip firewall address-list
> []
>
> VLAN network config...
> ```

Feel free to modified the scripts to customize how the VLAN gets created and/or how IP prefix/etc gets calculated, add VRRP to VLANs, etc.  Assume you added the function to a /system/script named "autovlan"... _if you want to EDIT the file, it really best to do that in the Terminal editor (Ctrl-O will save, Ctrl-C will exit without saving, Ctrl-A goes to begin of line, Ctrl-E goes to line end, 2x Ctrl-E goes to end of doc)_

Here are some example usages:

```routeros
/system/script/edit autovlan source
```
The reason for this recommendation is the Terminal's edit will do syntax-coloring — so error will be see.  If you use winbox or webfig to edit script, no realtime checking is done (and the proportional font make it hard to read too).

**_Versions_**
v1.4 - cleanup after import, no change other than formatting
v1.3  - handle buggy [:convert to=byte-array] on MIPSBE, see [post #20](https://forum.mikrotik.com/viewtopic.php?t=214189#p1122089)
v1.2  - fix logic error when autovlanstyle is unset
v1.1  - fix when running as /system/script; remove catvlan export where; new ip subnet schemes; minor cleanup
v1.0  - initial

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/4](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/4)
- Created: `2025-01-25T16:55:13.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

It could still use cleanup, and alternative "numbering plans"...

Despite my commentary on the forum on esoteric scripting topics... my business use for scripting is automating doing config, or output setting without running a dozen CLI commands.    Yet there actually aren't a lot of example of automating one of more common topics like VLAN.  So thought I start a discussion about it...

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/5](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/5)
- Created: `2025-01-25T17:29:34.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I realized it should have some choice of "style" for how the PVID/vlan-id is converted to an IP address.  And, just note, you can always use that part of the $pvid2array and $prettyprint code without the rest of the automatic config stuff, like you want to a way to pick a subnet for a VLAN

Currently only one "style" is used, but I'm thing of adding some option to use a different scheme to convert the PVID/vlan-id into a subnet.

The current scheme is what I'm calling "bytes" – that will use 192.168.<0-254>.0 for VLAN IDs below 255.  Above 255 to max of 4094, a 172.<16-30>.<0-254>.0 is used.  Keep in mind in express in HEX would look like 0x0ABB – for the 172.0x0A.0xBB.0 (with the 0x0A being added by 0x0F... which makes it (base10) range 16-32.  _(With newer ":convert to=byte-array"  breaking up the PVID in 2 parts)_.

Basically if always use VLAN ID below 255, you'll get a 192.168.<vlanid> to keep things one-to-one between subnet part and VLAN ID.  Since the "bytes" does get confusing...

**style=bytes**
$prettyprint [$pvid2array style=bytes **99**]
{
"cidrnet": "192.**168.99**.0/24",
"vlanid": 99
}
$prettyprint [$pvid2array style=bytes **1234**]
{
"cidrnet": "172.**19.210**.0/24",
"vlanid": 1234
}
# bytes are still linear :wink:... so for 123**5** it's still the next /24 subnet:
$prettyprint [$pvid2array style=bytes 123**5**]
{
"cidrnet": "172.19.21**1**.0/24",
"vlanid": 1235
}

The newer schemes I came up with are "split10" and "bytes10", which use 10.x.x.x.

The "split10" uses the base10 parts of the PVID to make the IP address... so VLAN 123 is 10.1.23 - this skeps the binary/hex and make the VLAN readable just from the subnet.

**style=split10**
$prettyprint [$pvid2array style=split10 **99**]
{
"cidrnet": "10.**0.99**.0/24",
"vlanid": 99
}
$prettyprint [$pvid2array style=split10 **1234**]
{
"cidrnet": "10.**12.34**.0/24",
"vlanid": 1234
}

Likely less useful than above, the same scheme use in "default" bytes scheme, except it ALWAYS uses the 10.x.x.x private range:

**style=bytes10**
$prettyprint [$pvid2array style=bytes10 **99**]
{
"cidrnet": "10.**0.99**.0/24",
"vlanid": 99
}
$prettyprint [$pvid2array style=bytes10 **1234**]
{
"cidrnet": "10.**5.210**.0/24",
"vlanid": 1234
}

Anyway, if anyone has suggestion/improvement/bugs LMK here.  I'll probably update the script with minor cleanup this weekend.  And likely some "$lsvlan" to print a table of the various config (IP, dhcp, etc) for each VLAN interface in one list...

[//]: #.

## Post 8

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/8](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/8)
- Created: `2025-01-26T14:20:36.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

It turns out some code in catvlan might not work when run from /system/script (but did from when cut-and-paste code to CLI).  I already had some other minor updates, so a posted a new version.  I tested when run after loading from a /system/script – so it should work now.  There is a new global "autovlanstyle" in this version that can control how address are generated (i.e. 'split10' would use 10.12.34.0/24 for vlan-id 1234, 10.0.2.0/24 for vlan-id 2), which I'll explain how to use soon...

Also "$catvlan" will only work VLANs that are automatically generated by "$mkvlan".  So the $catvlan 60 would not have worked, but you ran into a bug that happens when functions are run from /system/script before you got to that one :wink:.

I have a "$lsvlan" that I should post (but need to test it) – which does list ALL VLANs (and associated DHCP/IP/etc stuff in one table).  This one is actually more complex, since the trick with mkvlan/rmvlan is using comment= to align everything - but that's not possible for an non-automated VLAN, so it take more scripting to build some "combined view" of ANY arbitrary VLAN.

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/9](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/9)
- Created: `2025-01-26T14:28:46.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Yeah I'm working towards that… As you see above, there might be bugs :wink:

And likely more cleanup/+options on the mkvlan/rmvlan/catvlan are need here.  And still like to combine these my "TUI scripts" like $INQUIRE to have some holistic "scripted setup" – that prompt for some details before advocating this approach for newbies yet.  For setting up test routers, it's  more handy today….

I have thought about a 7.16+ version @pcunite's VLAN/multiwan guide, using scripting functions. Mikrotik has done good work in scripting – and VLAN bridging – of late… so some of these things are easier.  i.e. "someone" puts in feature requests for the esoteric things seen in the "console -" release notes.   I have a lot script functions, but I post them as way to force me to clean them up :wink: but the writeup takes longer (as I'm sure you know)…

> Quoted forum context omitted.

Now that's a different topic...  I have thought about writing my own setup guide – at least for 7.16+.  The approach I take – which may be controversial – is a few things different:

1. **Leave the any defconf untouched by scripts**. So that means leaving IP address on bridge interface itself.  Potentially setting the basics on QuickSet screen.  If you want VLANs, you can **use bridge interface for the management VLAN**, instead of "LAN". This also allows QuickSet to set the some management or any IP LAN safely.  This tracks what UBNT does with its hybrid port scheme, which I think is reasonable.  Basically… LAN are always VLAN, management port is the bridge interface.  And these functions never touch comment=defconf - which is what makes QuickSet unsafe - so leave that stuff alone...

2. **Set "/interface/bridge/set [find] vlan-filtering=yes" as the FIRST thing** – not @pcunite's last thing.  Reason the bridge's pvid=1, and bridge ports are also pvid=1 – and RouterOS will automatically untag the bridge interface on those port WITHOUT any additional config.  All just works.  The only side effect is winbox MAY drop the connection, but will reconnect it quickly.  My belief is this is safer to at the start with a default configuration and NO change – since it's known harmless at that point.  While setting vlan-filtering=yes at end of configuration mean any mistake will cause you do lose access – now this why the "off-bridge management port" is often recommended – but this has it's drawbacks in that adds more complexity (and same risk for config error too) with only benefit of avoiding using bridge interface for L3 (or perhaps if you had complex topology than some LANs-as-VLANs).

3. **In 7.16+, there is NO need to explicitly set tagged=bridge for a vlan-id in /interface/bridge/vlan** - that happens automatically.  So some of the explaining just goes away as result.  This leave ONLY setting /interface/bridge/port's pvid= to make an access port.  Only for trunk or hybrid ports is adding a vlan-id to /interface/bridge/vlan needed, and then it's adding an trunk ports as tagged=.  Basically there is a lot dynamic bridge configuration that happens that make it WAY easier to script (or even do "by hand") that's all new since 7.15/7.16.  None of the guides really reflect this more streamlined process for bridge ports.

In addition, part of @pcunite's guide covers multiple routers/switches/APs.  One thing I've **thought is this is where MVRP** might be a useful addition – although I don't handle it script above today. But MVRP is just a couple settings to enable and should enable "syncing VLANs" when right bridge setting.  Also I'm also a f**an of VRRP, so if you have multiple routers that should be covered** since for LAN-side VLAN's it's actually pretty trivial configuration — and why I have a separate IP subnet generation function since VRRP add more variant IP things.  To @pcunite's multiwan I'd probably add some _tangent_ about using LTE in routed mode with VRRP (instead of LTE passthrough) for some cases…but that's a different topic.

Anyway more thinking than actions at this point, but building been requisite parts one function at time for a bit, so getting closer.

[//]: #.

## Post 11

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/11](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/11)
- Created: `2025-01-27T13:22:37.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

My bad.  And thanks for testing!!!  I updated the script, v1.2 with a fix.

_There was a new global, "autovlanstyle" also add in the update.  But it had a logic error there but only when autovlanstyle is empty — and I didn't notice since I had it set which avoid the logic issue. Basically I had a else={} block when it should have be a do={} block in the $pvid2array that generates the IP address_

> _:if ($autovlanstyle~"bytes|bytes10|split10") > **do={} else=**> {
> :set schema $autovlanstyle
> }_

_should have been_

> _:if ($autovlanstyle~"bytes|bytes10|split10") do={> } else=> {
> :set schema $autovlanstyle
> }_

Anyway, you should be able to update the script from top post (v1.2), which has that fix, and try again — $pvid2array <vlan-id> will JUST show what be used:

```routeros
/system/script/run autovlan
$prettyprint [$pvid2array 60]
```
> {
> "basename": "vlan60",
> "cidraddr": "192.168.60.1/24",
> "cidrnet": "192.168.60.0/24",
> "commenttag": "mkvlan 60",
> "dhcpdns": "192.168.60.1",
> "dhcpgw": "192.168.60.1",
> "dhcppool": "192.168.60.10-192.168.60.249",
> "ipprefix": "192.168.60",
> "routerip": "192.168.60.1",
> "vlanbridge": "bridge",
> "vlanid": 60
> }

Also, you can set the "IP generation style" use the $autovlanstyle global which control what scheme is used to generate IPs - this uses the "split10" scheme:

```routeros
:set autovlanstyle split10
$prettyprint [$pvid2array 60]
```
> {
> "basename": "vlan60",
> "cidraddr": "10.0.60.1/24",
> "cidrnet": "10.0.60.0/24",
> "commenttag": "mkvlan 60",
> "dhcpdns": "10.0.60.1",
> "dhcpgw": "10.0.60.1",
> "dhcppool": "10.0.60.10-10.0.60.249",
> "ipprefix": "10.0.60",
> "routerip": "10.0.60.1",
> "vlanbridge": "bridge",
> "vlanid": 60
> }

And the "vlanautostyle" effects the $mkvlan too (both the :set and /sys/script/run are only need once per terminal):

```routeros
/system/script/run autovlan
:set autovlanstyle split10
$mkvlan 60
$catvlan 60
```
> starting VLAN network creation for 10.0.60.0/24 using id 60 ...
> - adding vlan60 interface on bridge using vlan-id=60
> - assigning IP address of 10.0.60.1/24 for vlan60
> - adding IP address pool 10.0.60.10-10.0.60.249 for DHCP
> - adding dhcp-server vlan60
> - adding DHCP /24 network using gateway=10.0.60.1 and dns-server=10.0.60.1
> - add VLAN network to interface LAN list
> - create FW address-list for VLAN network for 10.0.60.0/24
> * NOTE: in 7.16+, the VLAN 60 is dynamically added to /interface/bridge/vlans with tagged=bridge
> thus making an access port ONLY involves setting pvid=60 on a /interface/bridge/port
> * EX:   So to make 'ether3' an access point, only the following additional command is:
> /interface/bridge/port set [find interface=ether3] pvid=60 frame-types=allow-only-untagged
> VLAN network created for 10.0.60.0/24 for vlan-id=60

> {
> "/interface/list/member": [
> {
> ".id": "*79",
> "comment": "mkvlan 60",
> "dynamic": false,
> "interface": "vlan60",
> "list": "LAN"
> }
> ],
> "/interface/vlan": [
> {
> ".id": "*142",
> "arp": "enabled",
> "arp-timeout": "auto",
> "comment": "mkvlan 60",
> "interface": "bridge",
> "l2mtu": 1588,
> "loop-protect": "default",
> "loop-protect-disable-time": "1970-01-01 00:05:00",
> "loop-protect-send-interval": "1970-01-01 00:00:05",
> "loop-protect-status": "off",
> "mac-address": "74:4D:28:38:B3:CD",
> "mtu": 1500,
> "mvrp": false,
> "name": "vlan60",
> "use-service-tag": false,
> "vlan-id": 60
> }
> ],
> "/ip/address": [
> {
> ".id": "*12A",
> "actual-interface": "vlan60",
> "address": "10.0.60.1/24",
> "comment": "mkvlan 60",
> "interface": "vlan60",
> "network": "10.0.60.0"
> }
> ],
> "/ip/dhcp-server": [
> {
> ".id": "*1A",
> "address-lists": [],
> "address-pool": "vlan60",
> "comment": "mkvlan 60",
> "interface": "vlan60",
> "lease-script": "",
> "lease-time": "1970-01-01 00:30:00",
> "name": "vlan60",
> "use-radius": "no"
> }
> ],
> "/ip/dhcp-server/network": [
> {
> ".id": "*19",
> "address": "10.0.60.0/24",
> "caps-manager": [],
> "comment": "mkvlan 60",
> "dhcp-option": [],
> "dns-server": "10.0.60.1",
> "gateway": [
> "10.0.60.1"
> ],
> "ntp-server": [],
> "wins-server": []
> }
> ],
> "/ip/firewall/address-list": [
> {
> ".id": "*27",
> "address": "10.0.60.0/24",
> "comment": "mkvlan 60",
> "creation-time": "2025-01-27 05:12:08",
> "dynamic": false,
> "list": "vlan60"
> }
> ],
> "/ip/pool": [
> {
> ".id": "*B",
> "comment": "mkvlan 60",
> "name": "vlan60",
> "ranges": [
> "10.0.60.10-10.0.60.249"
> ]
> }
> ]
> }

If you want to **change the default IP address scheme**, just change the variable "autovlanstyle" at the top of the script on your router, so the line:

> :global autovlanstyle

becomes

> :global autovlanstyle "split10"

to cause the scheme to be 10**.**_<pvid[3]><pvid[2]>_**.**_<pvid[1]><pvid[0]>_**.**0/24 - which use the base10 vlan-id, while the default uses base16 split subnets.

[//]: #.

## Post 13

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/13](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/13)
- Created: `2025-01-27T14:58:15.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Hmm.  Somehow the "highbits" in vlan-id are NOT nothing, which is how you ended up with that.  But I don't know how yet....
I do know the "75" comes from that it thinks highbits are the lowbits, so it's adding +16 to get the 172 address to 172.16-31 - but it should NOT be using a 172 address, instead it SHOULD be get 192.168.60.0/24.

Can you try clearing out the variables using the following & then re-run "/system/script/run autovlan"?

```routeros
:global mkvlan
:global catvlan
:global rmvlan
:global prettyprint 
:global pvid2array
:global autovlanstyle
:set mkvlan
:set catvlan
:set rmvlan
:set prettyprint 
:set pvid2array
:set autovlanstyle
/system/script/run autovlan
$prettyprint [$pvid2array 60]
```
If that does NOT work, can you try the following script **at the TerminalCLI**  (and NOT in /system/script) & paste the result here.  And to confirm you're using 7.18beta? – which is what I'm testing too – so this should work.

```routeros
{
    :put "== use :convert to make a byte-array so we can get at the IP parts"
    :local vbytes [:convert from=num to=byte-array 60]
     :local lowbits ($vbytes->0)
    :local highbits ($vbytes->1)
    :local ipprefix "0.0.0"
    :put "\t... got $[:tostr $vbytes]"

    :put "== verify :convert is working as expected"
    :put  "\tHIGH: $[:typeof ($vbytes->1)] $[:len ($vbytes->1)] $($vbytes->1)"
    :put  "\tLOW: $[:typeof ($vbytes->0)] $[:len ($vbytes->0)] $($vbytes->0)"
    :put "\t** HIGH should be 'nothing' - if it something, thats a bug" 

    :put "== replicate SAME code in pvid2array"  
    :if ([:typeof $highbits] = "nothing") do={
        :set ipprefix "192.168.$lowbits"
    } else={
        :set ipprefix "172.$($lowbits + 15).$highbits" 
    }
    :put "\t... which gets a prefix of: $ipprefix" 

    :put "== use DIFFERENT code in pvid2array to check instead for !num"  
    :if ([:typeof $highbits] != "num") do={
        :set ipprefix "192.168.$lowbits"
    } else={
        :set ipprefix "172.$($lowbits + 15).$highbits" 
    }
    :put "\t... which gets a prefix of: $ipprefix" 

}
```

[//]: #.

## Post 17

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/17](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/17)
- Created: `2025-01-27T15:31:08.000Z`
- Likes on this post: 0

Thanks!

It seems some bug in [:convert to=byte-array]:

> == use :convert to make a byte-array so we can get at the IP parts
> ... got 60;0;0;0;0;0;0;0

I'm using an ARM-based RB1100 mainly, and another ARM system to test.

> == use :convert to make a byte-array so we can get at the IP parts
> ... got 60
> == verify :convert is working as expected
> HIGH: nothing 0
> LOW: num 2 60

I'll update the script in a bit to workaround this, I think...  But if you can run this and post it that help narrow this down:

```routeros
:foreach testnum in=(1,60,128,256,257,512,513,4094,4095,1024*1024,1024*1024*1024,1024*1024*1024*1024) do={
    :local bytearray [:convert from=num to=byte-array $testnum]
    :put "$testnum got byte-array: $[:tostr $bytearray] ($[:len $bytearray] $[:typeof $bytearray])"
}
```
> 1 got byte-array: 1 (1 array)
> 60 got byte-array: 60 (1 array)
> 128 got byte-array: 128 (1 array)
> 256 got byte-array: 1;0 (2 array)
> 257 got byte-array: 1;1 (2 array)
> 512 got byte-array: 2;0 (2 array)
> 513 got byte-array: 2;1 (2 array)
> 4094 got byte-array: 15;254 (2 array)
> 4095 got byte-array: 15;255 (2 array)
> 1048576 got byte-array: 16;0;0 (3 array)
> 1073741824 got byte-array: 64;0;0;0 (4 array)
> 1099511627776 got byte-array: 1;0;0;0;0;0 (6 array)

[//]: #.

## Post 19

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/19](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/19)
- Created: `2025-01-27T15:48:58.000Z`
- Likes on this post: 0

Interesting, good find.

It's the CPU, your hAPac is a MIPSBE, while I'm using ARM things on my two test devices for this.  The [geeky explanation](https://en.wikipedia.org/wiki/Endianness) is that "BE" in MIPSBE stand for big-endian, and this affects how numbers are stored in low-level memory blocks, which somehow effecting [:convert].  Although, in theory, RouterOS should normalize this either big/small endian in [:convert] — so I still think it's a bug.

Anyway, I can workaround this.  I'll update the script in bit.

[//]: #.

## Post 20

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/20](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/20)
- Created: `2025-01-27T15:58:59.000Z`
- Likes on this post: 0

_Internal Scripting Notes..._

> Quoted forum context omitted.

More convinced now that look in more detail.   i.e. Even if I give Mikrotik that :convert follow CPU endianness, the array size should be consistently 8:

> 128 got byte-array: 128;0;0;0;0;0;0;0 (8 array)
> 256 got byte-array: 1;0;0;0;0;0;0 (> **7** > array)
> 257 got byte-array: 1;1;0;0;0;0;0;0 (8 array

— the 256 value shows the problem since that also be a length of 8 with a leading zero:
_256 got byte-array: **0;**1;0;0;0;0;0;0 (**8** array)_
... but it's not a length of 8, so that's not actually the byte-array in memory no matter how you slice it.

If anyone wants to try on your TILE router & post results (or other older CPUs), that be helpful:

```routeros
:foreach testnum in=(1,60,128,256,257,512,513,4094,4095,1024*1024,1024*1024*1024,1024*1024*1024*1024) do={
    :local bytearray [:convert from=num to=byte-array $testnum]
    :put "$testnum got byte-array: $[:tostr $bytearray] ($[:len $bytearray] $[:typeof $bytearray])"
}
```
I've been playing with IOT stuff, and been using [:convert to=byte-array], so be good to know it works on OTHER CPUs.

UPDATED: a fix for this problem is in version 1.3 of script in #1 post. Largely adding this:

```routeros
     # uses :convert to break pvid into array with 2 elements between 0-256
    :local vlanbytes [:convert from=num to=byte-array $vlanid]  
    :local lowbits ($vlanbytes->0)
    :local highbits ($vlanbytes->1)

    # UGLY workaround for MIPSBE/other, detected when we don't get two parts from the vlan-id
    :if ([:len $vlanbytes]>2) do={
        :if ($vlanid > 255) do={
            # even worse workaround, normalize to 8 bytes - ros wrongly trims leading 0
            :if ([:len $vlanbytes]=7) do={ 
                # make it len=8 by pre-pending a 0 - so the swap below is correct
                :set vlanbytes (0,$vlanbytes) 
            }
            # now swap the high and low bytes
            :set lowbits ($vlanbytes->1)
            :set highbits ($vlanbytes->0)  
        } 
        # lowbits is right if under 256
    }
```

[//]: #.

## Post 24

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/24](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/24)
- Created: `2025-01-27T17:06:22.000Z`
- Likes on this post: 0

@eddieb - thanks again for testing! -

I put an updated 1.3 version with, hopefully, a fix for the bad-behaving :convert on MIPSBE.  _I put the relevant fix for scripting-denizens in post #20 above._

> Quoted forum context omitted.

No problem – but the [:convert **from=num** ...] part is new 7.17, so that's why it needs to be at least that version.

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/26](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/26)
- Created: `2025-01-27T17:28:23.000Z`
- Likes on this post: 0

Yea!  That looks like it works.  You could confirm it's removed by running the "$catvlan" again and it should everything with a [] empty array.

[//]: #.

## Post 27

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/27](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/27)
- Created: `2025-01-27T17:31:10.000Z`
- Likes on this post: 0

@rextended,

> Quoted forum context omitted.

That's my "split10" style, so if you set that at the top of the script, that's what the $mkvlan/$rmvlan/$catvlan will do already:

```routeros
:global autovlanstyle "split10"
```
Or using a :set before using any of the command functions:

```routeros
/system/script/run autovlan
:set autovlanstyle "split10"
$prettyprint [$pvid2array 1234]
```
> {
> "basename": "vlan1234",
> "cidraddr": "10.12.34.1/24",
> "cidrnet": "10.12.34.0/24",
> "commenttag": "mkvlan 1234",
> "dhcpdns": "10.12.34.1",
> "dhcpgw": "10.12.34.1",
> "dhcppool": "10.12.34.10-10.12.34.249",
> "ipprefix": "10.12.34",
> "routerip": "10.12.34.1",
> "vlanbridge": "bridge",
> "vlanid": 1234
> }

And to @rextended "use vlan-id under 1002/5".  4094 is still a valid vlan-id, so don't think the functions themselves should enforce a rule to keep them under ~1000.

> available only 256 /24 (0..255) so only VLAN 2-255 are used:

But I'll up the ante...  if you **keep your VLAN ID under 256 - which is likely reasonable*** ... the default in $mkvlan will do exactly that.  I figured the 172.16.0.0/12 is already kinda weird (or at least 16-32 part), so if by default you use a >256 VLAN, you do get a potential weird result using binary math - a middle ground on the @rextended's ~1000 rule.  And for something like a "home lab", keeping all the LAN to 192.168.0.0/16 range means 10 and 172 are available for corporate/other VPNs or ISP with CGNAT etc/etc - who are very unlikely going to a 192.168.0.0 scheme.

_* for nearly all folks that don't already have some kind subnet/VLAN/etc numbering plans already - in which case, **$pvid2array is a function, so you can replace that with your own, since all the other function just need an similar structured array and don't require changes for different schemes, only $pvid2array does.**.  Also, there could be non-/24 schemes or other complex schemes too.  More food for thought on how to structure "config code"._

And I agree the "split10" is the most identifiable to the VLAN of course.  And there could be some "bytes172" scheme ... I guess ... that always used 172.x.x.x for everything so pvid=1 be 172.16.0.0/24.

Perhaps the "split10" should be the default?

[//]: #.

## Post 28

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/28](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/28)
- Created: `2025-02-01T16:46:33.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

[...]
I have thought about a 7.16+ version @pcunite's VLAN/multiwan guide, using scripting functions. Mikrotik has done good work in scripting – and VLAN bridging – of late…
[...]
3. **In 7.16+, there is NO need to explicitly set tagged=bridge for a vlan-id in /interface/bridge/vlan** - that happens automatically.  So some of the explaining just goes away as result.  This leave ONLY setting /interface/bridge/port's pvid= to make an access port.  Only for trunk or hybrid ports is adding a vlan-id to /interface/bridge/vlan needed, and then it's adding an trunk ports as tagged=.  Basically there is a lot dynamic bridge configuration that happens that make it WAY easier to script (or even do "by hand") that's all new since 7.15/7.16.  None of the guides really reflect this more streamlined process for bridge ports.
[...]
[/quote]

Adding a couple more function here —  **$mktrunk and $rmtrunk — that will "tag" bridge port <interface> with a provided <vlan-id>**.   I actually skipped these in the initial posting since it's actually not so straightforward to do this**...

Usage is simple:

**$mktrunk <vlan-id> <interface>** - which will add the <interface> as tagged= on some /interface/bridge/vlan - it will either reuse an existing "static" one, or create/"add" a new /interface/bridge/vlan if the provide <vlan-id> was not already there.  The "add" assumes you have only one vlan-filtering=yes bridge, since it need to know which bridge to use.

To remove, it same syntax: **$rmtrunk <vlan-id> <interface>**, which will remove the <interface> from any /interface/bridge/vlan that has <vlan-id> _as a member of vlan-ids= array_.  It has additional logic (marked, "# optional") that will remove the /interface/bridge/vlan if it contains no tagged= or untagged= members at all (since $mktrunk might have created)

Feel free to adapt/improve, again just providing examples of a technique to do this.  These don't have a lot of bells-and-whistles to check things - since "clean" example is already complex... While I think they should be safe, so don't try on a production router or anything like that without some testing.

:global mktrunk do={
        :local bvid [/interface/bridge/vlan find dynamic=no vlan-ids=[:if ([:len [:find $"vlan-ids" $1]]) do={:return $"vlan-ids"}]]
        :if ([:len $bvid]=0) do={
            :set bvid [/interface/bridge/vlan add vlan-ids=$1 comment="added by $0" bridge=[/interface/bridge/find vlan-filtering=yes disabled=no]] 
        }
        /interface/bridge/vlan set $bvid tagged=([get $bvid tagged],$2)
    }

:global rmtrunk do={
        :local bvid [/interface/bridge/vlan find dynamic=no vlan-ids=[:if ([:len [:find $"vlan-ids" $1]]) do={:return $"vlan-ids"}]]
        :local orig [/interface/bridge/vlan get $bvid tagged] 
        :local final [:toarray ""]
        :foreach i in=$orig do={ :if ($i != "$2") do={:set final ($final, $i)} }
        /interface/bridge/vlan set $bvid tagged=$final
        # optional, if there are no more tagged or untagged ports, remove bridge vlan itself        
        :if (([:len [/interface/bridge/vlan get $bvid tagged]]=0) and ([:len [/interface/bridge/vlan get $bvid untagged]]=0)) do={
            /interface/bridge/vlan remove $bvid
        }
        # while mktrunk could take an array of interface, rmtrunk must be a single interface in $2 
 }

# create
    $mktrunk 123 ether4
# update
    $mktrunk 123 ether5
# remove
    $rmtrunk 123 ether5
# note: array is only support on mktrunk, since it was automatic
    $mktrunk 123 ("ether5","ether6")
# but rmtrunk does NOT accept an array and will not find/remove anything
Couple notes:
- again these assume 7.16+ (although should work in any version) — it **does NOT add tagged=bridge when creating the interface**.  In 7.16 that will happen automatically, so theory is best to let it do that post-7.16.
- the **$mkvlan already has example of how to make an "access port" by setting PVID** on /interface/bridge/port, using the "real" command seems appropriate and actually shown there

> EX: So to make 'ether3' an access point, only the following additional command is:
> /interface/bridge/port set [find interface=ether3] pvid=123 frame-types=allow-only-untagged

_** @optio contributed the following exotic part to locate the .id of a /interface/bridge/vlan containing a VLAN ID  – since [find vlan-ids=4] will not work, as vlan-ids is an array type, so 4 != (4) or 4 !=(1,2,3,4) either....  See @pcunite's 3 years-old prophetical [Append Bridge vlan values](http://forum.mikrotik.com/t/append-bridge-vlan-values/147015/1) post which has the discussion about script code above:_

> Quoted forum context omitted.

_Long story short... how this works... while the find is running, essentially, a function is run on each item, and if the inner :find in index matches, the otter [find ...] returns upon finding a matching <VLAN_ID>.  And, note the colon : in ":find", which finds the index in an array, which is not same as the plain "find"... And the careful $"dashed-attrbutes-use-quotes" & 0 == false, etc, etc...  But it quite the dense scripting example for sure..._

[//]: #.

## Post 29

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/29](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/29)
- Created: `2025-02-01T21:35:51.000Z`
- Likes on this post: 0

So the scripts here are part of multi-year background project to build some interactive TUI (terminal user interface) over RouterOS, many covered by my other Scripting topics.  But it takes a lot of parts - the "scripting VLAN bridging" part is covered here.  We'll be on Mars before I'm "done" however.  But unwinding /interface/bridge scripting was a key part and not so simple (see post above).  But one main thing I've want to do is visually view (and ideally, one day, edit) a vlan-filtering=yes /interface/bridge.

Below is a screenshot of **$lsbridge** in this series.  Nothing interactive yet... it just presents the /interface/bridge config as a PivotTable™.
I'm kinda looking for feedback on the look-and-feel right now.  I have included the script if anyone wanted to try, but it's really more a prototype at this point & **requires 7.18beta** on top of that.
Forum attachment omitted: lsbridge-hex-s-forum.jpeg

```routeros
# 2025-02-01 06:02:17 by RouterOS 7.18beta4
# model = RB760iGS
/interface bridge
add add-dhcp-option82=yes admin-mac=B8:69:F4:01:81:18 auto-mac=no comment="main VLAN bridge" dhcp-snooping=yes mvrp=yes name=bridge1 port-cost-mode=short protocol-mode=mstp vlan-filtering=yes
/interface bridge port
add bridge=bridge1 interface=ether2 internal-path-cost=10 path-cost=10 pvid=10 trusted=yes
add bridge=bridge1 interface=ether3 internal-path-cost=10 path-cost=10 pvid=8 trusted=yes
add bridge=bridge1 frame-types=admit-only-vlan-tagged interface=ether4 internal-path-cost=10 path-cost=10 pvid=6 tag-stacking=yes trusted=yes
add bridge=bridge1 ingress-filtering=no interface=ether5 internal-path-cost=10 path-cost=10 pvid=8 tag-stacking=yes trusted=yes
add bridge=bridge1 ingress-filtering=no interface=sfp1 internal-path-cost=10 path-cost=10
add bridge=bridge1 frame-types=admit-only-untagged-and-priority-tagged interface=ether1 internal-path-cost=10 path-cost=10 pvid=8 trusted=yes
/interface bridge vlan
add bridge=bridge1 tagged=bridge1,ether4 untagged=sfp1 vlan-ids=8
add bridge=bridge1 tagged=bridge1 untagged=sfp1 vlan-ids=6
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=10
add bridge=bridge1 comment="added by \$mktrunk" tagged=ether4,sfp1 vlan-ids=2001
add bridge=bridge1 comment="added by \$mktrunk" tagged=ether2,ether5 vlan-ids=3001
```
The full code uses, which include the above helpers here.  I was more trying to "play" with various visual appearance – the code can always be cleaned up later.  This is from a hEX-S with a semi-random bridge setup to show the various flags/colors/letters.  The code uses :serialize and :convert options that do not exist prior to 7.18beta – why I'm call it a "prototype – and also it's pretty inefficient taking a 5-10 seconds.

```routeros
# for array output - \$prettyprint
:global prettyprint do={
    :if ([:typeof $1]="nothing") do={
        :put "usage: $0 <data> - print provided <data>, including arrays, in a pretty format"
        :put "example: $0 {\"num\"=1;\"str\"=\"text\";\"float\"=\"0.123\"}"
        :error ""
    }
    :local jsonstr [:serialize to=json options=json.pretty $1]
    :if ($2 = "as-value") do={ :return $jsonstr } else={ :put $jsonstr }  
}

# logging helpers - \$l0g
:global debug
:global "l0g-no-put"
:global "l0g-no-log"
:global l0g do={
    :global prettyprint
    :local lvl $level
    :if ($lvl~"(debug|info|warning|error)") do={} else={:set lvl "info"}
    :local msg "$[:tostr $1]"
    :if ([:typeof $2]!="nothing") do={:set msg "$msg\r\n$[$prettyprint $2 as-value]"} 
    :if ($"l0g-no-log") do={} else={
        :if ($lvl="debug") do={/log debug $msg}
        :if ($lvl="info") do={/log info $msg}
        :if ($lvl="warning") do={/log warning $msg}
        :if ($lvl="error") do={/log error $msg}
    }
    :if ($"l0g-no-put") do={} else={:put $msg}
}
# extra help just for dending debug
:global l0gd do={
    :global debug
    :global l0g
    :if ($debug) do={
        $l0g $1 $2 level=debug
    }
}

# coloring helper
:global c0lor do={
    :global c0lor
    :local helptext "\
    \r\n \$c0lor
    \r\n  generates ANSI codes that can be used in a string to add colorized text\
    \r\n     \$c0lor <text-color> [inverse=yes] [[bold=yes]|[dim=yes]]"    
    # handle 8-bit color names
    :local lookupcolor8 do={
        :local color8 {
            black={30;40};
            red={31;41};
            green={32;42};
            yellow={33;43};
            blue={34;44};
            magenta={35;45};
            cyan={36;46};
            white={37;47};
            "no-style"={39;49};
            reset={0;0};
            "bright-black"={90;0};
        }
        :if ($1 = "as-array") do={:return $color8}
        :if ([:typeof ($color8->$1)]="array") do={
            :return ($color8->$1) 
        } else={
            :return [:nothing]
        }
    }
    :if ($1 = "color") do={
        :if ([:typeof $2] = "str") do={
            :local ccode [$lookupcolor8 $2]
            :if ([:len $ccode] > 0) do={
                :put $ccode 
                :return [:nothing]
            } else={$c0lor colors}
        } else={$c0lor colors}
    }
    :if ($1 = "colors") do={
        :put "\t <color>\t\t $[$c0lor no-style inverse=yes]inverse=yes$[$c0lor reset]\t\t $[$c0lor no-style bold=yes]bold=yes$[$c0lor reset]\t\t $[$c0lor no-style dim=yes]dim=yes$[$c0lor reset]"
        :foreach k,v in=[$lookupcolor8 as-array] do={
            :local ntabs "\t"
            :if ([:len $k] <  8 ) do={
                :set ntabs "\t\t"
            } 
            :put "\t$[$c0lor $k]$k$[$c0lor reset]$ntabs$[$c0lor $k inverse=yes]\t$k$[$c0lor reset]\t$[$c0lor $k bold=yes]$ntabs$k$[$c0lor reset]\t$[$c0lor $k dim=yes]$ntabs$k$[$c0lor reset]"
       } 
       :return [:nothing]
    }
    :if ($1 = "help") do={
        :put $helptext
        :return [:nothing]
    }
    # set default colors
    # sets default to no-style - :local c8str {mod="";fg="$([$lookupcolor8 no-style]->0)";bg="$([$lookupcolor8 no-style]->1)"}
    :local c8str {mod="";fg="";bg=""}
    # if the color name is the 1st arg, make the the foreground color
    :if ([:typeof [$lookupcolor8 $1]] = "array") do={
        :set ($c8str->"fg") ([$lookupcolor8 $1]->0)
        :set ($c8str->"bg") ([$lookupcolor8 "no-style"]->1)
    } 
    # set the modifier...
    # hidden= 
    :if ($hidden="yes") do={
        :set ($c8str->"mod") "8"
    } else={
        # bold=
        :if ($bold="yes") do={
            :set ($c8str->"mod") "1"
            # set both bold=yes and light=yes? bold wins...
        } else={
            # dim=
            :if ($dim="yes") do={
                :set ($c8str->"mod") "2"
            }
        }        
        # inverse= 
        :if ($inverse="yes") do={
            :if ([:len ($c8str->"mod")]>0) do={ :set ($c8str->"mod") "$($c8str->"mod");"}
            :set ($c8str->"mod") "$($c8str->"mod")7"
        } 
    }
    # if bg= set, apply color  
    :if ([:typeof $bg]="str") do={
        :if ([:typeof [$lookupcolor8 $bg]] = "array") do={
            :set ($c8str->"bg") ([$lookupcolor8 $bg]->1)
        } else={:error "bg=$bg is not a valid color"}
    }
    # build the output
    :local rv "\1B["
    :if ([:len ($c8str->"fg")]>0) do={
        :if ([:len ($c8str->"mod")]>0) do={
            :set rv "$rv$($c8str->"mod");$($c8str->"fg")" 
        } else={
            :set rv "$rv$($c8str->"fg")" 
        }
    } else={
        :set rv "$rv$($c8str->"mod")"
    }
    :if ([:len ($c8str->"bg")]>0) do={
        :if ([:len $rv]>2) do={
            :set rv "$rv;$($c8str->"bg")"
        }

    }
    :set rv "$($rv)m"
    # if debug=yes, show the ANSI codes instead
    :if ($debug = "yes") do={
        :return [:put "\\1B[$[:pick $rv 2 80]"]
    }
    # if the 2nd arg is text, or text= set, 
    :local ltext $2
    :if ([:typeof $text]="str") do={
        :set ltext $text
    }
    :if ([:typeof $ltext] = "str") do={
        :return [:put "$rv$2$[$c0lor reset]"]
    }
    :return $rv    
}

:global pvid2array do={
    # autovlanstyle - overrides the default IP addressing scheme,
    #                 valid values: "bytes", "bytes10", or "split10"
    :global autovlanstyle
    #       i.e. by adding a valid style to end of above, like this: 
    # :global autovlanstyle "split10"

    # determine "addressing style" from \$autovlanstyle - default bytes
    :local schema "bytes"
    :if ([:typeof $style] = "str") do={
        :if ($style~"(bytes|bytes10|split10)") do={} else={
            :error "$0 style= must be either bytes | bytes10 | split10 "
        }
        :set schema $style
    } 
    :if ([:typeof $autovlanstyle] = "str") do={
        :if ($autovlanstyle~"(bytes|bytes10|split10)") do={
            :set schema $autovlanstyle
        }
    }
    # process args 
    :local vlanid [:tonum $1]
        # check it PVID is valid
    :if ([:typeof $vlanid] != "num" || $vlanid < 2 || $vlanid > 4094) do={
        :error "PVID must be valid as first argument to command function" 
    }
    # find the bridge interface
    :local bridgeid [/interface bridge find vlan-filtering=yes]
    :if ([:len $bridgeid] != 1) do={
        :error "A bridge with vlan-filtering=yes is required, and there can be only one for this script."
    }
    # uses :convert to break pvid into array with 2 elements between 0-256
    :local vlanbytes [:convert from=num to=byte-array $vlanid]  
    :local lowbits ($vlanbytes->0)
    :local highbits ($vlanbytes->1)
        # NOTE: UGLY workaround for MIPSBE/other, detected when we don't get two parts from the vlan-id
    :if ([:len $vlanbytes]>2) do={
        :if ($vlanid > 255) do={
            # even worse workaround, normalize to 8 bytes - ros wrongly trims leading 0
            :if ([:len $vlanbytes]=7) do={ 
                # make it len=8 by pre-pending a 0 - so the swap below is correct
                :set vlanbytes (0,$vlanbytes) 
            }
            # now swap the high and low bytes
            :set lowbits ($vlanbytes->1)
            :set highbits ($vlanbytes->0)  
        } 
        # lowbits is right if under 256
    }
    # determine the leading 3 octets, based on the "schema" 
    :local ipprefix "0.0.0"
    :if ($schema = "bytes") do={
        # for pvid below 257, use 192.168.<pvid>.0/24 as base IP prefix
        # for others map pvid into unique /24 with 172.<lowbits+15>.<highbits>.0/24
        :if ($vlanid < 256) do={
            :set ipprefix "192.168.$vlanid"
        } else={
            :set ipprefix "172.$($lowbits + 15).$highbits" 
        }
    }
    :if ($schema = "bytes10") do={
        # map pvid into /24 with 10.<lowbits>.<highbits>.0/24
        :if ($vlanid < 256) do={
            :set ipprefix "10.0.$vlanid"
        } else={
            :set ipprefix "10.$($lowbits+1).$highbits" 
        }
    }
    :if ($schema = "split10") do={
        # map pvid into 10.pvid[3]pvid[2].pvid[1].pvid[0] using ASCII chars in pvid 
        :if ($vlanid < 100) do={
            :set ipprefix "10.0.$vlanid" 
        } else={
            :set ipprefix "10.$[:tonum [:pick $vlanid 0 ([:len $vlanid]-2)]].$[:tonum [:pick $vlanid ([:len $vlanid]-2) [:len $vlanid]]]"
        }
    }
    # now calculate the various "formats" of a prefix for use in other scripts
    :return {
        "vlanid"="$vlanid";
        "basename"="vlan$vlanid";
        "commenttag"="mkvlan $vlanid";
        "vlanbridge"="$[/interface/bridge get $bridgeid name]";
        "ipprefix"="$ipprefix";
        "cidrnet"="$ipprefix.0/24";
        "cidraddr"="$ipprefix.1/24";
        "routerip"="$ipprefix.1"; 
        "dhcppool"="$ipprefix.10-$ipprefix.249"; 
        "dhcpgw"="$ipprefix.1"; 
        "dhcpdns"="$ipprefix.1"
    }
}

:global mkvlan do={
    :global pvid2array
    :global mkvlan

    :if ([:typeof [:tonum $1]]="num") do={
        :global mkvlan 
        :return ($mkvlan <%% [$pvid2array [:tonum $1]])
    }

    :put "starting VLAN network creation for $cidrnet using id $vlanid ..."
    
    :put " - adding $basename interface on $vlanbridge using vlan-id=$vlanid"
    /interface vlan add vlan-id=$vlanid interface=$vlanbridge name=$basename comment=$commenttag

    :put " - assigning IP address of $cidraddr for $basename"
    /ip address add interface=$basename address=$cidraddr comment=$commenttag

    :put " - adding IP address pool $dhcppool for DHCP"
    /ip pool add name=$basename ranges=$dhcppool comment=$commenttag

    :put " - adding dhcp-server $basename "
    /ip dhcp-server add address-pool=$basename disabled=no interface=$basename name=$basename comment=$commenttag 

    :put " - adding DHCP /24 network using gateway=$dhcpgw and dns-server=$dhcpdns"
    /ip dhcp-server network add address=$cidrnet gateway=$dhcpgw dns-server=$dhcpdns comment=$commenttag 

    :put " - add VLAN network to interface LAN list"
    :if ([:len [/interface list find name=LAN]] = 1) do={
        /interface list member add list=LAN interface=$basename comment=$commenttag 
    }

    :put " - create FW address-list for VLAN network for $cidrnet"
    /ip firewall address-list add list=$basename address=$cidrnet comment=$commenttag  

    :put " * NOTE: in 7.16+, the VLAN $vlanid is dynamically added to /interface/bridge/vlans with tagged=$vlanbridge "
    :put "         thus making an access port ONLY involves setting pvid=$vlanid on a /interface/bridge/port"
    :put " * EX:   So to make 'ether3' an access point, only the following additional command is:"
    :put "           /interface/bridge/port set [find interface=ether3] pvid=$vlanid frame-types=allow-only-untagged"

    /log info [:put "VLAN network created for $cidrnet for vlan-id=$vlanid"]
}

:global rmvlan do={
    :global pvid2array
    :global rmvlan
    :local tag "INVALID"
    :if ([:typeof [:tonum $1]]="num") do={
        :global rmvlan 
        :return ($rmvlan <%% [$pvid2array [:tonum $1]])
    }
    :if ([:typeof $comment]="str") do={
        :set tag $comment
    } else={
        :if ([:typeof $commenttag]="str") do={
            :set tag $commenttag 
        } else={
            :error "$0 requires with an tag provided by '$0 comment=mytag' or via '($0 <%% [$pvid2array 1001]"
        }
    }

    :put "starting VLAN network removal for comment=$tag"
    :put " - remove $basename interface on $vlanbridge using vlan-id=$vlanid"
    /interface vlan remove [find comment=$tag]

    :put " - remove IP address of $cidraddr for $basename"
    /ip address remove [find comment=$tag]

    :put " - remove IP address pool $dhcppool for DHCP"
    /ip pool remove [find comment=$tag]

    :put " - removing dhcp-server $basename "
    /ip dhcp-server remove [find comment=$tag] 

    :put " - remove DHCP /24 network using gateway=$dhcpgw and dns-server=$dhcpdns"
    /ip dhcp-server network remove [find comment=$tag] 

    :put " - remove VLAN network to interface LAN list"
    /interface list member remove [find comment=$tag] 

    :put " - create FW address-list for VLAN network for $cidrnet"
    /ip firewall address-list remove [find comment=$tag]  

    /log info [:put "VLAN network removed for comment=$tag"]
}

:global catvlan do={
    :global pvid2array
    :global catvlan
    :global prettyprint
    :local tag "INVALID"
    :local json [:toarray ""]
    :if ([:typeof [:tonum $1]]="num") do={
        :return [($catvlan <%% [$pvid2array [:tonum $1]])]
    }
    :if ([:typeof $comment]="str") do={
        :set tag $comment
    } else={
        :if ([:typeof $commenttag]="str") do={
            :set tag $commenttag 
        } else={
            :error "$0 requires with an tag provided by '$0 comment=mytag' or via '($0 <%% [$pvid2array 1001]"
        }
    }

    :set ($json->"/interface/vlan") [/interface vlan print detail as-value where comment=$tag]
    :set ($json->"/ip/address") [/ip address print detail as-value where comment=$tag]
    :set ($json->"/ip/pool") [/ip pool print detail as-value where comment=$tag]
    :set ($json->"/ip/dhcp-server") [/ip dhcp-server print detail as-value where comment=$tag] 
    :set ($json->"/ip/dhcp-server/network") [/ip dhcp-server network print detail as-value where comment=$tag] 
    :set ($json->"/interface/list/member") [/interface list member print detail as-value where comment=$tag]
    :set ($json->"/ip/firewall/address-list") [/ip firewall address-list print detail as-value where comment=$tag] 

    # Ideally it be able to do a "export where" to show the code, which kinda works 
    # But for dhcp-server here, but elsewhere too, it exports all children despite the "where" 
    # Mikrotik confirmed it a known bug to be fixed, no ETA.  
    # ":grep" used to strip comments from "export where" since it be duplicate when doing multiple exports
    #     [[:parse ":grep pattern=\"^/\" script={:grep pattern=\"lease-time\" script={/ip/dhcp-server/export terse where comment=\"$tag\"}} "]]
    #     [[:parse ":grep pattern=\"^/\" script={/ip/dhcp-server/network/export terse where comment=\"$tag\"} "]]

    :return [$prettyprint $json]
}

:global lsbridge do={
    :global l0g
    :global l0gd
    :global c0lor
    :global prettyprint

    $l0gd "hello?"

  ### PROCESS ARGS 
        # help
    :if ("$1" = "help") do={
        :error "$0 [ports|vlans] [show-ids] [as-value] [trim=yes*|no] [color=yes*|no]"
    }
        # display/table options
    :local showtables [:toarray ""] 
    :if (" $1 $2 $3 $4 $5 $6 $7 $8 "  ~ " vlan | vlans ") do={
        :set showtables ($showtables,"vlans")
    }
    :if (" $1 $2 $3 $4 $5 $6 $7 $8 "  ~ " port | ports ") do={
        :set showtables ($showtables,"ports")
    }
    :local shouldtrim true
    :if ("$trim" ~ "no") do={
        :set shouldtrim false 
    }
    :local usecolor true
    :if ("$color" ~ "no") do={
        :set usecolor false 
    }
        # output options
    :if ([:len $showtables] = 0) do={
        :set showtables ("ports","vlans") 
    }
    :local showids false 
    :if (" $1 $2 $3 $4 $5 $6 $7 $8 "  ~ " show-id | show-ids ") do={
        :set showids true
    }
        # "classic" to disable output to console
    :local asvalue false 
    :if (" $1 $2 $3 $4 $5 $6 $7 $8 "  ~ " as-value ") do={
        :set asvalue true
    }

  ### MACROS AND HELPER LOCAL FUNCTIONS
    :local flagmap {
        "vlans"={".opts"=[:toarray ""];".flags"=[:toarray ""]};
        "ports"={".opts"=[:toarray ""];".flags"=[:toarray ""]}
    }

    # setcharposition <str> <char> pos=<pos> 
    :local setcharposition do={ 
        :local bytes [:convert to=byte-array $1]
        :local lmin [:tonum $min]
        :local lpos [:tonum $pos]
        #:put "$0 debug setcharposition START - str '$1' char '$2' pos '$lpos'/'$lpos' min '$min'/$lmin"
        :if ($lpos < 1) do={:set $lpos 0} else={:set $lpos [:tonum $lpos]}
        :if ($lpos > $lmin) do={:set lmin $lpos}
        #:put "$0 debug setcharposition fixup - str '$1' char '$2' pos '$lpos' min '$min'"
        :if ([:len [:tostr $2]] = 1) do={
            :set ($bytes->$lpos) [:tonum [:convert to=byte-array [:tostr $2]]]
            #:put "$0 debug setcharposition replace - min '$min' bytes $[:tostr $bytes]"
        }
        :if ($lmin > 0) do={
            :for p from=0 to=([:tonum $lmin]-1) do={
                #:put "$0 debug setcharposition pad enter - $p of $min - char '$[:tostr ($bytes->$p)]' bytes '$[:tostr $bytes]'"
                :if (($bytes->$p)>127 or ($bytes->$p)<32) do={
                    :set ($bytes->$p) 32
                }
            }
        }
        :local rv [:convert from=byte-array $bytes]
        #:put "$0 debug - setcharposition END - $rv $[:len $rv] $[:tostr $bytes]"
        :return $rv
    } 

  ### HEALTH CHECK - require one vlan bridge or bridge=<interface>
    
    :local vlanbridgeids [/interface/bridge find vlan-filtering=yes] 
    :local bridgeid $vlanbridgeids

    # if NO VLAN bridges... see what's going on first, before error'ing
    :if ([:len $vlanbridgeids] = 0) do={
        # check if safe to enable vlan-filtering
        :local allbridgeids [/interface/bridge find]
        :if ([:len $allbridgeids] = 1) do={
            # okay, one bridge only, do any ports NOT use pvid=1?
            :local ispvid1 true
            :local hasports false
            :foreach port in=[/interface/bridge/port/print detail as-value] do={
                :set hasports true
                :if (($port->"pvid") != 1) do={
                   :set ispvid1 false 
                }
            }
            # if no ports, just fail
            :if ($hasports = false) do={
                :error "$0 error - no bridge ports found, manual bridge setup required"
            }
            # if any port has non-default PVID, also fail
            :if ($ispvid1 = false) do={
                :error "$0 error - some bridge ports do not use pvid=1, manual bridge setup required"
            }
            # recommend vlan-filtering=yes - only one bridge, >1 ports, all pvid=1
            :put "\t\tTIP..."
            :put "$0 requires a bridge with vlan-filtering=yes to continue, to enable it:"
            :put "\t/interface/bridge/set $[:tostr $allbridgeids] vlan-filtering=yes"
            :put "\t\t(use at your own risk, likely safe with from a default configuration)"
            :put ""
            :error "$0 error - no bridges with vlan-filtering=yes"
        } else={
            :error "$0 error - no bridges with vlan-filtering=yes, manual bridge setup required"
        }

    }
    :if ([:typeof $bridge]="str") do={
        :local tempbrid [/interface/bridge/find name=$bridge]
        :if ([:len $tempbrid] = 1) do={
            :set bridgeid $tempbrid 
        } else={
            :error "$0 got bridge=$bridge, but bridge name was not found"
        }
    }
    :if ([:len $bridgeid] != 1) do={
        :error "$0 only works with one bridge at a time, use 'bridge=<name>' in args to set one"
    }
    :local bridgename [/interface/bridge get $bridgeid name] 

  ### MAKE VLANS MAP
    # dictionary-of-dictionaries indexed by bridge *vlan-id* & included in output
    :local pvidmap [:toarray ""]

    # start with /interface/bridge/vlan/print 
    :local brports [/interface/bridge/vlan/print detail as-value where bridge=$bridgename] 

    # loop array of vlan entires from print
    :foreach brport in=$brports do={
        
        # loop again... each bridge vlan may have MULTIPLE vlan-ids inside
        :foreach vlanid in=($brport->"vlan-ids") do={

            # initialize vlan-id in pvidmap, if not already
            :local ifid [:tostr [/interface/vlan/find vlan-id=$vlanid interface=$bridgename]]
            :if ([:typeof ($pvidmap->"$vlanid")] != "array") do={ 
                :set ($pvidmap->"$vlanid") {
                    "tagged"=([:toarray ""]);
                    "untagged"=([:toarray ""]);
                    "current-tagged"=([:toarray ""]);
                    "current-untagged"=([:toarray ""]);
                    "dynamic-id"="";
                    "static-id"="";
                    ".ifid"=($ifid);
                    ".brifid"=($brport->".id");
                    ".flags"="";
                    ".opts"="";
                    "flags"=""
                } 
            }
                
            # NOTE: each vlan-id in /inteface/bridge/vlan may have TWO entries:
            #	- dynamiclly created by RouterOS based on some other option
            #	- "statically" (manually) by user config 
            # ...thus we may see same vlan-id TWICE in loop

            # store .id based on if static or dynamic (since there could be BOTH) 
            :if ([/interface/bridge/vlan/get ($brport->".id") dynamic]) do={
                :set ($pvidmap->"$vlanid"->"dynamic-id") (($pvidmap->"$vlanid"->"dynamic-id"),($brport->".id"))
            } else={
                :set ($pvidmap->"$vlanid"->"static-id") ($brport->".id")
            }
            
            # set .flags
                # has dynamic bridge vlan entry (non-standard flag)
            :if ([:len ($pvidmap->"$vlanid"->"dynamic-id")]>0)  do={
                if (($pvidmap->"$vlanid"->".flags")~"d") do={} else={
                    :local posflag [$setcharposition ($pvidmap->"$vlanid"->".flags") pos=2 min=3 "d"]
                    :set ($pvidmap->"$vlanid"->".flags") $posflag
                    :set ($flagmap->"vlans"->".flags"->"d") "MAC-dynamic" 
                }
            }
                # has "static" bridge vlan (non-standard flag)
            :if ([:len ($pvidmap->"$vlanid"->"static-id")]>0) do={
                if (($pvidmap->"$vlanid"->".flags")~"s") do={} else={
                    :local posflag [$setcharposition ($pvidmap->"$vlanid"->".flags") pos=1 min=3 "s"]
                    :set ($pvidmap->"$vlanid"->".flags") $posflag
                    :set ($flagmap->"vlans"->".flags"->"s") "MAC-static" 
                }
            }
                # disabled
            :if ([/interface/bridge/vlan/get ($brport->".id") "disabled"]=true) do={
                :local posflag [$setcharposition ($pvidmap->"$vlanid"->".flags") pos=0 min=3 "X"]
                :set ($pvidmap->"$vlanid"->".flags") $posflag
                :set ($flagmap->"vlans"->".flags"->"X") "MAC-disabled" 
            }
            :set ($pvidmap->"$vlanid"->".flags") [$setcharposition min=3 ($pvidmap->"$vlanid"->".flags")] 

            # set .opts
            :local vopts {
                "disabled"={"x";1};
                "mvrp"={"M";2};
                "running"={"r";0};
                "use-service-tag"={"%";2};
            }
            :foreach a,opt in=$vopts do={
                :if ([:len "$ifid"] > 0) do={
                    :if ([/interface/vlan/get $ifid $a]=true) do={
                        :local posflag [$setcharposition ($pvidmap->"$vlanid"->".opts") pos=($opt->1) min=[:len $vopts] ($opt->0)]
                        :set ($pvidmap->"$vlanid"->".opts") $posflag
                        :set ($flagmap->"vlans"->".opts"->($opt->0)) "IP-$a" 				
                    }
                }
            }
            :set ($pvidmap->"$vlanid"->".opts") [$setcharposition min=[:len $vopts] ($pvidmap->"$vlanid"->".opts")] 

            # merge .flages and .opts into flags in map
            :set ($pvidmap->"$vlanid"->"flags") (($pvidmap->"$vlanid"->".flags").($pvidmap->"$vlanid"->".opts"))	
    
            # store interfaces in "pvidmap"
            :set ($pvidmap->"$vlanid"->"tagged") (($pvidmap->"$vlanid"->"tagged"),($brport->"tagged"))
            :set ($pvidmap->"$vlanid"->"untagged") (($pvidmap->"$vlanid"->"untagged"),($brport->"untagged"))
            :set ($pvidmap->"$vlanid"->"current-tagged") (($pvidmap->"$vlanid"->"current-tagged"),($brport->"current-tagged"))
            :set ($pvidmap->"$vlanid"->"current-untagged") (($pvidmap->"$vlanid"->"current-untagged"),($brport->"current-untagged"))
        }
    }

  ### MAKE PORTS MAP
    # dictionary-of-dictionaries indexed by bridge *ports* & included in output
    :local portmap [:toarray ""] 

    # start with VLANS MAP (pvidmap) first to build the "portmap"
    :foreach vid,conf in=$pvidmap do={
        # using tag/untag attributes "portmap" 
        :foreach attr in=("tagged","untagged","current-tagged","current-untagged") do={
            :foreach iface in=($conf->"$attr") do={
                # create if portmap entry for interface, if missing
                :if ([:typeof ($portmap->"$iface")]!="array") do={ :set ($portmap->"$iface") [:toarray ""] }
                # copy data from pvidmap into portmap 
                :set ($portmap->"$iface"->"$attr") (($portmap->"$iface"->"$attr"),$vid)  
            }
        }
    }

    # NOTE: "portmap" is initially created using the "tagged"/etc in /interface/bridge/vlan
    #	but pvid= & others should be included from /interface/bridge/port
    #   so this modifies BOTH "pvidmap" and "portmap"
    
    # start with /interface/bridge/port 
    :local arrports [/interface/bridge/port/find bridge=$bridgename]

    # loop though all bridge ports
    :foreach pid in=$arrports do={
        :local pattr [/interface/bridge/port/get $pid]
        :local lpvid [:tostr ($pattr->"pvid")]

            # add ports not already found 
        :if ([:typeof ($portmap->"$($pattr->"interface")")] != "array") do={
            :set ($portmap->"$($pattr->"interface")") [:toarray ""] 
            :foreach attr in=("tagged","untagged","current-tagged","current-untagged","pvids") do={
                :set ($portmap->"$($pattr->"interface")"->"$attr") [:toarray ""]	
            }
        } 
        :set ($portmap->"$($pattr->"interface")"->"untagged") (($portmap->"$($pattr->"interface")"->"untagged"),$lpvid)
        :set ($portmap->"$($pattr->"interface")"->"pvids") (($portmap->"$($pattr->"interface")"->"pvids"),$lpvid)	
        # NOTE: below modifies "pvidmap" here, since pvid= only on bridge ports
        #       in order to correctly identify the PVID in the "pvidmap"

            # also add pvid= to VLANS map ("pvidmap")
        :if ([:typeof ($pvidmap->"$lpvid")] != "array") do={
            :set ($pvidmap->"$lpvid") [:toarray ""] 
            :foreach attr in=("tagged","untagged","current-tagged","current-untagged","pvids") do={
                :set ($pvidmap->"$lpvid"->"$attr") [:toarray ""]	
            }
        }
        :set ($pvidmap->"$lpvid"->"untagged") (($pvidmap->"$lpvid"->"untagged"),($pattr->"interface"))
        :set ($pvidmap->"$lpvid"->"pvids") (($pvidmap->"$lpvid"->"pvids"),($pattr->"interface")) 
    }

    # loop though the generated "portmap", instead of /interface/bridge/port, to fill in more data
    :foreach k,v in=$portmap do={
        # get the portid
        :local portid [/interface/bridge/port/find interface=$k bridge=$bridgename]
        # NOTE: could be the "mysterious" bridge "port", which is not a /interface/bridge/port
        #	but /interface/bridge itself will have VLAN attributes there, not in ports...
            # storage for "port" attributes, which could be the bridge interface's attributes (not "port")
        :local portattrs [:toarray ""]
            # depending on if bridge port, get the port's vlan attributes
        :local isbridge false
        :if ([:len $portid] != 1) do={
            # must be a bridge?
            # TODO: check if is actually bridge & handle if like non-existant >1
            :set portid $bridgeid
            :set isbridge true
            :set portattrs [/interface/bridge/get $portid]
        } else={
            # get all bridge port attributes
            :set portattrs [/interface/bridge/port/get $portid]
        }
        # portid should be a string (TODO: check if needed)
        :set portid [:tostr $portid]
        # store interface ids in "portmap"
        :set ($portmap->"$k"->".ifid") "$[:tostr [/interface/find name="$k"]]"
        :set ($portmap->"$k"->".brifid") $portid
        # status to .flags
        :local attr2flags {
            "disabled"={"X";0};
            "dynamic"={"D";2};
            "inactive"={"I";1};
            "hw-offload"={"H";3}
        }
        :foreach a,opt in=$attr2flags do={
            :if (($portattrs->"$a")=true) do={
                :local posflag [$setcharposition ($portmap->"$k"->".flags") pos=($opt->1) min=4 ($opt->0)]
                :set ($portmap->"$k"->".flags") $posflag
                :local fname "MAC-$a"
                :if ($a="hw-offload") do={ :set fname "$a"} 
                :set ($flagmap->"ports"->".flags"->($opt->0)) $fname
            }
        }
        :set ($portmap->"$k"->".flags") [$setcharposition min=4 ($portmap->"$k"->".flags")] 
        # frame-types to .opts indicators 
        :local fts {
            "admit-all"={"*";2;"admit all"};
            "admit-only-untagged-and-priority-tagged"={"-";2;"untagged only"};
            "admit-only-vlan-tagged"={"=";2;"only tagged"}
        }
        # NOTE: but only if ingress-filtering is enabled,
        # as frame-types does not apply otherwise so don't show
        :if (($portattrs->"ingress-filtering")=true) do={
            :foreach ft,opt in=$fts do={
                :if (($portattrs->"frame-types")=$ft) do={
                    :set ($portmap->"$k"->".opts") [$setcharposition ($portmap->"$k"->".opts") pos=($opt->1) min=3 ($opt->0)] 
                    :set ($flagmap->"ports"->".opts"->"|$($opt->0)") ($opt->2) 				
                }			
            }
        }
        # vlan filtering/status bools to .opts
        :local vis {
            "ingress-filtering"={"|";1};
            "tag-stacking"={"%";0}
        }
        :foreach vi,opt in=$vis do={
            :if (($portattrs->"$vi")=true) do={
                :set ($portmap->"$k"->".opts") [$setcharposition ($portmap->"$k"->".opts") pos=($opt->1) min=3 ($opt->0)]
                :if ($vi != "ingress-filtering") do={
                    # ingress-filtering flag is included with frame-type, 
                    # since you cannot have one without the other - to save space in output
                    :set ($flagmap->"ports"->".opts"->($opt->0)) $vi
                }				
            }
        }
        :set ($portmap->"$k"->".opts") [$setcharposition min=3 ($portmap->"$k"->".opts")] 
        :set ($portmap->"$k"->"flags") (($portmap->"$k"->".flags").($portmap->"$k"->".opts"))	
    }

    $l0gd ("$0 debug - PORTS:$[:len $portmap] VLANIDS: $[:len $pvidmap]")

 ### MAKE COLUMN HEADERS FOR VLANS AND PORTS TABLES
    # generate column "views" and create output array
        # by ports
    :local listports [:toarray ""]
    :foreach k,v in=$portmap do={:set listports ($listports,$k)}
        # by vlans
    :local listvlanids [:toarray ""]
    :foreach a,v in=$pvidmap do={:set listvlanids ($listvlanids,$a)}
            # sort the "by vlan" so its numerical - not easy...
                # add leading zeros
    :foreach i,x in=$listvlanids do={
        :while ([:len ($listvlanids->$i)]!=4) do={
            :set ($listvlanids->$i) "0$($listvlanids->$i)"
        }
    }
           # by making it map, it sorted by RouterOS
    :local fakemap [:toarray ""]
    :foreach m in=$listvlanids do={:set ($fakemap->"$m") [:tonum $m]}
            # now unwind the "fake" map into the list
    :set listvlanids [:toarray ""]
    :foreach k,vid in=$fakemap do={:set $listvlanids ($listvlanids,$vid)}
            # ...done sort vlan id's numbers numberically...

 ### "MAKEROW" FUNCTION - essentially makes a "PivotTable" using a maps
    # makerow - returns simple list, in column order from above, for BOTH MAPS 
    :local makerow do={
        :local rv [:toarray ""]
        # loop over the map, to create plain list of untag/tag status from provided map
        :foreach q,prt in=$zmap do={
            :local rp [:toarray ""]
            :foreach ivp,vid in=($zlist) do={
                # determine U / u / T / t from provided entry in map 
                :foreach torc in=("tagged","untagged") do={
                    :if ([:typeof [:find ($prt->"$torc") $vid]]="num") do={
                        :if (([:typeof [:find ($prt->"current-$torc") $vid]]="num")) do={
                            :set ($rp->$ivp) [:tostr [:convert transform=uc [:tostr [:pick $torc 0 1]]]]
                        } else={
                            :set ($rp->$ivp) [:tostr [:pick $torc 0 1]]
                        }
                    } else={
                        # nothing mean port is NOT on the VLAN
                        :if ([:typeof ($rp->$ivp)] != "str") do={
                            :set ($rp->$ivp) [:nothing]
                        }
                    }
                }
                # handle PVID "+"
                :if ([:typeof [:find ($prt->"pvids") $vid]]="num") do={
                    :set ($rp->$ivp) (($rp->$ivp)."+")	
                }
            }
            :set ($rv->"$q") $rp 
        }
        :return $rv
    }

 ### USING ROWS, DETERMINE HYBIRD, TRUNK, OR ACCESS PORTS
        # use above to resolving the tag/untag flags & add it as a "row" list in both maps  
    :foreach p,portrow in=[$makerow zmap=$portmap zlist=$listvlanids rmap=$pvidmap] do={
        :set ($portmap->"$p"->"row") $portrow
        :set ($portmap->"$p"->".type") ""
        :foreach r in=$portrow do={
            :if ([:len $r] > 0) do={
                :if ($r~"(U|u)") do={
                    :if (($portmap->"$p"->".type") ~ "(trunk|hybrid)") do={
                        :set ($portmap->"$p"->".type") "hybrid"
                    } else={
                        :set ($portmap->"$p"->".type") "access"
                    }
                }
                :if ($r~"(T|t)") do={
                    :if (($portmap->"$p"->".type") ~ "(access|hybrid)") do={
                        :set ($portmap->"$p"->".type") "hybrid"
                    } else={
                        :set ($portmap->"$p"->".type") "trunk"
                    }
                }
            }
        }
    }
        # same as above, for "pvidrow" (TODO: should refactor)
    :foreach v,pvidrow in=[$makerow zmap=$pvidmap zlist=$listports rmap=$portmap] do={
        :set ($pvidmap->"$v"->"row") $pvidrow
        :set ($pvidmap->"$v"->".type") ""
        :foreach r in=$pvidrow do={
            :if ([:len $r] > 0) do={
                :if ($r~"U|u") do={
                    :if (($pvidmap->"$v"->".type") ~ "(trunk|hybrid)") do={
                        :set ($pvidmap->"$v"->".type") "hybrid"
                    } else={
                        :set ($pvidmap->"$v"->".type") "access"
                    }
                }
                :if ($r~"T|t") do={
                    :if (($pvidmap->"$v"->".type") ~ "(access|hybrid)") do={
                        :set ($pvidmap->"$v"->".type") "hybrid"
                    } else={
                        :set ($pvidmap->"$v"->".type") "trunk"
                    }
                }
            }
        }
    }

 ### FLATTEN ALL MAPS FOR DISPLAY
    # determine output columns
    :if ($showids = true) do={}
    :local precols (".ifid",".brifid","flags")

    # finally "flatten" maps for use in display/CSV into ->.table
    :local tablegen {
        "ports"={"fmap"=$portmap;"cols"=$listvlanids;"rmap"=$pvidmap;"rows"=[:toarray ""]};
        "vlans"={"fmap"=$pvidmap;"cols"=$listports;"rmap"=$portmap;"rows"=[:toarray ""]}
    }
    :foreach tablename,opts in=$tablegen do={
        :local frows [:toarray ""]
        :local fmap ($opts->"fmap")
        :local cols ($opts->"cols")
        :local rmap ($opts->"rmap")

        # helper to shorten ifnames to 8 chars to display as table in terminal
        :local trimcell do={:return $1}
        :if ($shouldtrim = true) do={
            :set trimcell do={
                :if ([:len $1] > 8) do={
                    :return "$[:pick $1 0 3]~$[:pick $1 ([:len $1]-3) [:len $1]]"
                }
                :return $1
            }
        }

        # trim colum names
        :local scols [:toarray ""]
        :foreach c in=$cols do={ 
            :set scols ($scols,[$trimcell $c]) 
        }

        # update column header colors
        :foreach i,c in=$scols do={
            :local v ($rmap->"$[:tostr $c]")
            :local tcolor "no-style"
            :if (($v->".type")="hybrid") do={:set tcolor "cyan"}
            :if (($v->".type")="trunk") do={:set tcolor "magenta"}
            :if (($v->".type")="access") do={:set tcolor "green"}
            :if ([:len ($v->".brifid")] = 0) do={
                :set tcolor "yellow"
            }
            :set ($scols->$i) "$[$c0lor $tcolor bold=yes]$c$[$c0lor reset]"
        }
        
        # build the flat table            
        :foreach k,v in=$fmap do={
            :local frow [:toarray ""]
            :local mrow ($v->"row")
            :set frow [:toarray ""]
            :foreach i,pcol in=$precols do={
                :set ($frow->$i) ($v->"$pcol")
                :local dim no
                :local pcolor no-style
                :if ($pcol~"id\$") do={:set dim yes; :set pcolor blue}
                :if ($pcol="flags") do={
                    :local fansi "" 
                    :foreach j,f in=[:convert to=byte-array ($v->"flags")] do={
                        :local c [:convert from=byte-array ({$f})]
                        :if ($c~"H|r") do={
                            :set fansi ($fansi.[$c0lor green dim=yes].$c.[$c0lor reset])
                        } else={
                        :if ($c~"d") do={
                            :set fansi ($fansi.[$c0lor yellow dim=yes].$c.[$c0lor reset])
                        } else={
                        :if ($c~"X|x|I") do={
                            :set fansi ($fansi.[$c0lor red bold=yes].$c.[$c0lor reset])
                        } else={
                            :set fansi ($fansi.$c)
                        }}}
                    }
                    :set ($frow->$i) $fansi 
                } else={
                    :set ($frow->$i) "$[$c0lor $pcolor dim=$dim]$($v->"$pcol")$[$c0lor reset]"
                }
            }
            :if ($usecolor = true) do={}
            :foreach i,m in=$mrow do={
                :local color "no-style"
                :local bold "no"
                :local inv "no"
                :local bg "no-style"
                :if ($m~"(U|u)") do={:set color "green"}
                :if ($m~"(T|t)") do={:set color "magenta"; :set bg "white"}
                :if ($m~"(U|T)") do={:set bold "yes"}
                :if ($m~"(U|u|T|t)") do={:set inv "yes"}
                :set ($mrow->$i) " $[$c0lor $color bg=$bg inverse=$inv bold=$bold] $[$setcharposition $m min=2]$[$c0lor reset]"
            } 
            :local tcolor "no-style"
            :if (($v->".type")="hybrid") do={:set tcolor "cyan"}
            :if (($v->".type")="trunk") do={:set tcolor "magenta";}
            :if (($v->".type")="access") do={:set tcolor "green"}
            :if ([:len ($v->".brifid")] = 0) do={
                # must be the mysterious bridge port, since it is NOT a /interface/bridge/port
                :set tcolor "yellow"
            }
            :set frow ($frow,"$[$c0lor $tcolor bold=yes]$[$trimcell $k]$[$c0lor reset]",$mrow)
            :set frows ($frows,{$frow})
        }
        :if ($addtableheaders = true) do={}
        # add footers
        $l0gd [$prettyprint $flagmap as-value]
        :local footer ([$c0lor inverse=no].[$c0lor cyan bold=yes]."  Flags:  ".[$c0lor no-style])
        :foreach fall in=(".opts",".flags") do={
            :foreach f,t in=($flagmap->"$tablename"->"$fall") do={
                :set footer ($footer."  ".[$c0lor green bold=yes].$f." ".[$c0lor no-style dim=yes].$t)
            }
        }

        :local header ($precols,"$[$c0lor bold=yes]$tablename$[$c0lor reset]",$scols)
        # set table header/footer for output
        :set ($tablegen->"$tablename"->".header") $header
        :set ($tablegen->"$tablename"->".footer") $footer
        
        # combine table for output
        :set frows ({$header},$frows)
        
        # also update the rows in tablegen array
        :set ($tablegen->"$tablename"->"rows") $frows
    }

 ### CREATE OUTPUT ARRAY FROM LOCAL VARIABLES

    # setup output, including flat vlan/port tables
    :local out [:toarray ""]
    :set ($out->"ports") $portmap 
    :set ($out->"vlans") $pvidmap 

    # add "columns", which store the vlanid/port name indexed same as rows
    :set ($out->".cols") [:toarray ""] 
    :set ($out->".cols"->"ports") $listports 
    :set ($out->".cols"->"vlans") $listvlanids
    :set ($out->".cols"->".pre") $precols 

    # store generated tables (TODO: should be arg to control)
    :set ($out->".tables") [:toarray ""]
    :set ($out->".tables"->"ports") ($tablegen->"ports"->"rows")
    :set ($out->".tables"->"vlans") ($tablegen->"vlans"->"rows")

    # store the headers/footer
    :set ($out->".header"->"ports") ($tablegen->"ports"".header")
    :set ($out->".header"->"vlans") ($tablegen->"vlans"->".header")
    :set ($out->".footer"->"ports") ($tablegen->"ports"->".footer")
    :set ($out->".footer"->"vlans") ($tablegen->"vlans"->".footer")

    # handle as-value
    :if ($asvalue) do={
        # do nothing - since actually always return the out array
    } else={
        # ... output are "pretty" tables
        :global catbridge
        $catbridge bridge=$bridgename
        :foreach tbl in=$showtables do={
            # generate header line
            :local header " $tbl "
                # calculate heder length
                # 	NOTE: port cols uses vlans, & vice-versa... so use "inverse" table to calc [:len]
            :local revrow "vlans"
            :if ($tbl="vlans") do={:set revrow "ports"}
                # add spaces (8 chars are tab break; name is not in .pre nor .cols, so +1)
            :local headerlen (([:len ($out->".cols"->".pre")]+[:len ($out->".cols"->"$revrow")]+1)*8)
            :local nspaces ($headerlen-[:len $header])
            :for c from=0 to=$nspaces do={ :set $header ($header." ") }
                # build header with spaces and colorize if needed
            :set header ([$c0lor cyan bold=yes inverse=yes].[:convert transform=uc $header].[$c0lor reset]) 
            :put $header 
            # output rows for table
            :local map ($out->".tables"->"$tbl")
            :foreach row in=$map do={
                :put [:serialize to=dsv delimiter="\t" $row]
            }
            :put ($out->".footer"->"$tbl")
        }
        :put ([$c0lor cyan bold=yes]." Colors:  ".[$c0lor reset].[$c0lor red]."disabled ".[$c0lor green]."enabled  ".[$c0lor cyan bold=yes]."\t Ports:  ".[$c0lor reset].[$c0lor magenta]."trunk ".[$c0lor cyan]."hybrid ".[$c0lor green]."access  ".[$c0lor bold=yes green]."+ ".[$c0lor reset].[$c0lor gray]."pvid".[$c0lor reset])    
    }
    :return $out
}

:global catbridge do={
    :global c0lor
    :global l0gd

    # check for c0lor, if none disable ANSI codes
    #:if ([:typeof $c0lor]="nothing") do={
    #    :put "  No \$c0lor found.  See http://forum.mikrotik.com on how to add \$c0lor function"
    #    :set c0lor do={return ""}
    #}
    # find bridge to cat
    :local bridgeid
    :local bridgename $name
    :if ([:typeof $bridgename]!="str") do={
        :set bridgeid [/interface/bridge/find vlan-filtering=yes disabled=no]
    } else={
        :set bridgeid [/interface/bridge/find name=$bridgename] 
    } 
    # handles errors and help
    :local helptext "$0 [bridge=<bridge-name>] - colorized display of bridge settings\r\n\t(default: bridge= first vlan-filtering=yes disabled=no bridge)"
    :if ($1="help") do={
        :error $helptext
    }
    :if ([:len $bridgeid]!=1) do={
        :put $helptext
        :error "error - could not find bridge, should be one but got '$[:tostr $bridgeid]'"
            
    }
    # get bridge settings
    :local brget [/interface/bridge/get $bridgeid]
    
    # store results in array first
    :local rv [:toarray ""]

    # mapping attributes to categories
    :local bridgemap {
        { "";{"running";"disabled";"dynamic";"name";".id"}}
        { "";{"comment"}}
        { "mac";{"mac-address";"auto-mac";"admin-mac"}};
        { "ether";{"ether-type";"fast-forward";"arp";"arp-timeout"}};
        { "mtu";{"actual-mtu";"mtu";"l2mtu"}};
        { "vlan";{"vlan-filtering";"pvid";"ingress-filtering";"frame-types";"mvrp"}};
        { "stp";{"protocol-mode";"priority";"port-cost-mode";""}};
        { "dhcp";{"dhcp-snooping";"add-dhcp-option82"}};
        { "igmp";{"igmp-snooping";"igmp-version";"multicast-router";"multicast-querier";"mld-version"}};
    }
    :foreach bridgeitem in=$bridgemap do={
        :local groupname ($bridgeitem->0)
        :local attrs ($bridgeitem->1)
        
        # build map based bridgemap array, and colorize if possible
        :local oline ""
        :foreach attr in=$attrs do={
            :local val ($brget->$attr)
            :local oval $val
            :local oattr $attr
            :local usegeneric true
            :local colorval cyan
            :local colorattr no-style
            # handle fixups
             :if ($oval="enabled") do={
                # cause "enabled" to be same as another bool
                :set oval true
            }
            :if ($oval="disabled") do={
                # cause "enabled" to be same as another bool
                :set oval false
            }
            :if ($attr=".id") do={
                :set oval [:tostr $bridgeid]
            }
            :if ($attr~"(running|disabled|dynamic)") do={
                :if ($oval=false) do={
                    :set usegeneric false
                }
                if ($attr~"disabled") do={
                    :set colorval red
                }
                :set oattr [:convert transform=uc $oattr]
            }
            :if ($attr~"(frame-types|mac-address)") do={
                :set oattr ""
            }
            :if ($attr="protocol-mode") do={
                :set oattr ""
                :set colorval magenta
                :set oval [:convert transform=uc $oval] 
            }
            :if ($attr="comment") do={
                :set oattr ""
                :set colorval magenta
                :if ([:len $oval]=0) do={
                    :set usegeneric false
                }
            }
            :if ($attr~"mvrp|arp\$") do={
               :set oattr [:convert transform=uc $oattr] 
            }
            :if ($attr="multicast-router" and $val="temporary-query") do={
                :set oattr ""
                :set colorval green
            }
            :if ($attr="igmp-version") do={
                :set oattr "ver"
            }
            # run styling code 
            :if ($usegeneric) do={
                :local valtype [:typeof $oval]
                :if ($valtype="str") do={
                    :set oline ($oline.[$c0lor no-style dim=yes].$oattr." ".[$c0lor $colorval bold=yes].$oval.[$c0lor reset]."  ")
                }
                :if ($valtype="num") do={
                    :set oline ($oline.[$c0lor no-style dim=yes].$oattr." ".[$c0lor $colorval bold=yes].$oval.[$c0lor reset]."  ")
                }
                :if ($valtype="bool") do={
                    :if ($oval = true) do={
                        :set oline ($oline.[$c0lor green bold=yes].$oattr.[$c0lor reset]."  ")
                    } else={
                        :set oline ($oline.[$c0lor red bold=yes].$oattr.[$c0lor reset]."  ")
                    }
                }
                # array or nothing not handled
                :if ($valtype~"str|num|bool") do={} else={}
            }
        }
        :local line "      $[$c0lor yellow bold=yes]$[:convert transform=uc $groupname]$[$c0lor reset]\t$oline"
        :set rv ($rv,$line)
    }
    :local headerline " BRIDGE "
    :for s from=[:len $headerline] to=77 do={
        :set headerline ($headerline." ") 
    }
    :put ([$c0lor cyan inverse=yes bold=yes].$headerline.[$c0lor reset])
    :foreach r in=$rv do={:put $r}
}

:global mktrunk do={
    :local bvid [/interface/bridge/vlan find dynamic=no vlan-ids=[:if ([:len [:find $"vlan-ids" $1]]) do={:return $"vlan-ids"}]]
    :if ([:len $bvid]=0) do={
        :set bvid [/interface/bridge/vlan add vlan-ids=$1 comment="added by $0" bridge=[/interface/bridge/find vlan-filtering=yes disabled=no]] 
    }
    /interface/bridge/vlan set $bvid tagged=([get $bvid tagged],$2)
}

:global rmtrunk do={
    :local bvid [/interface/bridge/vlan find dynamic=no vlan-ids=[:if ([:len [:find $"vlan-ids" $1]]) do={:return $"vlan-ids"}]]
    :local orig [/interface/bridge/vlan get $bvid tagged] 
    :local final [:toarray ""]
    :foreach i in=$orig do={ :if ($i != "$2") do={:set final ($final, $i)} }
    /interface/bridge/vlan set $bvid tagged=$final
    # optional, if there are no more tagged or untagged ports, remove bridge vlan itself        
    :if (([:len [/interface/bridge/vlan get $bvid tagged]]=0) and ([:len [/interface/bridge/vlan get $bvid untagged]]=0)) do={
        /interface/bridge/vlan remove $bvid
    }
    # while mktrunk could take an array of interface, rmtrunk must be a single interface in $2 
}

:global mkpvid do={
    :local bpvid $1
    :local bpname $2
    /interface/bridge/port set [find interface=$bpname] pvid=$bpvid
}
```
Part of the idea is someone could more easily "see" some configuration error with the colors.  So here is the "light mode" version from same hEX-S used above, but with some birding/port/vlan settings subtly different from above config.  
Forum attachment omitted: lsbridge-hex-s-forum-white-igmp.png
Like a color-blind test... can you spot the different _settings_ in white vs dark mode?

Anyway, if anyone has thought at what should be included (or not included here), LMK.  Or, have other ideas on how to visualize bridging "mysteries".

[//]: #.

## Post 31

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/31](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/31)
- Created: `2025-02-02T18:30:44.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Well the limit of "ROS TUIs" is US-ASCII only, 16 colors, and generally working in 80x24...  Without UTF-8 (or god-forbid codepages), the "lines" and "boxes" aren't possible.  So I guess I'm targeting late-1970s/early-1980s style TUIs :wink:

What you got is [[/terminal inkey timeout=1s] as an "event loop"](http://forum.mikrotik.com/t/how-to-add-color-to-output/142687/1) and when the timeout= hit, you can do a "refresh" a screen using ":put".  [:put does support ANSI colors, using my $CHALK](http://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/1) function (or reduced version in $c0lor above) & "\t" will align text to 8 char columns automatically, so you can use that to align columns.  $lsbridge above "trims" everything to 7 chars is main "trick" to keep it aligned in columns...

Now what made TUIs slightly easier is the [newest :convert and :[de]serialize methods](http://forum.mikrotik.com/t/experiments-with-convert-for-bits-bytes-csv-from-iot/179268/1), along with :ask (which isn't used here).  Specifically :convert's "byte-array", which let you treat a RouterOS string as a "array of char[]" & :serialize, essentially, let you do all sorts of array transformations, including using [:convert $myarr to=dsv delimator="\t"] which is used to print "table rows".   But that why these script require 7.17 (or 7.18 in case of $lsbridge, since that needs options=dsv.remap to deal with a "list-of-dictionaries" from the "print as-value" arrays).  Rending the colors does get messy & dealing with alignment – why I'm kinda trying a few different approaches...

> Quoted forum context omitted.

I think I'm working to "top" like interface to do "monitoring" which often where using winbox/CLI is sometimes lacking.  While "print"'s more advanced follow does let you do a lot - in fact I use a similar trick to @optio's bridge vlan to [show colors in traefik containers log](http://forum.mikrotik.com/t/container-traefik-on-rb5009/165849/14).  The problem, I think, is when you want to "watch" a few different parts of the config at the same time in same place at same time where the "normal" CLI print things don't help.

While MC's UI styling is a no-go... most of the "command tree" can be render using some combo of "/console/inspect" things with my [$QKEYS](http://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1) and [$INQUIRE](http://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1) functions.  I haven't done this since there actually a lot of way to use the same RouterOS attributes... But it's possible with some "rendering function" for data from various "get"/"print as-value" on a loop of /console/inspect to something like MC's "left side".  Another trick is the out put of a command's  "get" without any attribute return a set of "active" ones, like if IGMP or DHCP sniffer is disabled, the associated timeout/etc attribute aren't in the array – so that help in rendering things a bit too.

My "needs" are often it takes some complex combo of commands to "show" something meaningfully or setting a bunch of windows, etc etc.  The VLAN bridge is one of the main ones it take me parsing a lot of the config the figure out what's being tagged/untagged...  Making $lsbridge interactive – likely named "$topbridge" – is something I'd like to do...  Rendering all of RouterOS, well, maybe one day.  Basically I'd like to add some kinda UNIX "top" like UI for more commands as the next things.  You play a tune using [$PIANO - interactive "player piano"](http://forum.mikrotik.com/t/piano-interactive-player-piano-studio-quality-recorder-using-beep/173756/16) or watch something on [$ROKU](http://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1) while you wait :wink:

[//]: #.

## Post 32

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/32](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/32)
- Created: `2025-02-24T18:40:24.000Z`
- Likes on this post: 0

**Requires 7.18+** — it uses some new :serialize options (see 7.18 release notes), so it will fail ungracefully on older routers.

_Now that 7.18 is out_, I posted the "Bridge Visualizer" script shown above on GitHub to make download a little easier:

```routeros
     # to download:
/tool/fetch url=https://tikoci.github.io/scripts/lsbridge.rsc
     # to install as script
/system/script/add name=lsbridge source=[/file/get lsbridge.rsc contents]
     # to load script into CLI
/system/script/run lsbridge
     # to run just use:
$lsbridge
```
Forum attachment omitted: lsbridge-hex-s-forum.jpeg
**_Tech Note:_ Curating and Colorizing Attributes**
While script is huge, there is actually a pretty simple scheme over how to "colorize" the RouterOS attributes.  Since it might be useful to small subnet of scripting devotees, the key points are:

* **/some/cmd "get" vs "print as-value" ...** - In scripting, using a plain "get" _without attribute_, in most places, returns a _**curated** set of attributes_ - not necessarily ALL attributes.  While a "print as-value" will always return _**all** values_ in the returned array.  This difference is actually useful to $lsbridge, since /interface/bridge get <id> does returns different sets of attributes depending on what is actually configured.  This may be surprising in other cases (i.e. some attribute isn't in a returned "get"), for developing a TUI... using "get" for UI display is useful since it does remove likely esoteric/unset things.
* The even subtler UI trick that results from "get" different output, is that means: **an attribute position on a row may change** - and if you looked at a few different $lsbridge output screen, that be another subtle visual clue "something is different"
* **Colorization scheme is actually pretty simple...** - all the boolean stuff goes to red/green does a lot of work & and to save space some value-names are not output, since value alone is enough and clear in means.  In $lsbridge, this is used to not show "frame-types" since the "allow-only-untagged..." is quite clear alone.  but basically the RouterOS type alone is enough to figure out a color without too much extra logic.  So it's really only items that are "drop-down" in winbox that require special case code to deal with color.
* **Using "columns" is actually much harder** - $lsbridge depends that RouterOS always uses a tab-size of 8 in it's UNIX "termcaps", as a <tab> will cause alignment to the next "tab stop".  While that means if all you have some array data where all elements are <8 chars, it is simple to produce a nicely formatted table:
_:put [:serialize to=dsv delimiter="\t" $my-list-of-lists]_
* But the problem get more complex when data >8 chars, since you can either truncate it (see below)... or the task I avoid here... **track how how tabs may need to be padded if column data has both <8 and >8 values**.  And, even worse, using [:len $cellText] has to be done on the un-colorized version.  As the ANSI color codes are stripped and "don't count" to the 8 char tab spots - but to :len, it a byte and counts.
* **Cells get truncated using first – and last – parts if >8 chars...** - this another subtle UI thing in $lsbridge to note, while "ether11" fits in 8 char, not all interface/etc names.  And often folks do keep some convention with the using "mylonginterfacename13" - so simple just taking "first 8 chars" does not work well in a lot of case.  So the "TUI trick" is to use use any ending numbers (although $lsbridge is a bit less sophisticated, it first 3 char and last 3 chars RN)

**Known Bugs**

* show-id is always set, the .id and .brifid columns shown not be shown by default
* U vs u is does not have some footer to explain - i.e. CAPITAL means it's in current-tagged or current-untagged in /interface/bridge/vlan
* "$lsbridge" help should show all flags and other mappings
* should error if there are "too many vlans" - both since display won't work well right now & the internal arrays are not efficient so easily could hit some scripting memory limit someplace.
* use "smarter" truncation logic
* PORTS section using "wrong" .id value & but not sure any .id value be useful or even clear - only shown as a way to deal with truncated names that may not be ambiguous – but using 16 chars for port/interface name avoid both problems.

[//]: #.

## Post 39

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/39](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/39)
- Created: `2025-02-26T15:42:37.000Z`
- Likes on this post: 0

Some points of clarifications:

> Quoted forum context omitted.

[$lsbridge is just a large function](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting#Scripting-Functions).  While it lives in /system/script, run the script will ONLY load the function in the CLI to be used.  So "/system/script/run" does nothing directly - except if that "run" gets an error message... that means there is a bug in the script and it does not compile.

> Quoted forum context omitted.

7.18 (or eventually newer).  So even 7.17.2 will not work.  In last few V7 release there have been some tiny, potentially esoteric, additions to :convert and :serialize/:deserialize that actually reduce the amount of code needed to do these things.

> Quoted forum context omitted.

The generated "table view" depends on this, since, essentially, :put "one\ttwo\t\three" will automatically align on 8 char tabs.  So **$lsbridge** uses :serialize to add "\t" to RouterOS array lists, as what other languages might call _.join("\t")_.

And as you see here, already bug reports on 7.18...

> Quoted forum context omitted.

You need a **$ _before_ lsbridge**, so:

```text
$lsbridge
```
As explained above, it a function, which is also a :global variable.  So /script/script stores the "code", but cannot show UI.  And in compliance with GOST-RSC-23, there is a "help" subcommand, that explains in terse-terms:

```text
[amm0@forum] > $lsbridge help
$lsbridge [ports|vlans] [show-ids] [as-value] [trim=yes*|no] [color=yes*|no]
```
_The "as-value" allows "dumping" located information to a RouterOS array (i.e. the kinds of array that [make @Dru's head hurt](https://www.youtube.com/watch?v=eWCJw0uZ-lE))... So VERY theoretically use it's calculations in further scripts by consulting the returned array - but it's structure is designed to deal with UI presentation needs (see spaces in flags elements like "   X")_

And **thanks all for testing!**  I do want to add some interactive controls to it one day, like my [see my $PIANO script](http://forum.mikrotik.com/t/piano-interactive-player-piano-studio-quality-recorder-using-beep/173756/1) or [$ROKU](http://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1).  But kinda wanted to know it generally worked before messing with it more....

Also **if anyone had feedback on the information displayed, be open to suggestions**.  Also, I know some of the code needs cleanup, since it duplicative in a few areas - but [partially/opinionatedly] unwinding the bridge mysteries, in RouterOS script, is not so easy.  There is subtle things that it shows, like the "running" status for BOTH the /interface/bridge/port and /interface/vlan as IP- and MAC- & and also why it's 48K worth of script (*actually, the colors add the most code).

FWIW, I tested this on pretty stock KNOT this AM with one VLAN, and the above steps did work:
Forum attachment omitted: 7.18 on KNOT one-vlan defconf with $lsbridge .png
Now I've only tested on hEX-S, RB1100AHx4, RB5009, and KNOT at this point.   So it's totally possible the code does not correctly deal with all bridge configurations.  And **a _vlan-filtering=yes_ bridge is required** - but should prompt if there isn't one...

[//]: #.

## Post 41

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/41](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/41)
- Created: `2025-02-26T16:14:16.000Z`
- Likes on this post: 0

Happy to see it work someplace else actually.   And I made a script around [:beep], don't necessarily expect useful :wink:.

But agree it be more useful if CHANGE the config using it like "Excel" spreadsheet to change a "cell" (i.e. tagged/untagged port) with arrow keys for navigation.

Now on the shown data, I'll disagree a bit.   Your screenshot shows a lot &  more than just a single /export would.  For example, we know your actual-mtu=1500, and none of the /interface/vlan's are disabled, etc.

Also with the dynamic /interface/bridge/ports change in 7.16+ - VLAN bridge config is not going to be exposed under /bridge – you have "envision" what /interface/vlan/add does now.  This is useful for scripted configuration for sure....  But makes an export more tricky to read with the dynamic config not being show there.

And again more subtle things is if you "manually" created a VLAN (vs RouterOS adding one dynamically/automatically).  Or whether a port is active (plugged-in) is show via the letters and colors.  I know there is a lot of them.  But was kinda going for some single screen that "resolved the bridge config" for **quicker review**.

[//]: #.

## Post 42

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/42](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/42)
- Created: `2025-02-26T16:26:17.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Also, arguably*, it not directly show whether you have an "unbridged management port" ...
But since you say it's a ax3, those have 5 ports & "ether5" is absent/missing from display...
I think it show you followed @anav specs to have a management "oh shit" port too.

(* currently $lsbridge, by default, uses the _FIRST_ vlan-filtering=yes bridge to display — so show "unbridged" things IDK as going against it working from some fixed /interface/bridge to view the world)

[//]: #.

## Post 48

- Original post: [https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/48](https://forum.mikrotik.com/t/example-of-automating-vlan-creation-removal-inspecting-using-mkvlan-friends/181480/48)
- Created: `2025-09-17T03:26:08.738Z`
- Likes on this post: 0

> Quoted forum context omitted.

The `+` is currently calculated from /interface/bridge/port _only_.  So it's not reading the PVID on bridge.  I'll take a look and try to fix that.

> Quoted forum context omitted.

RouterOS `:put` with a `\t` lines up columns at 8 chars.  Since custom names (or even potentially default names) could be longer than 7 chars, the code always truncates names to fit.  The truncating logic uses the first few chars **and** last chars... so how well it works kinda depends on how you create names.

Anyway I'll take a look at this script again and see what can done to clean this up.
