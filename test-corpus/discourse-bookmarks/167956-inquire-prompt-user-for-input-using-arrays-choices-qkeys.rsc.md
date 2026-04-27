[//]: #!tikbook discourse-bookmark topic=167956

# $INQUIRE - prompt user for input using arrays +$CHOICES +$QKEYS

- Source thread: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 29 total (29 post bookmark(s))
- Posts included: 14
- First bookmarked: `2025-06-16 20:31:32 UTC`
- Last bookmarked: `2025-06-16 20:31:32 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/1)
- Created: `2023-07-10T21:51:14.000Z`
- Likes on this post: 0

There is a node.js/JavaScript project called "inquirer.js" that takes some JSON with some "questions"/"prompts", and returns the calling JavaScript an JS object with all the answers.  It's pretty handy for getting user input from the terminal.  See https://github.com/SBoudrias/Inquirer.js.

So my $INQUIRE function is poor-man port of Inquirer.JS for RouterOS script.  The RSC $INQUIRE function code uses the nifty "inline function" syntax e.g. the "op type" (>[]) to emulate JavaScripts callbacks (see http://forum.mikrotik.com/t/persistent-environment-variables/145326/1)

To use the $INQUIRE function, you can create an "array-of-arrays" with the questions.  Specifically the outer array is just a list of questions, with each element being an associative array with some value $INQUIRE uses to build/validate/return the prompts.

For example, if you define $myquestions like so...
:global myquestions { 
    {   text="What is your name?"; 
        defval="";
        validate="str" 
        min=0;
        max=16;
        key="name"
    };
    {   text="What is your favorite number?"; 
        defval="42"; 
        validate="num";
        min=0;
        max=100;
        key="favnum"
    };
    {   text="Pick a random IPv4 address..."; 
        defval="$[:rndnum from=1 to=254].$[:rndnum from=0 to=255].$[:rndnum from=0 to=255].$[:rndnum from=0 to=255]"; 
        validate="ip"
        key="rndip"
    }
}
Assuming the $INQUIRE function and $myquestions are loaded, it works like this...

![](https://i.imgur.com/b2KgcL0.gif)

$INQUIRE can also take "callback function" to pretty print response and skip array output with "as-value"...

```routeros
$INQUIRE $myquestions (>[:put "$($1->"name")'s favorite number is $($1->"favnum")"]) as-value
```
Or using the same $myquestions from above, it can be stored as an array for later use:

```routeros
:global myanswers [$INQUIRE $myquestions as-value]
:put ($myanswers->"name")
```
More complex example... Here we ask the user to confirm (or change) the RouterOS "system identity".   As shown below, the questions themselves can be provided directly on the function.
This one shows the use of an "action=" that get called after each question (if defined), with $0 being the "answer" given.  Also the "validator=" is an "inline function" here, so any "custom validator" can be used, if "true" is returns it mean input was okay, otherwise a string error can be returned (which is displayed to the user & user is re-prompted the same question until input is valid).

```routeros
$INQUIRE ({
    {   text="Router name:"; 
        defval=(>[:return "$[/system/identity/get name]"]); 
        validate=(>[:if ([:tostr $0] ~ "^[a-zA-Z0-9_\\-]*\$" ) do={:return true} else={:return "invalid name"}]);
        action=(>[/system/identity/set name=$0]);
        key="sysid"
    }}) (>[:put "New system name is: $($1->"sysid")"]) as-value
```
It's important to understand that action=, defval= and validate= are "inline functions" (>[]) which are called *dynamically* during user prompting.  So the default value is obtained each time $INQUIRE is called, not just when the "questions array" is defined.

Anyway, enough examples.  The needed code below can be loaded by cut-and-paste initially, or via /system/script.  Once loaded, you can use $INQUIRE to invoke with an array defined like the "myquestions" above...

# $INQUIRE - prompt for values using array with questions
# usage:
#    $INQUIRE <question_array> [<callback_function>] [as-value]
# returns:  associative array with key= as the index, and answer as value 
# param - <question_array>: index array, containing one or more associative arrays e.g. { 
#    {   text=<str>;    #question to ask
#        [key=<str>];   #key in returned $answer
#        [defval=<str|num|op|function>];   #default value, default is ""
#        [action=<op|function>];           #function to call after validated input
#        [validate=<op|function|"str"|"num"|"ip">];  #perform validation
#        [min=<num>]; #min num or string length
#        [max=<num>]  #max num or string length
#    }
# }
# param - <callback_function>: called after ALL questions have been asked 
#                              with $1 arg to function containing all answers/same as return
# param - as-value: if not provided, the answers will be output in as an array string
:global INQUIRE do={
    # store questions/prompts as $qr
    :local qr $1

    # variable to store answers to return
    :local answers [:toarray ""]
    
    # use array to map "ASCII code" (e.g. num type) to a "char" (e.g. str type of len=1)
    :local "asciimap" {
        "\00";"\01";"\02";"\03";"\04";"\05";"\06";"\07";"\08";"\09";"\0A";"\0B";"\0C";"\0D";"\0E";"\0F";
        "\10";"\11";"\12";"\13";"\14";"\15";"\16";"\17";"\18";"\19";"\1A";"\1B";"\1C";"\1D";"\1E";"\1F";
        "\20";"\21";"\22";"\23";"\24";"\25";"\26";"\27";"\28";"\29";"\2A";"\2B";"\2C";"\2D";"\2E";"\2F";
        "\30";"\31";"\32";"\33";"\34";"\35";"\36";"\37";"\38";"\39";"\3A";"\3B";"\3C";"\3D";"\3E";"\3F";
        "\40";"\41";"\42";"\43";"\44";"\45";"\46";"\47";"\48";"\49";"\4A";"\4B";"\4C";"\4D";"\4E";"\4F";
        "\50";"\51";"\52";"\53";"\54";"\55";"\56";"\57";"\58";"\59";"\5A";"\5B";"\5C";"\5D";"\5E";"\5F";
        "\60";"\61";"\62";"\63";"\64";"\65";"\66";"\67";"\68";"\69";"\6A";"\6B";"\6C";"\6D";"\6E";"\6F";
        "\70";"\71";"\72";"\73";"\74";"\75";"\76";"\77";"\78";"\79";"\7A";"\7B";"\7C";"\7D";"\7E";"\7F";
        "\80";"\81";"\82";"\83";"\84";"\85";"\86";"\87";"\88";"\89";"\8A";"\8B";"\8C";"\8D";"\8E";"\8F";
        "\90";"\91";"\92";"\93";"\94";"\95";"\96";"\97";"\98";"\99";"\9A";"\9B";"\9C";"\9D";"\9E";"\9F";
        "\A0";"\A1";"\A2";"\A3";"\A4";"\A5";"\A6";"\A7";"\A8";"\A9";"\AA";"\AB";"\AC";"\AD";"\AE";"\AF";
        "\B0";"\B1";"\B2";"\B3";"\B4";"\B5";"\B6";"\B7";"\B8";"\B9";"\BA";"\BB";"\BC";"\BD";"\BE";"\BF";
        "\C0";"\C1";"\C2";"\C3";"\C4";"\C5";"\C6";"\C7";"\C8";"\C9";"\CA";"\CB";"\CC";"\CD";"\CE";"\CF";
        "\D0";"\D1";"\D2";"\D3";"\D4";"\D5";"\D6";"\D7";"\D8";"\D9";"\DA";"\DB";"\DC";"\DD";"\DE";"\DF";
        "\E0";"\E1";"\E2";"\E3";"\E4";"\E5";"\E6";"\E7";"\E8";"\E9";"\EA";"\EB";"\EC";"\ED";"\EE";"\EF";
        "\F0";"\F1";"\F2";"\F3";"\F4";"\F5";"\F6";"\F7";"\F8";"\F9";"\FA";"\FB";"\FC";"\FD";"\FE";"\FF"
    }

    # some ANSI tricks are used in output to format input and errors
    :local "ansi-bright-blue" "\1B[94m"
    :local "ansi-reset" "\1B[0m"
    :local "ansi-dim-start" "\1B[2m"
    :local "ansi-dim-end" "\1B[22m"
    :local "ansi-clear-to-end" "\1B[0K"

    # main loop - ask each question provided in the $1/$qr array
    :for iq from=0 to=([:len $qr]-1) do={
        # define the current answer and use "defval" to populate
        :local ans ($qr->$iq->"defval")
        # if "defval" is inline function, call it to get default value
        :if ([:typeof $ans] ~ "op|array") do={
            :set ans [$ans ($qr->$iq)]
        }
        # ask the question, using an default in $ans
        :put "  $($qr->$iq->"text") $($"ansi-bright-blue") $ans $($"ansi-reset") "
        # last char code received
        :local kin 0
        # keep looking for input from terminal while $inputmode = true
        :local inputmode true
        :while ($inputmode) do={
            # re-use same terminal line
            /terminal cuu
            # get keyboard input, one char
            :set kin [/terminal/inkey]
            # if NOT enter/return key, add char to the current answer in $ans
            :if ($kin != 0x0D) do={
                # use ascii map to convert num to str/"char"
                :set ans "$ans$($asciimap->$kin)"
            } else={
                # got enter/return, stop input
                :set inputmode false
            }
            # if backspace/delete, remove the control code & last char
            :if ($kin = 0x08 || $kin =0x7F) do={
                :set ans [:pick $ans 0 ([:len $ans]-2)]
            }
            # assume input is valud
            :local isvalid true
            :local errortext ""
            # unless validate= is defined...
            # if validate=(>[]) is inline function
            :if ([:typeof ($qr->$iq->"validate")] ~ "op|array") do={
                # call question's validator function
                :set isvalid [($qr->$iq->"validate") $ans]
            }
            # if validate="num", make sure it a num type
            :if (($qr->$iq->"validate") = "num") do={
                # see if casting to num is num
                :if ([:typeof [:tonum $ans]] = "num") do={
                    # store as num type
                    :set ans [:tonum $ans] 
                    # valid so far
                    :set isvalid true
                    # if a min= is defined, check it
                    :if ([:typeof ($qr->$iq->"min")] = "num") do={
                        :if ($ans>($qr->$iq->"min")) do={
                            :set isvalid true
                        } else={
                            :set isvalid "too small, must be > $($qr->$iq->"min") "
                        }
                    }
                    # if a max= is defined, check it
                    :if ([:typeof ($qr->$iq->"max")] = "num") do={
                        # if already invalid, use that text first e.g. too small
                        :if ($isvalid = true) do={
                            :if ($ans<($qr->$iq->"max") && isvalid = true) do={
                                :set isvalid true
                            } else={
                                :set isvalid "too big, must be < $($qr->$iq->"max") "
                            }
                        }
                    }
                } else={
                    :set isvalid "must be a number"
                }
            }
            # if there is min= or max= but no validate=, assume validate str lengths
            :if ([:typeof ($qr->$iq->"validate")] ~ "nil|nothing") do={
               :if (([:typeof ($qr->$iq->"min")] = "num") || ([:typeof ($qr->$iq->"max")] = "num")) do={
                  :set ($qr->$iq->"validate") "str"
               }
            }
            # if validate="str", make sure it's a str type
            :if (($qr->$iq->"validate") = "str") do={
                :if ([:typeof [:tostr $ans]] = "str") do={
                    # save answer as str 
                    :set ans [:tostr $ans] 
                    :set isvalid true
                    # if min=, check length in range
                    :if ([:typeof ($qr->$iq->"min")] = "num") do={
                        :if ([:len $ans]>($qr->$iq->"min")) do={
                            :set isvalid true
                        } else={
                            :set isvalid "too short, must be > $($qr->$iq->"min") "
                        }
                    }
                    # if max=, check length in range
                    :if ([:typeof ($qr->$iq->"max")] = "num") do={
                        :if ($isvalid = true) do={
                            :if ([:len $ans]<($qr->$iq->"max")) do={
                                :set isvalid true
                            } else={
                                :set isvalid "too long, must be < $($qr->$iq->"max") "
                            }
                        }
                    }
                } else={
                    :set isvalid "must be a string"
                }
            }
            # if validate="ip", make sure it valid IP address
            # note: IPv6 is not supported
            :if (($qr->$iq->"validate") = "ip") do={
                # make sure it's num.num.num.num BEFORE using :toip to avoid .0 being appended
                :if ($ans ~ "^[0-9]+[\\.][0-9]+[\\.][0-9]+[\\.][0-9]+\$") do={
                    # then check it parsable using :toip
                    :if ([:typeof [:toip $ans]] = "ip") do={
                        :set ans [:toip $ans] 
                        :set isvalid true
                    } else={
                        :set isvalid "IP address not valid"
                    }
                } else={
                        :set isvalid "bad IP address format, must be x.y.z.a"
                }
            }
            # if answer is valid, store it in the $answers array
            :if ($isvalid = true) do={
                # if a key="mykeyname" is used, that becomes the key in array map
                :if ([:typeof ($qr->$iq->"key")] = "str") do={
                    :set ($answers->"$($qr->$iq->"key")") $ans
                } else={
                    # otherwise the key in returned array map is "promptN" where N is index
                    :set ($answers->"prompt$iq") $ans 
                }
                :set errortext ""
            } else={
                # if no valid... report the error, and continue input mode
                :set errortext $isvalid
                :set inputmode true
            }
            # finally output the question, using ANSI formatting
            :put "  $($qr->$iq->"text") $($"ansi-bright-blue") $ans $($"ansi-reset") $($"ansi-dim-start") $errortext $($"ansi-dim-end") $($"ansi-clear-to-end")"
            # if action= is defined & validated - call the action
            :if ($kin = 0x0D && isvalid = true) do={
                :if ([:typeof ($qr->$iq->"action")] ~ "op|array") do={
                    [($qr->$iq->"action") $ans]
                }
            }
        }
    }
    # end of questions

    # if 2nd arg is a function or "op" (e.g. inline function), call that with the $answers
    :if ([:typeof $2] ~ "op|array") do={
        [$2 $answers]        
    }
    # if 2nd or 3rd arg is "as-value", do not print the results to terminal
    :if (($2 = "as-value") || ($3 = "as-value")) do={
        :return $answers
    } else={
        :put $answers
        :return $answers
    }
}
I was more trying to play around with the inline functions $(>[]), so maybe bugs...  But comment below anyone uses this and has issues.

Known Issues
- using "arrow keys" to move inline does NOT work
- ideally there be some "choice" type like the original Inquirer.JS code
- no support for IPv6 or "bool" types
- cursor shows on line below, although edit happens on line above

TODO's
- rename defval= to just val= to match $CHOICE array
- if validate/defval/action/when are fns, provide $answers and $questions as args
- add "type=" e.g. support non-text inputs like $CHOICE
- validate based type= automatically to avoid needing validate=
- add new "when=<function>|<bool>", default true but if false question skips question
- add type="choice" as type & add "choices=" as optional
- type=choice should support a "multiselect=yes" to allow multiple val= as array in answers
- keyboard shortcuts for type=choices
- add type=ipprefix
- add type=ip6
- add type=confirm + confirm=yesno|bool|num for a simple yes/no
- add type=password to mask password input
- add type=seperator to insert blank or text= (from inquirer.js)
- support a type="goto" and goto=<num-index>|<str=key> e.g. with when= also for a conditional jump

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/4](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/4)
- Created: `2023-07-11T14:55:59.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

The "do=[:return]" trick to collect input works ... just hated the ugly "value:[]" prompt it uses – but yeah it's dozens of lines of script to avoid that :wink:.  But the instant feedback on bad input is pretty nifty, I thought at least.

In fairness, 90% of the code is dealing with types and validation.  And nothing with script var types is easy.

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/12](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/12)
- Created: `2023-07-13T12:57:31.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

The (>[]) is undocumented, so always a risk.  While it provides some handy shortcut to define a function inline, it be easy to use the "normal" way like _set ($myquestion->0->"validate") do={}_ – just not as clean as doing in a single array definition.  Now... (>[]) use as a "inline function" as an argument to another function call is kinda handy – otherwise you'd have to define the function in another line.

My guess is it's artifact of their parser – op_erators_ like greater-than > are still functions internally but take input from the _left_ side – most function take the argument from the right side of fn name...but since left side is nil/nothing/null, it _somehow_ causes compare operator to "escape" (and returned).  My bet is they have a lot of bugs to fix outside of mucking with the bowls of their script interpreter code, so likely "safe".

[//]: #.

## Post 13

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/13](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/13)
- Created: `2023-07-13T13:44:05.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Great work.  Nice sound effects... now if only [:beep] worked using the terminal.  I should fixup up the cursor position & borrow some of your  validation.  (Although theoretically UTF-8 input passthrough if terminal supported it - why it's not limited to lower ASCII)

But part of what I was going for is simplicity to get one question, so

```routeros
:local iname [$INQUIRE ({{text="name?"}}) as-value]
```
works in a larger script to get some input.

[//]: #.

## Post 14

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/14](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/14)
- Created: `2023-07-17T15:00:03.000Z`
- Likes on this post: 0

One of the feature of the original JS library was a "choice" question type, essentially the equivalent of a "radio selector" in windows.   But to show a menu is kinda different that collecting input, I wrote a seperate function to do it.  I don't have time to merge it with the $INQUIRE right now – e.g. so the questions array can use a type="choice" and choices={"one";"two"}.  But posting the code both so I don't forget & might be useful independent of $INQUIRE function anyway.

The $CHOICES function takes an array as 1st argument, and presents that as a selectable list in the terminal.  Then, one of the items can be selected by moving around the UP/DOWN arrow keys.  A value is selected by hitting enter/return on the selected (shown in reversed text).  The selected item's string (or val=, see below) is the return as the value of the function. e.g.

```routeros
:put [$CHOICES ({"Dog"; "Cat"; "Snake"; "Pig"; "Horse"; "Bird"; "Llama"})]

          Dog      
          Cat      
          Snake            
          **Pig**      
          Horse            
          Bird             
          Llama            
Pig
```
The provided array list can populated with "str" or contain inner associative array with val=, text=, and help= attributes.  If just a string is used, the return value and what's displayed are the same.  However, when an associative array, text= is what's displayed on the terminal in list, while val= is what will be returned by the function.  With a help= that shows some string next to the selectable item e.g. in dimmed text, like a "tooltip"

```routeros
:put [$CHOICES ({{val="yes";text="Yes";help="go ahead"};{val="no";text="No";help="skip it"}})]
```
The return value can be stored in a variable to use in other script code:

```routeros
{
    :local d40 [$CHOICES ({{val="Yup"};{text="Nope"}})]
    :put "$d40 - good choice!"
}
```
_Note: As shown above, the input array with the "choices" for $CHOICES, will try "fix up" empty values... So if you set just text=, that's what will be returned if selected even without a val=.  Similar with only a val=, that becomes the text=._

![](https://i.ibb.co/M16ZQ7n/Screenshot-2023-07-17-at-7-56-03-AM.png)

Eventually, I'll update $INQUIRE to use it.  But here is the $CHOICES function as a standalone function:

:global CHOICES do={
    # :global CHALK
    :local lchoices $1
    :local isel 0
    :if ([:len $lchoices]>0) do={:set isel 0} else={:error "error - no choices"}
    :for uchoice from=0 to=([:len $lchoices]-1) do={
        # convert string list to array
        :if ([:typeof ($lchoices->$uchoice)]="str") do={
            :set ($lchoices->$uchoice) {val=($lchoices->$uchoice);text=($lchoices->$uchoice)} 
        }
        # if array, regularize it
        :if ([:typeof ($lchoices->$uchoice)]="array") do={
            :if ([:typeof ($lchoices->$uchoice->"val")]~"str|num") do={
                :if (([:typeof ($lchoices->$uchoice->"text")]~"str|num")) do={
                    # both text= and val=
                } else={
                    # val= but NO text=
                    :set ($lchoices->$uchoice->"text") ($lchoices->$uchoice->"val") 
                }
            } else={
                # NO val=
                :if (([:typeof ($lchoices->$uchoice->"text")]~"str|num")) do={
                    # use text= as val=
                    :set ($lchoices->$uchoice->"val") ($lchoices->$uchoice->"text") 
                } else={
                    #invalid
                    :set ($lchoices->$uchoice) {val="invalid$uchoice";text="$[:tostr ($lchoices->$uchoice)] [invalid$uchoice]"}  
                }
            }
        } else={
            # neither string nor array
            :set ($lchoices->$uchoice) {val="invalid$uchoice";text="$[:tostr ($lchoices->$uchoice)] [invalid$uchoice]"}  
        }
    }
    :if ([:typeof $selected] = "str") do={
       :set isel [:find $lchoicesnames ] 
    }
    :local lkey 0
    :local bsel ""
    :while ($lkey != 13) do={
        :if ($lkey != 0) do={:for icuu from=0 to=([:len $lchoices]-1) do={/terminal/cuu}}
        :for ichoice from=0 to=([:len $lchoices]-1) do={
            # avoid CHALK dependency             
            #:if ($isel = $ichoice) do={:set bsel "yes"} else={:set bsel "no"}
            #:put "\t$[$CHALK blue inverse=$bsel] $($lchoices->$ichoice->"text") $[$CHALK reset]\t$[$CHALK grey dim=yes]$($lchoices->$ichoice->"help")$[$CHALK reset]"
            :if ($isel = $ichoice) do={:set bsel "7;"} else={:set bsel ""}
            :put "\t \1B[$($bsel)34;49m $($lchoices->$ichoice->"text") \1B[0m \t \1B[90;49m $($lchoices->$ichoice->"help") \1B[0m"
        }
        :set lkey [/terminal/inkey]
        :if ($lkey = 60931) do={
            :set isel ($isel-1)
            :if ($isel < 0) do={:set isel 0}
        }
        :if ($lkey = 60932) do={
            :set isel ($isel+1)
            :if ($isel > ([:len $lchoices]-1)) do={:set isel 0}
        }        
    }
    :return ($lchoices->$isel->"val")
}

[//]: #.

## Post 16

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/16](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/16)
- Created: `2023-07-17T15:48:34.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Close, but not exactly.  [ @mrz put the kibosh to my feature request for CLI/API to quickset: http://forum.mikrotik.com/t/is-quickset-available-via-the-api/133261/1 - so this be one solution for a better QuickSet :wink: ]

It's /container actually where I run into these "user input" needs.  Today I use a script per container that manage a particular container.  But it's hard to be generic, so the script requires a bunch of variable in the code – that might need to be changed for a particular router – and editing a script isn't very "user friendly".  For example, if you look at my serial2http container, you can see how complex installation is to describe.  A few user prompts to install avoid a lot of writing:  https://github.com/tikoci/serial2http/tree/main#automating-installation

For example, what a container's root-dir should be is not that easy to abstract/guess, so be good to get a user to "confirm" the path.  And if you think each question in $INQUIRE's array is mapped to each on of a container's environment variables, to confirm or alter how the container runs, the logic here might make more sense.

[//]: #.

## Post 17

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/17](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/17)
- Created: `2023-07-17T15:58:14.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

BTW, It's actually the "ipprefix" type I need to add my INQUIRE script – going to have to borrow your :parse technique for that one (since there still isn't a :toipprefix :wink: )

[//]: #.

## Post 19

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/19](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/19)
- Created: `2023-07-17T18:12:13.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Well, you can put a wizard over your extensive encoding and converter libraries...

![](https://i.ibb.co/bBrSYch/Screenshot-2023-07-17-at-11-08-59-AM.png)

```routeros
{
    :local iftrans do={
        :global CHOICES
        :local gostspecs {"OST 8483";"GOST 16876-71 (1973";"T SEV 1362 (1978)";"GOST 7.79-2000 (2002)";"GOST 52535.1-2006 (2006)";"ALA-LC";"ISO/R 9";"ISO 9"}
        :if ($1 = "Latin-Transliterated Cyrillic") do={
            :put "There are many standards for transliteration...which one?"
            :return [$CHOICES $gostspecs]
        } else={:return [:nothing]} 
    }

    :local encodings {"Urlencoded";"Base64";"HexString";"UCS2";"GSM7";"UTF8";{text="CP1252 / Latin-1";val="CP1252";help="RouterOS default"};"CP1291";{val="ASCII";text="US ASCII"; help="us-ascii"};"Latin-Transliterated Cyrillic"}
    :local inouts {"global/local variable";"file";"escaped string text";"PDU field (big-endian,semi-octets)"}
    :put "How is the text already encoded?"
    :local inencoding [$CHOICES $encodings]
    :local ingosts [$iftrans $inencoding]
    :put "Where is it stored currently?"
    :local insrc [$CHOICES $inouts]
    :put "What encoding to you need output?"
    :local outencoding [$CHOICES $encodings]
    :local outgosts [$iftrans $outencoding] 
    :put "Which output do you need?"
    :local outdest [$CHOICES $inouts]

    :put "..."
    :put "SpamGPT says:"
    :put "..."
    :put "Help @rextended! I need $inencoding $ingosts stored in a $insrc, for output in $outencoding $outgosts to $outdest."
    :put "..."
    :put "@reextended says:"  
    :put "Do you not know how to search? \1B]8;;$http://forum.mikrotik.com/search.php?keywords=$($inencoding)to$($outencoding)\07http://forum.mikrotik.com/search.php?keywords=$($inencoding)to$($outencoding)\1B]8;;\07"  
    :put ""
}
```
edit1: minor typos in output text
edit2/3: added "clickable URL"  and expected response

[//]: #.

## Post 22

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/22](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/22)
- Created: `2023-07-17T19:30:44.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Oh my go(o)d....   :open_mouth:
[/quote]

I'd forgot about HexString, URL encoding, Base64, likely others.  And added an expected response...

_*if you use SSH it creates a "clickable" URL to search in the output of my "Encoding $CHOICES" example:_

![](https://i.ibb.co/5cX9C3v/Screenshot-2023-07-17-at-12-25-41-PM.png)

[//]: #.

## Post 24

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/24](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/24)
- Created: `2024-06-13T19:33:08.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Well... $CHOICES was made to be simple.    Couldn't you just use a :while loop and have a "fake" selection for "DONE" that you check in the loop?  That be keep things simple.

And while more complex, $INQUIRE function has "function callbacks" that could be used to do this.  The "validate=" in $INQUIRE can keep you in the same menu items.

Overall, I've tried to borrow from how "Inquirer.js" ( https://github.com/SBoudrias/Inquirer.js ) handles things.  $CHOICE is same as "Select" in Inquirer.js. In that scheme, there are other "types" of these "TUI control".  So @Sertik is more asking for some $CHECKBOX function.  That possible but it should be separate from $CHOICE.

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/26](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/26)
- Created: `2024-06-17T14:44:04.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

$CHOICES was designed to be simple, and, eventually a "plugin" to $INQUIRE as a "type" in menu.  Some future $SELECT is the missing function that stay in same menu to make multiple selections in this scheme, showing checkbox [X] things or the like....like InquireJS/similar do.

But it should be a one-line change to use a global - @Sertik  I have faith in your abilities.  But... _As a general programming best practice, functions should not be operating on variables outside their scope - that's why there functions.  And, using arbitrary globals in a function requires [:parse] tricks, which I don't like since errors are deferred to runtime as :parse is not syntax checked.  Anyway setting a :global is not going to be the example.  But totally cool if you want to modify it for your uses._

[//]: #.

## Post 27

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/27](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/27)
- Created: `2024-06-17T15:03:22.000Z`
- Likes on this post: 0

I did create another function, $qkeys in a different thread.  This is simplified version of $INQUIRE, that just takes keypresses to either run a command, or present a menu if array contained another array.

See http://forum.mikrotik.com/t/a-few-undocumented-operators-that-are-kind-of-neat/163557/1

So for @Sertik's case, the $qkeymap could set a global, on a keypress (not choice) but that might work.  For example, changing $qkeymap to:

```routeros
:global count 0
:set qkeysmap {
       "+"={"+1";(>[{:global count; :set count ($count+1); :return $count}])}
       "-"={"-1";(>[{:global count; :set count ($count-1); :return $count}])} 
}
```
Forum attachment omitted: qkeys-global-add2.png

[//]: #.

## Post 28

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/28](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/28)
- Created: `2024-06-19T02:18:35.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

LOL, so Mikrotik @druvis did a good video to explain "Scripting Arrays": https://www.youtube.com/watch?v=eWCJw0uZ-lE

Essentially, the $INQUIRE script at top is just a "for" loop shown in the video, just with more stuff going on inside the loop.  i.e. looping over the array of questions, instead of array from /interfaces as shown in the video.  Inside the $INQUIRE loop gets more complex... largely because of the "11 data types", which I noticed there is another nice video on:
https://www.youtube.com/watch?v=9SeYC_s95rw
_... but to ask a user for something practical like VLAN ID, you want to validate the "num" type is between 1 to 4094... so the "array loop" need to deal with all those data-types_

> Quoted forum context omitted.

Well idea here was  ANYONE could USE these functions to create their OWN QuickSet.  Since that take just knowing the {} array syntax, and not the complex array/data-type processing which is hidden in the $CHOICE/etc functions here.

Anyway, those video might help explain the array syntax used in the $INQUIRE and $CHOICE, so thought I'd point out Mikrotik's contributions here :wink:.

_Now $CHOICE and $QKEYS, use the "mixed array" formats that @druvis said "hurt his head".  But CREATING an array is a little easier...than USING them in a script._

[//]: #.

## Post 29

- Original post: [https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/29](https://forum.mikrotik.com/t/inquire-prompt-user-for-input-using-arrays-choices-qkeys/167956/29)
- Created: `2024-06-19T19:21:22.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

To keep things together and consistent, I updated the "qkeys" function in another thread, to a more sophisticated version $QKEYS function below that takes an array as a parameter (instead of using a global).  With some more options, and "help" menu too.  Additionally the "new QKEYS" uses the **fancy <%% operator**  to, optionally, provide arguments to functions defined in the array with the menu choices.
Forum attachment omitted: Screenshot 2024-06-19 at 12.01.11 PM.png
Part of the idea here is that someone can create new commands using QKEYS to build a console UI for anything.  So here is an example using the wttr.in REST service to show weather for a few locations.  The code builds the array to display from a more simple array, and also shows providing arguments to the function defined for the "macro".   So you can have "multiple menus" by just calling $QKEYS from within your own function.
# requires $QKEYS be loaded before calling

:global wttr do={
    :global QKEYS
    # https:///wttr.in support several formats, one-liner is 2
    :local format 2
    # list of city to show in menu 
    :local cities {
        m="@mikrotik.com"
        s="San Francisco"
        r="Rio de Janeiro"
        b="Bali"
        l="Lucca"
        t="Taipei"
    }
    # dynamically build the array needed for $QKEYS
    :local keymap [:toarray ""]
    :foreach key,city in=$cities do={
        :set ($keymap->$key) [:toarray ""]
        :set ($keymap->$key->0) $city
        :set ($keymap->$key->1) (>([/tool/fetch url="https://wttr.in/$urlcity?format=$fmt" output=user as-value]->"data"))
        # provide a 3rd arg to $QKEYS, so enable substitution in url
        :set ($keymap->$key->2) {
            urlcity=[:convert $city to=url]
            fmt=$format
        }
    }
    # :if ($1="dump") do={:put [:serialize to=json $keymap options=json.pretty]}

    $QKEYS inline=no $keymap
}

# now run the '$wttr' menu 
$wttr
Forum attachment omitted: Screenshot 2024-06-19 at 11.59.05 AM.png
Here is the code needed to run $wttr or build-your-console-ui:

:global QKEYS
:set QKEYS do={
    :global QKEYS
    :local topmap

    :if ([:typeof $1]!="array") do={
        :put " \1B[1m$0 - interactive menu tree, from a user-defined array of 'macros'\1B[0m"
        :put "\tUsage:"
        :put "\t\t$0 <array> [quit=(\"yes\"|\"no\")] [inline=(\"yes\"|\"no\")]\1B[2m" 
        :put "\t\t  <array> - key-value array of 'hotkey' mapped to either"
        :put "\t\t\t- 'op' function with command to run, or "
        :put "\t\t\t- another key-value array with a 'sub-menu' of commands"
        :put "\t\t  inline=(\"yes\"|\"no\") - \"yes\" (default) to show choices inline, \"no\" adds newlines"
        :put "\t\t  quit=(\"yes\"|\"no\") - default is \"yes\" to stay in menu until 'q' quit"
        :put "\t\t           quit=no will exit menu if an function returns a value"
        :put "\t\1B[0mMetakeys:\1B[2m"
        :put "\t\t'q' is always mapped to quit/exit, so it not valid as menu choice in <array>"
        :put "\t\t'/' returns to \"top\" of menu, if in a submenu"
        :put "\t\t'<backspace>' returns to previous menu, if in a submenu"
        :put "\t\1B[0mReturns:\1B[2m"
        :put "\t\tany return value for last command before 'q' (quit), or if quit=no"
        :put "\t\1B[0mMenu Array Format:\1B[2m"
        :put "\t\tThe general array shape is: { a={\"\";(>[]);{}}; s={\"\";{a={\"\";(>[])};{}}}"
        :put "\t\tIn the key-value array provided, the key= is always the keypress in menu"
        :put "\t\tThe key's value is a list-type array of 1, 2, or 3, items"
        :put "\t\tFirst element in list array, for a key, is name to display."
        :put "\t\tThe 2nd argument can be an 'array', in which case it a sub-menu"
        :put "\t\tIf the 2nd argument is an 'op' function, that contains the function to run on keypress"
        :put "\t\t\t(for 'op' types, optional 3rd argument can provide args to 'op' using <%%"
        :put "\t\tFor example, the 3rd arg provides 'hello' value to print in 'op' function:" 
        :put "\t\t\1B[0m\1B[1;36m\$QKEYS ({ k={\"name\";(>[:return \$arg1]);{arg1=\"hello\"}} })\1B[0m"
        :put "\t\1B[0mExample: 'yes' or 'no'\1B[1;36m"
        :put "\t  :put [$0 ({y={\"yes\";(>[:return true])};n={\"no\";(>[:return false])}}) quit=no]"
        :put "\t\1B[0mTips:\1B[2m" 
        :put "\t\t- array defined as function arg requires using () around it, as shown above"
        :put "\t\t- names are optional, only an 'op' is required in the value of a key"
        :put "\1B[0m"
        :error "QKEYS script requires an array with the menu"
    }

    # use 1st argument as array with choices, the "top menu"
    :set topmap $1
    
    # store position within menu created by input array 
    :local currmap $topmap
    :local currpath ""
    :local mapstack [:toarray ""]
    
    :local loop true
    :local rv

    # if quit=no, then "return on return"
    :local exitOnReturn false
    :if ($quit~"^(n|N)") do={:set exitOnReturn true}

    # if inline=no, print menu choice on seperate lines
    :local useNewlines false
    :if ($inline~"^(n|N)") do={:set useNewlines true}

    # print current menu choices
    :local printHeader do={
        :local sep ""
        :if ($useNewlines) do={ :set sep "\r\n" }
        :local cmds "\1B[1;36m$currpath >\1B[0m$sep"
        :local builtin [:toarray ""]
        :if ($exitOnReturn = false) do={ :set builtin ($builtin,{q={"quit"}}) }
        :if ($currmap!=$topmap) do={ :set builtin ($builtin,{"/"={"top"}}) }
        :foreach k,v in=($currmap,$builtin) do={
            :set cmds "$cmds  \1B[1;32m($[:tostr $k]) \1B[2;39m$[:tostr ($v->0)] \1B[0m$sep"
        }
        :put $cmds
    }

    # main loop to go navigate array of keys
    :while (loop) do={
        # normalize name so all keymaps have some name
        :foreach k,v in=$currmap do={
            :if ([:typeof $v]="op") do={
                :set ($currmap->$k) {"($[:pick [:tostr $v] 10 30])";$v}
            } 
        }
        
        $printHeader currmap=$currmap currpath=$currpath topmap=$topmap exitOnReturn=$exitOnReturn useNewlines=$useNewlines

        # get key
        :local kcode [/terminal/inkey]
        :local key ([:convert to=raw from=byte-array {$kcode}])

        # find in map    
        :local currval ($currmap->$key)         
        :if ([:typeof $currval]!="nil") do={
            :local currname ($currval->0)
            :local currdata ($currval->1)
            :local currtype [:typeof $currdata]
            :local currargs [:toarray ""]
            :if ([:typeof ($currval->2)]="array") do={:set currargs ($currval->2)}

            # found array (another tree)
            :if ($currtype="array") do={
                # store previous menu in stack
                :set mapstack ($mapstack,{{$currpath;$currmap}})
                # set new menu tree, since array-in-array
                :set currpath "$currpath \1B[1;36m> $currname\1B[0m"
                :set currmap $currdata
            }
            # found op (function) to run
            :if ($currtype="op") do={
                :put "$currpath \1B[1;31m> $currname\1B[0m"
                # since element has a function, call it - potentially using args
                :set rv ($currdata <%% $currargs)
                # if quit=no, then exit on return
                :if ([:typeof $rv]!="nil" && $exitOnReturn) do={ :return $rv}
                :put "\t \1B[2;35m$[:pick [:tostr $rv] 0 64]\1B[0m"
            }
        } else={
            # not in map
        }
        # if no "q" in map, then assign to quit
        :if ($key~"(q|Q)") do={ :set loop false }
        # / go to top
        :if ($kcode=47) do={ :set currmap $topmap; :set currpath ""; :set mapstack [:toarray ""]}
        # handle BS (backspace), uses mapstack to pop of submenu
        :if ($kcode=8) do={
            :if ([:len $mapstack]>0) do={
                :set currmap ($mapstack->([:len $mapstack]-1)->1)
                :set currpath ($mapstack->([:len $mapstack]-1)->0)
                :set mapstack [:pick $mapstack 0 ([:len $mapstack]-1)]
            }
        }
    }
    :return $rv
}

> Quoted forum context omitted.

_As a general programming best practice, functions should not be operating on variables outside their scope - that's why there functions._
[/quote]

_The new $QKEYS here no longer relays on a global for menu - but the functions can use globals.  And, any globals STILL have to be declared in "op" type too)._

```routeros
:global count 0
$QKEYS ({
       "+"={"+1";(>[{:global count; :set count ($count+1); :return $count}])}
       "-"={"-1";(>[{:global count; :set count ($count-1); :return $count}])} 
})
```
And the more elaborate menu from the original version of $qkeys still works, with new $QKEYS, except $qkeysmap have to be provided as an argument to $QKEYS now:
http://forum.mikrotik.com/t/a-few-undocumented-operators-that-are-kind-of-neat/163557/1

```routeros
$QKEYS inline=no $qkeymap
```
> $QKEYS $qkeysmap inline=no
> >
> (4) ip
> (6) ipv6
> (C) clear
> (`) edit macros
> (b) bridge
> (c) container
> (e) export
> (i) interfaces
> (l) lte mon
> (q) quit
> (r) board
> (v) vlans
>
> > ip >
> (/) top
> (a) address
> (f) firewall
> (q) quit
> (r) route
>
> > ip > firewall >
> (/) top
> (c) connections
> (f) filter
> (m) mangle
> (n) nat
> (q) quit
>
> > ip > firewall > mangle
> Flags: X - disabled, I - invalid; D - dynamic
> 0    chain=input action=accept log=no log-prefix=""
