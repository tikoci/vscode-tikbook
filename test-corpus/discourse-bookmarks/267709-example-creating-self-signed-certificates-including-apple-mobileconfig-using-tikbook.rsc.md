[//]: #!tikbook discourse-bookmark topic=267709

# ✍️ Example: Creating self-signed certificates, including Apple `.mobileconfig`, using TikBook

- Source thread: [https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/1](https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 3 total (3 post bookmark(s))
- Posts included: 2
- First bookmarked: `2026-01-14 05:50:07 UTC`
- Last bookmarked: `2026-01-14 05:50:07 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/1](https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/1)
- Created: `2026-01-10T21:15:22.275Z`
- Likes on this post: 1

This comes up from a discussion in the 7.22beta thread, mainly with @wfbuton on creating "self-signed wildcard certificates".   But it test of using `reverse-proxy` to run VSCode for Web (`code-server`) in `/app` container, using my [TikBook notebook extension], to then test creating wildcard certs.

And also add a function to create an Apple Profile (`.mobileconfig`) that can be used to install root certificate into iOS (or any Apple platform) that could be used elsewhere.  _Since "how to use with apple" came up in the 7.22 discussion with @wfbuton._  

The following "TikBook" is still a valid `.rsc` file and usable in `/system/script`/etc... 
Attachment omitted: reverse-proxy.md.rsc (11.1 KB)

But will open with in VSCode (with TikBook extension installed),  the various block shown below are cells that can be run individually:
Forum attachment omitted: Screenshot 2026-01-10 at 12.23.49 PM

> [Install TikBook extension into VSCode](https://marketplace.visualstudio.com/items?itemName=TIKOCI.tikbook), see forum post that describes more:

https://forum.mikrotik.com/t/tikbook-notebook-and-tools-for-visual-studio-code-including-routeros-lsp/263305

And withVSCode, things like the "Outline" view also work, so can "jump" to various parts of a script (or run parts too):
Forum attachment omitted: Screenshot 2026-01-10 at 12.35.05 PM

And if "Open With Markdown" in VSCode, you get the following markdown, which allow quick posting from the TikBook to the forum...   And in Markdown view, you can also use the VSCode help to "Run on RouterOS":
Forum attachment omitted: image

So the example below was edited in TikBook, then converted to a "RouterOS Markdown" notebook for the post below.  _And, why there are global variables, since side-effect is you need `global` to pass variables between cells (as each cell has its own `local` scope) — less ideal for forum example, but super easy to go from testing to posting_

Anyway, since it what I used to test some new 7.22 stuff, including the `code-server` app which allow TikBook in web, via a RouterOS container... thought it be good real-world example of using VSCode with TikBook.

`[//]: #!tikbook`

# Creating self-signed certificates

For use with new RouterOS 7.22+ `reverse-proxy`, and includes generating an Apple "Profile" to install root CA into iOS and other Apple platforms.

[//]: #.

To keep things organized, using a variables to store a "base name" and other details used when creating certificates:

```routeros
:global scepbase "tik.home.arpa"

:global sysname [/system/identity/get name]

:put "$scepbase on $sysname"
```
> A related notebook also creates an SCEP server, so the main variable used below is named `$scepbase`, but it should be thought of the base domainname.

These variables are certificate-related, adjust "days" as needed.

```routeros
:global certkeysize 2048

:global digestalgo "sha256"

:global certdays 365

:global certcadays 1825

:global scepdays 10

:global domainname $scepbase

:global certserversans ("DNS:$domainname","DNS:*.$domainname")

:put "$certserversans"
```
Output what we know about certificates from RouterOS **before** doing anything.

> If this is run in a [TikBook](), this `print` command, it will **also** retrieve JSON using "pure REST" call. Using the "..." next to the output cell let you use different formats using "Change Presentation", including other "Notebook Renders" that show a pretty table from the JSON. You can use `plain/text` to see the results of the `:execute`"

```routeros
/certificate/print
```
#### Remove any previously generated certificates

[//]: #.

>

> Since we're _testing_, just remove any existing certificates using our scheme. This allow the notebook to run **multiple** times. Now for `/certificate`, that means client certs associated with any created here get deleted. So likely you want to run this "once".

>

```routeros
/certificate { :foreach c in=[find name~"$scepbase"] do={ :do { remove $c } on-error={ } } }
```
#### Add Certificate Authority

```routeros
/certificate add name="$scepbase-$sysname-ca" organization=$scepbase common-name="$[:convert transform=uc $scepbase] Authority ($sysname)" unit=$sysname digest-algorithm=$digestalgo days-valid=$certcadays key-usage=key-cert-sign,crl-sign key-size=$certkeysize
```
#### Add Server Certificate

```routeros
/certificate add name="$scepbase-$sysname-router" organization=$scepbase common-name=$domainname subject-alt-name=$certserversans unit=$sysname digest-algorithm=$digestalgo days-valid=$certdays key-usage=digital-signature,content-commitment,key-encipherment,data-encipherment,key-agreement,tls-server,tls-client,code-sign,email-protect,timestamp,ocsp-sign key-size=$certkeysize
```
And let's print it agian, to be sure we got some certs...

```routeros
:delay 1s

/certificate/print detail
```
#### Use "helper function" to find the CA root used in signing next

```routeros
:global getScepAuthorityName do={

:global scepbase

:global sysname

:return [/certificate get [find name="$($scepbase)-$($sysname)-ca"] name]

}

:put [$getScepAuthorityName]
```
#### Sign the CA to add key and make it "self-signed"

```routeros
/certificate/sign [$getScepAuthorityName]
```
#### Sign the "Server"/Router Certs using CA

```routeros
:delay 5s

/certificate sign ca=[$getScepAuthorityName] [find name="$scepbase-$sysname-router"]
```
### Export the CA certificate and "Share"

Export as PEM and share using BackToHomeFiles to allow manual profile creation

```routeros
# before doing that save the file name...

:global caCertFileBase "/$[$getScepAuthorityName]"

:global caCertFile "$($caCertFileBase).crt"
```
```routeros
/certificate/export-certificate [$getScepAuthorityName] file-name=$caCertFileBase
```
At this point, Files on router will have the root certificate that can be manually downloaded and installed.

```routeros
/file print proplist=name where name~".crt"
```
## Creating Apple Profile

[//]: #.

### Using [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12)

With the CA certificate (URL to it shared above), you can use [Apple Configurator.app](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12) (downloadable from Apple App Store) to create a `.mobileconfig` Profile file. This file is used by most Apple products to install "Profile". For use here, the Profile just contains the self-signed root authority, and information on to obtain a client certificate from SCEP.

> While `.mobileconfig` profiles are typically used as part of a Mobile Device Management (MDM) system, for iOS in particular it's the only way to install certificates on the device. While a client certificate _could_ be included in the `.mobileconfig` profile, using SCEP allow the OS to renew certificates.

[//]: #.

### Creating `.mobileconfig` on RouterOS

Using Apple Configuratator is likely best and easiest. But is tricky to automate since MDM systems would typical handle automating `.mobileconfig` generation and deployment.

But since our need is only certificates for VPNs, the above `.mobileconfig` can be generated on RouterOS. Similar to the CA, it is also possible to "share" to allow easy install on Apple iPhone and iPad.

With RouterOS 7.19's support for multiline strings, creating templates is much easier. Before getting code, let's some variable related to creating a `.mobileconfig` to use the SCEP Server.

```routeros
:global keyUsage "signature"

:global retries 8

:global retryDelay 15

:global clientname "client$[:tonum [:timestamp]]"

:global exportfilename "/$scepbase-$sysname-$($clientname).mobileconfig"

:put $exportfilename
```
#### UUID generator function

Another function is needed before we can get creating a `.mobileconfig`. The XML has needs a unique UUID for the `PayloadUUID` fields. RouterOS does not have one built in, thus another function. *Note, depending on use case, you may not want to the set a different `PayloadUUID` since client use it identify the same profile - more complex topic.*

```routeros
# UUIDv4

:global UUIDv4 do={

:local uuid ""

# Part 1: 8 random hex characters (e.g., "xxxxxxxx")

:set uuid ($uuid . [:rndstr from="1234567890ABCDEF" length=8])

:set uuid ($uuid . "-")

# Part 2: 4 random hex characters (e.g., "xxxx")

:set uuid ($uuid . [:rndstr from="1234567890ABCDEF" length=4])

:set uuid ($uuid . "-")

# Part 3: 4xxx (The '4' indicates UUID version 4)

:set uuid ($uuid . "4")

:set uuid ($uuid . [:rndstr from="1234567890ABCDEF" length=4])

:set uuid ($uuid . "-")

# Part 4: yxxx (The 'y' indicates the UUID variant, must be 8, 9, a, or b)

:set uuid ($uuid . [:rndstr from="89AB" length=1])

:set uuid ($uuid . [:rndstr from="1234567890ABCDEF" length=3])

:set uuid ($uuid . "-")

# Part 5: 12 random hex characters (e.g., "xxxxxxxxxxxx")

:set uuid ($uuid . [:rndstr from="1234567890ABCDEF" length=12])

:return $uuid

}

:put [$UUIDv4]
```
#### `$makeAppleProfileFile` - function to generate a Apple `.mobileconfig`

This is what actually combines all of the various `:global`'s in the notebook. _With new multiline strings, and RouterOS LSP, the XML is surprisingly readible_

```routeros
:global makeAppleProfileFile do={

:global getScepAuthorityName

:global caDownloadUrl

:global UUIDv4

:global scepserverhost

:global scepserverport

:global keyUsage

:global certkeysize

:global retries

:global retryDelay

:global clientname

:global scepbase

:global caCertFile

:global sysname

:local caPayloadId [$UUIDv4]

:local scepPayloadId [$UUIDv4]

:local profilePayloadId [$UUIDv4]

:local keyUsageNumber 0

:local keyUsageEnum {"none"=0;"key encipherment"=4;"signature"=1;"all"=5}

:if ($keyUsageEnum->$keyUsage) do={:set keyUsageNumber ($keyUsageEnum->$keyUsage)}

:local xml "<?xml version= \"1.0\" encoding= \"UTF-8\"?>

<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">

<plist version=\"1.0\">

<dict>

<key>PayloadContent</key>

<array>

<dict>

<key>PayloadCertificateFileName</key>

<string>routeros-ca.crt</string>

<key>PayloadContent</key>

<data>

$[:convert to=base64 [/file/get [find name=[:pick $caCertFile 1 1024] contents]]]

</data>

<key>PayloadDescription</key>

<string>Adds a CA root certificate</string>

<key>PayloadDisplayName</key>

<string>$[:convert transform=uc $scepbase] Authority ($sysname)</string>

<key>PayloadIdentifier</key>

<string>com.apple.security.root.$caPayloadId</string>

<key>PayloadType</key>

<string>com.apple.security.root</string>

<key>PayloadUUID</key>

<string>$caPayloadId</string>

<key>PayloadVersion</key>

<integer>1</integer>

</dict>

</array>

<key>PayloadDescription</key>

<string>Adds certificate authority using RouterOS '$sysname' from '$scepbase' organization</string>

<key>PayloadDisplayName</key>

<string>Certificates from $scepbase-$sysname</string>

<key>PayloadIdentifier</key>

<string>routeros.scepclient.$sysname.$profilePayloadId</string>

<key>PayloadOrganization</key>

<string>$scepbase</string>

<key>PayloadRemovalDisallowed</key>

<false />

<key>PayloadType</key>

<string>Configuration</string>

<key>PayloadUUID</key>

<string>$profilePayloadId</string>

<key>PayloadVersion</key>

<integer>1</integer>

</dict>

</plist>"

:return $xml

}
```
#### Generate and Share `.mobileconfig`

[//]: #.

##### Make `.mobileconfig` file with root certificate

[//]: #.

Remove any existing `.mobileconfig` file, so a new one can be added.

```routeros
:onerror e in={/file/remove [find name~"$scepbase-$sysname-$($clientname).mobileconfig"] } do={:put "ignoring error: $e"}
```
Now call the `makeAppleProfileFile` function to get the XML and add file with it.

```routeros
/file/add name=$exportfilename contents=[$makeAppleProfileFile]
```
#### Install Profile on Apple Device

Send the generated `.mobileconfig` file stored in router's files, to your Apple device. Opening the file on any Apple device will prompt you to go to Settings to install it. There are a few screens advicing what will happen.

```routeros
/file print proplist=name where name~".mobileconfig"
```
## Setup `reverse-proxy` to use self-signed certificates

> This will only work on RouterOS 7.22+, since the `reverse-proxy` is a new feature.

[//]: #.

### Add DNS to support wildcards

Add use `match-subdomain=yes` to resolve any domain in DNS. _If same MikroTik is **not** the DNS server, you'll have to setup the SNI for resolve to the router where `/app` and reverse-proxy is installed._

```routeros
/ip dns static remove [find comment=reverse-proxy-sni]

/ip dns static add address="$[/app/settings get router-ip]$[/app/settings get assumed-router-ip]" match-subdomain=yes name=$domainname type=A comment="reverse-proxy-sni"

/ip dns static export terse where comment=reverse-proxy-sni
```
### Set `reverse-proxy` to use self-signed certificates

```routeros
/ip/service/set reverse-proxy certificate="$scepbase-$sysname-router"

/ip/service/print where name=reverse-proxy
```
Just in case, restart the reverse-proxy. _Although not sure it's needed, just safer for testing_

```routeros
/ip/service disable reverse-proxy

/ip/service enable reverse-proxy
```
#### Setup any SNI Rules to use `reverse-proxy`

You will also have to manually add the designed services to proxy using WinBox4 UI (not CLI) in IP > Reverse Proxy.

See [forum post in 7.22 thread](https://forum.mikrotik.com/t/v7-22beta-development-is-released/267611/99) for example.

_And, RouterOS line ending are treated CRLF, so when copy-and-paste to forum, it adds an extra space.  How to deal with line-ending in TikBook schemes is still WIP.._

If you open the `.mobileconfig` on an Apple Mac (or iPhone), you get some prompting an something like this:
Forum attachment omitted: Screenshot 2026-01-10 at 12.32.36 PM

Forum attachment omitted: Screenshot 2026-01-10 at 12.32.53 PM

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/3](https://forum.mikrotik.com/t/example-creating-self-signed-certificates-including-apple-mobileconfig-using-tikbook/267709/3)
- Created: `2026-01-11T01:43:43.187Z`
- Likes on this post: 0

Script and text could be improved, so just shared what I was using.  But the `/certificate` commands likely good examples since the getting the attributes right are important.

> _I was working on longer version of this "TikBook" a little bit ago that also setup/used the SCEP Server (within `/certificate/scep-server`) to further automate the self-signed certificate.  The SCEP server in RouterOS has HTTP API that Windows [someplace] or Linux [using CLI] or more "stuff" in the `.mobilesconfig` for Apple.  The API is a standard so it gets you a X509 client certificate, but also gets you the self-signed root CA.  The longer version also used BackToHomeFiles to share the certificate.  Anyway there bit more which could make it easier to install/use self-signed certs from RouterOS._
