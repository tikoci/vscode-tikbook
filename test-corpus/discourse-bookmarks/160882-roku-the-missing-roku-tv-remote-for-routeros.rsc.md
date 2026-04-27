[//]: #!tikbook discourse-bookmark topic=160882

# $ROKU, the missing Roku TV remote for RouterOS

- Source thread: [https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1](https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 5 total (topic bookmark)
- Posts included: 4
- First bookmarked: `2025-06-16 20:32:13 UTC`
- Last bookmarked: `2025-06-16 20:32:13 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1](https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/1)
- Created: `2022-09-17T20:36:34.000Z`
- Likes on this post: 0

I've long used a Python-based command-line program, [python-roku](https://github.com/jcarbaugh/python-roku) to control my Roku-based TV.  It works pretty well, except I'd perfer "vi-style" keys to navigate the Roku TV's grid-like interface.  For fun, I wrote a RouterOS script that uses the same HTTP-based [Roku external control REST API](https://developer.roku.com/docs/developer-program/debugging/external-control-api.md), using ROS's /tool/fetch command (and /terminal/inkey).  Once the script's variables are loaded, it can be run using "$ROKU <cmd>", it acts like a built-in command except prefixed with the "$" (to access the function that implements the "fake command").  Specifically "$ROKU remote" will run it as a command-line remote control for a RokuTV.

The ROKU script function works well enough for my purposes for a few months so thought I'd share.  But likely not bug-free.  In particular, "$ROKU remote" has a "keyboard mode" is a work-in-progress.  Feel free to comment on improvements if anyone ends up using it.  I have only tested it under RouterOS v7, but believe it should generally work also on V6 (but perhaps minor tweaks may be required)

**Installing the script…**

The script needed is at the bottom of this post.  I assume some familiarity with RouterOS script – so how the ROKU function variable (and other needed associated variables) are loaded in the RouterOS "shell" is up to you, but any of the methods should work:
* Cut-and-paste the entire code block into the terminal.  This allows you to test it on your particular router, but as variables are clear at power loss/reboot may not be best long term
* Copy the ROKU.rsc file below to RouterOS, then use ":import ROKU.rsc" to load it into a ROS terminal shell.
* Add the code to a /system/script via Winbox or CLI, then load the variable into the CLI by running in the terminal using /system/script/run <roku_script_name>

And, if you want to load it after reboot, you can use /system/scheduler.  There are many "schools of thought" on how to load ROS scripts – I'm more sharing my ROKU remote code than how-to load a script here.

**Implementation Notes**

If you look at the code, the variable "ROKU" is main function.  The code is structured into several global variables, either arrays or functions, but all must be loaded for the ROKU function to work.
A variable "roku-rcpmap" controls the keyboard mapping to Roku TV commands – feel free to adjust as needed (and any changed will be reflected in the "$ROKU remote" help screen).
Also, I haven't packaged this for general usage – it's more in the "fun with Mikrotik scripts" category – so you should understand some ROS scripting before using it...e.g. no warranties here :wink:.

**Setting the Roku TV's IP address…**

Roku TV OS uses [DIAL/SSDP](https://en.wikipedia.org/wiki/Discovery_and_Launch) for service discovery.  However, RouterOS has no native support for DIAL (or SSDP), so the ROKU script requires an IP address of the TV be specified.  The IP address is available on a Roku TV under Home > Settings > Network > About.  Obviously the TV's IP address needs to be reachable from the RouterOS device that's running the ROKU script.

Once the ROKU code is loaded, you can set the TV's IP address by entering like "$ROKU set ip=192.168.88.249" (replace with the actual IP address of TV).  Internally, the script sets a DNS name "roku" to this IP, so alternatively you can add a static DNS record named "roku" that $ROKU will use.

**$ROKU command usage…**

All commands are access through a function named $ROKU that the script loads to global variable.  The $ROKU functions has some "sub-modes" of operation:
* Script commands - like "$ROKU poweron" or "$ROKU input_hdmi1" that can be used in other scripts or directly at the ROS terminal
* Emulated remote control via $ROKU remote - will the function in a loop waiting for keypress in the RouterOS terminal, a help screen will the available commands but they generally follow "vi-style"(H=left, J=up, K=down, L=right) with return key same a Roku's "OK" button. In the remote control mode, a seperate "Keyboard Mode" can entered and exited via the backtick ` key (similar to switching vi/vim from command mode to input mode) –this allow typing into the various Roku screen like "Search"
* "$ROKU help" - will displace the full set of commands
* "$ROKU set ip=x.x.x.x" - will set the IP address of the Roku TV to use

"$ROKU help" will show the available commands.  With "$ROKU remote" being the command to start the Roku TV remote "emulator" from the ROS terminal.

```routeros
$ROKU - the missing remote for Mikrotik
   $ROKU remote  -  interactive remote using vi-like key maps
   $ROKU set ip=<roku_ip> - set Roku IP address as a static DNS name 'roku'
   $ROKU <cmd>  -  issues a single Roku remote control command, specifically:
        $ROKU back 
        $ROKU backspace 
        $ROKU channel_down      (requires TV with built-in Roku)
        $ROKU channel_up        (requires TV with built-in Roku)
        $ROKU down 
        $ROKU enter 
        $ROKU find_remote 
        $ROKU forward 
        $ROKU home 
        $ROKU info 
        $ROKU input_av1         (requires TV with built-in Roku)
        $ROKU input_hdmi1       (requires TV with built-in Roku)
        $ROKU input_hdmi2       (requires TV with built-in Roku)
        $ROKU input_hdmi3       (requires TV with built-in Roku)
        $ROKU input_hdmi4       (requires TV with built-in Roku)
        $ROKU input_tuner       (requires TV with built-in Roku)
        $ROKU left 
        $ROKU literal 
        $ROKU play 
        $ROKU power     (requires TV with built-in Roku)
        $ROKU poweroff  (requires TV with built-in Roku)
        $ROKU poweron   (requires TV with built-in Roku)
        $ROKU replay 
        $ROKU reverse 
        $ROKU right 
        $ROKU search 
        $ROKU select 
        $ROKU up 
        $ROKU volume_down       (requires TV with built-in Roku)
        $ROKU volume_mute       (requires TV with built-in Roku)
        $ROKU volume_up         (requires TV with built-in Roku)
```
**"$ROKU remote" emulator**

The basic commands in "remote" mode are:
* Roku "OK" button is mapped the return key.
* Roku "Home" button is mapped to the tab key.
* Roku's * key is mapped the letter "i" (for "info").
* Either the arrow keys or "vi keys" (h,j,k,l) can be used to navigate menus.
* The "\" key will toggle the power from it's current state (either on -> off OR off -> on) while "P" means explicitly only "Power On".
* 1,2,3,4 will switch to the corresponding HDMI input
* A backtick (`) entered an under-construction "keyboard input mode" to allow sending actual letter (e.g. not commands) to a connected Roku's text edit boxes like Search

The script will loop forever waiting for keyboard input (via /terminal/inkey), a separate help screen will show the current keyboard to Roku command map like so:

```text
           ALL                      TV ONLY
back - Back
left - Backspace                down - ChannelDown
j - Down                        up - ChannelUp
enter - Enter
F - FindRemote
f - Fwd
tab - Home
i - Info                        ! - InputAV1
                                1 - InputHDMI1
                                2 - InputHDMI2
                                3 - InputHDMI3
                                4 - InputHDMI4
h - Left                        t - InputTuner
` - Lit
space - Play                    \ - Power
                                P - PowerOff
r - InstantReplay               p - PowerOn
b - Rev
l - Right
/ - Search
enter - Select
k - Up                          - - VolumeDown
                                0 - VolumeMute
                                + - VolumeUp
```
Control-C will exit the remote.

**ROKU script function…**

Here is actual code:

```routeros
# $ROKU - the missing remote for RouterOS

:global ROKU
:global debug 0

# helpers types
:global "roku-rcpmap"
:global "roku-sendkey"

# UDP port for communication with roku (set later, default is 8060)
:global "roku-active-rcpport"

# RouterOS ASCII mappings 
:global "ascii-map"
:global "ascii-name"

# main command function
:set ROKU do={
    # no keyboard events, so poll for keypresses every...
    :local loopdelay 100ms
    
    # global used variables must be defined
    :global ROKU
    :global "roku-rcpmap"
    :global "roku-sendkey"
    :global "ascii-map"
    :global "ascii-name" 
    :global "roku-active-rcpport"

    # default is port 8060
    :if ([:typeof ($"roku-active-rcpport")]!="num") do={ 
        :set "roku-active-rcpport" 8060
    }
 
   
    # we require some command after $ROKU, like help or remote...
    :if ([typeof $1]="str") do={
        # if it's a known command, like "$ROKU back", easy...
        :local cmd ($"roku-rcpmap"->$1->"cmd")
        :if ([:typeof $cmd]="str") do={
            :local sendkeyout [$"roku-sendkey" $1]
            :put "\$ROKU '$1' sent to $sendkeyout"
            :return $sendkeyout
        }
        # interactive remote use "$ROKU remote"...
        :if ($1="remote") do={
            # first, output possible commands            
            :put "\t   ALL  \t            TV ONLY"

            # & process $"roku-rcpmap" for output and
            # as a "pivot" rcpmap on keypress (e.g. lookup table for keypress to roku cmds)
            :local cmdkeymap [:toarray ""]
            :local lastcol -1
            :foreach k,v in=($"roku-rcpmap") do={ 
                :local hit ($v->"keypress")
                :local tags ($v->"tags")
                :local cmd ($v->"cmd")
                :if ($tags~"tv") do={
                    :if ($lastcol=0) do={/terminal cuu}
                    :put "\t\t\t\t$hit - $cmd"
                    :set $lastcol 1
                } else={
                    :if ($lastcol=1) do={/terminal cuu}
                    :put "$hit - $cmd"
                    :set $lastcol 0
                }
                :set ($cmdkeymap->"$hit") $cmd
            }
            # always map array keys
            :set ($cmdkeymap->"up") "Up"
            :set ($cmdkeymap->"down") "Down"
            :set ($cmdkeymap->"left") "Left"
            :set ($cmdkeymap->"right") "right"
            :put ""

            :local keyed 65535
            :local started 1
            :local keyboard 0
            :while ($started) do={ 
                :local keyname [$"ascii-name" $keyed]
         
                :if ($keyname="`") do={
                    :if ($keyboard=1) do={
                        :set keyboard 0
                        /terminal cuu
                    } else={
                        :set keyboard 1
                        :put "KEYBOARD MODE ACTIVE               "
                    }
                }
                :if ($keyboard=0 && [:typeof ($cmdkeymap->"$keyname")]="str") do={
                        :local sendkeyout [$"roku-sendkey" ($cmdkeymap->"$keyname")]
                        :put "\$ROKU $sendkeyout SENT $(($cmdkeymap->"$keyname"))"
                        :set keyed 65535
                        /terminal cuu
                } else={
                    :if ($keyboard=1 && $keyname~"^([A-z0-9]|\\.|enter|space|back)\$") do={
                        :local litkey "Lit_$keyname"
                        :if ($keyname="enter") do={:set litkey "Enter"}
                        :if ($keyname="space") do={:set litkey "Lit_%20"}
                        :if ($keyname="back") do={:set litkey "Backspace"}
                        $"roku-sendkey" $litkey
                        /terminal cuu 
                        :put "\t\t\t\t     sent $litkey      "
                    }
                }                
                :if ($keyboard=0 && $keyname~"q|Q|x|X") do={
                    :return "Quiting Roku Remote..."
                }
                :set keyed [/terminal inkey timeout=$loopdelay]
            }
            :return ""
        }
        :if ($1="help") do={
            :put "\$ROKU - the missing remote for Mikrotik"
            :put "   \$ROKU remote  -  interactive remote using vi-like key maps"
            :put "   \$ROKU set ip=<roku_ip> - set Roku IP address as a static DNS name 'roku'"
            :put "   \$ROKU <cmd>  -  issues a single Roku remote control command, specifically:"
            :foreach k,v in=($"roku-rcpmap") do={
                :local requires ""
                :if (($v->"tags")~"tv") do={
                    :set requires "(requires TV with built-in Roku)"
                }
                :put "\t\$ROKU $k \t$requires"
            }
            :return ""
        }
        :if ($1="set") do={
            :if ([:typeof [:toip $ip]]="ip") do={
                :local rokudns [/ip dns static find name="roku"]
                :if ([:len $rokudns]=1) do={
                    /ip dns static set $rokudns address=$ip
                } else={
                    /ip dns static add name=roku address=$ip type=A
                }
            }
            :if ([:typeof $port]="str") do={
                :set ($"roku-active-rcpport") [:tonum $port]
            }
            :return ""
        }
        :if ($1="print") do={
            :put "\t ip: \t $[:resolve roku]"
            :put "\t port: \t $($"roku-active-rcpport")"
            :return ""
        }
    }

    [$ROKU help]
}

:global "roku-sendkey"
:set "roku-sendkey" do={
    :global "roku-rcpmap"
    :global "roku-active-rcpport"
    :global debug
    :local rokuip [:resolve roku]
    :local rokuport ($"roku-active-rcpport")
    :if ([:typeof $rokuip]!="ip") do={
        :put "Problem! \$ROKU does a DNS lookup for 'roku'. To fix, use a static DNS entry with the IP of your Roku devices"
        :error "\$ROKU 'roku' does not resolve to an IP address.  An IP address of a Roku device is required."
    }
    :if ($1="Lit") do={:return "$rokuip:$rokuport"}
    :local rokurl "http://$rokuip:$rokuport/keypress/$1"
    :if ($debug = 1) do={
        :put "DEBUG: sending $rokurl"
    } 
    :do command={
        :local out [/tool fetch http-method=post output=none url=$rokurl as-value]
    } on-error={:put "Unsupported command."; /terminal cuu}
    :return "$rokuip:$rokuport"
}

# KV array mapping roku commands to keyboard
# (tags= is used by help to organize the grouping)
:global "roku-rcpmap" 
:set "roku-rcpmap" {
    "home"={
        cmd="Home";
        keypress="tab";
        tags={""}
    };
    "reverse"={
        cmd="Rev";
        keypress="b";
        tags={""}
    };
    "forward"={
        cmd="Fwd";
        keypress="f";
        tags={""}
    };
    "play"={
        cmd="Play";
        keypress="space";
        tags={""}
    };
    "select"={
        cmd="Select";
        keypress="enter";
        tags={""}
    };
    "left"={
        cmd="Left";
        keypress="h";
        tags={""}
    };
    "right"={
        cmd="Right";
        keypress="l";
        tags={""}
    };
    "down"={
        cmd="Down";
        keypress="j";
        tags={""}
    };
    "up"={
        cmd="Up";
        keypress="k";
        tags={""}
    };
    "back"={
        cmd="Back";
        keypress="back";
        tags={""}
    };
    "replay"={
        cmd="InstantReplay";
        keypress="r";
        tags={""}
    };
    "info"={
        cmd="Info";
        keypress="i";
        tags={""}
    };
    "backspace"={
        cmd="Backspace";
        keypress="left";
        tags={""}
    };
    "search"={
        cmd="Search";
        keypress="/";
        tags={""}
    };
    "enter"={
        cmd="Enter";
        keypress="enter";
        tags={""}
    };
    "literal"={
        cmd="Lit";
        keypress="`";
        tags={""}
    };
    "find_remote"={
        cmd="FindRemote";
        keypress="F";
        tags={"find"}
    };
    "volume_down"={
        cmd="VolumeDown";
        keypress="-";
        tags={"tv"}
    };
    "volume_up"={
        cmd="VolumeUp";
        keypress="+";
        tags={"tv"}
    };
    "volume_mute"={
        cmd="VolumeMute";
        keypress="0";
        tags={"tv"}
    };
    "channel_up"={
        cmd="ChannelUp";
        keypress="up";
        tags={"tv";"channel"}
    };
    "channel_down"={
        cmd="ChannelDown";
        keypress="down";
        tags={"tv";"channel"}
    };
    "input_tuner"={
        cmd="InputTuner";
        keypress="t";
        tags={"tv";"input"}
    };
    "input_hdmi1"={
        cmd="InputHDMI1";
        keypress="1";
        tags={"tv";"input"}
    };
    "input_hdmi2"={
        cmd="InputHDMI2";
        keypress="2";
        tags={"tv";"input"}
    };
    "input_hdmi3"={
        cmd="InputHDMI3";
        keypress="3";
        tags={"tv";"input"}
    };
    "input_hdmi4"={
        cmd="InputHDMI4";
        keypress="4";
        tags={"tv";"input"}
    };
    "input_av1"={
        cmd="InputAV1";
        keypress="!";
        tags={"tv";"input"}
    };
    "power"={
        cmd="Power";
        keypress="\\";
        tags={"tv";"power"}
    };
    "poweroff"={
        cmd="PowerOff";
        keypress="P";
        tags={"tv";"power"}
    };
    "poweron"={
        cmd="PowerOn";
        keypress="p";
        tags={"tv";"power"}
    }
}

# function, takes $1 a num result from [/terminal inkey] 
#           and maps to name a string name like "tab" or "enter"
:global "ascii-name"
:set "ascii-name" do={
    :global "ascii-map"
    :local keyname ""
    :local keyed [:tonum $1]
    :if ($keyed<255) do={
        :set keyname ($"ascii-map"->$keyed)
        #:put $keyname
    } else={
        :if ($keyed=65535) do={ :set keyname "timeout" }
        :if ($keyed=60929) do={ :set keyname "left" }
        :if ($keyed=60930) do={ :set keyname "right" }
        :if ($keyed=60931) do={ :set keyname "up" }
        :if ($keyed=60932) do={ :set keyname "down" }
    }
    :return $keyname
}

# array of str, with array index match the ascii code with value being the str name 
:global "ascii-map"
:set "ascii-map" {"";"NUL";"SOH";"STX";"ETX";"EOT";"ENQ";"ACK";"back";"back";"tab";"VT";"FF";"enter";"return";"SI";"DLE";"DC1";"DC2";"DC3";"DC4";"NAK";"SYN";"ETB";"CAN";"EM";"SUB";"ESC";"FS";"GS";"RS";"US";"space";"!";"\"";"comment";"\$";"%";"&";"";"(";")";"*";"+";",";"-";".";"/";"0";"1";"2";"3";"4";"5";"6";"7";"8";"9";":";";";"<";"=";">";"\?";"@";"A";"B";"C";"D";"E";"F";"G";"H";"I";"J";"K";"L";"M";"N";"O";"P";"Q";"R";"S";"T";"U";"V";"W";"X";"Y";"Z";"[";"\\";"]";"^";"_";"`";"a";"b";"c";"d";"e";"f";"g";"h";"i";"j";"k";"l";"m";"n";"o";"p";"q";"r";"s";"t";"u";"v";"w";"x";"y";"z";"{";"|";"}";"~";"delete";"\80";"\81";"\82";"\83";"\84";"\85";"\86";"\87";"\88";"\89";"\8A";"\8B";"\8C";"\8D";"\8E";"\8F";"\90";"\91";"\92";"\93";"\94";"\95";"\96";"\97";"\98";"\99";"\9A";"\9B";"\9C";"\9D";"\9E";"\9F";"\A0";"\A1";"\A2";"\A3";"\A4";"\A5";"\A6";"\A7";"\A8";"\A9";"\AA";"\AB";"\AC";"\AD";"\AE";"\AF";"\B0";"\B1";"\B2";"\B3";"\B4";"\B5";"\B6";"\B7";"\B8";"\B9";"\BA";"\BB";"\BC";"\BD";"\BE";"\BF";"\C0";"\C1";"\C2";"\C3";"\C4";"\C5";"\C6";"\C7";"\C8";"\C9";"\CA";"\CB";"\CC";"\CD";"\CE";"\CF";"\D0";"\D1";"\D2";"\D3";"\D4";"\D5";"\D6";"\D7";"\D8";"\D9";"\DA";"\DB";"\DC";"\DD";"\DE";"\DF";"\E0";"\E1";"\E2";"\E3";"\E4";"\E5";"\E6";"\E7";"\E8";"\E9";"\EA";"\EB";"\EC";"\ED";"\EE";"\EF";"\F0";"\F1";"\F2";"\F3";"\F4";"\F5";"\F6";"\F7";"\F8";"\F9";"\FA";"\FB";"\FC";"\FD";"\FE";"\FF"}
```

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/3](https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/3)
- Created: `2024-03-15T02:32:09.000Z`
- Likes on this post: 0

I still use it, so it works.  LMK if you run into trouble.

You need to either add static DNS for "roku" or use the following to set the Roku's IP address to control:
$ROKU set ip=192.168.88.249

If you run "$ROKU remote", it uses the VI-keys to navigate menus .  When in the remote, typing backtick ` puts you into "keyboard mode" to type actual keys for stuff like Search (and ` will get you out of "keyboard mode" back to command mode where the keys navigate).

I know the "help screen" could be cleaner, I kinda know what the keys do since I pick them :wink:

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/4](https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/4)
- Created: `2024-03-15T15:41:45.000Z`
- Likes on this post: 0

It works with anything that runs "Roku OS", a lot of TV have Roku built-in but the Roku sticks would also work.  But it's not a universal remote :wink:

Since it uses IP directly to the TV, it does not actually involve the remote control.  It uses a REST API on the TV to send the commands.  So on RouterOS side, it uses /tool/fetch and it's  /terminal/in-key makes it "interactive" wait for keypress, with some arrays doing lookups on what to do when a keypresses.  With the status line bring updated using :put then /terminal/cuu.

The underlying approach could work for potentially more useful things – like creating more "interactive" UI over VLAN bridge.  Instead, I occasionally make CLI remote controls, and more recently a "piano" (which is a fun one, if you're router's :beep does something at CLI): http://forum.mikrotik.com/t/piano-interactive-player-piano-studio-quality-recorder-using-beep/173756/1

I have a few Roku's and used a Python script for years that did similar CLI control of the TV.  But the python script didn't support "VI" like keys & writing anything in RouterOS script is kinda fun programming challenge.

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/5](https://forum.mikrotik.com/t/roku-the-missing-roku-tv-remote-for-routeros/160882/5)
- Created: `2025-01-12T18:18:05.000Z`
- Likes on this post: 0

I don't know if there any other users of my $ROKU script, but in the latest RokuOS update [some permissions have changed](https://community.roku.com/t5/Wi-Fi-connectivity/No-more-ECP-or-how-to-loses-customers-in-a-single-update/td-p/1033350) that will break the script .  Specifically "ECP" which is the web service used to control the TV via HTTP over the LAN.

So to keep using the script, you must enable on the Roku TV, by going to Settings from the Home Screen.  Then navigate the menus...
- Settings >
- System >
- Advanced system settings >
- Control by mobile apps

Then select:
- "Network access"
- Changed from "(Limited)" to either
- "Permissive" (only same subnet src-addresses are accepted) ... OR
- "Enabled" (all private IP src-addresses accepted)...

Roku will prompt you with to "Yes, allow", which will allow the ECP web service to accept unauthenticated requests from the LAN.

_And to clarify the security change... ECP really only allows stuff like changing volumes/channel/sources/etc – ECP does not have access to apps you're running or your account.  ECP is kinda one-way, you send remote control commands, so there is no real responses other than accepted from the ECP API.  See https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md for more details on the ECP protocol.\

And...If you look at the script, you'll note it sends text commands that mimic what's on the remote...  i.e. enabling ECP (and thus the RouterOS CLI remote control) might allow an attacker on LAN to change the TV volume/etc on you, but not purchase things or see other private data.  So perhaps someones kids (or some adult messing with their kids) might figure out the web services offered by a home TV to do stuff like change the input at some critical juncture in a game, but that the risk profile here..._
