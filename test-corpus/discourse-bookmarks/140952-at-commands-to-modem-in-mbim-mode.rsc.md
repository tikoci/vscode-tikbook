[//]: #!tikbook discourse-bookmark topic=140952

# AT Commands to modem in MBIM mode?

- Source thread: [https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/1](https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 21 total (21 post bookmark(s))
- Posts included: 3
- First bookmarked: `2025-06-16 20:35:05 UTC`
- Last bookmarked: `2025-06-16 20:35:05 UTC`

[//]: #.

## Post 16

- Original post: [https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/16](https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/16)
- Created: `2021-09-02T00:23:45.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Are you using lte/MBIM mode or PPP mode with at-chat?  I just tried in this on a hAPac2 with external MC7455 and seem to work with LTE mode:

```routeros
[skyfi@hap94] > /interface/lte/monitor lte1 
            status: connected
             model: MC7455
          revision: SWI9X30C_02.32.11.00
  current-operator: AT&T
        data-class: LTE
    session-uptime: 3h42m9s
              imei: xxx
              imsi: xxx
              uicc: xxx
              rssi: -91dBm

[skyfi@hap94] > /interface/lte/at-chat lte1 input="AT!ENTERCND=\"A710\""
  output: OK

[skyfi@hap94] > /interface/lte/at-chat lte1 input="AT!USBCOMP=?"
  output: !USBCOMP: AT!USBCOMP=<Config Index>,<Config Type>,<Interface bitmask> 
          <Config Index> - configuration index to which the composition applies, 
          should be 1 <Config Type> - 1:Generic, 2:USBIF-MBIM, 3:RNDIS config 
          type 2/3 should only be used for specific Sierra PIDs: 68B1, 9068 
          customized VID/PID should use config type 1 <Interface bitmask> - DIAG 
          - 0x00000001, NMEA - 0x00000004, MODEM - 0x00000008, RMNET0 - 
          0x00000100, RMNET1 - 0x00000400, MBIM - 0x00001000, e.g. 10D - diag, 
          nmea, modem, rmnet interfaces enabled 1009 - diag, modem, mbim 
          interfaces enabled The default configuration is: at!usbcomp=1,1,10F OK

[skyfi@hap94] > /interface/lte/at-chat lte1 input="AT!LTEINFO?"
  output: !LTEINFO: Serving: EARFCN MCC MNC TAC CID Bd D U SNR PCI RSRQ RSRP 
          RSSI RXLV 2000 310 410 35614 0A1FC518 4 3 3 6 269 -12.1 -94.6 -65.8 -- 
          IntraFreq: PCI RSRQ RSRP RSSI RXLV 269 -12.1 -94.6 -65.8 -- 223 -18.0 
          -103.3 -72.5 -- 222 -20.0 -106.0 -72.5 -- InterFreq: EARFCN 
          ThresholdLow ThresholdHi Priority PCI RSRQ RSRP RSSI RXLV 5110 0 0 0 
          290 -15.0 -93.3 -65.2 0 5110 0 0 0 8 -9.0 -83.2 -65.9 0 5110 0 0 0 125 
          -14.7 -90.9 -66.0 0 WCDMA: UARFCN ThreshL ThreshH Prio PSC RSCP ECN0 
          RXLV OK

[skyfi@hap94] > /interface/lte/at-chat lte1 input="AT!GSTATUS?"
  output: !GSTATUS: Current Time: 12834 Temperature: 47 Reset Counter: 1 Mode: 
          ONLINE System mode: LTE PS state: Attached LTE band: B4 LTE bw: 10 MHz 
          LTE Rx chan: 2000 LTE Tx chan: 20000 LTE CA state: INACTIVE LTE Scell 
          band:B12 LTE Scell bw:10 MHz LTE Scell chan:5110 EMM state: Registered 
          Normal Service RRC state: RRC Connected IMS reg state: No Srv PCC RxM 
          RSSI: -65 RSRP (dBm): -98 PCC RxD RSSI: -64 RSRP (dBm): -94 SCC RxM 
          RSSI: -65 RSRP (dBm): -90 SCC RxD RSSI: -71 RSRP (dBm): -96 Tx Power: 
          -- TAC: 8B1E (35614) RSRQ (dB): -10.5 Cell ID: 0A1FC518 (169854232) 
          SINR (dB): 7.6 OK

[skyfi@hap94] > /interface/lte/at-chat lte1 input="AT!USBCOMP?"
  output: Config Index: 1 Config Type: 1 (Generic) Interface bitmask: 00001009 
          (diag,modem,mbim) OK

[skyfi@hap94] > /system/routerboard/print 
       routerboard: yes
        board-name: hAP ac^2
             model: RBD52G-5HacD2HnD
     serial-number: xxx
     firmware-type: ipq4000L
  factory-firmware: 6.43.10
  current-firmware: 7.1rc2
  upgrade-firmware: 7.1rc2
```
One note, you used to need to escape "?" like \?.  But in rc1 and rc2, at-chat has worked with Siera MC7455 in LTE at-chat no problem.  I did have an issue MC7354 in PPP mode not liking at-chat (tried to use that switch it to MBIM using USBCOMP) in beta6 or rc1.

[//]: #.

## Post 17

- Original post: [https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/17](https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/17)
- Created: `2021-09-02T01:43:53.000Z`
- Likes on this post: 0

In fact, it now pretty easy use scripting "functions" to issue the AT commands with at-chat and the Sierra etc modems.  If you put it into a scheduler script, with an interval, it can poll the modem and store the detailed LTE info.  See below:

```routeros
[skyfi@hap94] > /system/scheduler/export

# sep/01/2021 18:33:32 by RouterOS 7.1rc2
# software id = QDR7-4Y0A
#
# model = RBD52G-5HacD2HnD
# serial number = xxx
/system scheduler
add interval=15s name=doPollingScripts on-event=":global AT;\r\
    \n:global atLTEINFO;\r\
    \n:global lteinfo;\r\
    \n\r\
    \n:global AT do={/interface/lte/at-chat lte1 input=\$1;};\r\
    \n:global atLTEINFO [/interface/lte/at-chat lte1 input=\"AT!LTEINFO\?\" as-va\
    lue];\r\
    \n:global lteinfo do={ :put \$atLTEINFO };" policy=\
    ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon start-time=\
    startup
    
[skyfi@hap94] > $AT ATI
  output: Manufacturer: Sierra Wireless, Incorporated Model: MC7455 Revision: 
          SWI9X30C_02.32.11.00 r8042 CARMD-EV-FRMWR2 2019/05/15 21:52:20 MEID: 
          xxx IMEI: xxx IMEI SV: 19 FSN: xxx 
          +GCAP: +CGSM OK

[skyfi@hap94] > $lteinfo
output=!LTEINFO: 
Serving:   EARFCN MCC MNC   TAC      CID Bd D U SNR PCI  RSRQ   RSRP   RSSI RXLV
             2000 310 410 35614 0A1FC518  4 3 3  -3 269 -12.6 -100.7  -68.6 --
IntraFreq:                                          PCI  RSRQ   RSRP   RSSI RXLV
                                                    269 -12.6 -100.7  -68.6 --
                                                     40 -14.1 -101.4  -78.4 --
                                                    223 -17.6 -106.0  -78.4 --
InterFreq: EARFCN ThresholdLow ThresholdHi Priority PCI  RSRQ   RSRP   RSSI RXLV
             5110            0           0        0 290 -15.8  -99.2  -71.9   0
             5110            0           0        0  33 -19.0  -97.1  -68.9   0
             5110            0           0        0   8 -11.7  -91.3  -70.1   0
WCDMA:     UARFCN ThreshL ThreshH Prio PSC   RSCP  ECN0 RXLV

OK
```
In theory, one could use :toarray and the new MQTT function (in IOT v7.1 extra package) to store persist these values in something like AWS.  That gets more complex, but seemingly possible.

So there may be bug in the at-chat hanging... I've only seen that with the PPP at-chat.  But have to say this is night and day with the Sierra modems from v6 where PPP mode only has 1 AT channel, so you can't even get RSSI with the MC7354/MC7455 modems while there running.

[//]: #.

## Post 19

- Original post: [https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/19](https://forum.mikrotik.com/t/at-commands-to-modem-in-mbim-mode/140952/19)
- Created: `2023-12-18T20:04:52.000Z`
- Likes on this post: 0

You can try to add a "wait=no" to the commands.  The default (wait=yes) waits for an "OK" to be received, but it can timeout.

If you add adding logging for topics=lte,!packet, the log may show the results too.

Alternatively, you may be able to use something like "/system/serial-terminal usb1 channel=1" to get to directly to the AT serial line of the modem (& adjust port and channel as needed in the command)
