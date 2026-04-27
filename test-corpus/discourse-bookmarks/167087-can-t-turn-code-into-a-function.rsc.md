[//]: #!tikbook discourse-bookmark topic=167087

# Can't turn code into a function

- Source thread: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/1](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 46 total (topic bookmark)
- Posts included: 8
- First bookmarked: `2025-06-16 20:31:06 UTC`
- Last bookmarked: `2025-06-16 20:31:06 UTC`

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/2](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/2)
- Created: `2023-05-31T17:31:19.000Z`
- Likes on this post: 0

Several problems.  Main one is you need to use $1 to capture the 1st argument to the function and assign it to a "number" inside your function – no need for ":local number XXXX" if your using a function.  Personally, I'd make the function itself global.  Although you can keep it :local, but then entire block need to be enclosed in { } to keep the local function available to locals INSIDE same block (which is the 2nd problem since the local function is no longer available when you get to calling it... since not in same block).

So assuming we make the function a global, looks like this:

```routeros
:global reverseNumber do={
    :local number [:tostr $1]
    :local len [:len $number]
    :local tmpNum [:toarray ""]
    :local realNum [:toarray ""]
    :local result

    :local counter 0
    while ( $counter<$len ) do={
        :set $tmpNum ($tmpNum, [:pick $number $counter ($counter+1)] )
        :set $counter ($counter + 1)
    };

    :local counter 0
    while ( $counter<$len ) do={
        :if ( ($counter % 2) = 0) do={
            :set $realNum ($realNum, ($tmpNum->($counter+1) ) )
        } else={
            :set $realNum ($realNum, ($tmpNum->($counter-1) ) )
        }
    :set $counter ($counter + 1)
    };

    :put $realNum
    :foreach num in=$realNum do={
            :set result ($result.$num)
        }

    :return $result
}

# test code for reverseNumber
{
:local numberarg "8350000048F0"
$reverseNumber $numberarg

:local result [$reverseNumber $numberarg]
:put $result
}
```
I left the ":put" inside the function, which may be for debugging.  Also you might want to avoid using variable names that match commands, although that shouldn't break anything here but not a good idea...

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/4](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/4)
- Created: `2023-05-31T17:46:43.000Z`
- Likes on this post: 0

Any named variable you provide, become a local to the function.  No need to declare anything.  So basically if you remove the first line of the function, you can just use "$reverseNumber number=ABCDEF".

For completeness, you can make the function local, but then all code using it need to be in same block like:

```routeros
{
    :local reverseNumber do={
        :local len [:len $number]
        :local tmpNum [:toarray ""]
        :local realNum [:toarray ""]
        :local result

        :local counter 0
        while ( $counter<$len ) do={
            :set $tmpNum ($tmpNum, [:pick $number $counter ($counter+1)] )
            :set $counter ($counter + 1)
        };

        :local counter 0
        while ( $counter<$len ) do={
            :if ( ($counter % 2) = 0) do={
                :set $realNum ($realNum, ($tmpNum->($counter+1) ) )
            } else={
                :set $realNum ($realNum, ($tmpNum->($counter-1) ) )
            }
        :set $counter ($counter + 1)
        };

        :put $realNum
        :foreach num in=$realNum do={
                :set result ($result.$num)
            }

        :return $result
    }

    {
    :local numberarg "8350000048F0"
    $reverseNumber number=$numberarg

    :local result [$reverseNumber number=$numberarg]
    :put $result
    }
}
```

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/5](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/5)
- Created: `2023-05-31T17:55:46.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Well, just skip the last part of your function and return $realNum (which is an array type).  Or you can add a 2nd parameter that does takes "as-array" like so:

```routeros
:global reverseNumber do={
        :local number $1
        :local len [:len $number]
        :local tmpNum [:toarray ""]
        :local realNum [:toarray ""]
        :local result

        :local counter 0
        while ( $counter<$len ) do={
            :set $tmpNum ($tmpNum, [:pick $number $counter ($counter+1)] )
            :set $counter ($counter + 1)
        };

        :local counter 0
        while ( $counter<$len ) do={
            :if ( ($counter % 2) = 0) do={
                :set $realNum ($realNum, ($tmpNum->($counter+1) ) )
            } else={
                :set $realNum ($realNum, ($tmpNum->($counter-1) ) )
            }
        :set $counter ($counter + 1)
        };

        :if ($2 = "as-array") do={
             :return $realNum
        } else={
            :foreach num in=$realNum do={
                :set result ($result.$num)
            }
            :return $result
        }
    }
```
For example,

```routeros
{
:local rv [$reverseNumber ABCD as-array] 
:put $rv 
:put [:typeof $rv]
:set rv [$reverseNumber ABCD]
:put $rv 
:put [:typeof $rv]} 
}

# Output:
B;A;D;C
array
BADC
str
```

[//]: #.

## Post 26

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/26](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/26)
- Created: `2023-06-05T16:10:17.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Not need to list here the code here... but the globals must be _declared_ in your new function with ":global hex2num" etc.  That's at least one issue with your code.

Also, I get your idea to modularize the code...but just beware if you go down this way that :local functions can only call globals or locals defined with a local function – you cannot call a local function in higher scope.  This puts a damper on the ability to modularize using :local functions.    Currently, seems you're using :globals for your helper functions, which is fine.  But all these oddities is why you see @rextended use slightly more monolithic functions...

[//]: #.

## Post 29

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/29](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/29)
- Created: `2023-06-05T16:45:34.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

This goes without saying. I thought that it would be superfluous to indicate here, because I showed that in the code from which I make the function, these global functions are declared.
[/quote]

Perhaps bad word choice – "defined" meaning it has code vs "declared" mean code is somewhere else...  Regardless, in your $getUTC function, you need

:local getUTC do={
:local pair $1;
:local sign "";
:local tZone "";
**:global num2bin
:global hex2num**
:put $pair;
:local UTC [ $num2bin [ $hex2num $pair] ]
# ...

[//]: #.

## Post 35

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/35](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/35)
- Created: `2023-06-05T17:14:13.000Z`
- Likes on this post: 0

I recommend you write some unit test function to call your function with the some of various PDU formats & see what breaks.  Post the test function and results. :wink:

[//]: #.

## Post 37

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/37](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/37)
- Created: `2023-06-05T17:16:06.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Yes.  That why it gets kinda annoying to have a lot of little functions. :wink:

[//]: #.

## Post 42

- Original post: [https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/42](https://forum.mikrotik.com/t/cant-turn-code-into-a-function/167087/42)
- Created: `2023-06-05T18:39:05.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Can you explain the correct algorithm in simple words? And preferably in another topic, so that it is in the right place.
[/quote]

Well, what he means is there no fractions returned, only integers, when dividing in RouterOS so 18/4=4...

```routeros
:put (18 / 4)
4
```
And since the PDU use a unit of time in 15 minutes (e.g. quarter of an hour), you kinda need to / 4.

The lack of floats follows that the RouterOS variables act like most Bourne/bash/etc variables & function.  e.g. In linux /bin/sh, "echo $((18/4))"  will also output 4 although the value is really 4,5 (or 4 1/2 or 4.5 depending on locale)
