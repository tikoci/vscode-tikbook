[//]: #!tikbook discourse-bookmark topic=264179

# How to add 2FA to MikroTik logins

- Source thread: [https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/1](https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 14 total (14 post bookmark(s))
- Posts included: 2
- First bookmarked: `2026-03-21 01:07:20 UTC`
- Last bookmarked: `2026-03-21 01:07:20 UTC`

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/12](https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/12)
- Created: `2025-11-26T04:19:19.898Z`
- Likes on this post: 2

Great work @rextended in documenting the user manager! 

Maybe you should use some `rndstr` to avoid cut-and-paste same codes...  And perhaps variables...  Here is what I tried, which worked.

_Bonus_ It uses ANSI terminal code to generate hyperlinks that work via SSH (not in MacOS default Terminal, however) that you can use for the `otpauth://...` path.

 Now if only MikroTik has some option to "Show 2FA Code" in WinBox settings (or better still if WinBox _protocol_ reply that a 2FA was going to be needed) — but not much you can do about this...

### One Time Setup in User Manager

This needs to be done once. If you want to store the user manager database on another disk, set `userManagerDisk`.

```routeros
:global userManagerDisk ""
/user-manager/database set db-path="$userManagerDisk/user-manager"

:global radiusSharedSecret [:rndstr length=40]

/user-manager set enabled=yes
/user-manager/router add address=127.0.0.1 name=SystemUser2FA shared-secret=$radiusSharedSecret disabled=no

/radius add address=127.0.0.1 secret=$radiusSharedSecret service=login
/radius/incoming set accept=yes

/user/aaa set use-radius=yes
```
### Create a new 2FA enabled user

Change the following variables as needed:

```routeros
:global username "forumadmin"
:global password "forumpassword"
:global authgroup "full"

# Generates a 40 char length string to mimic SHA1 (which `:convert tranform=` does not support)
:global otpsecret [:pick [:convert to=base32 [:rndstr length=40]] 0 40]

# Add new RouterOS user to user-manager (works via AAA in /user)
/user-manager/user add attributes="Mikrotik-Group:$authgroup" name="$username" password="$password" otp-secret="$otpsecret"

# Output new user information

:put "New AAA user with 2FA created:"
:put $username
:put $password
:put ""
:put "To setup in 2FA TOTP Authenticator, include Apple Password user the following URL"

:global url "otpauth://totp/$username?secret=$otpsecret&issuer=RouterOS&algorithm=SHA1&digits=6&period=30"
:put $url

# or if use SSH from a real terminal, the following will create a clickable link in terminal using ANSI codes:

:put "\1B]8;;$url\07$url\1B]8;;\07"
```
I tested on MacOS, and in Tabby terminal, the clickable link works which takes you to the native MacOS Password application that support TOTP. 

Forum attachment omitted: image

 In Passwords, it will prompt you create a keychain item for it, including username and password, and will show the TOTP code with item in Password app.  _It does not actually use the username/password since RouterOS does not use keychain — but the TOTP code needed _after_ password in RouterOS will be generate and works_

Forum attachment omitted: image

### _Dangerous_ Cleanup Previous User Manager and RADIUS
If you need to rerun the setup script, this will **NUKE** any user-manager or radius config created above.
```routeros
/user-manager/router remove [find]
/user-manager/user remove [find]
/radius remove [find]
```

[//]: #.

## Post 13

- Original post: [https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/13](https://forum.mikrotik.com/t/how-to-add-2fa-to-mikrotik-logins/264179/13)
- Created: `2025-11-26T04:29:39.608Z`
- Likes on this post: 0

FWIW, I tried using SHA512 via `convert transform=sha512` and used that in URL etc... but I could not get that to work.  But using a 40 char string (base32 encoded) does work.  I'm not sure if a trailing `=` on the SHA512, or if RouterOS (or Apple) does not support `hash=sha512` as OTP secret.
