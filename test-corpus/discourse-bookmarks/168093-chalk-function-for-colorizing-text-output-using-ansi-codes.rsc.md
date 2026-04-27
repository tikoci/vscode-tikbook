[//]: #!tikbook discourse-bookmark topic=168093

# $CHALK - function for colorizing text output using ANSI codes

- Source thread: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/1](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 9 total (topic bookmark)
- Posts included: 5
- First bookmarked: `2025-06-16 20:34:01 UTC`
- Last bookmarked: `2025-06-16 20:34:01 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/1](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/1)
- Created: `2023-07-16T21:13:44.000Z`
- Likes on this post: 0

I'd previous used the "/terminal style" commands to add colorized output from a script.  The alternative method is encoding ANSI control codes into a string, so wrote a function that "wraps" some text with the needed escape to set text and background colors.  The code is loosely based on a JavaScript/node project called "chalk.js", see https://github.com/chalk/chalk - although this code  only deals with 8-bit colors (e.g. no RGB codes).

The $CHALK function can be used **inline/interpolation** to add a <color> to text in a string like so:

```routeros
:put "$[$CHALK blue]hello world$[$CHALK no-style]"
```
Note: The colors need to be cleared to avoid the terminal using the last color set, this is done via "$CHALK no-style" which is included in-line above.

**Or,** If **<text>** is provided as the _2nd argument_ to $CHALK function, it will be output via a :put in one-line.

```routeros
$CHALK red "hello world" bold=yes inverse=yes
```
Another use case is using **debug=yes** as an option $CHALK, this will output the ANSI escape code _formatted for use in a Mikrotik script_ – e.g. you can use $CHALK to make an ANSI string WITHOUT having CHALK function load "at runtime".

```routeros
[amm0@Mikrotik] /> $CHALK red debug=yes

\1B[31;49m

[amm0@Mikrotik] /> $CHALK no-style debug=yes

\1B[39;49m

[amm0@Mikrotik] /> :put "\1B[31;49mcut-and-pasted-codes\1B[39;49m"
cut-and-pasted-codes   # (in bold red)
```
The available color are available using "**$CHALK colors**":

![](https://i.ibb.co/6vYBZkX/Screenshot-2023-07-16-at-2-01-00-PM.png)

As a bonus, there a "url" option that will generate a **"clickable" URL** in a modern terminal:

```routeros
     $CHALK url "http://example.com" text="Example Link"
```
_Note: this does NOT work in the RouterOS terminal form winbox/webfig – however if you access the router using a SSH client, it create a clickable link with the URL in a Mac/Linux/WSL terminal._

![](https://i.ibb.co/QXXRpq3/Screenshot-2023-07-16-at-2-11-50-PM.png)

To see some examples, you can use "$CHALK help"...

The actual code for the $CHALK function that will be have to add to the RouterOS, either by cut-and-paste to test, or via /system/script or /system/scheduler so it's always loaded:

:global CHALK do={
    # we may call ourselves for control codes, so declare that
    :global CHALK
    :local helptext "\
    \r\n \$CHALK
    \r\n  generates ANSI codes that can be used in a string to add colorized text\
    \r\n \
    \r\n Basic Syntax:\
    \r\n     \$CHALK <text-color> [<text>] [inverse=yes] [[bold=yes]|[dim=yes]]\
    \r\n \
    \r\n Alternatively, use set background (bg=) color, instead of inverse=yes:\
    \r\n     \$CHALK <text-color> [<text>] bg=<text-color> [[bold=yes]|[dim=yes]]\
    \r\n \
    \r\n View possible values of <text-color>:\
    \r\n     \$CHALK colors\
    \r\n \
    \r\n Clear all ANSI formatting:\
    \r\n     \$CHALK reset\
    \r\n \
    \r\n Clear only foreground and background colors:\
    \r\n     \$CHALK no-style\
    \r\n \
    \r\n Generate a \"clickable\" URL (in select terminals only):\
    \r\n     \$CHALK url \"http://example.com\" text=\"Example Link\"\
    \r\n \
    \r\n To see this page, use:\
    \r\n     \$CHALK help\
    \r\n \
    \r\n Example: \
    \r\n     Print (\"put\") some text in cyan -\
    \r\n         \$CHALK cyan \"hello world\" \
    \r\n \
    \r\n     Output blue text inside a string -\
    \r\n         :put \"\$[\$CHALK blue]hello world\$[\$CHALK no-style]\"\
    \r\n \
    \r\n     Shout bold text with background color (using inverse=yes) -\
    \r\n         :put \"\$[\$CHALK red inverse=yes bold=yes]HELLO WORLD\$[\$CHALK no-style]\"\
    \r\n \
    \r\n     Create a click-able URL -\
    \r\n         :put \"\$[\$CHALK url \"http://www.mikrotik.com\" text=\"Go to Mikrotik Website\"]\" \
    \r\n             ** only works when connected via SSH & using \"modern\" terminal\
    \r\n \
    \r\n     Show example colors -\
    \r\n         \$CHALK colors \
    \r\n "    
    
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
            "gray"={90;100};
            "grey"={90;100};
            "bright-red"={91;101};
            "bright-green"={92;103};
            "bright-yellow"={93;104};
            "bright-blue"={94;104};
            "bright-magenta"={95;105};
            "bright-cyan"={96;106};
            "bright-white"={97;107}
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
            } else={$CHALK colors}
        } else={$CHALK colors}
    }
    :if ($1 = "colors") do={
        :put "\t <color>\t\t $[$CHALK no-style inverse=yes]inverse=yes$[$CHALK reset]\t\t $[$CHALK no-style bold=yes]bold=yes$[$CHALK reset]\t\t $[$CHALK no-style dim=yes]dim=yes$[$CHALK reset]"
        :foreach k,v in=[$lookupcolor8 as-array] do={
            :local ntabs "\t"
            :if ([:len $k] <  8 ) do={
                :set ntabs "\t\t"
            } 
            :put "\t$[$CHALK $k]$k$[$CHALK reset]$ntabs$[$CHALK $k inverse=yes]\t$k$[$CHALK reset]\t$[$CHALK $k bold=yes]$ntabs$k$[$CHALK reset]\t$[$CHALK $k dim=yes]$ntabs$k$[$CHALK reset]"

       } 
       :return [:nothing]
    }

    :if ($1 = "help") do={
        :put $helptext
        :return [:nothing]
    }

    # handle clickable URLs
    :if ($1 = "url") do={
        :local lurl "http://example.com"
        :if ([:typeof $2]="str") do={
            :set lurl $2
        } else={
            :if ([:typeof $url]="str") do={
                :set lurl $url
            } 
        }
        :local ltxt $lurl
        :if ([:typeof $text]="str") do={
            :set ltxt $text
        }
        :return "\1B]8;;$lurl\07$ltxt\1B]8;;\07" 
    }

    # set default colors
    :local c8str {mod="";fg="$([$lookupcolor8 no-style]->0)";bg="$([$lookupcolor8 no-style]->1)"}
    
    # if the color name is the 1st arg, make the the foreground color
    :if ([:typeof [$lookupcolor8 $1]] = "array") do={
        :set ($c8str->"fg") ([$lookupcolor8 $1]->0) 
    } 

    # set default colors
    
    # set the modifier...
    # hidden= 
    :if ($hidden="yes") do={
        :set ($c8str->"mod") "8;"
    } else={
        # inverse= 
        :if ($inverse="yes") do={
            :set ($c8str->"mod") "7;"
        } 
        # bold=
        :if ($bold="yes") do={
            :set ($c8str->"mod") "$($c8str->"mod")1;"
            # set both bold=yes and light=yes? bold wins...
        } else={
            # dim=
            :if ($dim="yes") do={
                :set ($c8str->"mod") "$($c8str->"mod")2;"
            }
        }        
    }

    # if bg= set, apply color  
    :if ([:typeof $bg]="str") do={
        :if ([:typeof [$lookupcolor8 $bg]] = "array") do={
            :set ($c8str->"bg") ([$lookupcolor8 $bg]->1)
        } else={:error "bg=$bg is not a valid color"}
    }
    
    # build the output
    :local rv "\1B[$($c8str->"mod")$($c8str->"fg");$($c8str->"bg")m"

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
        :return [:put "$rv$2$[$CHALK reset]"]
    }

    :return $rv
}
_The following GitHub gist was used as reference for the ANSI codes used here:  https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797_

TODO
- support "cls" and/or"clear-screen" to wipe screen
- reset should be just ]0m not ]0,49m
- debug=yes does not work with URL nor includes text if there was text provided
- add RGB support if an 3 element array is provided {R;G;B} as a color name
- should support ascii name for control codes (e.g. $CHALK esc or $CHALK bel)
- incorporate some "color prefix code" like + - etc to avoid needing inverse= dim=
- help should use $0 instead of assuming name is CHALK

edit 1/2: updated TODOs

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/3](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/3)
- Created: `2023-07-19T05:34:53.000Z`
- Likes on this post: 0

That's a philosophical question.  Several ways actually, same as scripts.

Likely easiest is to use winbox to create a new System>Schedule...using "Start Time" as "startup" and interval 00:00:00...then cut-and-paste the $CHALK code above as the script.  After reboot, the $CHALK should be loaded in terminal.

The alternative approach to loading function is save them as a file on the router, then just using ":import /flash/chalk.rsc"* to load only when needed in a script. (*assuming you save the code above to a file called chalk.rsc).  You can also do same using /system/script to add a new script with same $CHALK code, then use "/system/script/run chalk" to load it say at the start of another script that used $CHALK.

Regardless of how you load it, in all case If you use it another function....you need to declare it using just ":global CHALK" e.g.

```routeros
{
    :local myprint do={
       :global CHALK
       :put "$[$CHALK yellow]Hello $[$CHALK yellow inverse=yes]Kentzo$[$CHALK reset]"
   }
   
   $myprint
}
```
If you use the debug=yes in the command you just DIRECTLY use the generated ANSI code in your own strings.  See description about debug=yes in original post above.  So you load it only to generate the codes, so it does not be load if you just cut-and-pasted the ANSI from it :wink:

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/5](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/5)
- Created: `2023-07-19T06:00:56.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Yeah you have to declare a global variable (function) inside another function.  The "tips-and-tricks" linked from the script help page has some good tips, including this one about declaring use of a global variable in a different block/function:
https://wiki.mikrotik.com/wiki/Manual:Scripting_Tips_and_Tricks#Read_value_of_global_variable_defined_in_other_script

_I mention the "rule" about declaring globals since the function not being loaded looks identical to it not be declared – the function gets skipped just the same in both case. :wink:_

> Quoted forum context omitted.

:import just executes a file, it does not actually care if it's not "config code".  The :import also has a verbose=yes option that will output the script as it's being interpreted... so useful to "debug" scripts, e.g. it will stop on a failing line – not quite a debugger but better than nothing.

[//]: #.

## Post 7

- Original post: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/7](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/7)
- Created: `2023-07-19T13:21:30.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Criticism is how things improve. :slight_smile:

I only disagree with making the background a "positional parameter".  It's actually not all the useful since inverse=yes will set the background as the color, the foreground is something reasonable.  So kinda why it's an optional, but short, "bg=" for background color since in most cases "inverse=yes" be a better plan.

> Quoted forum context omitted.

I ain't picky on names ... initially concerned with the logic working right :wink:.  But anyone can rename the global when scheduling/sys script/import...  Now, I added TODO that help strings should use $0 instead a static CHALK so they'd refer the assigned variable name.

I think using it just to generate the code once is likely best plan –  cut-and-paste the real ANSI code into a string but use CHALK (or CS) to help build them initially... e.g. the debug=yes option - which might be better named too.

> Quoted forum context omitted.

I liked the **+ - !** modifiers – that's a good one – including the logic that they cancel each other out.  Perhaps "!" be logical inverse=yes...  Perhaps * for bold since that what markdown/etc use.  Let me mull on this one.

On the short color names... As you can see, I just do a lookup in array by index since it simple...  But similar to the CS name, changing color name key in the array to the shorter ones change black to bk be an easy "user mod".  Or, just adding the "short colors" as additional values be another hack (I do this with gray, which is bright-black).

Tricky balance on how much command parsing to do... I thought about do some partial matching already so "ye","yel","yell" all meaning "yellow", like RouterOS CLI does – but just more code when the array can be adjusted to use whatever desired names to ANSI code mapping.

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/9](https://forum.mikrotik.com/t/chalk-function-for-colorizing-text-output-using-ansi-codes/168093/9)
- Created: `2023-07-19T15:17:05.000Z`
- Likes on this post: 0

Let me mull here.  I actually have real work to do.

Good point, there is a standard for 2 letter color codes, IEC 60062:2016:  https://en.wikipedia.org/wiki/Electronic_color_code
But yeah I didn't support partial matches since it wasn't all that useful :wink:.

There is ANSI encoding for RGB, so some color name to RGB might be fun. I'll probably add a different/seperate function to lookup more "advanced" color names, likely using the X11 color spec.   e.g. you want "[cornflower blue](https://www.youtube.com/watch?v=OUoKrdB9BjU)", no problem  :wink:
