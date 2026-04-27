[//]: #!tikbook discourse-bookmark topic=156066

# Securely storing apikey/tokens for /tool/fetch... Approaches?  == $SECRET

- Source thread: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/1](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 11 total (topic bookmark)
- Posts included: 6
- First bookmarked: `2025-06-16 20:35:48 UTC`
- Last bookmarked: `2025-06-16 20:35:48 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/1](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/1)
- Created: `2022-02-22T18:17:12.000Z`
- Likes on this post: 0

In V7, I've been trying to "port" some bash/javascript scripts we use.  Most just call various REST APIs.  Been using RouterOS script using /tool/fetch to replicate some of them, since running them directly on a router make scripting _SOME_ stuff easier.

Problem is some REST API I call need an "apikey" or "token", which is essentially a fancy password needed for the API.
e.g.

```routeros
:global apikey [???????]
/tool/fetch url=... http-header-field="Authorization: bearer $apikey" ...
```
Since I'm just experiment with this approach, I've used them as :global variables loaded by script & this obviously works.  **But not very secure.**  Since the script code is pretty visible in the config (e.g. via :export or other uses).  And, even load them from a file in /files, the files can't be restricted to a single user either AFAIK.

While for [stuff like AWS](https://help.mikrotik.com/docs/pages/viewpage.action?pageId=63045633#heading-Certificates-2) and other API, you can use the X.509 certificates – which are supported in /tool/fetch under V7, e.g.

```routeros
/tool/fetch url=... certificate=...
```
But not all REST APIs support X.509 client certs.

Basically... **I want to "stash" an external REST API's apikey/token/password on a Mikrotik, that will be there after reboot, but not show up in an ":export".**  Similar to how /certificate stuff work (e.g. in "backup" but not ":export"), except I'm dealing with 8-64 char strings, not certificates.  Or, the concept of "[encrypted-secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)", which store "private data" used by GitHub repo/actions/etc (e.g. to avoid needing password aren't kept in files/code) .

_Curious if any one has any "nifty" solutions to this?_

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/2](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/2)
- Created: `2022-02-22T22:23:48.000Z`
- Likes on this post: 0

I'd seen "/ip/firewall/layer7-protocol/..." used to "cache" things, but that's also not very "hidden".

But that gave me an idea.   I don't normally use PPP, but they do have "secrets" and the password field there would at least hidden in most exports, but still persist.  Anyway wrote a function that use

```routeros
/ppp/secret $name set/get password=$apikey
```
for storing, well, "secrets".   Maybe there is a better approach – really was hoping there be something in /certificates to securely store a basic string, but couldn't figure out any tricks there.  Anyway, this is what I came up so far:

_**Updated:** See code in https://forum.mikrotik.com/viewtopic.php?p=916159#p916159_

Which then can be used like:

```routeros
> $SECRET set MTforumpw password=ItIsASecretDontYouKnow

 > :put [$SECRET get MTforumpw]
ItIsASecretDontYouKnow
 
 > $SECRET print
Columns: NAME, SERVICE, PASSWORD, PROFILE
# NAME       SERVICE  PASSWORD                          PROFILE
;;; used by $SECRET
1 MTforumpw  async    ItIsASecretDontYouKnow            null
```
And my main use is for /tool/fetch, so looks like this with /tool/fetch's headers:

```routeros
{
# ...
:local headers "Authorization: bearer $[$SECRET get mtforumpw]"        
:local resp [/tool/fetch url="$url" http-method="$method" http-header-field="$headers" http-data=($payload) output="user" as-value]
:put $resp
```
Seems to work in a few tests – at least avoids the /export showing REST/etc API keys without show-sensitive, which was my biggest concern.
_Still feel pretty_ "hack-ish"_, so curious if anyone has any better ideas here..._

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/4](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/4)
- Created: `2022-02-23T03:25:14.000Z`
- Likes on this post: 0

Yes, PPP is a poor knock-off of AAA.

> Quoted forum context omitted.

You won't get an argument from me :slight_smile:.  Basically trying to not have "passwords" is my ROS script code.

While I do find the approach of "/ip/firewall/layer7-protocol/set $attr regexp=$value" from [this post](http://forum.mikrotik.com/t/persistent-environment-variables/145326/5) very cleaver – it shows the same need of "persisted variables" as built-in to RouterOS (with some "is-sensitive=yes" option I suppose :wink: ).

But good news is it's easy to change my $SECRET function to do={# something else in future} – without changing any of the code that USED any "secrets".  As you point out, /ppp/secret has _some_ /user/group policy for it ("sensitive"), although the :export with /system/script/... containing "passwords" was WAY bigger concern, than other admin users seeing anything.

> Quoted forum context omitted.

Again, no argument.

But this is why I started my hunt for some "hack" in /certificates ... I knew cert stuff is NOT in an /export – so TRIED to turn that negative, into a positive :slight_smile: ... no such luck.

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/5](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/5)
- Created: `2022-02-23T04:08:23.000Z`
- Likes on this post: 1

Did a quick test on this.  /ppp/secret's password can be up to 64k it seems – I would have though it be much lower.  At least under V7, this test script show the limit:

```routeros
:global ppppwdmax do={
    :for i from=1 to=[:tonum $1] step=($1/10) do={
        /ppp/secret/remove [find where comment="#removeme"]
        :local expected [:rndstr length=$i from=abc]
        /ppp/secret/add name="pwd$i" password=$expected comment="#removeme"
        :local actual [/ppp/secret/get "pwd$i" password]
        :put "/ppp/secret test loop=$i expected=$[:len $expected] actual=$[:len $expected]"
        /terminal/cuu
        :if ($expected!=$actual) do={
            :error "failed to created new /ppp/secret with password lengths of loop=$i expected=$[:len $expected] actual=$[:len $actual] "
        }  
    } 
}

# this will work
$ppppwdmax 60000
# /ppp/secret test loop=54001 expected=54001 actual=54001

# this won't and gets a very clear error with limit
$ppppwdmax 100000
# afraid to create strings larger than 64kB
```

[//]: #.

## Post 6

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/6](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/6)
- Created: `2022-02-28T19:04:48.000Z`
- Likes on this post: 1

Updated the "persisted store using ppp secrets" script so it should work on both V6 and V7.  Although again persisted variables are a "needed feature" – since this is still a hack, works well enough for my purposes, but no warranties here.

```routeros
### $SECRET
#   get <name>
#   set <name> password=<password>
# . remove <name
#   print
:global SECRET
:set $SECRET do={
    :global SECRET

    # helpers
    :local fixprofile do={
        :if ([/ppp profile find name="null"]) do={:put "nothing"} else={
            /ppp profile add bridge-learning=no change-tcp-mss=no local-address=0.0.0.0 name="null" only-one=yes remote-address=0.0.0.0 session-timeout=1s use-compression=no use-encryption=no use-mpls=no use-upnp=no
        }
    }
    :local lppp [:len [/ppp secret find where name=$2]]
    :local checkexist do={
        :if (lppp=0) do={
            :error "\$SECRET: cannot find $2 in secret store"
        }
    }

    # $SECRET
    :if ([:typeof $1]!="str") do={
        :put "\$SECRET"
        :put "   uses /ppp/secrets to store stuff like REST apikeys, or other sensative data"
        :put "\t\$SECRET print - prints stored secret passwords"
        :put "\t\$SECRET get <name> - gets a stored secret"
        :put "\t\$SECRET set <name> password=\"YOUR_SECRET\" - sets a secret password" 
        :put "\t\$SECRET remove <name> - removes a secret" 
    }

    # $SECRET print
    :if ($1~"^pr") do={
        /ppp secret print where comment~"\\\$SECRET"
        :return [:nothing] 
    }

    # $SECRET get
    :if ($1~"get") do={
        $checkexist
       :return [/ppp secret get $2 password] 
    }

    # $SECRET set
    :if ($1~"set|add") do={
        :if ([:typeof $password]="str") do={} else={:error "\$SECRET: password= required"}
        :if (lppp=0) do={
            /ppp secret add name=$2 password=$password 
        } else={
            /ppp secret set $2 password=$password
        }
        $fixprofile
        /ppp secret set $2 comment="used by \$SECRET"
        /ppp secret set $2 profile="null"
        /ppp secret set $2 service="async"
        :return [$SECRET get $2]
    } 

    # $SECRET remove
    :if ($1~"rm|rem|del") do={
        $checkexist
        :return [/ppp secret remove $2]
    }
    :error "\$SECRET: bad command"
}
```
Here is an example of using the function:

```routeros
$SECRET 
#$SECRET
#   uses /ppp/secrets to store stuff like REST apikeys, or other sensative data
#        $SECRET print - prints stored secret passwords
#        $SECRET get <name> - gets a stored secret
#        $SECRET set <name> password="YOUR_SECRET" - sets a secret password
#        $SECRET remove <name> - removes a secret
#$SECRET: bad command

$SECRET print
#Flags: X - disabled 
# #   NAME         SERVICE CALLER-ID      PASSWORD      PROFILE      REMOTE-ADDRESS 

$SECRET add "rest_apikey" password="mikrotik"
#

$SECRET print
#Flags: X - disabled 
# #   NAME         SERVICE CALLER-ID      PASSWORD      PROFILE      REMOTE-ADDRESS 
# 0   ;;; used by $SECRET
#     rest_apikey  async                  mikrotik      null        

:put [$SECRET get rest_apikey]
# mikrotik

$SECRET remove rest_apikey
# 

:put [$SECRET get rest_apikey]
# no such item
```
and more specific example from above of using as in /tool/fetch for common "API Keys" (TLS with Bearer auth header):

```routeros
{
# ...
:local headers "Authorization: bearer $[$SECRET get mtforumpw]"        
:local resp [/tool/fetch url="$url" http-method="$method" http-header-field="$headers" http-data=($payload) output="user" as-value]
:put $resp
# ...
}
```

[//]: #.

## Post 11

- Original post: [https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/11](https://forum.mikrotik.com/t/securely-storing-apikey-tokens-for-tool-fetch-approaches-secret/156066/11)
- Created: `2025-01-09T17:27:13.000Z`
- Likes on this post: 0

Yeah the whole idea of $SECRET is that it uses /ppp/profile password= variable, which in RouterOS policy is "sensitive" - you indeed you do need policy permission for it.

Now the main benefit of using a "sensitive" attribute to store the "secret" is that stuff like API keys would not appear in :export to avoid leaking API keys.  But unfortunately the same policy permission is required to use it.

In an ideal world RouterOS scripting would support persistent secure variables, since often some key/etc is needed for any /tool/fetch call to cloud services...  $SECRET is still better than just embedding password in the script itself IMO, since even a "read only" user can see any keys in a /system/script source= attribute.
