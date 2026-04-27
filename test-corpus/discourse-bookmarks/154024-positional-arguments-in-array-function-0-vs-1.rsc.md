[//]: #!tikbook discourse-bookmark topic=154024

# Positional Arguments in Array Function - $0 vs $1?

- Source thread: [https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/1](https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 3 total (3 post bookmark(s))
- Posts included: 3
- First bookmarked: `2025-06-16 20:29:53 UTC`
- Last bookmarked: `2025-06-16 20:29:53 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/1](https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/1)
- Created: `2021-12-10T15:37:08.000Z`
- Likes on this post: 0

Ran into a curious bug, or feature, using [functions](https://help.mikrotik.com/docs/display/ROS/Scripting#Scripting-Functions) with arguments when the function is stored as a named array element.  But it took me a while to at _understand_ what's happening – maybe it helps someone else.

Functions can take parameters, which can be positional or named.  Normally "positional" ones start at $1 for the first parameter to a function.  Since a function can be an element of an array, they too can take parameters just like one a global (or local) function.  This all works fine (with correct bracing).

But when the function is run from the array using _[($array->"fn") hello]_, the parameter "hello" is at $0, not the expected $1.  With multiple parameters, what would be $2 at global scoped function, is $1 when function is defined within an array.  Basically, whether the first argument is $0 or $1, depends on where it lives.  Even mixin a named parameter still works, the positional arguments are just shifted by one and key=value ones work anywhere as usual.

I'd say it's a bug, but more subtle than that. But I can see the logic: An array function is more like anonymous function is CS terms, while global function is a command (commands have name, a name is an argument) – so the first argument _known_ to the function is always $0, which could be it's name if available.

However, this logic was quite subtle to figure out since I couldn't tell why the same function acted differently when cut-and-pasting code from a global to array – I didn't notice they were just shift: they just looked wrong/old/sometime and obviously cause code that expected a $1="yes" not $1=nil.  **Fix was simple: use $0 when a function is defined in an array.**

I think this shows the issue I ran into (although more obvious in the example than in real scripts):

```routeros
:global hello
:set $hello do={:put "$0 $1"}
$hello world
#>>            $hello world

:global greetings [toarray ""]
:set ($greetings->"hello") do={:put "hello $1 "}
[($greetings->"hello") world]
#>>                                     hello
{ /terminal style error; put "expected: 'hello world' not just 'hello' string"; /terminal style none }   

# use $0 instead, works: 
:set ($greetings->"hello") do={:put "hello $0"}
[($greetings->"hello") world]
#>>                                       hello world
```
This is with v7.1.  But same holds on long-term v6.  Not necessarily asking for a "fix", but it is a pretty weird.

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/2](https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/2)
- Created: `2021-12-10T16:44:35.000Z`
- Likes on this post: 0

Using named arguments/parameters mixed with positional ones to same function, all still works same as global – just positional args start at $0, and here $1 is the 2nd positional argument (and the named argument "prefix" can be anywhere).

```routeros
:global greetings [toarray ""]
:set ($greetings->"hello") do={:put "$0 $prefix $1"}
[($greetings->"hello") hello world prefix=mx]
#>>                                             hello mx world
[($greetings->"hello") prefix=mrs hello world]
#>>                                             hello mrs world
[($greetings->"hello") hello prefix=mr world]
#>>                                             hello mr world
```
and yeah with a global it has to be $1 and $2 respectively.

```routeros
:global hello do={:put "$1 $prefix $2"}
[$hello hello world prefix=mx]
#>>                                             hello mx world
[$hello prefix=mrs hello world]
#>>                                             hello mrs world
[$hello hello prefix=mr world]
#>>                                             hello mr world
```
For me the "named arguments" (e.g. [$myfunction val1=me myvar2=1]) are pretty easy, now when the get mixed that's where I ran into trouble – but using $0 in "array function" as 1st positional argument help me work though my scripts.

[//]: #.

## Post 3

- Original post: [https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/3](https://forum.mikrotik.com/t/positional-arguments-in-array-function-0-vs-1/154024/3)
- Created: `2021-12-10T16:48:56.000Z`
- Likes on this post: 0

Since I went down this rabbit hole.  Where this get might get strange is re-assignment of the function itself (not the value) between a global and array element...

Wrote a small script to verify the logic.  So it does seem by assigning a function to array in any way – defining it via a do={} or using a "function variable" doesn't matter – by virtue of _calling it_ though the array syntax it seem to shift the $0 $1 et'll parameter meanings.  Not 100% sure but seems to be right.

Maybe hard to understand – posted mainly as double-check of this.

```routeros
# global function to reassign
:global echo do={ :put "[ echo \$0=$0 \$1=$1 ]"; :return "$1"; }
:put [$echo "it works from echo"]

# array function to reassign
:global funarray [toarray ""];
:set ($funarray->"echo") do={ :put "[ (arr)->echo \$0=$0 \$1=$1 ]"; :return "$0"}
:put [($funarray->"echo") "it works from funarray"]

# reassign code of global $echo as array element
:set ($funarray->"aliasfn") $echo
{/terminal style error; :put [($funarray->"aliasfn") "1st arg is not out"]; /terminal style none}
:put [($funarray->"aliasfn") 0 "2nd arg to the caller"]
# ...only the "2nd arg" works - it's looking for $1 which is actually the 2nd calling arg

# reassign function from array and set it on a global
:global aliasfn
:set $aliasfn ($funarray->"aliasfn")
{/terminal style error; :put [($aliasfn) "1st arg is not output"]; /terminal style none}
:put [($aliasfn) 0 "2nd arg to the caller"]
# ...recall the orginal echo is looking for $1 in output, the array assignment loses the command
#    and why adding 0 above helps to make the 2nd arg be $1
```
