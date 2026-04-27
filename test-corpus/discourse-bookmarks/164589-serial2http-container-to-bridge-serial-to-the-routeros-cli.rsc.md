[//]: #!tikbook discourse-bookmark topic=164589

# "serial2http" — container to bridge serial to the RouterOS CLI

- Source thread: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/1](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 16 total (topic bookmark)
- Posts included: 7
- First bookmarked: `2025-06-16 20:47:44 UTC`
- Last bookmarked: `2025-06-16 20:47:44 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/1](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/1)
- Created: `2023-02-20T17:05:13.000Z`
- Likes on this post: 0

**Problem**
RouterOS supports serial via /ports, including serial devices via USB or actual serial ports on the device.  While RouterOS allows serial to IP via /ports/remote-access, e.g.

```routeros
/port remote-access add port=serial0 protocol=rfc2217 tcp-port=22171
```
But what **RouterOS does not have an RFC-2217 client** in the CLI and/or RouterOS scripts. e.g. SENDING new serial data to a connected (or remote) serial device – not just exposing a physical port as IP port.   One workaround is to create a "/interface/ppp-client" with port set to the serial devices, then commands can be /ppp-out1 at-chat input=" – but that only works with serial devices that have an AT command set.  But it be better if "at-chat" was more flexible & perhaps an option on /port/remote-access to inject data on the shared ports.

Not much has changed, so this 2009 posting has more background on serial and RouterOS (http://forum.mikrotik.com/t/get-the-data-over-serial-port/21656/4).  The new docs may have some details on new devices and serial support too.

Basically the container improves upon this approach:
https://wiki.mikrotik.com/wiki/Sending_text_out_over_a_serial_port

**Idea: use HTTP to "proxy" serial data via a container**
**Importantly, since /container does NOT have direct access to the serial ports, so you MUST use /ports/remote-access to use this container with even a directly attached serial device.**

RouterOS does a /tool/fetch, but obviously that doesn't work with serial data (or the remote-access ports either)...  Since a container can do whatever userland stuff (e.g. no USB/devices), I create one that has a small python script that listens for incoming HTTP request POST'ed, sends via IP-based serial port (e.g. a /port/remote-access), and then returns the response from the serial device in the HTTP response as plain text.  So with the "serial2http" container, the following sends "my-data-to-go-to-serial" to a IP-wrapped serial device, and the output is available in CLI:

```routeros
/tool/fetch url=http://172.22.17.1 method=post http-data="my-data-to-go-to-serial" output=user
```
(or in scripting by storing the result of /tool/fetch in a variable)

**... with Python's PySerial library (in container) as the "glue"**
What the container below does is use Python's pySerial library to connect to any serial port exposed as IP, and runs Python's internal HTTP server to listen for commands to send.  It looks for a "\n" to know when to return a response.  Feel free to adjust the python to your needs – more example here really...  Where/how is connected is controlled by env vars to the container:

```routeros
/container/envs {
    # HTTP port the container listens for commands on...
    add name="$containertag" key="PORT" value=80 
    # PySerial "URL" to use to connect to serial device via RFC2217
    add name="$containertag" key="SERIALURL" value="rfc2217://172.22.17.254:22171?ign_set_control&logging=debug&timeout=3"
    # while most options can be set in the pyserial's url, BAUDRATE must be explicit 
    add name="$containertag" key="BAUDRATE" value=115200
}
/container/mounts {
    # serial2http doesn't use mounts
}
```
Critical to serial2http container is the PySerial's URL.  Please see: https://pyserial.readthedocs.io/en/latest/url_handlers.html for details on what can be set in SERIALURL envs above.  For example, if you set "raw" as type on /ports/remote-access, then use the "socket://" in SERIALURL.  All of the work here is done via PySerial so their docs likely very useful to effectively using this container for your own purposes.

Not the python expert – only used it because PySerial has very rich serial support – so LMK if there are issues in the actual Python code.  (e.g. It's not clear who closes the files, but seem to happen)

**Building the container...**
_One day I'll publish some containers on GitHub, but you can build this one using the following below._.  So I'll presume you have docker tools and know something about it to keep this short.

To build it you really need two files: and so download the following put them in same directory.
- Dockerfile
- serial2http-code.py

**Dockerfile**

```text
FROM python:3.11-alpine
WORKDIR /usr/src/app
RUN pip install --no-cache-dir 'pyserial>=3.5' 
COPY . .
CMD [ "python", "./serial2http-code.py" ]
```
**serial2http-code.py**

```text
#!/usr/bin/env python3
import serial
import io
import os
from http.server import BaseHTTPRequestHandler

defserialurl= "rfc2217://172.22.17.254:22171?ign_set_control&logging=debug&timeout=3"
httpport    = os.getenv('PORT', "80")  
serialurl   = os.getenv('SERIALURL', defserialurl) 
baudrate    = os.getenv('BAUDRATE', "115200")
print(f'port {httpport} serialurl {serialurl} baudrate {baudrate}', flush=True)

class SerialViaHttpPostHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # use ENV variables – TODO should use some config class...
        global httpport    
        global defserialurl
        global serialurl   
        global baudrate    

        length = int(self.headers.get('content-length'))
        reqdata = self.rfile.read(length)

        self.send_response(200)
        self.send_header('Content-Type', f'text/plain; charset=windows-1252')
        self.end_headers()
        
        with serial.serial_for_url(serialurl, baudrate=int(baudrate), timeout=5) as ser:
            try:
                cmdin = reqdata
                print(f"cmdin = {str(cmdin)}({type(cmdin)})", flush=True)
                ser.write(cmdin)
                cmdout = ser.readline() 
                print(f"cmdout = {str(cmdout)}({type(cmdout)})", flush=True)
                self.wfile.write(cmdout)
            finally:
                print("finished", flush=True)
                ser.close()

# when launched as root script, start listening on HTTP
if __name__ == '__main__':
    from http.server import HTTPServer
    server = HTTPServer(('0.0.0.0', int(httpport)), SerialViaHttpPostHandler)
    print(f'HTTP listening on {str(httpport)}')
    server.serve_forever()
```
To build it, you can use following command, in the same directory as the two files above:

```text
docker build --platform linux/arm/v7 -t serial2http .     
docker save serial2http > ../serial2http.tar
```
the .tar file will be in the parent directory.  You can copy and install on your router, using the envs discussed above to control.

The default networking assumes the following, but change as desired:

```routeros
{
:local containernum 1
:local containername "serial2http" 
:local containeripbase "172.22.17"
:local containerprefix "24"
:local containergw "$(containeripbase).254"
:local containerip "$(containeripbase).1"
:local containertag "$(containername)$(containernum)"
:local containerethname "veth-$(containertag)"

/interface/veth {
    remove [find comment~"$containertag"]
    :local veth [add name="$containerethname" address="$(containerip)/$(containerprefix)" gateway=$containergw comment="#$containertag"]
    :put "added VETH - $containerethname address=$(containerip)/$(containerprefix) gateway=$containergw "
}
/ip/address {
    remove [find comment~"$containertag"]
    :local ipaddr [add interface="$containerethname" address="$(containergw)/$(containerprefix)" comment="#$containertag"]
    :put "added IP address=$(containergw)/$(containerprefix) interface=$containerethname"
}
/container/envs {
    remove [find name="$containertag"]
    add name="$containertag" key="PORT" value=80 
    add name="$containertag" key="SERIALURL" value="rfc2217://$(containergw):2217$(containernum)?ign_set_control&logging=debug&timeout=3"
    add name="$containertag" key="BAUDRATE" value=115200
}
/container/mounts {
    # serial2http doesn't use mounts
    remove [find comment~"$containertag"]
}
}
```
Since this is all insecure traffic, you'd want to think about how best to write up the container (and port used by /port/remote-access).

Anyway this approach seems to work, thought I'd share.  No warranties however.

[//]: #.

## Post 2

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/2](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/2)
- Created: `2023-02-25T14:03:24.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Since I want to figure this out anyway.  I put this on GitHub, which builds a package to install.  See updated version here:
https://github.com/tikoci/serial2http

[//]: #.

## Post 4

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/4](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/4)
- Created: `2023-12-19T16:41:56.000Z`
- Likes on this post: 0

I'm guessing the board in the photo is using the RouterOS console to read/write CLI commands (like reset or health) — hard to know.  e.g. it's not RouterOS script controlling the board, likely the other way around.  But dunno.

There is /interface/ppp-client/at-chat that let you talk to serial via script.  The BIG downside is that it's designed for a modem using "AT" commands.  While the /interface/ppp-client/at-chat will send to any serial port (or USB serial) anything provided in the input="" to the serial device.   But at-chat is limited on read the serial responses — it looks for an "OK" in the serial to know to return data to a routeros script to use.  No "OK" in response, "at-chat" can't be used.

I suppose the other alternative, if one was more industrious and had free time... would be use V6 and MetaROUTER to do same as the serial2http container above.  MetaROUTER did run on older MIPS/etc things.  e.g. expose serial as TCP, have openwrt in MetaROUTER use a webserver+python script like above container.  But that be a lot of work.

[//]: #.

## Post 6

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/6](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/6)
- Created: `2023-12-20T22:32:54.000Z`
- Likes on this post: 0

Yeah if it's one-way, then ppp-client can work.

The bytes would need to be encoded in a routeros string first:
"\7E\FF\06\03\00\00\01\EF"

Now I dunno if ppp-client init/at-chat allows high ASCII chars or limits the bytes...you'd have to test that.

[//]: #.

## Post 9

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/9](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/9)
- Created: `2023-12-22T08:23:51.000Z`
- Likes on this post: 0

Did you set the correct baudrate/parity for the serial0 in /port (System > Ports in winbox)?

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/12](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/12)
- Created: `2023-12-22T16:30:21.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

It will append a newline I believe so there that.  If you enable logging on "async" topic, you might get more data too.

I'd try it via "/interface ppp-client at-chat [find] input=", not the modem-init (leave that blank) — I'm not sure what else happens when you start ppp-client...   "at-chat" just uses the setting from a ppp-client to know what port to use, but it doesn't require the ppp be active for at-chat to work.

I have no reason believe RouterOS filters the ASCII chars, so it should send escaped string as bytes, but it possible it filter special/high ASCII chars...never tested that part.

[//]: #.

## Post 15

- Original post: [https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/15](https://forum.mikrotik.com/t/serial2http-container-to-bridge-serial-to-the-routeros-cli/164589/15)
- Created: `2023-12-24T17:57:36.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Yup, that make sense now that I look at the serial command.  In C, \00 (NULL char) is a string terminator...so I guess that percolates to it's processing of script strings.

I was worried about higher ASCII (>128 dec, > 7F hex), but it's the "lowest" ASCII char that seemingly blocks at-chat from working for your particular string.

These vagaries (and that at-chat looks for "OK" and always send a newline) are why I created a container and used IP-to-serial in RouterOS :wink:
