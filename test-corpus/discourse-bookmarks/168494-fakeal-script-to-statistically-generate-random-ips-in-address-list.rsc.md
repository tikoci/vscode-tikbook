[//]: #!tikbook discourse-bookmark topic=168494

# $FAKEAL - script to statistically generate random IPs in address-list

- Source thread: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/1](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 29 total (29 post bookmark(s))
- Posts included: 15
- First bookmarked: `2025-06-16 20:33:35 UTC`
- Last bookmarked: `2025-06-16 20:33:35 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/1](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/1)
- Created: `2023-08-02T15:40:57.000Z`
- Likes on this post: 0

I wrote a function **$FAKEAL** to generate random IPs in an address-list, e.g. ones that might require aggregation.  Originally created to test an @rextended prefix aggregator script (http://forum.mikrotik.com/t/find-addresses-with-same-octets/168376/27), but likely has additional uses (e.g. testing network performance with large address lists present).  The code is a section below.

_What it does?_
Creates random IPs addresses (e.g. /32 prefix) in an specific /ip/firewall/address-list, with controls on the possible range of address (spread=) and how "full" the range is (density=)

To see it in action... the basic uses "spread=" to control the range of IPs added to list (by /24 subnet's...,so spread=1 mean a /24) & density=1 means the range is populated with 1% of possible IP addresses in the resulting address-list.

```routeros
[admin@router] />        $FAKEAL spread=1 density=1

using   address-list FAKEAL
remove  FAKEAL done   
adding  98%     169.254.0.250 (added 4 at 250 of 254)             
runtime 00:00:00
done!   wanted 2 got 4 (off by -2) in FAKEAL (length 4)

[admin@router] />      /ip/firewall/address-list print
Columns: LIST, ADDRESS, CREATION-TIME
# LIST    ADDRESS        CREATION-TIME      
0 FAKEAL  169.254.0.65   2023-08-01 13:28:46
1 FAKEAL  169.254.0.81   2023-08-01 13:28:46
2 FAKEAL  169.254.0.102  2023-08-01 13:28:46
3 FAKEAL  169.254.0.250  2023-08-01 13:28:46
```
The function $FAKEAL provides a help to understand the options:

```routeros
$FAKEAL help
Usage:
$FAKEAL [spread=0..119304647] [density=1..100] [list=list_name] [replace={no|false|off|0}] [start=ip.ad.dr.ess]
    spread=  num of /24's to distribute random entires over (e.g. how many / 254), default is 1 (/24)
    density= percentage (as int) of used address over the total range (i.e. 50 = 50% of possible IP), default is 25
    list=    default is FAKEAL but can be any valid name for /ip firewall address-list
    start=   the first possible IP address to use, default is 169.254.0.0
    replace= any previous list created by $FAKEAL is removed, use 'replace=no' to keep an old entires in list, default is yes
```
The needed function code to do this is here:

```routeros
:global FAKEAL do={
    :local defaultlname [:pick $0 1 255]
    :local defaultspread 1
    :local defaultdensity 25
    :local defaultstart 169.254.0.0
    :local todefault  do={:if ([:typeof $1]="$2")                do={:return $1  } else={:return $3   }}
    :local invalidchr do={:if ($1~"[\24\3F\\\60\01-\19\7F-\FF]") do={:return true} else={:return false}}
    :local listname [$todefault         $list     "str" $defaultlname ]
    :local lspread  [$todefault [:tonum $spread ] "num" $defaultspread ]
    :local ldensity [$todefault [:tonum $density] "num" $defaultdensity ]
    :local lstart   [$todefault [:toip  $start  ] "ip"  $defaultstart ]
    :local lreplace  [$todefault [:tostr $replace ] "str"  true ]
    :if ([$invalidchr $listname]                   ) do={:error "list= contains invalid chars" }
    :if (($lspread  < 0) or ($lspread  > 119304647)) do={:error "spread= is out of range" }
    :if (($ldensity < 1) or ($ldensity > 100      )) do={:error "density= is out of range" }
    :if ($replace~"^(no|false|off)\$") do={:set lreplace false} else={:set lreplace true} 
    :if ($1="help") do={
        :put "Usage:"
        :put "$0 [spread=0..119304647] [density=1..100] [list=list_name] [replace={no|false|off|0}] [start=ip.ad.dr.ess]"
        :put "    spread=  num of /24's to distribute random entires over (e.g. how many / 254), default is $defaultspread (/$($defaultspread*24))"
        :put "    density= percentage (as int) of used address over the total range (i.e. 50 = 50% of possible IP), default is $defaultdensity"
        :put "    list=    default is $defaultlname but can be any valid name for /ip firewall address-list"
        :put "    start=   the first possible IP address to use, default is $defaultstart"
        :put "    replace= any previous list created by $0 is removed, use 'replace=no' to keep an old entires in list, default is yes"
        :return [:nothing]
    }

    :local possible (254*$lspread)
    :local howmany ($possible*$ldensity/100)
    :local tstart 
    :local NOW do={:do { :return [:timestamp] } on-error={ :return [/system clock get time]}}
    /ip firewall address-list {
        :put "using\taddress-list $listname"
        :if ($lreplace) do={
            :put "remove\t$listname pending"
            remove [find list=$listname]
            /terminal cuu
            :put "remove\t$listname done   "
        }
        :set tstart [$NOW]
        :put ""
        :local numadded 0
        :local skipped [:toarray ""]
        :local rndip
        :for listitem from=0 to=($possible-1) do={
            # so we loop through possible range...
            :do {
                # apply the "odds" the IP should appear...
                :local varinum [:rndnum from=0 to=(10000 / $ldensity)]
                # if :rndnum is 0... which it would be 1 out of $ldensity times
                :if ($varinum < 100) do={
                    # add an possible IP to addresss, otherwise move on without adding
                    :set rndip ($lstart + $listitem)
                    add address=$rndip list=$listname 
                    :set numadded ($numadded+1)
                    /terminal cuu 
                    :put "adding\t$((($listitem+1)*100)/($possible))%\t$rndip\t(added $numadded at $listitem of $possible)             "
                } else={
                    # DEBUG
                    #:put "rejected $rndip with $varinum"
                }
            } on-error={:set skipped ($skipped,$rndip)}
        } 
        :if ([:len $skipped] > 0) do={
            :put "skipped\t$[:len $skipped] IPs, likely because the IP was already in list"
        }
        :put "runtime\t$([:pick ([$NOW]-$tstart) 0 8])"
        :put "done!\twanted $howmany got $numadded off by $($howmany-$numadded) ($(($howmany-$numadded) * 100 / $howmany)%) in $listname (length $[:len [find list=$listname]])"
    }
}

# show help
$FAKEAL help

# create ~25 IPs (density=10 is 10%) in an address-list over 169.254.0.0/24 (spread=1 is 254 IPs)
#$FAKEAL spread=1 density=10

# create ~645 IPs (density=1 is 1%) in specific address-list ("rndvente") over 10.20.0.0 (so spread=254 is /16)
#$FAKEAL spread=254 density=1 list=rndtens start=10.20.0.0
```
Performance isn't bad using the approach to loop through all possible IP THEN decide randomly if that particular possible address should be added.  Another approach was used in function called $fantacylist in http://forum.mikrotik.com/t/find-addresses-with-same-octets/168376/1 but this version is WAY faster than "hope and prey" method in $fantacylist.

In quick test, creating a list that ended up being 126471 address-list entries, took about 2 minutes (well 00:02:09) on a RB1100AHx4. But this method is by far quicker than checking if any item is the address-list before adding it – even at the expensive of looping >500,000 times to do it in the example below.

```routeros
$FAKEAL spread=2000 density=30 list=rndvente start=10.20.0.0     
using   address-list rndvente
remove  rndvente done   
adding  99%     10.27.192.84 (added 126471 at 507988 of 508000)              
runtime 00:02:09
done!   wanted 152400 got 126471 (off by 25929) in rndvente (length 126471)
```

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/3](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/3)
- Created: `2023-08-02T16:35:31.000Z`
- Likes on this post: 0

That's cleaner.  Feel free to suggest other changes.

Just for transparency in the numbers :wink:...  This is the wrapped function I've used to test your aggregation:

```routeros
:global ippa do={
    /ip/firewall/address-list remove [find list=test_End]
    /ip/firewall/address-list remove [find list~"^test_[^S]"]
    :put "before @rextended aggregation there are $[:len [/ip/firewall/address-list/find list=test_Start]] IPs"    
    :local tstart [:timestamp]
    /ip firewall address-list {
        :local toipprefix do={:return [[:parse ":return $1"]]}
        :local IPmustMask "^((25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])\\.){3}(25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])\\/(3[0-2]|[0-2]\?[0-9])\$"
        :local IPoptiMask "^((25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])\\.){3}(25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])(\\/(3[0-2]|[0-2]\?[0-9])){0,1}\$"
        :local IPwoutMask "^((25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])\\.){3}(25[0-5]|(2[0-4]|[01]\?[0-9]\?)[0-9])\$"

        :local field 0.0.0.0/0
        :local sub   0.0.0.0/0
        :local sub1  0.0.0.0/0
        :local sub2  0.0.0.0/0
        :local temp  0.0.0.0

    # from 32 to 31
        :local addrarray [:toarray ""]
        :local newarray  [:toarray ""]
        :foreach item in=[print as-value where address~$IPoptiMask and list="test_Start"] do={
            :set addrarray ($addrarray , ($item->"address"))
        }
        :foreach item in=$addrarray do={
            :set field $item
            :if ($field~$IPwoutMask) do={:set field [:toip $field]} ; :if ($field~$IPmustMask) do={:set field [$toipprefix $field]}
            :if ([:typeof $field] = "ip-prefix") do={
                :if ($field~"/31\$") do={
                    :if ([:find $newarray $field] = [:nothing]) do={
                        :set newarray ($newarray , $field)
                    }
                }
            }
            :if ([:typeof $field] = "ip") do={
                :set temp $field
                :set sub  [$toipprefix ("$($temp & 255.255.255.254)/31")]
                :set sub1 ($temp & 255.255.255.254)
                :set sub2 (($temp & 255.255.255.254) + 1)
                :if (([:find $newarray $sub] = [:nothing]) and ([:find $newarray $field] = [:nothing])) do={
                    :if (([:find $addrarray $sub1] = [:nothing]) or ([:find $addrarray $sub2] = [:nothing])) do={
                        :set newarray ($newarray , $field)
                    } else={
                        :set newarray ($newarray , $sub)
                    }
                }
            }
        }

    # useless, just for debug
    #    :foreach item in=$newarray do={
    #        add list="test_Inter31" address=$item
    #    }

    # from 31 to 30
        :local addrarray $newarray
        :local newarray  [:toarray ""]
        :foreach item in=$addrarray do={
            :set field $item
            :if ($field~$IPwoutMask) do={:set field [:toip $field]} ; :if ($field~$IPmustMask) do={:set field [$toipprefix $field]}
            :if ([:typeof $field] = "ip") do={
                :if ([:find $newarray $field] = [:nothing]) do={
                    :set newarray ($newarray , $field)
                }
            }
            :if ([:typeof $field] = "ip-prefix") do={
                :if ($field~"/30\$") do={
                    :if ([:find $newarray $field] = [:nothing]) do={
                        :set newarray ($newarray , $field)
                    }
                }
                :if ($field~"/31\$") do={
                    :set temp [:toip [:pick $field 0 [:find $field "/" -1]]]
                    :set sub  [$toipprefix ("$($temp & 255.255.255.252)/30")]
                    :set sub1 [$toipprefix ("$($temp & 255.255.255.252)/31")]
                    :set sub2 [$toipprefix ("$(($temp & 255.255.255.252) + 2)/31")]
                    :if (([:find $newarray $sub] = [:nothing]) and ([:find $newarray $field] = [:nothing])) do={
                        :if (([:find $addrarray $sub1] = [:nothing]) or ([:find $addrarray $sub2] = [:nothing])) do={
                            :set newarray ($newarray , $field)
                        } else={
                            :set newarray ($newarray , $sub)
                        }
                    }
                }
            }
        }

    # useless, just for debug
    #    :foreach item in=$newarray do={
    #        add list="test_Inter30" address=$item
    #    }

    # from 30 to 29
        :local addrarray $newarray
        :local newarray  [:toarray ""]
        :foreach item in=$addrarray do={
            :set field $item
            :if ($field~$IPwoutMask) do={:set field [:toip $field]} ; :if ($field~$IPmustMask) do={:set field [$toipprefix $field]}
            :if ([:typeof $field] = "ip") do={
                :if ([:find $newarray $field] = [:nothing]) do={
                    :set newarray ($newarray , $field)
                }
            }
            :if ([:typeof $field] = "ip-prefix") do={
                :if ($field~"/(29|31)\$") do={
                    :if ([:find $newarray $field] = [:nothing]) do={
                        :set newarray ($newarray , $field)
                    }
                }
                :if ($field~"/30\$") do={
                    :set temp [:toip [:pick $field 0 [:find $field "/" -1]]]
                    :set sub  [$toipprefix ("$($temp & 255.255.255.248)/29")]
                    :set sub1 [$toipprefix ("$($temp & 255.255.255.248)/30")]
                    :set sub2 [$toipprefix ("$(($temp & 255.255.255.248) + 4)/30")]
                    :if (([:find $newarray $sub] = [:nothing]) and ([:find $newarray $field] = [:nothing])) do={
                        :if (([:find $addrarray $sub1] = [:nothing]) or ([:find $addrarray $sub2] = [:nothing])) do={
                            :set newarray ($newarray , $field)
                        } else={
                            :set newarray ($newarray , $sub)
                        }
                    }
                }
            }
        }

        :foreach item in=$newarray do={
            add list="test_End" address=$item
        }
    }
    :put "completed in $([:timestamp]-$tstart)"
    :put "after @rextended aggregation there are $[:len [/ip/firewall/address-list/find list=test_End]] IP"    
}
```

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/5](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/5)
- Created: `2023-08-02T16:43:59.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

And, opps... #NoFloats!
but this is why it's not very accurate with higher density= values...

```routeros
# apply the "odds" the IP should appear...
:local varinum [:rndnum from=0 to=(100 / $ldensity)]
```
Suggestions?

[//]: #.

## Post 7

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/7](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/7)
- Created: `2023-08-02T16:49:51.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Nope.  And, I didn't notice that.  I tried to do something quick & turned into a few hours. :wink:

Feel free to rewrite/suggest.  But it my "odds" that's totally wrong...
e.g. with density=90... (100 / 90) == 1

So it's always 50% when high density=

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/9](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/9)
- Created: `2023-08-02T17:01:21.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I know why...

The help shows the default values used in the "Usage:" line (e.g. so you'd know what you'd get if param is left unset).  FWIW, I also use a $0 to get the function name, since not likely not everyone ALLCAPS for functions but that what I generally use internally.

[//]: #.

## Post 10

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/10](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/10)
- Created: `2023-08-02T17:43:53.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Usual solution, add a multiply by 10/100/etc, then look for a bigger range than just 0...

```routeros
              :local varinum [:rndnum from=0 to=(10000 / $ldensity)]
              :if ($varinum < 100) do={(somthing)}
```
e.g. say density=10 (10%)...  10000/10 = 1000, so rndnum is 0 to 1000...  thus, have 10% chance of the number being 0 to 100 (instead of just 0, when result often is either 0 or 1 :wink:).

Fixed the code to include @rextended "todefault" scheme & fixed the odds from 50% to something close to the distribution of :rndnum should be:

```routeros
$FAKEAL spread=254 density=1 list=rndtens start=10.10.0.0
     using   address-list rndtens
     remove  rndtens done   
     adding  99%     10.10.251.697   (added 632 at 64325 of 64516)             
     runtime 00:00:03
     done!   wanted 645 got 632 off by 13 (2%) in rndtens (length 632)

$FAKEAL spread=254 density=25 list=test_Start start=172.25.0.0  
     using   address-list test_Start
     remove  test_Start done   
     adding  100%    172.25.252.347  (added 16029 at 64515 of 64516)             
     runtime 00:00:16
     done!   wanted 16129 got 16029 off by 100 (0%) in test_Start (length 16029)
```

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/12](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/12)
- Created: `2023-08-02T19:35:25.000Z`
- Likes on this post: 0

Fixed the V7-isms.  And added,

```routeros
    :local NOW do={:do { :return [:timestamp] } on-error={ :return [/system clock get time]}}
```
Do you have a better one deal _generically_ with "boolean-ish" args & have a default? :wink:
I run into that one a lot...  I cheat as you noticed (e.g. $myboolarg = "yes") – but your above example for replace= is better since deals 0, true, etc.

[//]: #.

## Post 14

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/14](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/14)
- Created: `2023-08-02T19:47:17.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

> I really liked your todefault > _and invalidchr_ > "macro"!

e.g. my functions end up always being >50% of code being some stupid validation...

[//]: #.

## Post 16

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/16](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/16)
- Created: `2023-08-02T19:57:47.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

_invalidchr_? I just made it up :wink:
[/quote]

It's useful.

Did see your code – I was testing it...  I'll wait till you're done.

It's the replace= one that an odd-ball now.  It be nice if that was tied into your todefault/invalidchr scheme for this...  Since, ideally, for the =yes/1/true and =no/0/false, it be nice to "see" the default value (e.g. in the todefault section)...

[//]: #.

## Post 18

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/18](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/18)
- Created: `2023-08-02T20:07:28.000Z`
- Likes on this post: 0

LOL – your the one who added that boolean complexity!

I normally just do like originally, look for the ="yes" or ="no" as exact string.  Since, as you well know,  :tobool doesn't help with "yes"/"no" — even though that what the CLI uses everywhere!  So, yeah normally I skip the stupid inconstancy of "true"/[:tobool 1] or "false"/[:tobool 0] stuff :wink:.

[//]: #.

## Post 20

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/20](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/20)
- Created: `2023-08-02T20:15:56.000Z`
- Likes on this post: 0

FWIW...I'd started your "/29 reducer" (the $ippa above) a few hours ago (with some version of this code, we're _lucky_ you've been missing with defaults :wink:).

It just come back...  Just over one hour to process 16029 /32's into some 13938 adjacent ones.  From 172.25.0.0/16 with 25% of possible IPs in the test_Start list...

```routeros
$FAKEAL spread=254 density=25 list=test_Start start=172.25.0.0  
using   address-list test_Start
remove  test_Start done   
adding  100%    172.25.252.347  (added 16029 at 64515 of 64516)             
runtime 00:00:16
done!   wanted 16129 got 16029 off by 100 (0%) in test_Start (length 16029)

$ippa
before @rextended aggregation there are 16029 IPs
completed in 01:02:58.130963720
after @rextended aggregation there are 13938 IP
```

[//]: #.

## Post 22

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/22](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/22)
- Created: `2023-08-02T20:24:27.000Z`
- Likes on this post: 0

Boy you'd would have loved the VMS OS, it did all that shortening...

BTW the linux/homebrew commands got EXACT same number (even thought it support /28 and below – apparently at "25% full", it does find any < /29 prefixes...

```routeros
ssh me@host '/ip/firewall/address-list/print proplist=address where list=test_Start' | awk '{ print $2"/32" }' | aggregate | wc -l
   13938
```

[//]: #.

## Post 24

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/24](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/24)
- Created: `2023-08-02T20:28:49.000Z`
- Likes on this post: 0

Yeah I'm sure.  Some baseline that your code works I thought was pretty good.  Not sure how often these problems come up in real world, but prepared :wink:.

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/26](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/26)
- Created: `2023-08-03T14:36:10.000Z`
- Likes on this post: 0

Yeah, I was merely pointing out container as option.  Folks seem to use it for mainly Pi-Hole or other "servers" – but something simple like aggregate could packaged distrolessly.  _If you have V7, grab an ARM, and done the device-mode dance..._

Updated the code here with your "re-re" changes with minor update:
- left the help below the default/invalid stuff, since I do want it outputting the default based on variables.
- if params are bad, think :error is better – code calling it should be fixed :wink:
- just me I think... but like the database-style/Rust/Swift ":return [:nothing]" as as opposed to C-style ":return 0" – but doesn't matter.

Did a quick test (to make sure replace= etc worked)... 2 min 49 sec to create 127,000 IPs in an address-list (looped through the 1.2 million IP range to come up with those at 10%).  The probability now works correctly so just 00.678% off (RouterOS just calls it 0% – no floats!).

```routeros
$FAKEAL spread=5000 density=10 list=rndtens start=10.10.0.0 replace=no   
    using   address-list rndtens
    adding  99%     10.29.96.2191   (added 126138 at 1269979 of 1270000)             
    skipped 136 IPs, likely because the IP was already in list
    runtime 00:02:49
    done!   wanted 127000 got 126138 off by 862 (0%) in rndtens (length 127405)
```

[//]: #.

## Post 27

- Original post: [https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/27](https://forum.mikrotik.com/t/fakeal-script-to-statistically-generate-random-ips-in-address-list/168494/27)
- Created: `2023-08-03T14:46:05.000Z`
- Likes on this post: 0

n.b. No V6 compatibility however.  So this only works on V7, right now.  I forgot that [:rndnum] is a recent innovation...
