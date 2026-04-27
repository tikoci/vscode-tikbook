[//]: #!tikbook discourse-bookmark topic=155978

# ZeroTier on Mikrotik – a rosetta stone [v7.1.1+]

- Source thread: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/1](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 45 total (45 post bookmark(s))
- Posts included: 16
- First bookmarked: `2025-06-16 20:32:54 UTC`
- Last bookmarked: `2025-06-16 20:32:54 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/1](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/1)
- Created: `2022-02-20T01:34:46.000Z`
- Likes on this post: 0

**ZeroTier on Mikrotik is only available for ARM/ARM64 architecture running RouterOS version 7.1+**
This is biggest blocker to a lot useful use cases, since not all Mikrotik's are ARM-based.

**You may not have to even read this!  ZeroTier _aims_ to be very simple.**
So _IF_ you followed Mikrotik's instruction _AND_ know some networking/Mikrotik config already, _SHOULD_ be easy.  Now, it's the intersection with other RouterOS features/protocols where there may be more trouble, and why I write this. _But seemingly even "OSPF over ZeroTier" can be resolved within 4 forum posts, see: http://forum.mikrotik.com/t/ospf-over-zerotier/155782/1 - so lots of hope it CAN be simple._

I do NOT try to replace Mikrotik documentation, or ZeroTier's either, rather _supplement_ it here.
So this post make whole lot more sense if you'd already _tried_ Mikrotik's ZeroTier instructions FIRST:
**https://help.mikrotik.com/docs/display/ROS/ZeroTier**

Read this post more as a **"ZeroTier service manual for Mikrotik"** – rather than a cut-and-paste config cookbook.  For MIPSBE/TILE/SMIPS/CHR/X86 users – more **"Planning Guide"** :frowning:   _Although, AFAIK, Mikrotik has NOT said_ anything _about support for other platforms._

Disclaimer: _I write at the prompting of [@anav](https://forum.mikrotik.com/posting.php?mode=quote&p=913352) in several threads.  Most of my knowledge comes from reading ZeroTier's docs, KB, reddit, and other forum posts here, so not an expert on ANY of this.  But the details on how this all works on Mikrotik are a little vague and poor cataloged...  so I TRIED to distill all the various bit of using ZeroTier on Mikrotik into one post – it's long as a result..._.  But no warranties or guarantees here.

**ZeroTier Not Working?**
The _pre-flight checklist_ for RouterOS+ZeroTier:

* Can you ping the internet? (e.g.

```routeros
/ping [:resolve cloud.mikrotik.com]
```
)
* Did you follow Mikrotik instructions to setup ZeroTier? (e.g. https://help.mikrotik.com/docs/display/ROS/ZeroTier)
* Is your firewall allowing both ZeroTier "peers"/tunnels (typically port 9993) & traffic ("zerotierX" interface) in /ip/firewall/filter?
* ZeroTier instance is enabled and running? (e.g. /zerotier/enable [find])
* Is the ZeroTier interface showing "OK"? (e.g. /zerotier/interface/print)
* Are all ZeroTier clients ("members") authorized in [ZeroTier Central](https://my.zerotier.com)? (e.g. https://my.zerotier.com)
* Is there other Mikrotik config that might block the particular service you want to use (e.g. /ip/service)?
* Are the ZeroTier flow rules right?  (e.g. using ZeroTier's defaults in most cases)
* But if your using non-IP ethertypes in your network...like RoMON, VLAN tagged trunks, etc., did you CHANGE the flow rules to allow the ethertype? (see below for details on flow rules)
* If your ZeroTier interface is a _bridged port_, is "Allow Bridging" for "Member" at https://my.zerotier.com have a checkmark/enabled? _In all other cases, DO NOT CHECK "Allow Bridging"_

**Wait, so what can I use ZeroTier for?**

Mikrotik says:

> * Hosting a game server at home (useful for LAN only games) or simply creating a LAN party with your friends;
> * Accessing LAN devices behind NAT directly;
> * Accessing LAN devices via SSH without opening port to the Internet;
> * Using your local Pi-Hole setup from anywhere via the Internet;
>

I can add a few more Mikrotik-specific ones, covered later here:

1. **Using ZeroTier for remote management of RouterOS**
2. **Site-to-site routing using ZeroTier with static routes**
3. **Bridging a single LAN/VLAN to desktop/laptop using ZeroTier**
4. **Bridging an entire VLAN trunk using ZeroTier**

Some **non-Mikrotik example use cases** for ZeroTier can be found here:
https://github.com/zerotier/awesome-zerotier
_e.g. You don't necessarily need a Mikrotik to use ZeroTier._

**What is ZeroTier, in one word: "[deperimeterization](https://en.wikipedia.org/wiki/De-perimeterisation)"**
That's ZeroTier's word choice, not mine – so easy to understand how ZeroTier concepts could get confusing.  The ZeroTier client's [source code](https://github.com/zerotier/ZeroTierOne) is viewable on GitHub, if interested, but it has a good description of ZeroTier's aims:

> ZeroTier is a smart programmable Ethernet switch for planet Earth. It allows all networked devices, VMs, containers, and applications to communicate as if they all reside in the same physical data center or cloud region.
>
> This is accomplished by combining a cryptographically addressed and secure peer to peer network (termed VL1) with an Ethernet emulation layer somewhat similar to VXLAN (termed VL2). Our VL2 Ethernet virtualization layer includes advanced enterprise SDN features like fine grained access control rules for network micro-segmentation and security monitoring.
>
> All ZeroTier traffic is encrypted end-to-end using secret keys that only you control. Most traffic flows peer to peer, though we offer free (but slow) relaying for users who cannot establish peer to peer connections.
>
> The goals and design principles of ZeroTier are inspired by among other things the original > [Google BeyondCorp](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43231.pdf) > paper and the > [Jericho Forum](https://en.wikipedia.org/wiki/Jericho_Forum) > with its notion of "deperimeterization."

If you want to read more...

ZeroTier's official docs and KB are here:
https://docs.zerotier.com
https://zerotier.atlassian.net/wiki/spaces/SD/overview

ZeroTier also have their own user forum:
https://discuss.zerotier.com/search?q=mikrotik

& Mikrotik-specific ZeroTier discussion is this forum post:
http://forum.mikrotik.com/t/zerotier-added-to-routeros-v7-1rc2/151475/1

**My use case:  "winbox+ssh over LTE"**
This really did just work for me from day one – I followed Mikrotik instruction and my Mikrotik showed up in a remote winbox as "neighbor" (via a ZeroTier network).  No muss, no fuss.  Basically the experience as @gotsprings' comments in another posting:

> Quoted forum context omitted.

What ZeroTier solves is LTE networks are often behind a CGNAT.  And with a CGNAT, basically you can enable any VPN protocol in RouterOS since you can't open listen ports.  Obviously solvable in a lot of ways.  But with ZeroTier you just add few config lines on the Mikrotik & then be able use winbox (or ssh/webfig/etc) from literally anywhere, relatively safely.  The only problem is this only works for ARM-based Mikrotik, since **ZeroTier is not available for MIPSBE, CHR, TILE, etc. yet**

Maybe I'm a cynic... but seeing all your [ARM-based  :confused:] **remote** Mikrotik's just appear in winbox(+Mac+wine+ZeroTier), with only a few lines of config, is nothing short of miraculous.  Why I share what I know about "ZeroTier on MikroTik RouterOS".  Hopefully others can chime when I'm wrong, or share more details.

**_Multipath_ is missing in Mikrotik's ZeroTier!**
_**i.e. potentially using ZeroTier Multipath for "cellular bonding"?**_
I use a lot of Mikrotik's LTE devices, including wAP ac R, Audience, and RB5009(+USB modem) that are supported by the ZeroTier package.  Outside support for _all_ architectures, "Multipath" be my #1 feature request for ZeroTier!  It's not support on RouterOS today, ZeroTier's KB describe what it does:
https://zerotier.atlassian.net/wiki/spaces/SD/pages/568459265/Multipath
Today, /zerotier on Mikrotik does not have the needed options to enable ZeroTier Multipath, specifically "**defaultBondingPolicy**" etc. that are in the ZeroTier's native local.conf.  While I can't say how well ZeroTier Multipath Bonding works – I can't test it either.  But "cellular bonding" is a common feature on competing LTE routers & RouterOS has NEVER had a good solution to bond (e.g. "aggregate") multiple LTE interfaces.  Maybe ZeroTier work for this, dunno yet...

**ZeroTier isn't "open source" but can be free**
IANAL... For non-commercial use it can be used as if it were through my.zerotier.com controller (or pay for an enterprise plan).  The "Free Plan" does offers unlimited networks, just only 1 admin account, and limited to 25 members in total.  They do offer paid plans with high limits and other services, see [ZeroTier pricing page](https://www.zerotier.com/pricing/).  ZeroTier is licensed under a MariaDB-type "BSL" license, which is kinda different from a lot of commercial or OSS licenses, you can read it yourself if you want: https://github.com/zerotier/ZeroTierOne/blob/master/LICENSE.txt

**About ZeroTier Planets, Leafs, and Moons...**
Well...ZeroTier's backend isn't discussed here.  ZeroTier's docs describe the various roles/topology, if interested.  From a Mikrotik POV, these roles are mostly out of your control, so understanding them isn't critical to using ZeroTier.  Now /zerotier/peer will identify if leaf, planet, etc, – which ALL can be thought about as "possible routing path" a ZeroTier tunnels MAY take.
A limitation today is a Mikrotik can NOT act as ["Moon" (Private Root Server)](https://docs.zerotier.com/zerotier/moons) or as "Self Hosted Controller" today – this is, in part, why you need to use the controller at my.zerotier.com to manage ZeroTier.
In recent v7 RouterOS, a Mikrotik can act as ZeroTier controller.  See https://help.mikrotik.com/docs/display/ROS/ZeroTier#ZeroTier-Controller – basically instead of using my.zerotier.com, you can use a Mikrotik acting as a ZT controller to create ZT networks and authorize members.   But this seems like a whole different topic – the focus here is _using a ZeroTier interface_ and ZeroTier network & NOT how ZeroTier internally works.

**ZeroTier's Own Router Configuration Tips**
ZeroTier's KB has an article with a few suggested configuration to make their tunnels work better:
https://zerotier.atlassian.net/wiki/spaces/SD/pages/6815768/Router+Configuration+Tips
With the key takeaways for Mikrotik being:

* Using UPnP on your network can greatly improve performance by allowing ZeroTier endpoints to map external ports and avoid NAT traversal entirely.
* IPv6 is recommended and can greatly improve direct connection reliability if supported on both ends of a direct link.
* No Double NAT. Multiple layers of NAT introduce connection instability due to chaotic interactions between states and behaviors at different levels.
* If you have a firewall, allow traffic to/from UDP port 9993 to allow ZeroTier tunneling
* _Should I forward any ports in my router?_  No. Let ZeroTier and UPnP and IPv6 handle it automatically.
* RouterOS does not support NAT-PMP, but that is part of their recommendations.

**IPv6 "cheat code" using ZeroTier tunneling**
Consensus is you should use IPv6, if you can.  RouterOS v7 now has IPv6 is enabled by default, so if an ISP offers, Mikrotik will use it.  And, ZeroTier will prefer IPv6 when establishing potential tunnels.  Thus, even if you are blissfully unaware of IPv6, you may get IPv6 by virtue of using a ZeroTier network on a Mikrotik.  _i.e._ even if your internal networks use only IPv4, IPv6 may be used by ZeroTier tunnels.  Potentially getting a performance bump from ZeroTier's _automatic_ usage of IPv6 & not having to learn a thing about IPv6 _or_ change your IPv4 network one bit to get IPv6 internet.

**ZeroTier vs Wireguard**

This is a much discussed topic.  To quote @normis:

> Quoted forum context omitted.

So I focused on what ZeroTier _does_ – NOT if the _right_ choice for some use case.  The central difference between Wireguard and ZeroTier is:

* Wireguard works at with L3/Layer3/IP
* ZeroTier works at L2/Layer2/Ethernet/MACs/Bridges

So if you need _just_ L3/IP routing, there are LOTS of other protocol choices that may be better than ZeroTier...  In V6 terms, Mikrotik ZeroTier support does pretty much what EoIP+IPsec would, while Wireguard acts more like IPIP+IPSec.  With the underlying philosophy behind them looking a lot like whether you'd use MPLS or OSPF – ZeroTier being akin to MPLS's "Layer 2.5"/tags/overly networks, with Wireguard being in OSPF's strict IP/Layer3 focus (in that analogy).

If you want "geek out", you can read, and compare the [original WireGuard paper](https://www.wireguard.com/papers/wireguard.pdf) with ZeroTier's author's goals in his blog titled ["Decentralization: I Want To Believe"](http://adamierymenko.com/decentralization.html) – the difference between ZeroTier and Wireguard become readily apparent.  With Donenfeld describing WireGuard as:

> WireGuard is a secure network tunnel, operating at layer3, implemented as a kernel virtual network interface for Linux, which aims to replace both IPsec for most use cases, as well as popular user space and/or TLS-based solutions like OpenVPN, while being more secure, more performant, and easier to use. The virtual tunnel interface is based on a proposed fundamental principle of secure tunnels: an association between a peer public key and a tunnel source IP address.

with Ierymenko's 2014 Design Goals for ZeroTier

> I began the technical design of ZeroTier with a series of constraints and goals for the underlying peer-to-peer network that would host the Ethernet virtualization layer. They were and are in my head, so let me try to articulate them now. These are in order of importance, from most to least.
>
> 1. Any device must be able, by way of a persistent address, to contact any other connected device in the world at any time. Initialization of connectivity should take no longer than one second on average, ideally as close as possible to underlying network latency. (Non-coincidentally, this is what IP originally did before mobility broke the "static" part and NAT and other kinds of poorly conceived fail broke IP generally.)
> 2. It must just work. It must be "zero configuration." The underlying design must enable a user experience that does not invite the ghost of Steve Jobs to appear in my dreams and berate me.
> 3. If the underlying network location of a peer changes, such as by leaving hotel WiFi and joining a 4G access point, connectivity and reachability as seen by any arbitrary device in the world should not lapse for longer than ten seconds. (This is just an aspect of goal two, but it's worth stating separately because it will have implications later in the discussion.)
> 4. It must work for users obtaining their Internet service via all kinds of real-world networks including misconfigured ones, double-NAT and other horrors, firewalls whose clueless administrators think blocking everything but http and https does anything but inconvenience their users more than their attackers, etc.
> 5. Communication should be private, encrypted, authenticated, and generally secure. Security should be end to end, with secret keys not requiring central escrow. The network must be robust against "split brain" and other fragmentations of the address space (whether intentionally-induced or not) and Sybil attacks.
> 6. The overall network should be as decentralized as possible. Peer to peer connectivity should always be preferred, and centralized points of control should be minimized or eliminated.
>

The fact ZeroTier uses "Ethernet" / Layer2 is actually makes it different to start, and useful property for a lot things (but NOT ALL things) on a Mikrotik.  Since ZeroTier allows a "overlay network" on top of whatever network already exist, even regular networks users can also their own create ZeroTier networks, without a Mikrotik admin even being involved – that's part of ZeroTier's goals.  So as Mikrotik admin, even if you're not using ZeroTier, it's possible your users are.  And why some understand of ZeroTier may be useful even if you're not using it on a Mikrotik.

**Back to ZeroTier on Mikrotik...**

The first thing to understand is a /zerotier/interface on RouterOS ("zerotier1") = a "Member" of a ZeroTier "Network" created at https://my.zerotier.com.  And each ZeroTier network is best thought about as a unique but "global ethernet switch", with Mikrotik's /zerotier/interface being connected to a port on that switch.  And on the Mikrotik side, ZeroTier works same as if you added any other layer-2 interface in RouterOS.  Which means it ZeroTier can be a port on a RouterOS bridge interface if that's what your want – allowing a range of possibilities, which I'll discuss later.  But at the end of the day, the ZeroTier interface, once established, can be used just like an other "ethernet-like" interface on the RouterOS side: bridged or not bridged, up to you.

**It's a little like EoIP...**
If you're familiar with RouterOS, a good analogy for ZeroTier on Mikrotik is as a "sophisticated" version of EoIP+IPSec – so any use case where EoIP be useful, ZeroTier might be similarly useful.  Configuration wise, EoIP and ZeroTier largely identical in their usage in RouteOS, and have similar properties inside /ip/firewall & /interface/bridge – the only difference is in the backend tunnels.  In EoIP, tunnels are controlled by _explicitly_ setting the remote end, while in ZeroTier the tunnels are created _dynamically_ following ZeroTier's protocol to find paths to the remote end.  _And EoIP is one-to-one, while ZeroTier is potentially one-to-many._  There are more use case for ZeroTier beyond an EoIP replacement – but EoIP is closest V6 protocol to ZeroTier, at least parts of ZeroTier's possibilities.   Basically if you only have just two Mikrotik's connected to a ZeroTier network, it _largely_ no different than having an ethernet cable between them from RouterOS config's POV, just ZeroTier will inject an IP address on it automatically.  Now also the MTU be higher with ZeroTier than typical ethernet, & speed wouldn't even be close to line rate – but conceptually the same as an ethernet cable to switch – just slower WITH a few MORE gotchas (and it's these "gotchas" are what I'm try to cover here).

**Mikrotik config: /zerotier vs /zerotier/interface**
There is a ZeroTier _instance_ under /zerotier ("zt1"), but does not effect _configuration_ much, other than it **needs to be enabled**:

```routeros
/zerotier/enable [find]
```
But for the most part it can be ignored - we mainly deal with /zerotier/interface in this post.  But it is the _instance_ that _automatically_ creates any needed tunnels used by one or more /zerotier/interface(s).  But "the how" is _outside the control of RouterOS_ config since it _should_ follow [ZeroTier's VL1/VL2 protocol](https://docs.zerotier.com/zerotier/manual#211networktopologyandpeerdiscoveryaname2_1_1a).  While you can control which Mikrotik interfaces a ZeroTier instance is allowed to _potentially_ use via a "/zerotier/set [find] interface=", you can NOT control the specific path ZeroTier will _actually_ use - the Mikrotik admin only controls the Mikrotik _interfaces_ a tunnel will _try_ to use.  While the ZeroTier _instance_ is not be covered by [Packet Flow Diagram](https://help.mikrotik.com/docs/display/ROS/Packet+Flow+in+RouterOS) yet?,  any ZeroTier _interface_ like "zerotier1" follow ALL the normal packet flow diagram for a "logical in (or out) interface".  So ZeroTier _interface_ (e.g. traffic) is controlled the exactly same flow as something like EoIP or anything ethernet-like interface in any firewall rules etc.  **So managing the Mikrotik firewall around ZeroTier MAY be most difficult part here.**

**Initial ZeroTier Setup**

> Quoted forum context omitted.

Note: **If you use winbox, you should use v3.32+** since it has ZeroTier support in the GUI.  I use CLI commands in examples, but same stuff can be done winbox.  In particular, winbox's ZeroTier>Peer view is pretty handy to see what's going on with ZeroTier "tunnels" (e.g. "peers").

**I'll assume the basic ZeroTier setup from https://help.mikrotik.com/docs/display/ROS/ZeroTier has been done and at least getting an IP address from ZeroTier.**. Try Mikrotik's help doc on ZeroTier before doing anything described here.  That means:

* Your Mikrotik is what ZeroTier calls a "Member" of ZeroTier "Network" & need to have a "checkmark" under "Auth?" at https://my.zerotier.com
* /zerotier/interface/print should show "OK"
* Your Mikrotik should have an IP address (/ip/address/print) in the same range as the "Auto-assigned IP address" on the "ZeroTier Network" from my.zerotier.com web console.
* At least to start, **do NOT change any the defaults in ZeroTier**, other than those Mikrotik's ZeroTier docs recommends. e.g. use the "Easy" mode under "Auto-Assign from Range".
* If the IP range selected under "IPv4 Auto-Assign" within my.zerotier.com is in-use within your network, pick ANOTHER IP range from the list.
* You'll likely need to do _something_ within your firewall to allow ZeroTier.  Mikrotik's instructions on ZeroTier have a "optional step" to add a firewall rule (#6), but it isn't optional if you're using the default firewall.
* To see the tunnels created by ZeroTier, you can use:

```routeros
/zerotier/peer/print
```
Some additional troubleshooting tips:

* **Get an auto-assigned IP address from ZeroTier showing up on the Mikrotik is STEP 1 here** to know ZeroTier generally works BEFORE trying to config anything complex.
* For bridging cases, we won't use the defaults settings.  But for most Layer3 things, ZeroTier's network defaults really should be okay to start with.
* If you can't get this working, check the firewall rules and/or add ZeroTier the the right /interface/list and/or verify the Mikrotik has a working internet connection/DNS/etc.
* This is easy to forget.  But ALL devices joining a ZeroTier network MUST be individually authorized.  This is done by checking a box in my.zerotier.com for the particular device ("Member" in ZeroTier terms) under the "Devices" section. Mikrotik's ZeroTier docs explain this, but needs to happen for each new participant in the network.
* Next to each "Member"/device in my.zerotier.com, there is a "wrench" icon.  Tapping the "wrench" will show a couple device-specific network settings.  By default, both "Allow Ethernet Bridging" and "Do Not Auto-Assign IPs" are **UN**CHECKED.  Leave them this way for all devices initially.  But I'll note that both "Allow Ethernet Bridging" and "Do Not Auto-Assign IPs" should be CHECKED ONLY **IF** if it's a Mikrotik device AND ZeroTier interface has been added as a bridge port – ALL non-Mikrotik other devices should still be **UN**CHECK even in the bridging case (and Mikrotik's that are NOT bridged, too).  There is more configuration needed for bridging, discussed later – so really best to get a non-bridged ZeroTier connection working first!
* If you did already change some settings, you can start again with by creating a _new_ ZeroTier network in my.zerotier.com – you'd need to re-add the network ID on the Mikrotik side to join the newly created network.  You'd start at step #4 in the [Mikrotik ZeroTier help](https://help.mikrotik.com/docs/display/ROS/ZeroTier).
* In the free plan, ZeroTier limits you to 50 "member" devices per network and 1 admin.  But you can create unlimited number "Networks", so pretty easy to create multiple networks on my.zerotier.com for testing or have different configurations (say, eventually, have a different ZeroTier Network for each Mikrotik VLAN)...
* Either by design/config/bugs ZeroTier traffic may NOT show up in the /tool/sniffer or /tool/torch.  Not tested personally but recall some forum posting about these not always working.  So if a sniffer trace doesn't show ZeroTier, it _may_ still be working and the problem _could_ be with the sniffer/etc.
* ZeroTier's controller at my.zerotier.com has "Flow Rules" for a network.  In most cases you can leave them alone – except for RoMON or VLAN trunking (and perhaps a few similar things).  While you can do nifty stuff like block ports or even "ethernet types" on the ZeroTier side, to control _any_ ZeroTier traffic – this is the "SDN" (software defined networks) part of ZeroTier (and why ZeroTier is pretty different from Wireguard).  At 10,000 foot level, ZeroTier's flow rules are like a firewall, but since it's stateless that means no connection tracking & since a ZeroTier network is more like a switch, the Flow Rules operate on ALL ethernet frames passing through the ZeroTier traffic (so they are actually more similar to the RouterOS's _Bridge_ Firewall).  But the Flow Rules be whole different topic. Leaving them as defaults in my.zerotier.com network is BEST plan initially.

> Quoted forum context omitted.

Well for the admin uses, I think it's pretty easy.   For the bridging cases, the "mysteries" of the Mikrotik "Bridge" interface combine with nuances of ZeroTier – so kinda need to understand both pretty well so, yeah, "not so easy".  With V7 being new too...the potential for subtle RouterOS bugs may add another fun element on top.  Moving on the actual question about use cases...

**Use Case A: Using ZeroTier for remote management of RouterOS**

> Quoted forum context omitted.

This should actually work if both the iPhone and Mikrotik are joined to the same ZeroTier network as "Members".  You can use the ZeroTier assigned IP address to connect via webfig or Mikrotik iPhone app, assuming the iPhone has ZeroTier connected to same network.  It really is that simple.

**Firewall may be why this wouldn't just work...**
If you're using the default firewall, you need to do _something_ with zerotier1 interface to allow ("accept") it.  e.g. RouterOS firewall rules (/ip/firewall/filter) may block Winbox, SSH, etc. ports on INPUT from zerotier1 (since, by default, it isn't part of the LAN /interface/list).  Basically you need consider the ZeroTier interface (or IP range) and it's effect on your specific firewall rules – otherwise it may be DROP'ed by the default firewall filter rules.  Mikrotik's example allows full access to the router from the connected ZeroTier network, while blunt, does work:

```routeros
/ip firewall filter
add action=accept chain=forward in-interface=zerotier1 place-before=0
add action=accept chain=input in-interface=zerotier1 place-before=0
```
But a better approach may be to put the "zerotier1" interface in a specific /interface/list like "LAN" (or "BASE", "MGMT", etc.) so it be allowed via an EXISTING set of firewall rules, and controlled via an "/interface/list".  In most default configs this would do the trick too:

```routeros
/interface list member add list=LAN interface=zerotier1
```
And all smartphone/laptops/desktops/etc connected using a ZeroTier client app, that then connect to RouterOS over ZeroTier will appear using their ZeroTier-assigned IP address, via a Mikrotik's ZeroTier interface like "zerotier1" – any these can also be used in firewall rules as needed to accept/drop traffic too.  Certainly you can use more restrictive rules within the Mikrotik firewall (e.g. allowing ONLY  winbox/ssh/etc TCP ports using "... chain=input in-interface=zerotier1 ...").

**/ip/service can also restrict winbox,ssh,https,api,etc**
This isn't ZeroTier specific. But since ZeroTier does assign new IP range, you may have to add them as"allowed address" based on

```routeros
/ip/service/print
```
**/ip/neighbor "discover-interface-list" should include ZeroTier interface too...**
winbox uses the "discovery protocol" from RouterOS – that how the list of RouteOS device is built in winbox's "Neighbors" tab shown at startup.  But for this work, the laptop/desktop running Winbox must be connected to same ZeroTier network & the ZeroTier interface must be listed in a /interface/list of the "discover-interface-list" used in /ip/neighbors for "discovery over ZeroTier" to work.  If you already added zerotier1 to the "LAN" interface list, the defaults would allow discovery to work over ZeroTier, to check make sure the "discover-interface-list" includes the ZeroTier interface.  In some cases the default is "all", to check these use:

```routeros
 /ip neighbor discovery-settings print
#  discover-interface-list: all
#  lldp-med-net-policy-vlan: disabled
#. protocol: cdp,lldp,mndp
```
You can also change the "discover-interface-list" used, the key part is the /interface/list includes the ZeroTier interface.

**iPhone ZeroTier client may be more limited...**
Since iPhone come up a lot in my world, it important to note that the ZeroTier iOS client is more limited in the traffic it can pass – some Layer2 things are just not possible in iOS VPNs due to Apple/iOS limitation/restrictions.  So stuff like multicast and broadcast may be problematic or not work on iPhone/iPad, what and why is more complex – more something to be aware of when troubleshoot ZeroTier.  What this means for remote management is the Mikrotik's iPhone app may not work for discovery to find other Mikrotik routers over ZeroTier – but connecting to RouterOS using a ZeroTier assigned IP address should always work.
With Mac, Linux, and Windows ZeroTier clients, multicast/broadcasts does just work without issue, so these constraints don't come up.  But assuming the ZeroTier interface was a "discoverable" in /ip/neighbors, winbox should show them in "Neighbors" tab at bottom of winbox (even using wine on Linux/Mac) on desktop/laptop with a ZeroTier client.  Since ZeroTier at Layer2, either the MAC or IP address should work in winbox to connect via ZeroTier.

**Mac-telnet also work over ZeroTier**
Since ZeroTier operates at Layer2, even WITHOUT the right firewall rules... /tool/mac-telnet etc. should work between routers with ZeroTier.  Similar to /ip/service, you'll want to make sure "/tool/mac-server" is configured to allow the ZeroTier interface.  By default it's allows "all" (which include "zerotier1"), but may be restricted if someone choose to locked down the router, the defaults look like this (adjust as needed):

```routeros
/tool mac-server
set allowed-interface-list=all
/tool mac-server mac-winbox
set allowed-interface-list=all
/tool mac-server ping
set enabled=yes
```
**RoMON might be useful for routers without ZeroTier _direct_ support**
I guess ZeroTier isn't the only protocol on a Mikrotik with opaque tunneling and peer discovery, there's RoMON.  NOT necessarily advising this one – RoMON scares me... If you don't know [RoMON](https://help.mikrotik.com/docs/display/ROS/RoMON) help says this:

> RoMON stands for "Router Management Overlay Network". RoMON works by establishing an independent MAC layer peer discovery and data forwarding network. RoMON packets are encapsulated with EtherType 0x88bf and DST-MAC 01:80:c2:00:88:bf and its network operate independently from L2 or L3 forwarding configuration.

Basically it lets you use winbox, even if the RouterOS config is FUBAR.  And does this at Layer2, since ZeroTier also operates at ethernet/Layer2, it should be able "extend" RoMON remotely.  I don't want to cover the security risks, but ZeroTier is encrypted, so any RoMON at least be secured remotely.  While not all Mikrotik support ZeroTier, all do support RoMON – so if you enabled both ZeroTier and RoMON on at least one router, that router could "RoMON Bridge" across a ZeroTier network to allow remote management, on non-ZeroTier Mikrotik with RoMON enabled.

I'd like to say RoMON "just work" with ZeroTier.  But that may NOT be true... We're ignored discussing the flow rules so far.  But with RoMON, ZeroTier _likely_ NOT allow RoMON traffic through a ZeroTier network.  The reason is the Flow Rules would block it since "ethertype 0x88bf" isn't allowed by the default ZeroTier flow rules.

**ZeroTier's "Flow Rules" allow all IPv4, IPv6, and ARP traffic by default...**
That sound like everything, and to an Layer3 IP network, it is.  But at the ethernet level, there are _many_ different "EtherTypes", which is why RoMON may not work.  The "EtherType" comes up in other protocols on a Mikrotik – VLAN, 802.11x, MPLS, Wake-on-LAN, PPPoE, etc these protocol MIGHT have issues similar issue with ZeroTier's default Flow Rules at my.zerotier.com. Wikipedia has a good list of ethertypes:
https://en.wikipedia.org/wiki/EtherType#Values – so RoMON isn't alone here & so this may come up in other context when using ZeroTier.

The ZeroTier default flow include rules like:

```text
#
# Allow only IPv4, IPv4 ARP, and IPv6 Ethernet frames.
#
drop
	not ethertype ipv4
	and not ethertype arp
	and not ethertype ipv6
;
# Accept anything else. This is required since default is 'drop'.
accept;
```
While a double negative, what the drop rule WILL do is drop 0x88bf RoMON frames (and 0x8100 VLAN Ethernet frames, etc. too).  Lots of way to fix this, but for these "speciality" ethertypes, you can also just have "accept" for them at the top of the rules and be done.

So if just add the following to the TOP of the Flow Rules for the Network at my.zerotier.com.  You'd still want the defaults, so LEAVE the rest

```text
#
# Allow RoMON.
#
accept
	ethertype 0x88bf
;
```
There is some docs about the Flow Rules next to where you configure on ZeroTier's Network config page.   But way the flow rules work (& describe this):

* if action matches the criteria, rule evaluation stops (why we add an "accept ethertype 0x88bf;" at start and be done)
* the default action is deny (why the default includes a final "accept;" line) – **so NO rules, means NO traffic**
* if you use IP-based (Layer3) matchers, they are ignored for non-IP traffic (e.g. just "passthrough" to next rule)

But that's just a quick summary, check the docs for more details.

**Routing _and Bridging_ Options using ZeroTier**

Taking a scenario from another forum post by @404Network :
****

> Quoted forum context omitted.

This revolves around whether you want make the site-to-site connection via a Layer2+3 "bridged", or using IP (Layer3) "routing".  Both are possible with ZeroTier, but if you really just need Layer3 subnet routed (e.g. LAN-A to LAN-B), this is where you'd want to make sure Wireguard (or IPSec/MPLS/OSPF/EoIP/etc) isn't a better solution for the site-to-site link.  I say this since ZeroTier isn't going to be as FAST as Wireguard, and certainly more complex conceptually. So if a _direct_ Wireguard connection between two Mikrotik is possible, that be preferable to ZeroTier complexity for simple L3 routing between two Mikrotik routers.  Especially if both side have a fixed IPs, Wireguard is dirt simple.

But one of key benefits of ZeroTier is it's ability to "tunnel though" through a variety of NATs, with the protocol being smart enough to determine if local path is possible to avoid going to cloud if it's not needed – problem this is complex process and again the Mikrotik firewall/config may end up blocking things.  You can view the path it does select however. Using winbox's new ZeroTier UI to look at the "Peer" will show the path being used to troubleshoot the tunnels used by ZeroTier.  From the CLI, it's "/zerotier/peer/print" to see the paths.  You can also use /ip/firewall/connection on winbox with a filter, typically ZeroTier will use port 9993.

So if break up this up into use cases, there are [at least] three flavors of "site-to-site subnet connectivity" that are relevant to ZeroTier:

****

* **Site-to-site routing using ZeroTier with static routes**
* **Bridging a single LAN/VLAN to desktop/laptop using ZeroTier**
* **Bridging an entire VLAN trunk using ZeroTier**

**Likely better way to proxy the internet than ZeroTier...a "non-use case"**
So I'm skipping the cases where you'd use a Mikrotik as default gateway on a ZeroTier network. e.g. using the ZeroTier to proxy internet from a mobile device though the internet connection of a Mikrotik isn't one I'd recommend for ZeroTier.  For this case, you'd likely be better off using Wireguard if you could, so going skip describing this in detail.  But largely it just adding a 0.0.0.0/0 route on to the network used on my.zerotier.com so it points the Mikrotik's ZeroTier IP address & every ZeroTier client that uses it has to enable "Use Default Gateway" & also config on Mikrotik to do the routing too.  So, if you trying to use ZeroTier as VPN concentrator, likely better approaches on RouterOS to do this than ZeroTier.  Not say not possible, or even _potentially_ useful – just it won't be my first choice for this problem.

**Queue the /queue**
My ZeroTier needs for "remote winbox+ssh" can be measured in "kbps", so cannot offer much on QoS topics with ZeroTier.  But once your routing/bridging ENTIRE networks – that's a lot more traffic, potential tunneling in "odd ways".  And if you use QoS or /queue/tree... today, and apply ZeroTier to your parts of your network, you may have to revisit you queue design to control the new ZeroTier things.  Similarly, although very curious, how ZeroTier tunnels and/or traffic combine with V7 queue like fq_codel and CAKE is also something I have not tried.  Likely any queues won't effect whether ZeroTier "works", but do think the right /queue's could help with eventual "ZeroTier is slow!" problems.  _If/How?_ Dunno.

**Use Case B: Site-to-site routing using ZeroTier with static routes**

_Adapted the RPi-approach from ZeroTier's KB ["Route between ZeroTier and Physical Networks"](https://zerotier.atlassian.net/wiki/spaces/SD/pages/224395274/Route+between+ZeroTier+and+Physical+Networks)_

At a high level, ZeroTier is just a switch.  So if two Mikrotik are both "members" of a same ZeroTier network, they are also directly connected from RouterOS's POV.  Like any interface with an IP address in RouterOS, a "connected route" is automatically created in /ip/route for the subnet, based on the subnet mask in /ip/address.  So the same is true for the ZeroTier interface.  If you have two Mikrotik routers and just need IP routing, it's same as you would to enable IPv4 routing on an interface:
the "other Mikrotik's" IP subnet is dst-address in /ip/route, except for ZeroTier the gateway= is the ZeroTier IP address of "other Mikrotik", on the "first Mikrotik".

Basic IP routing stuff, just using "zeroteirX" instead of "etherX" –  ZeroTier isn't any different for other IP routing cases...

But walking through this... Taking the LAN A to LAN B case, with two Mikrotik routers, each connected to a different WAN, with some default/QuickSet firewall.  Let's assume both Mikrotik were connected to same ZeroTier Network (e.g. used same ZeroTier Network ID on BOTH routers).  And the following IP subnet are used:
LAN-A IP address on ROUTER-A = 192.0.2.1/24
LAN-B IP address on ROUTER-B = 198.51.100.1/24
ZeroTier "IPv4 Auto Assigned" IP to ROUTER A = 10.1.1.**100**/24
ZeroTier "IPv4 Auto Assigned" IP to ROUTER B = 10.1.1.**200**/24

Since both sides have a shared Layer3/IP subnet created by ZeroTier, a static route can be used on each to route traffic using the ZeroTier created network.  Since ZeroTier uses it own algorithms to determine the best path, we don't have to worry TOO much about the WAN side or how the tunnel got made.  In the most basic case, all that's need beyond the connection to ZeroTier is a static route on EACH router.  (Assuming both routers are were successfully connected to same ZeroTier network.)

So on ROUTER-A,

```routeros
/ip route add dst-address=198.51.100.0/24 gateway=10.1.1.200
```
And reverse on ROUTER-B,

```routeros
/ip route add dst-address=192.0.2.0/24 gateway=10.1.1.100
```
Assuming a "QuickSet-like" config, also need the /zerotier/interface (e.g. default "zerotier1") in the LAN interface list:

```routeros
/interface list member add list=LAN interface=zerotier1
```
/ip/firewall/filter _could_ block the IPs or interfaces, if you've deviated too much from the defaults.  But how to configure a firewall is a different topic.  Also, the zerotier1 interface needs to be running and showing "OK" on both routers (e.g. you'd setup ZeroTier on both routers).

But that's all it should take for a user in LAN A with IP 192.0.2.101 to ping a device at 198.51.100.201 on ROUTER-B/LAN-B and get a response.  The traffic be would carried by ZeroTier in a VL1+VL2 tunnel, and en-/de-capsulated into the zerotier1 interface on both sides, but all this happens "automatically" by the ZeroTier package.

**More about the ZeroTier tunnels (e.g. /zerotier/peer)...**
A spin on this case, is if those same routers were also connected via some local ethernet/VLAN trunk in addition to have a WAN connection.  Since Mikrotik's default ZeroTier _instance_ will listen on "all interfaces" on the Mikrotik, it should find a local ethernet path, and used that.  So ZeroTier doesn't always use internet/cloud to connect a ZeroTier tunnel between the two routers.  It can (and will) if that's the only path available.

The fact the ZeroTier protocol is always looking for a path (and establishes multiple paths to check) can be useful to easily add redundancy/resiliency.  ZeroTier will automatically/internally choose a different path for its tunnel if one path fails.  Even do stuff some nifty stuff with its tunnels.  Like...while you make have only IPv4 traffic, ZeroTier may create a IPv6 tunnel (assuming IPv6 on a WAN) – you'd getting some potential performance advantages from IPv6 internet, while still dealing with more simple IPv4 routing.  And if say the IPv6 tunnel stopped working, ZeroTier switch its type tunnel to IPv4 WAN/internet, etc., automatically.

Basically it's ZeroTier job to make sure zerotier1 has _some_ path to join the ZeroTier network together – which is why you don't have to worry too much about how ZeroTier is creating tunnels - since it's abstracted away & presented as the ZeroTier interface to rest of RouterOS.  The flip side here is while some people like magic, others know "magic" is generally just complexity in disguise.  ZeroTier's "magic" has worked for me, but YMMV.

Note: By default ZeroTier is allow to use any interface to establish its tunnels.  If you want to limit the possible path a ZeroTier VL1/VL2 tunnel takes, you need to set the interface= to be a list of interface instead of "all":

```routeros
 /zerotier/set [find] interface=all
```
Now, if you change this, you may limit ZeroTier ability to find the "best" path.  Again the ZeroTier>Peers view in winbox v3.32, or

```routeros
/zerotier/peer/print
```
will also show the tunnels/path uses by ZeroTier.  If you change interface=, this list may change – obviously no peers is a problem.

Since ZeroTier generally using UDP/9993, you can see ZeroTier tunnels in /ip/firewall/connection.  Or, you can use /tool/torch on particular interfaces and filtering for 9993.  Basically, the usual RouterOS tools should work the same with ZeroTier - you just need to know what to look for.  Since possible ZeroTier may use other ports, using /zerotier/peer should help with that – look at the "path" for each peer will show the IP/port it uses (and other stats).

**Use Case C: Bridging a single LAN/VLAN to desktop/laptop using ZeroTier**

_Loosely adapted from ZeroTier's KB ["Bridge your ZeroTier and local network with a RaspberryPi"](https://zerotier.atlassian.net/wiki/spaces/SD/pages/193134593/Bridge+your+ZeroTier+and+local+network+with+a+RaspberryPi) - except they recommend [LPM](https://en.wikipedia.org/wiki/Longest_prefix_match) e.g. /23 for "Managed Router", and /24 "Mikrotik/LAN Subnet", while below suggests changing the /ip/pool size - either work.  LPM is certainly easier, UNLESS you use have adjacent IP subnets._

Let's take ROUTER-A from above, and assume we want LAN-A subnet **bridged** to a remote MacBook..
LAN-A used a 192.0.2.0/24 subnet.
The goal here be the MacBook, even though remote(/not local) to the Mikrotik, also be on the 192.0.2.0/24 subnet.
And specifically, be able to use mDNS/Bonjour across the internet via ZeroTier.

Let's assume ROUTER-A has some default configuration with a LAN being on a /interface/bridge interface.
Specifically /ip/address of 192.0.2.1 for ether2 & a /interface/bridge/port "ether2" is associated with "bridge1" for this example.

Setting this up on the _**Mikrotik side**_ is pretty simple, assuming the ZeroTier _interface_ is name the default "zerotier1", you "just"***** add that as a bridge port:

```routeros
/interface bridge port add bridge=bridge1 interface=zerotier1 pvid=1
```
_If you use vlan-filtering=yes and the LAN is actually a VLAN, you'd need to do set right things in /interface/bridge/vlan too – e.g. the zerotier1 port is list "untagged" on VLAN ID you want want to bridge over ZeroTier AND pvid= on the bridge port for zerotier1 also matches your VLAN ID.  No different than an other ethernet[-like] interface on a VLAN Filtered Bridge_.

**This is the annoying part...when you want to bridge to any NON-Mikrotik ZeroTier client like Windows/Mac/Linux/smartphones/etc...**
Before enabling bridging on the ZeroTier controller at my.zerotier.com, you very likely need to adjust the DHCP Address Pool range (under /ip/pool) for the LAN you want to bridge.  I write up the why on this later.  But basically ZeroTier doesn't use DHCP to assign an IP, even when bridged.  So you need a range of your LAN addresses to use to assign to remote ZeroTier clients, while the Mikrotik DHCP Server will hand out different part to local LAN clients.  To see what IP pool range is used:

```routeros
/ip pool print
 # NAME                                    RANGES                         
 0 dhcp                                    10.0.2.10-10.0.2.249
```
Let's assume I only need a max of 100 IP addresses for local LAN clients, and 50 for "bridged"/remote ZeroTier LAN clients.  We can just reduce the pool size on the Mikrotik side, to leave a range we'll use on my.zerotier.com to assign to ZeroTier clients.  So for example, let use .100 to .199 for Mikrotik-side LAN clients (we'll later use .200 to .249 on the ZeroTier side).  The code for this look like (but you'll need to change to match you needs):

```routeros
/ip pool set dhcp1 ranges=10.0.2.100-10.0.2.199
```
There are other approach since to how to deal with too...  I discuss underlying "DHCP issue" and why this is needed later in this post.  Basically we need _some_ block of IP addresses from the bridged Mikrotik LAN for ZeroTier to use to assign to other ZeroTier client to move on for now...

Now we can enable bridging and set the IP Range on the **_ZeroTier controller side at https://my.zerotier.com_**...

Assuming you're starting from the ZeroTier defaults, you need to modify the "Network" configuration at my.zerotier.com as followed:

* Under "Managed Routes" remove any existing ones using trashcan icon, so it says: "No managed routes defined."
* Then, add new "Managed Route" using Mikrotik's LAN network and IP address.  In our example, "Destination" is 10.0.2.0/24 and "(via)" is 10.0.2.1, then tap "Submit"
* Under "IPv4 Auto-Assign" select "Advanced", then under "Add IPv4 Address Pools" add the range we allocated from the existing Mikrotik LAN.  In our example here, "Range Start" be 10.0.2.200 and "Range End" be 10.0.2.249", then click "Submit".
* Move down the "Members" section on the page and find the Mikrotik's connection in there.  If you're unsure, you can compare the Address or MAC address to what's showing under /zerotier/interface/print to find the right one.
* On that one (e.g. the ZeroTier "member" representing the Mikrotik router with the bridged to your LAN), hit the "wrench" icon next to the "Auth?" checkbox.
* Two more checkbox should appear in a purple section that appears.  **Check both boxes.**  So "Allow Ethernet Bridging" and "Do Not Auto-Assign IPs" should BOTH have a ticked/checkmark.  The change takes effect immediately AND there is NO "Submit" button needed here.
* While looking that "Members", make sure all clients you want to bridge have checkmarks in the "Auth?" column.  Importantly, only the Mikrotik with the bridge should be marked as "Allow Ethernet Bridging" – do not allowing bridge on any other Member!  And, you'll likely want Auto-Assign IPs, since we just set that up above :wink:.  So for all OTHER member, don't change the default settings.
* For bridging a single LAN, the default "Flow Rules" are fine.  You can change them later if you want to restrict traffic flowing through ZeroTier, but that's an even more advanced topic.
* Similarly, leave the DNS setting alone. DNS is another topic... but see: https://zerotier.atlassian.net/wiki/spaces/SD/pages/900431890/DNS+Management for details.  Key details is if you set DNS at my.zerotier.com, the client must use the "Allow DNS Configuration" option (which is NOT a default setting).

If you followed along, and connect using ZeroTier, you should have your single LAN bridged, and since it's bridged/Layer2, stuff like multicast/broadcast, including Bonjour/mDNS, should just work.

**If you use VLANs and vlan-filtering=yes...**
You can adapt this approach for VLANs by setting the PVID for zerotier's bridge port and /interface/bridge/vlan to set zerotier port to the right VLAN as UNTAGGED.  That's about it...

**And you map each VLAN to own seperate ZeroTier Network too...**
Both ZeroTier and Mikrotik allow multiple ZeroTier networks/interfaces, so another potential architecture is you'd have a one-to-one map between _each VLAN_ to a _unique_ ZeroTier network.  You may want to do this is you want to have different potential members for any remote ZeroTier client.

To do this...basically you repeat the same approach.  You start with creating a 2nd (or more) /zerotier/interface, just binding the Network ID for a "New Network" from my.zerotier.com, for each VLAN you want to expose the ZeroTier. Then, you'd add each of the new /zerotier/interface's as bridge port & assigned to right VLAN you wanted to bridge to ZeroTier.

Since the remote ZeroTier network connects to only a single VLAN, it's still be marked as untagged – just with each ZeroTier interface/network being untagged in a different VLAN.  The approach allows you to extend the same VLAN topology remotely – without requiring a VLAN trunk across the internet (our last topic).  ZeroTier client's on Mac/Windows/etc, that are expecting untagged traffic, still be able to reach any VLAN simply by selecting a different ZeroTier network.  ZeroTier client allow using multiple ZeroTier networks at the same time, so this may be pretty useful to get all your VLANs exposed on desktop/laptop/mobile.  You can even then "switch VLANs" using ZeroTierOne taskbar icon.

You still need to deal with aligning ZeroTier IPv4 "auto-assign" for each VLAN (e.g. adjust the DHCP pool being one approach from above).  e.g. the "DHCP pool splitting" would have to repeated for every VLAN you exposed via ZeroTier – no different than the single LAN case, just multiple times.  But let's come back to the DHCP, to explain the why...

**How ZeroTier assigned IP/router is critical to understanding bridging...**
One of the "subtleties" in ZeroTier is how it manages member (e.g. client) IP address assignment.  The key thing know is: the **ZeroTier client does NOT run DHCP client _by default_**.  Instead IP address and routes are entirely controlled, and "pushed" by ZeroTier by what's set for the specific network settings on my.zerotier.com & their client software does this internally WITHOUT using DHCP.

It be way easier if the ZeroTier client had an option to "Use DHCP for IP addresses" - it DOES NOT have that.  When you say "Allow Managed Address" that translate as: copy the IP address that configured on my.zerotier.com for my device under "Members" to this client. If you uncheck that, you'd get no IP address.

**ZeroTier _itself_ doesn't care about IP address...**
Technically, a ZeroTier member can also have no IP address, or have multiple IPs assigned or each member could be in different IP subnet – what's set as an IP under "Members" in my.zerotier.com for a particular device is what's pushed (along with any routes configured under "Managed Routes" for the same network) to ZeroTier VPN client apps.  This is because ZeroTier does NOT care about Layer3 routing or IP addresses, so it's happy to assign what ever you want – even if the rest of the network couldn't use/route it.  In fact, all the settings in the my.zerotier.com largely effect how IP addressing/routing are _configured_ on members (e.g. clients) – but ZeroTier does not route by itself or really enforce much about IP/routes, similar to how an ethernet switch doesn't either.

**Running your own DHCP client to get IP from ZeroTier-bridged Mikrotik /ip/dhcp-server...**
While, on a Mac or Linux, nothing stops you from running your own DHCP client on the ZeroTier interface (since it really is like an ethernet interface).  This actually does work.  But I don't recommend this approach since it take special configuration on each client.  On Mac, you can do this by finding the ZeroTier interface name using "ifconfig" then enabled DHCP on by using:

```text
sudo ipconfig set feth2156 DHCP
```
On Linux, adding a DHCP client on the ZeroTier interface would be specific to the distro you're using, on most:

```text
sudo dhclient <interface name>
```
BUT on iOS (iPhone/iPad with ZeroTier client) it is simply NOT possible to add a DHCP client – so the IP address used by the ZeroTier client on iOS ALWAYS is what's IP is set under "Members".

On Windows and Android, I dunno if it's how/if possible to force DHCP client.

Certainly cases where you do want Mikrotik to provide DHCP over ZeroTier, just the specifics vary by OS so not the focus here. Basically this is why I recommend just splitting the /ip/pool to "leave room" for a range ZeroTier can use: it's just simpler.  In the ZeroTier Free plan, there is a limit of 50 members, leaving 200 IPs for the Mikrotik in typical /24.  _Changing your network to use a larger subnet (say /23 here) be a similar approach to deal with the lack of DHCP via ZeroTier's clients._

Now on Mikrotik, you DO have a DHCP Client readily available – so a site-to-site BRIDGE between two or more Mikrotik's makes the DHCP part much easier. /ip/dhcp-client is under RouterOS's control (unlike on iOS and other ZeroTier clients).

**Users (e.g. ZeroTierOne clients) can block auto-assign IP too**
We just talked about the my.zerotier.com side of IP address/route assignment.  But the ZeroTier client also has four options that also related.  I'm using Mikrotik's option names - Mac/Windows/Linux/etc all use slightly different terms – but all work roughly the same across ZeroTier client platforms:

* allow-managed -  if true, ZT-managed IPs and routes are assigned
* allow-global - if true, ZT-managed IPs and routes can overlap public IP space
* allow-default - if true, network can override system default route (full tunnel)
* "All DNS Configuration" _(not supported on RouterOS)_ - if true, allows my.zerotier.com _some_ control over the client's DNS settings

These are client-only flags, so there is nothing in the cloud (my.zerotier.com) to change these AFAIK. What that also means is if you add a Managed Route for 0.0.0.0/0...and allow-default=no, then route will NOT be inserted until the user themselves changes that ZeroTier client setting.

Keep in mind RouterOS ZeroTier support is also just another "ZeroTier client".  So these setting can be control using:

```routeros
/zerotier/interface set [find] allow-managed=yes allow-global=no all-default=no
```
**Use Case D: Bridging an entire VLAN trunk using ZeroTier**

e.g. re-create the same VLANs on a remote RouterOS device, and use the same VLANs at two different site, via the internet+ZeroTier.

You can use ZeroTier to bridge an entire VLAN trunk (e.g. multiple tagged VLAN) between ZeroTier members – largely by adding the desire VLANs as tagged on a ZeroTier bridge port.  The benefit of using ZeroTier is you'd then have the same VLAN trunk available over the internet to any authorized ZeroTier network client (that also support VLAN trunks, like Mikrotik or Linux).

The only complexity in VLAN tagging/trunking in ZeroTier is you need to change the "Flow Rules" on my.zerotier.com to allow the 0x8100 ethertype.  This is critical for VLAN to work over ZeroTier!

I actually think this use case is pretty handy for some folks.  @pcunite already has a great post on ["Using RouterOS to VLAN your network"](http://forum.mikrotik.com/t/using-routeros-to-vlan-your-network/126489/1) so if you've gone down that road, bridging ZeroTier allow you extend any of those topology (on Mikrotik hardware with ZeroTier support, that is...) relatively securely over the internet.

**You need be familiar with how "bridge vlan filtering" works before trying this, ZeroTier doesn't make VLANs on a bridge easier...**

**The default ZeroTier "Flow Rules" DO NOT ALLOW VLANS**
So we need to change them a bit.  One fix is just adding a line under the "drop" rule in the default flow rules for the ZeroTier network, so it looks like (leaving the rest of the flow rules alone, in particular the final "accept;"):

```text
drop
	not ethertype ipv4
	and not ethertype arp
	and not ethertype ipv6
	and not ethertype 0x8100
	;
accept;
```
It's that "ethertype 0x8100" is allowed that's important.  Since the flow rules are yet-another-filter-scripting-language, you can write the rules however you'd prefer too.  So you could just as easily use "accept ethertype 0x8100;" at the top of the file instead.

**TAG the ZeroTier bridge port on any VLAN you want to trunk over a ZeroTier Network**
Adapting the single LAN bridging example above, the key differences for "VLAN Tagged Trunks" are:

* You need to be using "bridge VLAN filtering" (or) e.g. vlan-filtering=yes on the bridge interface with the ZeroTier bridge port
* Instead of "untagging" the zerotier1 bridge port (as in the single LAN case), you'd _add it as "tagged" interface on any VLAN_ in any /interface/bridge/vlan you want.  Obviously you can tag "zerotier1" on as many VLANs as you need/wanted bridged to the ZeroTier network.
* Since both sides of ZeroTier VLAN trunk are in Mikrotik bridges, **BOTH**/ALL Mikrotik routers need to be marked to "Allow Bridging" under "Members" on my.zerotier.com
* The /zerotier/interface on each router should be using the same ZeroTier network ID and be authorized and "OK".
* A trunk should have no untagged traffic.  Since "trunk" may be confusing, what I mean is ALL packets are VLAN tagged.  (Otherwise, it a "Hybrid" port...)
* If it's VLAN trunk, only things that understand VLAN tags, should be members of any ZeroTier network that's using VLANs.  You could have other things, I guess, but it wouldn't make sense to say have a Windows ZeroTier client connect to a trunk over ZeroTier (e.g. typically you don't have client devices use an ethernet trunk port).

Basically both routers just need to use the same tagging & VLAN ID for the zerotier1 bridge port, on EACH for router.  e.g. the /interface/bridge/vlan configuration need to match on BOTH sides (at least for the VLAN being carried over a ZeroTier network do).  Finally, you can then untag an VLAN as needed locally, on either side, onto actual other bridge ports to actually _use_ a bridged VLAN - even over the internet.

**No IP Address or DHCP tricks required for VLAN Trunking**
ZeroTier doesn't need ANY IP address or routing defined...  So you can skip all the changes to /ip/pool or other DHCP tricks for VLAN trunk – since DHCP is _inside a VLAN_ and tunneled to another Mikrotik, it work fine over ZeroTier.  So you can ignore the "Managed Routes" and "Address Pool" stuff in my.zerotier.com.   You could delete any "Managed Routes" and disable "Auto-Assign from Range" IF there really is no untagged traffic over the ZeroTier network being used for trunking – but you can leave the IP alone (even IPv4 auto-assigned) too since it shouldn't matter if BOTH Mikrotik port require VLAN tags.

**I guess you _can_ use both untagged traffic and tagged over same ZeroTier network...e.g. a hybrid port BUT...**
This is more complex since you now DO still have to with the IPv4 auto-assign/DHCP stuff that's been described at length above...  Since with vlan-filtering=yes, it generally recommended to  "tag everything on ingress to bridge interface", it be should be trivial to **AVOID having untagged traffic on this "ZeroTier VLAN Trunk"** – and that's what you should strive for...  But if you really want a hybrid port, you'd need to DO both:

* add a "Flow Rule" to allow ethertype 0x8100 for VLAN (see above)
* since you do have untagged traffic, you need deal with ZeroTier's IP configuration from the single untagged LAN case too (e.g. split a DHCP pool from the single VLAN or take another approach)

Totally doable, but if you ever change the VLAN ID/PVID that's untagged over a "Hybrid ZeroTier VLAN Trunk", then you'd also have to change all the ZeroTier/Mikrotik IP/DHCP stuff to match the new untagged IP subnet everytime you changed the untagged port on the ZeroTier VLAN Trunk.

**In all cases involving tagged VLAN over ZeroTier, it's critical the Flow Rules allow 0x8100 ethertype** – that is NOT the ZeroTier default & VLANs won't work over ZeroTier unless you add that.

Also only ONE Mikrotik should being running a DHCP Server for any VLAN. Basically one Mikrotik is the "default router" for the VLAN, while other Mikrotik connect via to a "ZeroTier VLAN Trunk" network should be more like the "switch" (e.g. only with tag/untagging in the bridge).  _Except, if your VLAN also uses [VRRP](https://help.mikrotik.com/docs/display/ROS/VRRP), where you could have multiple Mikrotik acting as a router, but that another topic._

**Scripting: Using RouterOS /tool/fetch to call the ZeroTier Central API**

So far ZeroTier has been managed using their website, https://my.zerotier.com to do stuff like:

* Create new ZeroTier network
* Set IP "Managed Routes"
* Control "IPv4 Auto-Assign"
* Authorize a "Member" to use the ZeroTier network (e.g. checkbox under Auth?)
* Set "Allow Bridging" on a "Member"

I do NOT have a Mikrotik script to do ANY have that...  But it is POSSIBLE to do all those via the ZeroTier Central API, their docs describe the operations in the REST API:
https://docs.zerotier.com/central/v1/

As a REST API, it can be invoked using /tool/fetch on a Mikrotik.  You will need an "API Key" from your ZeroTier account page, https://my.zerotier.com/account to use it.  Now you'd have to store the apikey some place, hopefully safe - this part is up to you.

Below is short **example script** that calls into the ZeroTier Central from a MikroTik RouterOS.  It only calls ZeroTier's /status API, with an "apikey" – if the key is valid it prints your "display name" from the ZeroTier account.  It actually should work if your familiar enough with RouterOS script to run it.

Obviously printing your name isn't that useful, but feel free to extend or adapt this script as you'd like:

```routeros
#
# THIS IS JUST AN EXAMPLE
#
# Below shows how a RouterOS script can "call" the "ZeroTier Central" (my.zerotier.com)
# using ZeroTier's REST API via /tool/fetch (& script functions)  
#
# This is useful if you want to script stuff like authorizing a "member"
# Or, creating new ZeroTier network from a Mikrotik script. 
#
# See ZeroTier Central API docs: https://docs.zerotier.com/central/v1
#
# You'll need to get an "API Access Token" from https://my.zerotier.com/account
# via "New Token" then "Generate", you name it whatever like "Mikrotik"
# It will generate a mixed case string like PlEaSeAdDJSONsUpPoRtInROSScript7
# You can use this as authentication to REST at https://my.zerotier.com/api/v1
# for management access to ZeroTier's "central" cloud configuration. 
#
# This is a simple function "$ztcget" we can use to call it easily from Mikrotik CLI
# Obviously, there could be a $ztcpost etc, or better "wrapper" over ZeroTier Central API.
# So this alone not that useful,  consider as an example of possibilities.
#
# TO TEST THIS SCRIPT...you NEED to set the ZeroTier API key, someplace.  
#
:global ztcget
:set $ztcget do={
    :if ([:typeof $apikey]="nothing") do={:error "apikey= must be provided"} 
    :if ([:typeof $path]="nothing") do={:error "path= must be provided"} 
    :local headers "Authorization: bearer $(apikey)"
    :local resp [/tool/fetch url="https://my.zerotier.com/api/v1$path" http-method=get http-header-field="$headers" output="user" as-value]
    :log info "\$ztcget: $($resp->"status") path=$($path) apikey-len=$([:len $apikey])"
    :return ($resp->"data")
}

# Mikrotik Script has NO JSON support, so need load another script for that:
:global JSONLoads
:if ([:typeof $JSONLoads]="nothing") do={
    /tool/fetch url=https://raw.githubusercontent.com/Winand/mikrotik-json-parser/master/JParseFunctions
    :import JParseFunctions
    :delay 5s
}
# (NOTE: the lack of JSON support in RouterOS script makes this MUCH less clean...)

# If we use another function, $ztclogin...
# We can call $ztcget above with /status to check if apikey is valid
# This is the first step to use the "REST" of the ZeroTier API for something useful.
:global ztclogin
:set $ztclogin do={
    # Declare the global functions we're using in the function
    :global ztcget
    :global JSONLoads

    # We'll just HTTP GET /status to see if we're authenticated.
    :local ztcjson [$ztcget apikey=$apikey path="/status"]

    # Parse the JSON into a Mikrotik :typeof "array"
    :local ztcstatus [$JSONLoads $ztcjson]

    # You can print the whole thing...for debug...
    # :put "$ztcstatus"

    # As a Mikrotik array, you can access the various JSON elements.
    # For ZeroTier Centeral's /status REST GET method...
    # if the apikey is valid, there would be a "user:"" in the JSON {..., user: {...}, ...}
    # if the apikey was wrong, user would be null. Or, with JSONLoads, :typeof "nil"
    :if ([:typeof ($ztcstatus->"user")]="nil") do={
        :put "Something is wrong.  Here the JSON what we got:"
        :put ($ztcjson)
        :error "** You may need to set the ZeroTier API Key, or its a bug. **"
    } else={
        :put "Hello $($ztcstatus->"user"->"displayName") - if that's right, you can use the ZTC API!"
    }
}

# And, THIS IS HOW you'd use the function(s) to "check if login is valid"

$ztclogin apikey=PlEaSeAdDJSONsUpPoRtInROSScript7

# If you got here, now you can change the apikey= above to test the script.
```
And if you got here, hope this was helpful.

v7.1.1+a 19FEB2022 - initial revision
v7.1.1+b 25JUL2023 - minor update - Mikrotik does support acting as ZT controller now

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/3](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/3)
- Created: `2022-03-09T13:50:50.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I was trying to catalog all the interactions. But got me: there is the bridge's "Use IP firewall" setting & that certainly could have side-effects.  Should work however.  But I don't have an instant answer how that interact with ZeroTier – as I don't regularly use that option, even without ZeroTier. 

Since winbox works, that indicates the Mikrotik has a Layer2/Ethernet connection to the ZeroTier network, so your firewall is at least allowing the ZeroTier tunnels.    But the IPv4 traffic carried by ZT would be subject to the firewall rules, and seemingly what may be blocking the ZT client from getting to the LAN.  The IP addresses/routing in BOTH the Mikrotik and my.zerotier.com has to aligned be the other big thing.

Be good to know what happens when you disable "Use IP Firewall", that might help to isolate the problem is even related to the firewall/bridge.  But if you're using "Use IP Firewall", you likely understand how it works than me.  A network diagram or better description of your topology might help.  e.g. Are they VLANs, multiple bridges, other things in play here.  Also troubleshooting from the client more may help. e.g. can the PC use `arp` to find MACs on the Mikrotik bridge – if so, then it routing or firewall configuration somewhere.

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/5](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/5)
- Created: `2022-03-13T22:46:34.000Z`
- Likes on this post: 0

Some thoughts...

Outside ZeroTier, you might want to make sure the MTU of the LTE interface is right.  Mikrotik seems to default at 1500, but LTE often much lower, typically 1428.  Similarly on MTU, you want to make sure ICMP is allowed in via LTE in the firewall filter (this is a typical the default).

If you ping the ZT address of your router from the box you're running winbox, does it show timeouts/drops/etc?  If ping looks good, you may want to add ZeroTier to "LAN" interface list.

Or, perhaps trying using the MAC address in winbox to connect, and see if that also drops.

You can also check out the tunnel connection using the CLI, at least most/some of them, using a few commands (fell free to adapt):

```routeros
/ip/firewall/connection/print where dst-address~"9993"
/zerotier/peer/print
/ip/firewall/connection/print where dst-address~"9993" timeout<30s
```
What's important is the "recvd" and "send" in the ZeroTier peer out.  That shows the last time it reached that peer – annoyingly ROS will show "active" even if it's "stale" and hasn't used a peer in a while.  Since most connections use port 9993, you can find those in the firewall connections.  In the firewall connection, you should see traffic flowing.

```routeros
> /zerotier/peer/print 

Columns: INSTANCE, ZT-ADDRESS, LATENCY, ROLE, PATH
# INSTANCE  ZT-ADDRESS  LATENCY  ROLE    PATH                                                            
0 zt1       XXf864ae71  228ms    PLANET  active,preferred,50.7.252.138/9993,recvd:4s515ms,sent:9s789ms   
1 zt1       XX8cde7390  104ms    PLANET  active,preferred,103.195.103.66/9993,recvd:4s629ms,sent:9s789ms 
2 zt1       XXfe04eca9  200ms    PLANET  active,preferred,84.17.53.155/9993,recvd:4s547ms,sent:4s736ms   
3 zt1       XXfe9efea9  48ms     PLANET  active,preferred,104.194.8.134/9993,recvd:4s694ms,sent:17s105ms 
4 zt1       XX799d8a6  82ms     LEAF    active,preferred,35.226.205.67/57571,recvd:7s445ms,sent:7s526ms 
5 zt1       1fceb9a1b0           LEAF                                                                    
6 zt1       XXd56eef8d  58ms     LEAF    active,preferred,162.236.246.88/9993,recvd:17s44ms,sent:17s105ms

> /ip/firewall/connection/print where dst-address~"9993" timeout<30s

Flags: C - CONFIRMED; s - SRCNAT
Columns: PROTOCOL, SRC-ADDRESS, DST-ADDRESS, TIMEOUT, ORIG-RATE, REPL-RATE, ORIG-PACKETS, REPL-PACKETS, ORIG-BYTES, REPL-BYTES
 #    PROTOCOL  SRC-ADDRESS            DST-ADDRESS        TIMEOUT  ORIG-RATE  REPL-RATE  ORIG-PACKETS  R  ORIG-BYTES  REPL-BYTES
13 C  udp       166.XXX.XXX.14:57447   50.7.252.138:9993  0s       0bps       0bps                  2  0         330           0
15 C  udp       166.XXX.XXX.14:57447   84.17.53.155:9993  0s       0bps       0bps                  1  0         165           0
27 Cs udp       192.168.202.197:45463  84.17.53.155:9993  2s       0bps       0bps                  2  0         330           0
28 Cs udp       192.168.202.197:45463  50.7.252.138:9993  2s       0bps       0bps                  2  0         330           0
```

[//]: #.

## Post 7

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/7](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/7)
- Created: `2022-03-14T14:19:48.000Z`
- Likes on this post: 0

"Debugging" the tunnels isn't easy.  Looking at your peer, you can see some rather long times since the last packet.  That could be a few reasons.  I highlighted them in red/orange below:

> Quoted forum context omitted.

But after looking at this, I realized you'd post here too: http://forum.mikrotik.com/t/zerotier-lte/155315/13 – I think you should start a new topic, with details/diagram/etc & what you're seeing where & what you've tried already...    Hard to go from "winbox drops over zerotier" to then continue with multiple WANs/routers...

[//]: #.

## Post 8

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/8](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/8)
- Created: `2022-03-14T14:42:13.000Z`
- Likes on this post: 0

I can offer a script _function_   **$ZTPEERS** that goes through the the ZeroTier peers to find associated firewall connections & do a /tool/ping-speed to get some data on the quality of the link.

The function goes though the output of /zerotier/peers to find the peer destination IP/port.  It then runs /tool/ping-speed for 5 seconds to some additional measurement on the latency (while it shows "speed", ping-speed is NOT accurate since it just based on a few ping times, useful to compare the "_relative_ speed of peers").  It also tries to find associated tracked connection in /ip/firewall/connection – this is useful since it shows you the src-address, and packet/byte counts for each.

![](https://i.ibb.co/drwxBzn/ztpeers-screenshot.jpg)

Code is below, you can cut-and-paste into terminal to load the $ZTPEERS function, then call it using just $ZTPEERS in the Terminal window.  If you want to save it, create a scheduled script to run it at startup to load the function on reboot.

```routeros
:global ZTPEERS
:set ZTPEERS do={
    # params
    :local warnlatency 100ms
    :local warnpeerdelay 10s
    :local pingspeedlen 5s
    :local pingspeedint 250ms

    # find "active" peers from /zeroteir/peer
    :local activePeerIds [/zerotier/peer/find path~"active"]

    # get data for each peer into an array
    :local activePeers [:toarray ""]
    :for i from=0 to=([:len $activePeerIds]-1) do={
        :set ($activePeers->$i) [/zerotier/peer get ($activePeerIds->$i)]
    } 

    # loop though each peer to do some checks
    :foreach ztpeer in=$activePeers do={
        # parse the "path" to find ip/port
        :local addrport ($ztpeer->"path"->2)
        :local addr [:pick $addrport 0 [:find $addrport "/"]]
        :local port [:pick $addrport ([:find $addrport "/"]+1) [:len $addrport] ]
        :set ($ztpeer->"ipaddr") "$addr:$port"

        # humanize latency "time"
        :local platency [:tostr ($ztpeer->"latency")]
        :local platency ("" . [:pick $platency 6 8] . "s " . [:pick $platency 9 13] . "ms") 

        # output headers 
        #   note: colorize output is from /terminal/styles...
        /terminal/style syntax-old
        :put "$($ztpeer->"role")\t$platency\t$addrport" 
        # warn on high latency by colorizing it
        :if (($ztpeer->"latency") > $warnlatency) do={
            # reprint latency in RED
            /terminal/cuu
            /terminal/style error
            :put "\t$platency"
        }
            
        # run a ping-speed 
        /terminal/style "syntax-noterm" 
        :put "\t PING-SPEED test   $addr $([:pick $pingspeedlen 6 8])s@$([:pick $pingspeedint 9 13])ms"
        :local pingresults [/tool/ping-speed address=$addr duration=$pingspeedlen interval=$pingspeedint as-value]
        :local avgpingkb (($pingresults->"average")/1024) 
        /terminal/cuu
        :if (avgpingkb < 1000) do={            
            /terminal/style error
            :put "\t\t\t got <1Mb/s, average: $avgpingkb Kb/s      "
        } else={
            /terminal/style "syntax-noterm" 
            :put "\t\t\t average: $avgpingkb Kb/s                                "
        }

        # output last tx/rx time from peer
        # TODO: colorize long times in last peer packet times 
        :local rxtime [:totime [:pick ($ztpeer->"path"->3) 6 32 ]]
        :local txtime [:totime [:pick ($ztpeer->"path"->4) 5 32 ]]
        {
            /terminal/style ambiguous
            :put "\t\t$($ztpeer->"path"->3)"
            /terminal/cuu
            :put "\t\t\t\t\t$($ztpeer->"path"->4)"
        }
        :if ($rxtime>$warnpeerdelay) do={
            { /terminal/cuu; /terminal/style error; :put "\t\t$($ztpeer->"path"->3)" }
        }
        :if ($txtime>$warnpeerdelay) do={
            { /terminal/cuu; /terminal/style error; :put "\t\t\t\t\t$($ztpeer->"path"->4)" }
        }
        /terminal/style none

        # output connections associated with ZT
        :local ztconns [/ip/firewall/connection/find dst-address=$addrport]
        :if ([:len ztconns] > 0) do={
            :set ($ztpeer-"conntrack") [/ip/firewall/connection/print as-value where dst-address=$addrport]
        } else={
            {/terminal/style error; :put "\tno associated connections found in firewall"}
        }
        /ip/firewall/connection/print where dst-address=($ztpeer->"ipaddr")
        :put ""
    }
}

[code]
```

[//]: #.

## Post 21

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/21](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/21)
- Created: `2023-07-15T17:58:03.000Z`
- Likes on this post: 0

Let me reiterate one point first: If you can enable IPv6 on your WAN, ZT will preferably use IPv6.  This avoids any hole punching on the Mikrotik for IPv4 ZT VL1 tunnels.  Obviously not always possible, so to answer the questions...

> Quoted forum context omitted.

The point was about if you have another router between the Mikrotik with ZT and the internet.  Say an ISP router in-between you can't remove, and it's that route that may support uPnP or NAT-PMP – and on that non-Mikrotik router, you might want to make sure either one of those protocols is enabled to help ZeroTier enable a more direct path though the intermediate router. e.g. sometimes **other routers** have some UI/checkbox to enable UPnP and/or NAT-PMP support, which be good to enable to aid ZT path discovery.

If the Mikrotik has a direct route to the internet (even if behind a NAT), no additional steps are needed (beyond the firewall filter and/or NAT rules discussed in docs and above).

> Quoted forum context omitted.

That should be unnecessary if the goal is allow Mikrotik ZT tunnel to make a tunnel to the ZT network.

What the above rules allow... and if the Mikrotik is the default gateway for a ZT network e.g. the ZT network at my.zerotier.com has a 0.0.0.0/0 route to the Mikrotik's ZT IP address.  Is if  say you have some desktop/PC/laptop/smartphone that is a member of the same ZT network...and the client has "Allow Default Router Override" set so the Mikrotik is this desktop route to the internet...  Then the above  UPnP rule will allow that desktop, connect to same ZT network as Mikrotik, to punch holes in the Mikroitk firewall.  UPnP is typically done by games and SIP clients, so that allow it happen from members of the ZeroTier network, who were using the Mikrotik as the default gateway to internet.

A different use for uPnP being enable on the Mikrotik is if the Mikrotik **LAN** if it has users that also have ZeroTier clients.

```routeros
/ip upnp interfaces add interface=WAN type=external
/ip upnp interfaces add interface=LAN type=internal
```
Since these non-Mikrotik ZT client on the local LAN may use additional/different ZT networks than the Mikrotik, those may have different paths needed.  If uPnP is enabled for the LAN interface list, then those desktop/smartphone ZeroTier client will attempt UPnP to form their own paths to various ZT networks.  Since UPnP is deterministic on the assigned port it likely slightly quicker to establish tunnels since it doesn't have to test using various port.  Basically UPnP will short-circuit more complex hole punching techniques.  As a bonus, if LAN ZT client's tunnels will show up as dynamic entires in the firewall with comments – so the ZT tunnels from LAN become more "visible" to the admin.  Otherwise, an admin finding VL1 tunnels in a network is non-determistic (see the complex script in #2 above to find peers in firewall on the Mikrotik, and it's impossible to do for LAN client's ZT tunnels).

> Quoted forum context omitted.

No.  **But** the ZeroTier client on Mikrotik may try it when establishes paths to next-hops beyond the current Mikrotik running ZT.  Similar to above, it just an option ZeroTier's ZL1 tunnels may try when establishing paths.

> Quoted forum context omitted.

Hmm.  I'm of the thought that if action=endpoint-independent-nat is needed for something, someone else made some poor design decision someplace.  So not thought about its interaction with ZT.  But ZT has its own complex logic to deal with NAT hole punching, so thinking it's best not mess with their logic by remapping things.  It really shouldn't be needed since ZT will likely do something reasonable without ANY kind of port forwarding etc.

Now since Mikrotik didn't support being a ZT controller when I wrote this article, I cannot say how rules involving "action=endpoint-independent-nat" would interact with ZT **controller** side... But since ideally ZT use one port (default 9993), just making sure that port was available on a controller should be all that's need. So worse case, you might need some dst-nat upstream in more complex topology.  But the how ZT controller work be another article...

[//]: #.

## Post 24

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/24](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/24)
- Created: `2023-08-14T00:45:35.000Z`
- Likes on this post: 0

The "middle" starts getting complex :wink:...

If I get the basic setup... you have some VLANs on one router...and different set of VLANs on another router... For simplicity, let assuming "MAIN", "GUEST", "IOT" on each.  And MAIN on Router A wants to access IOT on Router B.

My first question is do you want the IOT on Router A to be the same network Router B?  OR, do you want to keep Router A and Router B's IOT VLAN as different networks?

If it the later... and you just **one** of those VLAN to be same on both side, Option C right – IOT VLAN is same on both side (bridged) & any device can "see" any other device across the WAN.  The access from your MAIN VLAN is really up to the firewall rules... but assuming MAIN is allowed to access local IOT VLAN, and ZT bridge that network to other side's IOT VLAN (using Option C).  But essentially you end up one "IOT" VLAN that same network on both sides.

If you want the former (e.g. different IOT LANs on both sides, just Router A can access Router B IOT VLAN **only**)... In this case, you essentially might want to create a new VLAN interface  called "IOT-B" and add it to Router A & untagged the ZeroTier to that IOT-B VLAN (e.g. set PVID).  On Router B just need to set the PVID= on the ZeroTier bridge port to the IOT VLAN on Router B.  This essentially add a new VLAN to Router A.  Still same rough steps as Option C...

"Option D" describes a VLAN "trunk", but that means that non-Mikrotik ZeroTier clients cannot connect in this mode – the client don't untag VLANs, so that's approach isn't quite right.

But you may have gotten the "Option E" :wink:...

> "I guess you can use both untagged traffic and tagged over same ZeroTier network...e.g. a hybrid port BUT...
> This is more complex since you now DO still have to with the IPv4 auto-assign/DHCP stuff that's been described at length above..."

It's actually not that complex... but it is context specific & the more you understand how Bridge VLANs work, the more sense it makes...

Anyway, if you can provide your configs that's help.  And better explanation of what VLANs should map where...

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/26](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/26)
- Created: `2023-08-14T16:50:09.000Z`
- Likes on this post: 0

_I got lazy writing this towards the end is also part of the problem here :wink: – I was going to take the @pcunite's VLAN as an example, but it was already pretty long._

I think your problem is that you're using "Allow Managed" and/or the bridged VLAN's IP address are duplicates on both side...once bridged.  But rather than guess perhaps a more **simple "checklist" for ZeroTier bridging** be useful for how it works with vlan-filtering=yes (i.e. "@pcunite-style") Bridge VLAN scheme...

**_On the Mikrotik side,_**

- make sure "Allow Managed" addres is unchecked/="no" on both routers – this is critical...  _Otherwise, it will create a "connected route" for any ZT assigned address (same as RouterOS does for any other interface when an IP address is added to interface).   You don't want this since RouterOS already has a routing table & the bridged VLAN already has an IP for each router (e.g. the one assigned the IOT VLAN) – so you don't need ZT adding a 2nd IP to same interface (which is what happens with "Allow Managed Address" is enabled/checked)_

- make sure both routers have a unique IP address assigned to the VLAN on each side (e.g. 10.0.0.2/24 on RouterA and 10.0.0.1/24 on RouterB) & the associated DHCP server network for IOT should use that particular router's IOT VLAN's IP as the gateway (e.g. 10.0.0.1 or 10.0.0.2).   _Otherwise, there be IP address conflict once ZT is connecting both side & default gateway given to clients may be wrong_

- bridge port for zerotier1 interface uses the "right" frame-types= and pvid= _So for bridge one VLAN, frame-types= is "admit-only-untagged..." and pvid= match what you want as the network shared via non-Mikrotik ZeroTier clients.  To bridge multiple VLANs...whether you use frame-types=admit-all or frame-types=admit-only-vlan-tagged depend on if you want non-Mikrotik clients, i.e. need a hybrid port (frame-types=admit-all) **if** desktop/smartphone will connect **&** you want have VLAN tagged traffic over ZT network. Or, if ZT is used ONLY for trunking VLANs across a WAN, then frame-types=admit-only-vlan-tagged is what you'd want — in **either** hybird or truck case...just like any other hybrid/trunk bridge port for ethernet...you'd need to define the zerotier1 port as tagged= in /interface/bridge/vlan for the tagged VLAN(s) & adjust the flow rules as described in Option D in my main writeup_

- only one side should have dhcp-server enabled since with ZT bridging. _Otherwise, you'd end up with multiple DHCP servers run on same LAN...not necessity going to break anything, but potentially confusing/error-prone — e.g. DHCP server configuration have to be identical & you'd want to ensure "Conflict Detection" is enabled in /ip/dhcp-server on both._

- dhcp address pool (e.g. /ip/pool) for ZT-bridged VLAN should be adjusted so that there is some range for ZT clients to use (that be assigned by ZT to desktop/smartphone).  _In theory, it doesn't matter if DHCP server use the "Conflict Detection" but better just to prevent ZT from using same IP address in the same subnet – the main writeup at top describes how to adjust the pool in more detail_

- beyond the scope here... but VRRP could used so that if the WAN is lost, each RouterOS's IOT VLAN could operate independently during WAN outage (since dhcp-server listen on the VRRP, and use VRRP address as the gateway).

_**On the ZeroTier controller side (my.zerotier.com),**_

- in the routes, remove any existing ones & add one for the the bridge LAN subnet by using just 10.0.0.0/24 with no gateway – this essentially defines the scope for non-Mikrotik clients.  For bridging, you don't need any other routes. _Although you can add them if you wanted to allow ZeroTier desktop/smartphone clients access other networks, as they need routes defined in ZT controller/portal) – again you do NOT want "Allow Managed" on RouterOS since it [should] knows these routes already._

- whether it's an access port or hybrid port, the auto-assign IP address range should be same subnet as what's bridged – but critical it uses the same subnet as the VLAN that's being bridged (e.g. say 10.0.0.201-10.0.0.249 but whatever as long as different/non-overlapping range with the /ip/pool).  _Since a true VLAN trunk (e.g. nothing untagged) will not allow non-VLAN aware ZT clients, the auto-assignment should set to something that's NOT any subnet you used, to avoid routing issues – but it doesn't matter since there be only tagged traffic & ZT will passes those along in Layer-2, but it has NO VLAN helpers or anything to "untag" any of them_

- both Mikrotik should have the bridging enabled under the "Members" section using the gear (as again described more fully at top of thread) – nothing else should have that defined

- if you have **no tagged VLANs passing over ZT (e.g. frame-types=admit-only-untagged-and-priority on the bridge port, and correct pvid= set), then you can _ignore_ the "Flow Rules".  But for Hybrid or Trunk ports (no untagged traffic), you'll need to make sure you allow the VLAN "ethertype" in the flow rules – _this is not the default_ & will block any tagged VLANs from flowing through the ZeroTier network.**

[//]: #.

## Post 28

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/28](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/28)
- Created: `2023-08-18T06:12:45.000Z`
- Likes on this post: 0

**On 1st "Bridged Test"...**

If both routers can ping the other route's VLAN 30 IP from the console, ZeroTier should be working.
Assuming it bridged correctly (seem like it is), then should just follow firewall rules for VLAN 30...
So not sure it's the firewall – benefit of bridging... it should follow the VLAN of it's assigned pvid=, so NEW firewall rules should be needed.

Re DHCP, you may have to the **zerotier1 bridge port as "Trusted" for DHCP** to pass, that might be simpler.

If you posted a sanitized version of both router's config, that help here.  And perhaps output of /routing/route/print.

**On 2nd "Nonbridged Test"... (aka "Routed" approach)**
This one I'm not sure be is useful IF one is coming from "@pcunite VLAN" setup....  Since it involves using IPv4 routing ("subnets"/"prefixes"), vs thinking in VLANs and Layer-2 "interfaces"...  And this approach also involves creating new firewall rules, too...

The basic theory is using a SINGLE ZeroTier network that's connected all other routers.  That gets ALL router on the same IP subnet – e.g. so the routers can "ping" each other.   But that doesn't help any other traffic like VLAN – since you need have /ip/routes to that use the fact all routers are connected via ZT... One way is do it statically — that mean using "/ip route add" with the other router's ZT address as the gateway= and dst-address= the IP range/prefix associated with remote VLAN – for any subnet you wanted.

Instead, you actually define routes to some/all your VLANs in my.zerotier.com.  Setting the routes there gets more tricky.  But these ZT defined routes will be added by checking the "Managed Address" (which includes any routes at my.zerotier.com).  Useful, but by default problematic... since **you have to set the "Route Distance" property of zt1 _instance_ to at least 2 (or higher)**.  If you don't set route-distance=2 on "zt1" instance... problems can happen.  More specifically, very easy to creat ECMP/load balance route to a VLAN when route-distance=1 and your routing an existing VLAN...

And while ZeroTier will allow multicast (e.g. mDNS/SSDP/etc) over its network (unlike ZeroTier), /ip/route isn't going get deal with multicast without using IGMP-Proxy/PIM/etc. (IF multicast is needed)  e.g. LAN traffic is NOT "bridged", but "routed" via ZeroTier's switch to another router on the "ZeroTier Cloud Switch" (e.g. what's defined at my.zerotier.com).

My thought is when you start with VLANs...ZeroTier just extends these –  so "non bridged" case changes the model you're using in a routed approach, when the firewall/etc is designed around VLAN and interface-list.

[//]: #.

## Post 31

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/31](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/31)
- Created: `2023-10-11T12:06:46.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

That can work.   On both Mikrotik routers bridged to ZeroTier, do you have "Managed Address" unchecked on the ZertoTier?  And at my.zerotier.com BOTH router are marked as "Bridged" in the options next to the router in "Members" section (exposed by wrench icon)?

Another possibility is the bridge has loop detection...so possible RSTP might be tripping...and it generally harmless to disable.   To do this, you go your Bridge interface on each router, and select "None" as the "Protocol Type" in the STP tab.  Alternatively, you can try using a higher path cost (say path-cost=20) for the zerotier bridge ports in each router (in Bridge > Ports > STP).

[//]: #.

## Post 32

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/32](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/32)
- Created: `2023-10-11T12:40:31.000Z`
- Likes on this post: 0

One question, are the routers physically connected via ethernet?  That changes the story a bit...since it's be even more likely STP is coming into play.

One thing you can do is look at the bridge and see the forwarding state ("role") of the port.  The zerotier1's bridge port role should not be "disabled", when you have both ZT interface up... if it is STP is kicking in....

[//]: #.

## Post 35

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/35](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/35)
- Created: `2023-11-30T23:35:12.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

This is true & the feature come out AFTER I wrote his article.  The story is bit more complex — since there are still root servers — but it's pretty well described in Mikrotik's docs:
https://help.mikrotik.com/docs/display/ROS/ZeroTier#ZeroTier-Controller

> Quoted forum context omitted.

It's the term "without special attention" that confuses the question.

If ZT interface is **bridged** to desired VLAN/etc, then IoT/etc devices can span physical sites and operate the same.

The main caveat (and what's described in article) is the some attention MAY be need in the "Flow Rules"  — but ONLY IF your devices use non IP/IPv6 protocols.  For example, RoMON does use a different ether-type, so by default ZT controller would block...but small change to flow rules would allow RoMON, then it work just fine.

Also, it's also fair to mention that latency sensitive things may not be ideal to run across ZeroTier Network, so that be another area of "special attention".  And ZeroTier likely add more latency than some point-to-point VPNs (e.g. WireGuard).  Essentially ZT trades latency (using potentially slower indirect path) to work across more diverse/restricted networks (e.g. CGNAT's).

[//]: #.

## Post 37

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/37](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/37)
- Created: `2023-12-04T15:48:27.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

You might want to try change the "route distance" on the "zt1" instance under zerotier > instance tab to "10".  Otherwise it's possible 192.168.0.0/24 route might be load balanced if the ZeroTier added one's distance (default is 1) match the distance of that internal/Mikrotik version route.

But you have a double NAT situation, worse still with MULTIPLE ZeroTier client trying to use the default ports....that gets problematic...  If there is any way to get IPv6 enabled on you mobile account, that be best solution – may not be possible, but that be best.  Is there an options for a "DMZ" on the T-Mobile gateway, or can you map ports on the T-Mobile gateway?

[//]: #.

## Post 39

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/39](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/39)
- Created: `2023-12-04T21:07:41.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

If you look at /ip/route, you'll notice that the 192.168.0.0/24 is likely repeated (one for bridge/etherX, one from "zerotier1").  When there are multiple routes for same subnet, the LOWEST distance wins.  BUT if there are two subnet, at same distance...then routing is split 50%/50%...so changing the "zt1" to distance of 10 means it has a lower priority.

But it could just be port mapping through the CGNAT isn't conflicting & not the route distance.  Time will tell.

Since ZeroTier can use IPv6 to establish the tunnels to the ZeroTier planets/root servers... you wouldn't have the same potential for port mapping issues.  But the underlying ZeroTier tunnel can still use IPv4 inside, nothing else has to change **IF** you can get T-Mobile to enable IPv6.

[//]: #.

## Post 43

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/43](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/43)
- Created: `2024-08-07T16:48:21.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Feel free to post your needs/question(s) and any relevant config.

[//]: #.

## Post 44

- Original post: [https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/44](https://forum.mikrotik.com/t/zerotier-on-mikrotik-a-rosetta-stone-v7-1-1/155978/44)
- Created: `2024-08-07T17:30:30.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I think that's article is a pretty good summary.  I'd agree with most of it, specifically

> Tailscale is different than WireGuard in many ways, but it’s a better comparison to ZeroTier than WireGuard due to the way that it’s set up and configured, as well as its functionality.

I kinda focus on the interaction with RouterOS features in this original article here - than a comparison of VPN/protocols.  But do agree Tailscale is more similar to ZeroTier since both have some centralized control of clients/members/peers & routing, vs "pure WireGuard" that really just a peer-to-peer protocol within Linux kernel that OTHER things can make sure for a complete VPN solution (i.e. with Tailscale and Mikrotik's new Back-to-Home be examples of providing some higher-level control/policy to WireGuard.

But the high-level decision between WG/tailscale/BTH/etc vs ZeroTier is if "ethernet-like" Layer2 link is needed.  The need for Layer2/ethernet-like often comes up with devices that use multicast or other discovery protocols.  Conversely, pure/unicast IP networks would likely be better severed with some WireGuard-based protocol – since WG/tailscale/BTH is more efficient than ZeroTier, especially if all traffic is Layer3/IP.  And Tailscale add all the "policy management" stuff that's often needed in corporate/enterprise/education markets - that ain't in ZeroTier (or RouterOS).  While ZeroTier "policy" is more limited to it's "flow rules", which is akin to doing policy management using Mikrotik's bridge/firewall filters – so Tailscale makes a lot more sense when you need user-level access control than ZeroTier.   And Tailscale add user-authentication between just ZeroTier's simplistic (and ID-based) membership concept.

Additionally, Mikrotik's ZeroTier support has not expanded significantlly since I wrote this article*.  So some of ZeroTier's newer features/configuration are not available on Mikrotik.  Specifically low-bandwidth mode, peering control, and load balancing options.  And CHR/X86 lacking ZeroTier remains a significant limitation since now some other solution is still needed for a VPN/SD-WAN/etc.  WG is available on ALL Mikrotik platforms, and there are ways of integrating plain WG links into Tailscale - so that be another advantage from a Mikrotik POV.

I still maintain as an out-of-band management protocol for Mikrotik's (at least ones that's support ZT) is hard to beat – especially with RoMON being enabled.  Other use cases, does require more thought into picking between ZT and Tailscale or something else - starting with if there any Layer2 or multicast needs since that's not easily fixed AFTER a VPN/SD-WAN deployment.

Additionally, in the Mikrotik context...older routers might still be better off with IPSec-based things since some older routers with limited CPUs do support hardware encryption – while both ZeroTier and WG are going increase CPU load since they cannot make use of hardware encryption in older routers (that support IPSec in hardware).   So that be another important consideration if dealing with older hardware.

_*in fairness, Mikrotik did add the option of running you're own controller since my original post, but I'm less sure of the use cases._
