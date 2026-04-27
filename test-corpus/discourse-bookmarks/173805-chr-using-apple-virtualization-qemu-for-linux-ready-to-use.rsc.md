[//]: #!tikbook discourse-bookmark topic=173805

#  CHR using Apple Virtualization & 🐧 QEMU for Linux - Ready-to-use!

- Source thread: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/1](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/1)
- Corpus source: `mcp-discourse Amm0 archive`
- Scope: Amm0-authored posts from the bookmarked thread only
- Forum quote blocks and forum-hosted attachments are omitted
- Bookmarks represented: 85 total (topic bookmark)
- Posts included: 39
- First bookmarked: `2025-06-16 20:19:18 UTC`
- Last bookmarked: `2025-06-16 20:19:18 UTC`

[//]: #.

## Post 1

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/1](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/1)
- Created: `2024-02-20T03:25:07.000Z`
- Likes on this post: 0

# <mark>— NEW —</mark> ` TL;DR` ... 2026 Updates!

## Download site for ready-to-use CHR images!

So readers do not have splunk the 80+ post here, the TL;DR is much of thread is now captured in new webpage around the `mikropkl`/`utm-chr`/`fat-chr` projects discussed in thread....

https://tikoci.github.io/chr-images.html

[Forum attachment omitted: Screenshot 2026-03-20 at 6.26.33 AM](https://tikoci.github.io/chr-images.html)

Please check it out!  I've tested both the interface, UTM linked, and most downloads.  So pretty sure things generally works, but **comment below if you have a problem**.   Tested both 7.22 and 7.23beta using new site with UTM, and the new `qemu.sh` on macOS/intel, Arch and Ubuntu.  And added some automated tests that validate images using GitHub Action to start them using `qemu-system-*`, and make sure support basic RouterOS commands.  The new GH automated tests were run against same 7.22 and 7.23beta2, and future release will be too.

All images are built by Microsoft's GitHub Actions, from source on public GitHub `mikropkl`.  QEMU images are exact copies of MikroTik CHR images, while "Apple" images are enabled for EFI with repartitioned boot formatting (`ext2` to `fat`) _and also support `qemu.sh` too, just with EFI boot, not QEMU's SeaBIOS_.

Tried to build a good "help system" on the [tikoci.github.io/chr-images](https://tikoci.github.io/chr-images.html) — so start there!

## QEMU scripts for Linux and Mac _without needing UTM_ for <mark>version 7.22+</mark> 

Included in 7.22 and 7.23beta2 is **new** `qemu.sh` that will automatically launch a basic CHR in the terminal (or via `--background` beyond).  QEMU has env vars (network) and the `qemu.cfg` (cpu, memory) that can tweak it.  Running the script with no args, will bring CHR in user mode at a RouterOS terminal prompt.  In this mode, there is no networking other than port 80 is forward and there is BSD socket for the console, that you can use `socat` (or `screen`) to connect.  The `qemu.sh` script is quite smart, so it will figure out if accel=kvm|hvf|tsg based on OS and CHR image your using.   The new website has the basics on use, and with links to ["user manual" in `QEMU.md`](https://github.com/tikoci/mikropkl/blob/main/Files/QEMU.md) with more complete details.

### Notes on Networking _with_ QEMU...
* On Mac, the `qemu.sh` has a `--shared` and `bridged en0` option that uses Apple's `vmnet.framework` to create a NAT-ed network, or bridge a real interface, which is same as UTM uses for **both** QEMU and Apple Virtualization.framework – you do need `sudo qemu.sh` to use `--shared` or `--bridged <interface>` on Mac.  
* Running on Linux... network is less-automatic with `qemu.sh`... it must be manually add to qemu.cfg or via `QEMU_EXTRA=` (or modify `qemu.sh` directly), see [QEMU.md](https://github.com/tikoci/mikropkl/blob/main/Files/QEMU.md) for more details.

## More details, see the GitHub Project spawned from this thread...
For a while, I've published on GitHub some of the work here:
* [GitHub `tikoci/fat-chr`](https://github.com/tikoci/fat-chr) - _The first project from this thread._  This runs a GitHub Action for every new RouterOS release.  The CI action  repartitioning a RouterOS x86 CHR `.raw` image, so it will boot under a EFI boot loaded.    MikroTik official images CHR use a `ext2` "hybrid MBR" structure designed to use [1980s] BIOS (not EFI).  Some EFI system will boot it, as RouterOS kernel is actually packages in EFI binary inside the `ext2`.  But some virtualization, Apple which cause this thread, is one.  But there are others since EFI specifications requires a FAT partition for a EFI boot loader.  So the GitHub Action runs some shell and `qemu-*`  commands to create a new img file with same files, but the boot partition converted from `ext2` to `fat` - No file are harmed in the process, RouterOS itself remains unchanged.  
* [GitHub `tikoci/mikropkl`](https://github.com/tikoci/mikropkl) - _Grow out of fat-chr, with a [brief stop](https://github.com/tikoci/chr-utm)_  Idea take the CHR images from `fat-chr` for Apple, along with "real" ones for QEMU+BIOS and package them as  "clickable links" to install CHR into UTM from a webpage.  Until recently, `mikropkl` only used GitHub release to show _non-clicklable_ UTM URL like `utm://downloadVM?url=...`. _Turns out GH doesn't allow non HTTP or HTTPS links any pages - why it's been cut-and-paste before new "CHR Images" website._  So new "website" for download is really the completion of the original ~2 year.  It gone under significant remodeling and expansion this year — now support using same .ZIP files for UTM for use withe `qemu-system-*` with `qemu.sh` (has smarts to launch qemu automatically in best mode for OS) and it companion `qemu.cfg` (controls CPU and memory settings), each **7.22 and newer** build includes them in the chr.<platform>.<apple|qemu>.<verision>.zip downloadable.
* **[tikoci.github.io/chr-images](ttps://tikoci.github.io/chr-images.html)** - above screenshot is the site, it just wraps the [`tikoci/mikropkl` GitHub Releases](https://github.com/tikoci/mikropkl/releases) used prior to 7.22 for macOS UTM use.  With the shell script to launch QEMU on Linux and Mac _without needing UTM_ available too, the chr-images page can filter help based on UTM or QEMU, and OS (Mac/windows/Linux).  The help content could be improved but should be right or very close.  _Comment in this thread if corrections or improvements are needed!_

> Above was edited 2026-03-21 at post [#84](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-via-macos-utm/173805/84).  Most of the post below were the "lab notebook" for the above projects.  **If you're goal is just using CHR in UTM, or trying new QEMU support — start by going to **[tikoci.github.io/chr-images](ttps://tikoci.github.io/chr-images.html)**, there are instructions on use and relevant links.**

<mark>OLD "TOP" POST FROM TWO YEARS AGO...</mark>

See [post #65 below](https://forum.mikrotik.com/viewtopic.php?t=204805#p1131200) for UTM CHR installation instructions for the
 **Most streamline way to install RouterOS CHR on Intel-based any macOS UTM**

https://forum.mikrotik.com/viewtopic.php?t=204805#p1131200
https://forum.mikrotik.com/viewtopic.php?t=204805#p1125233

Forum attachment omitted: chr-utm-screenshot.png
I didn't intend on this thread to have 60+ posts... Which now includes multiple GitHub projects...
_CHR re-partitioning:_ **https://github.com/tikoci/fat-chr**
_UTM packaging to ZIP/URL - "mikropkl"_ **https://github.com/tikoci/mikropkl**
_Old Apple Virtualization Only UTM packaging to ZIP/URL_ https://github.com/tikoci/chr-utm

_At this point the rest of the content in this post below is now historic:_

I'd been experiment using Apple Virtualization Framework (https://developer.apple.com/documentation/virtualization) using the option in MacOS-version of UTM (https://mac.getutm.app).

I normally using VMWare Fusion/ESXi.  But UTM (in Apple, NOT QEMU, mode) seems to work okay in my limited testing for a few Linux images.   For a lark, I wanted to try CHR using UTM+AppleVMF.  Issue is Apple's Virtualization Framework ONLY support UEFI, which CHR – for some unknown reason includes EFI boot files, but the diskpart stuff isn't right.

As it turns out, I somehow got it work.  I use CHR on Mac for testing configscripts, so "working" is about all I need.   I tried to write up what I did, but post if you try and doesn't work.  I do know that CHR does not show the logon prompt on the emulated video display (although the serial port is mirrored as the screen shown below) but serial port and network work fine.   /tool/speed-test in a UTM+Apple VM matched a similar bridged network using VMWare Fusion.  Since UTM+Apple (e.g. no QEMU) uses less CPU and boot WAY quicker than VMWare Fusion, so far pretty good.

_Even more historic information, potentially could be removed:_
**See #15 post below for more streamlined process to using CHR with Apple virtualization, on Intel-based Macs:
https://forum.mikrotik.com/viewtopic.php?t=204805#p1059466**

_The following is the "manual" way now...._

This post had the clue on UEFI issues with CHR: http://forum.mikrotik.com/t/router-os-7-on-uefi/156661/5
While I did NOT use the script...the post was 100% correct:
For some reason, Mikrotik does actually includes the right bits for UEFI support...but UEFI requires a FAT16 partition — NOT the ext**2** that's the boot partition in the CHR .IMG file — so CHR does not work unless some Legacy BIOS is used (which Apple, and other VM platforms, do not offer).

The Mikrotik's help for CHR on Vultr has the big clue to how to avoid needing a script (which will not work on Mac) — boot to the SystemRescure image.  See https://help.mikrotik.com/docs/display/ROS/CHR+Vultr+installation

So the Vultr instruction _ALMOST_ works for UTM + Apple Virtualization: e.g. booting UTM with Apple Virtualization enabled to the "SystemRescueCD"...  But those need to be COMBINE with the @kriszos to convert the IMG file's partition from ext2 to fat16.  Most of the write up below is the process involved in that...

Inside UTM, select:
- hit "+" to add a new VM
- select "Linux" as the type
- check the "Use Apple Virtualization" box
- pick the SystemRescueCD as the "Boot ISO" (after downloading the ISO: https://www.system-rescue.org)
- pick cores/memory as desired
- pick a disk size - RouterOS does not need a big disk... I used 1GB but can be smaller/bigger as desired
- skip shared directory (hit continue)
- now, pick a name for the VM, I used "AppleCHR" and IMPORTANTLY check "Open VM Settings"
- dialog with VM setting will appear:
- under Network, you may to change to use "Bridge" mode (or add more network interface... or less likely, use shared if you really like multiple NATs)
- under Devices section, use "+ New..." to add a "Serial" port (below item network) – default is bring up serial port a new window which is what you want
- reviews other setting, but serial above is about only CRITICAL thing to add
- hit "Save"
- in UTM main window hit Play icon to start the new VM

I'm guessing Vultr is more forgiving than Apple about UEFI.  The solution to this is same as @kriszos post above allude: convert the ext2 partition to fat16.  And this can be done after the "dd" in SystemRescueCD.   The specific steps I used:
- follow other steps from https://help.mikrotik.com/docs/display/ROS/CHR+Vultr+installation
- at same SystemRescueCD's terminal...
- "mountall" **after** CHR has been extracted/copyed to the /dev/vda disk
- "mkdir /tmp/vda1" to create folder to store RouterOS EFI files in ext2 boot partition
- "cp -r /dev/vda1/* /tmp/vda1" to copy the EFI files
- "umount /dev/vda1" and "umount /dev/vda2" to un-mount the boot and main partitions
- "startx" - to launch X11 (probably some CLI to "parted" work too, but GUI is helpful with disks IMO)
- Hit the icon for "gparted" in the task bar (or run "gparted" from a Terminal in X11 desktop)
- Use the drop-down in upper left to select the /dev/vda disk.  You should see two partitions: one ext2 and one ext4.
- Right click on the first one, marked "boot" on right, and select format.
- Pick "fat16" as the format type.  This will "cue" the operation.
- Next commit the, use menus or hit the green checkbox in toolbar.  Assuming it says success in status window & still marked "boot"...closed gparted.
- Bring up a terminal window from menu/taskbar, and again type "mountall"
- At same terminal, use "cp -r /tmp/vda1 /dev/vda1" to copy the original files back to the re-formatted 1st partition.
- Finally "poweroff"
- CHR should be "installed" and bootable at this point, except you need to remove the SystemRescueCD from UTM – since it will boot to RouterOS at this point.

Note: I only tested on Intel Mac – but I believe UTM with Apple Virtualization framework will work on M1/M2/M3 (ARM) Mac via Rosetta.  If someone tries, that LMK if it works.

[//]: #.

## Post 5

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/5](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/5)
- Created: `2024-02-20T19:18:16.000Z`
- Likes on this post: 0

Well, I'm surprised CHR even worked – why I shared.  Not really not sure why there isn't a pre-made CHR image that works with UEFI since X86 does.  I'm sure there is probably a more optimized path to a working .IMG file than my write up since I just wrote down what I did than figure out the best way to do it.

When you use Apple Virtualization in UTM, I'm not sure UTM does very much other than call the needed Apple API.  Since the framework is new, my bet is Apple.  For example, the serial console works with Apple VMs, but not the display.  I know CHR shows the login prompt on VMWare, but using UTM+Apple Virtualization is video display is blank, but winbox etc via network does so not an issue for me.  BUT... without the serial port enabled... it look like it doesn't work...

I just used Ubuntu using Apple Virtualization – that does seem to work, at least for a week.  But I don't really stress any of my VMs.  I'm trying to ween myself off VMWare overall (Fusion  is more useful for me since I use ESXi and the VMs work same on both).

The one problem UTM solve is VMWare Fusion's boot speed ( http://forum.mikrotik.com/t/mikrotik-routeros-boot-speed-is-very-slow-vmware/166801/3 and others) – it seems to be a recurring problem.  UTM+Apple, boots in few seconds.

My only complaint so far is Apple does not support USB passthrough, which is useful to get an LTE modem into CHR.

[//]: #.

## Post 6

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/6](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/6)
- Created: `2024-02-21T08:39:17.000Z`
- Likes on this post: 0

I tried this tonight WITHOUT using UTM, only Apple.  I used some swift from an Apple sample project that used VZEFIBootLoader() & another sample with the serial console window.  And changed the disk image to use same converted CHR disk image (e.g. 1st/boot just changed from EXT2 to FAT16 type, as described in first post) as disk.  And CHR still works.  Since everyone like icons on Mac included a "teaser":

![](https://i.ibb.co/Kx9zBq1/Screenshot-2024-02-21-at-12-19-38-AM.png)

The real trick was @kriszos finding here about FAT16 being required by UEFI specs – which is NOT how Mikrotik package the CHR image (e.g. they use EXT2):
http://forum.mikrotik.com/t/router-os-7-on-uefi/156661/5

[//]: #.

## Post 8

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/8](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/8)
- Created: `2024-02-22T03:50:30.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

To confirm,

This window is not the VGA graphics from the CHR VM, but a SwiftUI window connecting to the serial port of the CHR?
[/quote]

Correct, it's a serial console in window using https://github.com/migueldeicaza/TermKit to deal with ANSI.  Using Swift without UTM, the VGA display is blank – same as UTM.

It's possible Apple is using the GPU variant of VirtIO display (QEMU's virtio-gpu-pci) – which does not have VGA emulation & likely CHR wants VGA...  Apple lets you set size not a specific driver (https://developer.apple.com/documentation/virtualization/vzvirtiographicsscanoutconfiguration).

[//]: #.

## Post 10

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/10](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/10)
- Created: `2024-02-22T22:39:02.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Yup.  Apparently, the specific are Rosetta will help with any X86's running inside Apple Virtualized machine – the actual Linux disto needs to also be same arm.  So "Ampere" support is needed.  Actually looked it up: https://developer.apple.com/documentation/virtualization/running_intel_binaries_in_linux_vms_with_rosetta
There was a footnote:

> Rosetta doesn’t support the bootstrapping or installation of Intel Linux distributions on Mac computers with Apple silicon using the Virtualization framework. Intel Linux distributions can run using the Virtualization framework on Intel-based Mac computers without the need for this translation capability.

[//]: #.

## Post 12

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/12](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/12)
- Created: `2024-02-28T16:12:40.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Totally @kriszos - it was worth a search for UEFI in the forum.... but I would have never got to the partition scheme in the RAW image was the reason EFI didn't work & given up before trying gdisk :wink:.

I filed a feature request for UEFI support as SUP-144667 after my post here.  I'm not sure they got the issue is **generically** UEFI support in CHR:

> We checked our suggestion list, and you are the only person who asked about Apple Hypervisor.
> We noted it, but it is not a big chance that it will be implemented soon.

But tried.

[//]: #.

## Post 15

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/15](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/15)
- Created: `2024-02-29T17:04:11.000Z`
- Likes on this post: 0

I took @kriszos's  "gdisk+bash" script, [with small modification](https://github.com/tikoci/fat-chr/blob/main/build.bash) to fetch RouterOS in loop, and put it into a [GitHub repo "fat-chr"](https://github.com/tikoci/fat-chr/releases) to build FAT UEFI images automatically via [GitHub's Action CI](https://github.com/tikoci/fat-chr/actions/workflows/build.yaml).

Since 7.14 stable came out today, I tried out my GH Action script with @kriszos's gdisk+bash script & have 7.14 stable IMG that work _without_ SystemRestoreCD – I just trigger a build in GitHub and download the .IMG.   And 7.14 CHR is running without UTM's QEMU, just Apple's.

IMG files built by GitHub and work with Apple (and likely other/newer hypervisors that require proper UEFI support) are here:
https://github.com/tikoci/fat-chr/releases
I would not use these for production - but to spin up a VM for testing, might be helpful.

This greatly simplify the process of adding a CHR to **Intel-based** UTM using it's "Apple mode".
In UTM, you need to check the "Use Apple" in wizard and still pick an ISO and create some disk... then in the setting BEFORE starting:
- create new VM in UTM "+" > Virtualize > Linux
- check the "Use Apple Virtualization" & pick some file for ISO boot image – going to remove later so doesn't matter what (could be text file whatever)
- click "next" to everything else in UTM setup wizard...and at end check "Open VM Setting"... then in those settings:
- remove the disk the wizard added
- remove the ISO image
- remove the display
- add a serial port
- under disk, use "Import" and pick .RAW image from GitHub
- give it a name if you want (default will be "Linux #")
- then... start it with Play icon... a console window will appear with RouterOS login [via serial —but you won't know – a VGA CLI look the same, so serial saves some bits/complexity if you think about]

Note: The image only fix the disk part of UEFI support.  Something else is needed for VGA display.  I think Apple's VirtIO driver does not have VGA mode, which is why Display will show nothing since CHR is liking setting VGA mode.   Bash nor GitHub can fix that... something in CHR have to change to deal with the newer VirtIO VGA-less display drivers.

[//]: #.

## Post 17

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/17](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/17)
- Created: `2024-02-29T18:54:45.000Z`
- Likes on this post: 0

Rosetta on ARM Mx only helps with X86 AFTER a ARM-based Linux is loaded.  The boot process does not go through Rosetta, only user applications.    So this won't work for non-Intel Macs. :frowning:. Apple docs say:

> Rosetta doesn’t support the bootstrapping or installation of Intel Linux distributions on Mac computers with Apple silicon using the Virtualization framework. Intel Linux distributions can run using the Virtualization framework on Intel-based Mac computers without the need for this translation capability.

So still QEMU on M1/M2/...  but "UEFI boot" for CHR should be selectable in other hypervisors using these images I think.

[//]: #.

## Post 18

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/18](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/18)
- Created: `2024-02-29T19:11:53.000Z`
- Likes on this post: 0

But Mikrotik does have "AMPERE" on their download page (grayed out).  To me, that's Mikrotik messed-up marketing for ARM64 ("aarch64") as ISO coming soon - but dunno.  But gives hope for M1+ Macs.

I used VMWare Fusion for a long while (since it come out) but CPU use is ~half with UTM+Apple on my main Intel Mac for a CHR VM.  And various problems with VMWare freezing when booting CHR also gone – it boots in few seconds.

[//]: #.

## Post 22

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/22](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/22)
- Created: `2024-03-05T15:44:51.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I tried on Equinox Metal, but couldn't get it work.  I do not think it's Mikrotik fault... Metal uses iPXE with netboot.xyz for custom OSes.  I use VMWare on X86... so I gave up quick since I don't know iPXE stuff (although similar problem as here – what's the kernel & initfs to use for RouterOS ).  But kinda did want to see it boot on something before spelunking on ARM Mac.  But no success on Metal.

I don't have an ARM Mac handy, but next time I can check I'll see what happens.   At the end of the day, Apple Virtualization needs some EFI executable file and a ramdisk with RouterOS file system (e.g. routeros.npk uncompressed AFAIK) — just how it find/pick them may be tricky align.

[//]: #.

## Post 23

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/23](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/23)
- Created: `2024-03-05T16:00:12.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Thanks for sharing your scripts.  Some working examples always help.

FWIW... this is a likely a good call:

```text
 ... qemu-system-aarch64 ...   
   -vga none -nographic -monitor none 
  -serial chardev:term0 -chardev stdio,id=term0
```
RouterOS X86 seems to have problems with VirtIO displays (e.g. on Apple, some Hyper-V, etc) — doubt that be fixed in ARM64.

Still... might be worth a check to see if virtual display actually works with "Ampere"+QEMU

[//]: #.

## Post 25

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/25](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/25)
- Created: `2024-03-05T17:59:11.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I'm not expect here, but re-packaging I can do.  I added ZIP file output to my GitHub "X86 UEFI CHR builder", while it doesn't have symlinks and stuff.  If you extract the ZIP file, you can see how the IMG get's structured without mounting the disk on Mac (since it's cannot read the 2nd partition):
https://github.com/tikoci/fat-chr/releases/tag/Build8160661125-testing

The CHR ARM64 ISO has a very different structure...  My wild ass guess is somehow though the sysconfig stuff it mounts routeros-7.15beta4-arm64.npk as the ramdisk.  While it ends in .npk, it's still a normal LZMA compressed file (e.g. 7-Zip) that EFI boot loader tries to find.

But I'm really not the expert on UEFI and Linux boot details, especially on ARM64...  If someone figures out the magic sauce, I can automate it.

[//]: #.

## Post 30

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/30](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/30)
- Created: `2024-03-06T00:09:50.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Just for fun, I tried the _ARM64_ ISO, emulated in UTM on _Intel_ Mac — WORKED.

Instructions _almost_ just work on Intel UTM with QEMU emulation....  Clearly the NVMe disk seem required (tried IDE or VirtIO – neither worked).  But for Intel UTM, the ISO image seems to need to be first converted _manually_ to a .qcow2 with VirtIO for the 1st partition to boot before importing it.

```text
qemu-img convert -O qcow2 mikrotik-7.15beta4-arm64.iso mikrotik-7.15beta4-arm64.qcow2
```

[//]: #.

## Post 31

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/31](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/31)
- Created: `2024-03-06T03:31:10.000Z`
- Likes on this post: 0

Now for _**Apple Virtualization on ARM MacOS**_...  My best guess is the new RouterOS  "ARM64 ISO" is missing a needed "virtio_blk.ko" (at least doesn't appear in ISO or any .NPK)
And since VirtIO is only* disk option on Apple Virtualization, kinda problematic (*if there isn't virtio_blk, there isn't NBD in RouterOS, while NBD is supported by Apple's APIs, it's not in UTM with Apple VM set).  Explain why QEMU seem requires NVMe emulation to boot in UTM...

I think the "ARM virtio disk problem" is same problem as video one: just another missing different virtio driver...

[//]: #.

## Post 35

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/35](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/35)
- Created: `2024-03-06T13:32:11.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

The step 10. does this conversion (or rather attachment of RAW).
[/quote]

Yeah that may be a bug in UTM (or gremlins)... it seem to try to convert it, and then reports in dialog it cannot find mikrotik-7.15beta4-arm64_.qcow_.  Just something I noticed.  (Keep in mind, I tested on Intel Mac using emulation, so may not happen on ARM Mac)

> Quoted forum context omitted.

Ah yes, the license scheme is different.  Which also makes sense why there isn't a virtio blk driver for it either.

> Quoted forum context omitted.

Nice!  There is hope.

[//]: #.

## Post 38

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/38](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/38)
- Created: `2024-03-06T16:22:25.000Z`
- Likes on this post: 0

I personally think it better to always use a hypervisor.  In years of using Mikrotik, never once tried metal X86 before here.

Mikrotik need to just build a ARM64 CHR version of "AMPERE", since it's not just Apple where this comes up.

And the "security warning" in this thread on UEFI image... easily fixed by Mikrotik changing their build to add one more CHR image with FAT as boot.  I put GitHub on that task, and since CI runners are free in public project, easy to share.  FWIW, the entire build process is observable/auditable, but it's a fair warning.   And I'd rather not be involved package building.

[//]: #.

## Post 42

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/42](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/42)
- Created: `2024-03-07T05:13:56.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Isn't there some extra-nic.npk you can install – maybe already did – just a thought.

> Quoted forum context omitted.

It does replicate QEMU where the CD-ROM had to be transformed into a disk image.  IDK about modern bootloaders, but AFAIK EFI will mount the CD-ROM for an OS install to START.  But when the "real" OS boot, it depends on its own driver for CD-ROM.  But a physical disk (or emulated one) be same ID/etc in both EFI and RouterOS kernel.

[//]: #.

## Post 44

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/44](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/44)
- Created: `2024-03-07T17:37:15.000Z`
- Likes on this post: 0

All reasons why I'm pro-virtualization.  Good news is seems the world is coalescing around VirtIO since Microsoft and even Apple support....  since dealing with device drivers has been a PITA my entire life.

FWIW, I did see @normis report WRT to "AArch64" on the 7.15beta thread:

> CHR images are coming in next betas

This be good news for Mac ARM users.  I suspect if it work under Apple Virtualization on ARM Mac... it work any other KVM hypervisor using AArch64.  e.g. Apple is kinda "worse case" since only supports VirtIO.  KVM long offered VirtIO, but most Linux hypervisors do have other supporting functions too... but with Apple it's 100% VirtIO drivers (and clearly a limited subset of them too).

[//]: #.

## Post 46

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/46](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/46)
- Created: `2024-03-07T20:07:34.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Mac does not offer KVM. It does offer HVF and Virtualization framework. Qemu can support anything HVF.
[/quote]

True.  I just found it telling that even Apple adopted KVM's VirtIO in "HVF", not their own drivers/VMXNET3/something ... Even to the extent that "HVF" is likely a "even more pure" VirtIO-based hypervisor, than even KVM :wink:

More a thought that HVF kinda useful for general VM testing.... if OS has poor VirtIO support, you'll get nothing from Apple.

[//]: #.

## Post 49

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/49](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/49)
- Created: `2024-03-08T15:58:46.000Z`
- Likes on this post: 0

Thanks @ayufanpl.  Used VMWare for decades and for a time built iOS apps.  Most server/apps/OS supported VMWare, while KVM was hit/miss.  Seems the reverse is happening, which is good since VMWare is now pretty expensive.  While I know UNIX/Linux well enough, all the KVM/QEMU stuff I'm trying to learn.  Seems complicated onion.

But I _now_ get what you mean when you said "HVF" – that QEMU support for Apple's Virtualization.framework. That's nifty – I thought Virtualization.framework was only in UTM actually.  But I though you made-up an weird acronym for "Apple's Virtualization.framework" (which has not acronym AFAIK).

UTM with Apple (outside CHR image problem) "just working" got me thinking...  So I did try the Virtualization.framework with Apple's Swift sample to directly to boot CHR, which worked:  https://forum.mikrotik.com/viewtopic.php?p=1061786#p1057843
I kinda liked the generic concept of have an "/Application" that put some nice SwiftUI (perhaps NOT a terminal) around some Linux thing more generically.    At some point, I'll put the "MacOS CHR" code/app on GitHub (perhaps, "AHR" :wink: ) when I have time.  Hopefully Mikrotik will have a ARM64 CHR image by then too.

[//]: #.

## Post 51

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/51](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/51)
- Created: `2024-03-08T19:03:28.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

LOL.  Yeah I recently just installed Proxmox VE on an old server to test it...  It better from a UI POV for sure.  And the disk management is just more logical too.  Plus seem QEMU has come a long way since I start with VMWare in the 90s.  CHR was an addition on ESXi a few years, but it super handy for dealing with all the networking stuff vSwitch can't & avoid need the even more price vSphere stuff.  e.g. RouterOS VRRP on two VMWare ESXI does similar HA things to vSphere & easier, and $100/server is a bargain.  On Proxmox VE, there is all Linux newer data plane stuff.  Haven't gotten there yet with Proxmox VE.

It was the Fusion to UTM part of conversion that got me here.  It was nice to be able test a VMX-based VM on Mac Fusion, and just copy files to ESXi (or vise versa).  But if want to do same with Proxmox, I need KVM/QEMU on Mac...

_One note: @TomjNorthIdaho (who runs an open btest server from his ISP) is in same boat re VMWare.  @ayufanpl, if you had any Proxmox advice, might want to share it here: http://forum.mikrotik.com/t/sr-iov-with-chr-what-hypervisors-are-you-using/173239/1

[//]: #.

## Post 56

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/56](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/56)
- Created: `2025-02-10T03:43:35.000Z`
- Likes on this post: 0

Given the Super Bowl in US... Amm0's container&script [superstore](https://github.com/tikoci) is now offering ...

**Easiest way to install a RouterOS*** — via URL:

```text
utm://downloadVM?url=https://github.com/tikoci/chr-utm/releases/download/v7.17.2/RouterOS.utm.zip
```
_*assuming you have an **Intel Mac with UTM installed — _To install UTM for Mac, see https://mac.getutm.com_ .**_

On Intel macOS, just **cut-and-paste URL below into Safari** — including the "utm://downloadVM?" which tell UTM to start the process:

```text
utm://downloadVM?url=https://github.com/tikoci/chr-utm/releases/download/v7.17.2/RouterOS.utm.zip
```
After using URL, UTM will prompt you download it, and will automatically add CHR to the virtual machine assuming you accept the download.  
Forum attachment omitted: CHR started after install using serial console.png
You can also **download the image directly** from the "Release" section on the GitHub project that, essentially, ZIP you a directory with a .plist file and .raw image (and icon).  If you expand the ZIP, UTM should see it as virtual machine then (**as it will have the ".utm" ending when unzip**).  So same image packaged for UTM (as a ZIP) is under "Releases" from the GitHub [tikoci/chr-utm](https://github.com/tikoci/chr-utm) repo:
https://github.com/tikoci/chr-utm/releases

In either case, you should be able to just start it once it installed in UTM — no configuration of serial ports or disks needed.
To start, click the ">" Start icon next to "RouterOS", and a console will appear
Forum attachment omitted: UTM prompt after utm url.png
The username is of course "admin", and CHR still uses no password.

**Note: RouterOS will use a UTM "shared" (NATed) network by default.**  With macOS defaults (i.e. macOS firewall enabled), no port should be available beyond you local Mac.  You can feel free to adjust any networking as desired —  including none if just want to test scripts or commands.  But you can _add multiple network adapters_, or _"bridge" CHR to a real interface_ if desired (i.e. to avoid NAT once it's configured with passwords and a RouterOS firewall).  For example, you can add a USB ethernet dongle to Mac, add that interface as "bridge" in RouterOS UTM image "Network" settings.  Anyway, there are network setting to adjust in UTM to present more network (say for testing) or use multiple "shared" ones.

Above uses Apple's "App URLs", which get send to UTM app and is same scheme as "[UTM Gallery](https://mac.getutm.app/gallery/)" uses to install images.  The image inside ZIP iimage based on the [tikoci/fat-chr](https://github.com/tikoci/chr-utm) "no-gdisk" method, and the image is set to use Apple Virtualization which is super fast at bring up CHR.

Finally **to use multiple CHR, you'll need to rename any existing ones first** named "RouterOS". So if you want to add TWO CHRs, you change "RouterOS" to "RouterOS 1" and then use same URL/download to add another CHR (and perhaps rename that one to "RouterOS 2").  Basically, it won't automatically install a CHR if same already exists.

[//]: #.

## Post 57

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/57](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/57)
- Created: `2025-02-22T01:31:58.000Z`
- Likes on this post: 0

I updated the readme on my Intel macOS CHR "automated" images for UTM.  I've included a bit more information on setup and usage:
https://github.com/tikoci/chr-utm

Also, If anyone has a .plist file and some details on image used for ARM64 UTM that known working... I can package that up similar to Intel on same GitHub project – I'm just don't have a ARM Mac always on hand to test, so avoid publishing anything for Apple Silicon macOS's UTM.

[//]: #.

## Post 59

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/59](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/59)
- Created: `2025-02-24T17:09:31.000Z`
- Likes on this post: 0

Thanks @optio.  I still have not added to my project to build QEMU variants.

But did just update the Apple Intel macOS-based "UTM CHR" to 7.18:

```text
utm://downloadVM?url=https://github.com/tikoci/chr-utm/releases/latest/download/RouterOS.utm.zip
```
With an update README on usage:
https://github.com/tikoci/chr-utm?tab=readme-ov-file#routeros-chr-for-utm

Since one use for CHR on Apple is testing...  While not fully baked, there is an `expect` script that will automatically accept license and reset password.  And links to UTM's AppleScript which can control UTM (and osascript allow AppleScript to be run from bash FWIW) that can tweak machine setting, start/stop etc.

[//]: #.

## Post 61

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/61](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/61)
- Created: `2025-02-24T18:52:24.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

My plan is to build three version:
UTM with Apple (Intel)
UTM with QEMU (Intel)
UTM with QEMU (ARM64)

I also want to figure out how to update the UUIDs in the .plist per build too.  I'll hopefully get it this week.

But I've gone from waiting 5 minutes for [VMWare Fusion to just start](http://forum.mikrotik.com/t/chr-on-vmware-fusion-12/146499/1)... to going from reading the "new release thread" to have CHR running in a 2-3 minutes for entire process.  I'm some AppleScript away to UTM from automating some testing.

If anyone had input on a good default mem/cpu's to use, I'm open.  I left UTMs defaults, but perhaps CHR's min specs.

[//]: #.

## Post 63

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/63](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/63)
- Created: `2025-02-24T20:39:45.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

You can try to automate with _PlistBuddy_ (_/usr/libexec/PlistBuddy_) in script. _PlistBuddy_ is macOS provided CLI tool for editing .plists
[/quote]

Oh plenty of tools on macOS for plist.  Issue is the UTM ZIP files are built at GitHub Action "in cloud" on Ubuntu...  And thus no PlistBuddy (or even `defaults`) on Linux...

I'm sure some `sed` could work.... but the nitty-gritty details are I wanted to try Apple's new config language, [pkl-lang.org](https://pkl-lang.org/index.html) since that does read a plist on Linux, and supports "templating" so the GitHub build can provide the variables to `pkl` to generate a new .plist as part of build.  For automation, it's actually more useful to set serial to a "Psuedo-TTY", and stuff like cpu/disk.  And pkl script should work both at GitHub and a local macOS to "clone" as UTM VM.    But I actually only got as far there wasn't some thing similar to plistbuddy for linux...  And... there are really no pkl-lang examples, other than: https://pkl-lang.org/main/current/language-tutorial/02_filling_out_a_template.html.

[//]: #.

## Post 65

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/65](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/65)
- Created: `2025-03-05T17:36:59.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

My plan is to build three version:
UTM with Apple (Intel)
UTM with QEMU (Intel)
UTM with QEMU (ARM64)
[/quote]

I finally got around to streamlining this.  It's actually in a new GitHub — [mikropkl](https://github.com/tikoci/mikropkl).

Since it has a better framework, and I plan to retire the chr-utm version at some point - since mikropkl has same Apple, plus now QEMU images.  Basically I can create ready-to-use UTM virtual machine based on a "manifest" file written in `pkl` (https://www.pkl-lang.org) that deal with UTM's .plist and other packaging details.  So creating any new variants of QEMU or Apple CHR is now pretty straightforward - it just a new half dozen line file in ./Manifests.   The Makefile and build will do the rest.

For example, I now have "ROSE" images that include 3 small 100Mb disks that can be used to test ROSE features, without having to manually add disks to config.  In the new scheme, QEMU images are always based on unmodified CHR images from Mikrotik (while Apple images still require processing to convert ext2 to fat inside the .img file).  And all VM packages come standard with TWO serial ports, one going to UTM window console, and another wired to some pseudo-tty device (i.e. a "file" like /dev/stty00X).  But still Apple Virtualization support is limited to Intel.
Forum attachment omitted: mikropkl-packages-in-utm.png
_FWIW, even the icon style (solid or line) and color are customizable in the manifest file, and selected for now based on gaudiness - in solidarity with the WinBox4 pro-color&contrast movement._

I have tested all these images on Intel macOS with UTM, but not Apple Silicon based macOS.  If anyone want to try the aarch64 QEMU image on ARM-based Mac, and report back that be good info to know if it just worked (although it's based on @optio's example above) - but it possible some tweak may be need for ARM macOS, dunno.

The download CHR images for UTM are here:  https://github.com/tikoci/mikropkl/releases/tag/chr-7.18.1

With the following images currently being built:

CHR.Apple.x86_64.utm.zip
CHR.QEMU.aarch64.utm.zip
CHR.QEMU.x86_64.utm.zip
ROSE.QEMU.aarch64.utm.zip
ROSE.QEMU.x86_64.utm.zip

[//]: #.

## Post 67

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/67](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/67)
- Created: `2025-03-06T20:05:04.000Z`
- Likes on this post: 0

And the UTM packager now deals with versions, so there is a 7.19beta4 release, with QEMU using "real CHR" (and the Apple Virtualization version still needs custom FAT boot image):
https://github.com/tikoci/mikropkl/releases/tag/chr-7.19beta4

Also, renamed the generated package/ZIP names to include the version.  While long, you can rename it once import or alias'ed in UTM.

I'll probably split the new UTM package into a new topic at some point.  But to use the new "mikropkl" UTM packages of CHR for _any_ macOS, it's basically:

1. Install UTM (via "brew install --cask utm" or https://mac.getutm.app) if you don't have it.
2. In Terminal or in Safari's URL, use the correct UTM URL from https://github.com/tikoci/mikropkl/releases - for example for Apple Silicon with 7.19beta4, with 3 spare disks, can be launched from Terminal using:

```text
open 'utm://downloadVM?url=https://github.com/tikoci/mikropkl/releases/download/chr-7.19beta4/rose.chr.aarch64.qemu.7.19beta4.utm.zip'
```
(note the 'single quotes' around the URL)
3. UTM will open and prompt to download and add the new CHR
4. If accepted, hit the "Start" icon on "rose.chr.aarch64.qemu.7.19beta4" shown on left in UTM
5. A terminal window will appear connected to CHR.  Login is "admin" without password, speed in free version is 1Mb/s.
6. After login, "/ip/address/print" will show you the "shared" network IP, and you can use that in Winbox or Webfig from the local computer only.

All ".qemu." version use the same CHR .img from Mikrotik.  The ".apple." version uses one that get repackaged by GitHub to convert ext2 to FAT (as well described in 60+ posts above).

The ready-to-use QEMU images for UTM on macOS - that use "real" image – are what's new here.

[//]: #.

## Post 69

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/69](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/69)
- Created: `2025-03-08T19:50:33.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

Thanks for testing!  I had not tried it on Apple Silicon, I'm a bit of a dinosaur on that front and still use Intel Mac.  So the aarch64 images are based on @optio's working configuration provided a few post above.

In diff'ing @optio's config from the GitHub generated config, I suspect the issue is the generated `config.plist` needs to have both setting below set to "false" - while GitHub/pkl are using "true":

```text
		<key>Hypervisor</key>
		<false/>
```
```text
		<key>RNGDevice</key>
		<false/>
```
Also, the CPU type is wrong, it's using "default" which may not be "cortex-a710" which is what @optio uses.  So this also need to change:

```text
		<key>CPU</key>
		<string>cortex-a710</string>
```
I'll re-generate an image with those settings for 7.19beta4 today, to exactly match @optio's configuration which is known to work.

You should be able to edit these "manually":
1. In UTM, right click on the CHR machine, select "Show in Finder".
2. Close UTM app to allow modifying the configuration without potential conflict.
3. In Finder, right click on same machine, select "Show Package Contents"
4. Select "config.plist" and right-click and open in an editor.  If there are no default editors, select "Other", then find "TextEdit".
5. Change the above RNGDevice and Hypervisor from <true/> to <false/>
5. Change the above CPU from "default" to "cortex-a710"
6. Save file and close editor.
7. Restart UTM and try machine again.

[//]: #.

## Post 71

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/71](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/71)
- Created: `2025-03-08T21:19:43.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

I re-built the 7.19beta4 and 7.18.1 images to exactly match @optio's plist, so cortex-a710 and no RNG for now.  I do think the RNG shouldn't be a problem.  But I recall the "no hypervisor" part in thread, but missed that in diff's.

Images with above changes:
https://github.com/tikoci/mikropkl/releases/tag/chr-7.19beta4

Or directly to ROSE + QEMU + 7.19beta4 for Apple Silicon (aarch64) from Terminal app:

```text
open 'utm://downloadVM?url=https://github.com/tikoci/mikropkl/releases/download/chr-7.19beta4/rose.chr.aarch64.qemu.7.19beta4.utm.zip'
```
> Quoted forum context omitted.

Yeah I don't know how the CHR software ID is generated, nor if it's correlated with UTM "machine identifier" UUID in config. Something could go wrong there, and "cloud lic" part is some clue I think.   I have tested with all images running on Intel.  _If running code locally, with "make utm-install; make utm-start" which add all built images and starts them with AppleScript from Makefile)_

**EDITS:** I changed the URL to releases to include a "chr-" & rebuilt 7.18.1 (stable) and 7.19beta4 (testing) to use revised "no hypervisor" and other settings for Apple Silicon

[//]: #.

## Post 73

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/73](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/73)
- Created: `2025-03-09T20:04:31.000Z`
- Likes on this post: 0

> Quoted forum context omitted.

This new image works like magic! Thank you so much! :slight_smile:
[/quote]

Good to hear.  Yeah it pretty cool to see them just open up, without going through dozen steps.

Forum attachment omitted: CHR 7.19beta4 x 4 (Tiled Terminals).png
I could write a bit more notes on _**using**_ them, but happy to hear it works since I can't easily test aarch64 macOS.

[//]: #.

## Post 75

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/75](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/75)
- Created: `2025-03-10T18:07:10.000Z`
- Likes on this post: 0

FWIW, I updated the [README.md](https://github.com/tikoci/mikropkl) with a lot more information.  I'll summarize some key things below.

While all generally works fine with Wi-Fi adapter...  it is not the quickest path.  This is NOT a CHR thing, as it effects all virtualization on Mac.  So wiring up a Ethernet dongle is recommend if you're looking to see more native-like performance from the network interface.   Or... if anyone wants to learn about /queue, bring up 2 x CHR images, both "bridged" to a Wi-Fi adapter, and run a /tool/bandwidth-test...you will quickly see variability.   TL;DR is **if you are using the Wi-Fi interface, using fq_codel queue in UTM CHR does clean up the performance** somewhat.

In particular on further automation options, which I left unexplored.  But the same utm:// URL scheme has a few more simple commands for automation.  So you can use some

```text
open 'utm://start?name=chr.aarch64.qemu.7.9beta4'
```
to start a VM.  UTM's docs are good here in describing some simple usages on macOS with Automator and Shortcuts:
https://docs.getutm.app/advanced/remote-control/
So you can in a more few steps, you can be starting/stopping CHR from Siri if desired.  And the same Automator and Shortcuts can be used with the REST API to go beyond starting/stopping in those tools.

Also, it now trivial to add new UTM CHR VM configurations for download, so if anyone wants a more "customized CHR"...  feel free to post the suggested configuration.  I added the ROSE images to both test the "customizability", but also it handy to not have to modify UTM setting after download.

> Quoted forum context omitted.

The current images all default to "help.mikrotik.com CHR recommandation" memory of 1GB and 2 CPU cores.  On a Mac Studio, you might be able to more generous.  :slight_smile:

On licensing, I added a section in [README.md](https://github.com/tikoci/mikropkl) about it.  But they do offer a 60-day "trial" mode. So if you have/create an account at [www.mikrotik.com/client](http://www.mikrotik.com/client), then to enable a 10Gb/s license on any CHR, the command is just:

```routeros
/system/license/renew account=$myaccount password=$mypassword level=p10
```
and enabling it does not need a credit card or anything.  @normis has pointed out the only restriction is upgrade is not allowed.

Since I think a primary use case be **testing**... you would not want to upgrade & likely use a new version before 60-day even.  Now for long-term use, yes, you should buy a license.  But I cannot see Mikrotik objecting to MORE people testing the "beta" or "rc", or new features like "ROSE" - the later @normis is also asking folk to "test" – but how was no described.  So the "ROSE" CHR image published, at least for macOS, allow someone to try the ROSE features safely.  But I do not speak for Mikrotik, and not a lawyer on licensing rules.

But.. essentially, it's one command and your password to move it from "free" to "trial" mode.

While the underlying GitHub re-packaging is as transparent as possible, It is worth repeating a previous commentary:

> Quoted forum context omitted.

And to clarify this part for the "mikropkl" images:

For the ***chr.*.qemu* VM downloads**, all use unmodified CHR .img files download as part of a GitHub Action.  Anyone curious can see the build logs here:  https://github.com/tikoci/mikropkl/actions.

For the ***chr.*.apple* VM downlaods**, these use images that are originally download from Mikrotik.com, but have a script changes partitioning table (as discussed in dozen of post above).  Specifically, the *.apple.* images on mikropkl's GitHub, use CHR images build in another project, [tikoci/fat-chr](https://github.com/tikoci/fat-chr), with those build logs here: https://github.com/tikoci/fat-chr/actions

At the end of the day, a lot of trust is placed in Microsoft / GitHub, since I cannot make that more transparent than it already is... Flip side is GitHub does have various security scanning tools to look for possible supply chain attacks that are enabled in tikoci projects.  And if the supply chain or other attack was within Mikrotik's image (e.g. in their build process), nothing to be done about the risk either, nor any transparency on that process.  It's a tricky world on these things.

And as alternative, it is totally possible to build everything locally.  The README.md describes how to this in [Build locally on macOS](https://github.com/tikoci/mikropkl/blob/main/README.md#build-locally-on-macos) section.

Please comment if anyone has idea to make the process _more_ secure.

[//]: #.

## Post 76

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/76](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/76)
- Created: `2025-03-15T18:50:30.000Z`
- Likes on this post: 0

For anyone messing around with Apple Virtualization and ARM-based Macs,  I saw this on YouTube today:
https://www.youtube.com/watch?v=r3wpXhL3iA0
while about Slackware linux, it was interesting to see the kernel options he used aarch64 / "Apple Silicon" with Apple Virtualization.  One thing I noticed was using console=hvc0 as a kernel option for Apple Virtualization on aarch64.  And there was another article about [Arch and Apple Virtualization](https://blog.vkhitrin.com/booting-arch-linux-using-apple-virtualization-framework-with-utm/) that also suggest using "console=hvc0" too.

At some point I'll break down and get a new ARM Mac, since I still think it's possible to get RouterOS to run on Apple VZ using _right_ ARM64 image or options.  So mainly cataloging the clues.

[//]: #.

## Post 77

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/77](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/77)
- Created: `2026-03-10T02:59:06.443Z`
- Likes on this post: 0

On GitHub for my [`mikropkl` CHR UTM images](https://github.com/tikoci/mikropkl/releases), there was report of trouble with CHR 7.21.3 on  "Apple Silicon"/aarach64.  The error looks like the image format might have changed...  

If one has CHR on their Mac, please LMK below if it works/does not work. (Even if you are **not** using [`mikropkl` images](https://github.com/tikoci/mikropkl).  Ideally provide the `config.plist` is ("Show in Finder" on CHR in UTM, then "Show Package Contents" to get the `config.plist`. 

Thanks for your help.  I don't a Silicon Mac to test here.

[//]: #.

## Post 78

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/78](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/78)
- Created: `2026-03-10T02:59:17.074Z`
- Likes on this post: 0

On GitHub for my [`mikropkl` CHR UTM images](https://github.com/tikoci), there was report of trouble with CHR 7.21.3 on  "Apple Silicon"/aarch64.  The error looks like the image format might have changed...  

If one has CHR on their Mac, please LMK below if it works/does not work. (Even if you are **not** using [`mikropkl` images](https://github.com/tikoci/mikropkl/releases).  Ideally provide the `config.plist` using "Show in Finder" on CHR in UTM, then "Show Package Contents" to get the `config.plist`.   Also, just "works fine for me" be good to know.

Thanks for your help.  I don't a Silicon Mac to test here.

[//]: #.

## Post 81

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/81](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/81)
- Created: `2026-03-12T04:08:20.123Z`
- Likes on this post: 0

Interesting.  I do get the `/system/check-installation` on ARM64 emulated on Intel Mac...  I tried both UTM "import" (using utm:// link) and "alias" (downloading the ZIP/UTM file, which runs in place).   I'd thought it maybe just the import.  Both QEMU ARM64 images do fail for me too.  

I think in `mikropkl`, I've always used the "real" images.  _Only the `fat-chr` project did I repackage ARM64/aarch64 in a few build._  I downloaded the QEMU ARM64 CHR from GitHub, and MikroTik version...

 **`diff` show them **identical** between what's download and MikroTik's image.**   Strange...

But... when you add UTM CHR "by hand", UTM converts the `chr*.img` to `chr*.qcow2` when creating a new machine in its UI.  `mikropkl` actually take the more conservative approach to leaving it a "RAW" `.img` — since that's what MikroTik offers. That less space efficient but perhaps `.qcow` does more....

One suspect is disk geometry may get calculated differently, someplace, and that's what's trigger the error.  Perhaps UTM/qemu, or limitation of "RAW" images (which may not easy to "know" the geometry, where as qcow2 may encode that.   e.g. QEMU has the "right info" to return for `qcow2` but `raw` – IDK, but that's my thought.  

If image is identical, something is going wrong elsewhere...   Perhaps size is not the only reason UTM always converts raw to `qcow` (or. maybe ASIF in some cases)...  If any calculation is "off-by-one", that likely "trip" the `/system/check-installation`.  

I could try the repacking, but I liked that I could say "it's the 'real' image".  But have the code from `chr-fat` to the conversion, but need to dig around more next I have a Silicon Mac handy.  It could easily be something else not aligned, like perhaps the efvars.fd (where EFI data is stored), or disk GUID need to match something (GUID in `.plist` are auto-generated on GitHub when built).

Both Intel QEMU and Apple, pass the /system/check-installation.  But QEMU **with ARM64** fails the `check-installation` on Intel (using emulation and Silicon Mac (using virtualization).

The workaround is remove the disk and add the "official" one, that will convert it to QCOW and fixes the error.  _Now you'd need to save any data for this approach...if these was not a test system and/or save configuration/backup_

But ironically the one that **is** repacked for EFI, Apple Virtualization, it says "installation is ok":

```routeros
[admin@MikroTik] > /system/check-installation 
  status: installation is ok
[admin@MikroTik] > /system/resource/print
                   uptime: 2h55m2s                                             
                  version: 7.22 (stable)                                       
               build-time: 2026-03-09 08:38:02                                 
         factory-software: 7.1                                                 
              free-memory: 674.7MiB                                            
             total-memory: 1024.0MiB                                           
                      cpu: Intel(R)                                                 
        architecture-name: x86_64                                              
               board-name: CHR Apple Inc. Apple Virtualization Generic Platform
                 platform: MikroTik          
```
And the QEMU on Intel, do same.  Just ARM64, and just with _using_ .raw images, do you get the 'check-installation`.  UTM imports and converts to `qcow2`, which work to avoid the `check-instillation` error.

[//]: #.

## Post 83

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/83](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/83)
- Created: `2026-03-18T01:15:38.184Z`
- Likes on this post: 0

## TL;DR: "bad image" is repo'able with QEMU "everywhere", not just UTM

> See [report-arm64-chr-check-installation-failures](https://github.com/tikoci/mikropkl/blob/main/Lab/report-arm64-chr-check-installation-failures.md)

## Repo "bad image" on Apple Silicon 
Although I did not doubt and see in ARM64-emulation on Intel.  I did try on "real" Apple Silicon, and got the same error with `/system/check-installation` with ARM64 CHR & QEMU (with UTM), either manually downloading from MikroTik or using the `mikropkl` packages.  No major trick I could find with just UTM UI and "Stock" Packages either. 

## Tried using `libvirt` on GitHub Actions...
To get the bottom of the ARM64 `/system/installation` issue, I added experimental "`libvirt` support" to `mikropkl`.  So future packages will include a valid libvirt XML to launch CHR with same matching params as UTM QEMU, but uses Linux KVM/QEMU instead.  (extra files are ignored by UTM, and tiny).  My goal was not `libvirt` support...I did that to test CHR on a **Linux `aarch64`** in GitHub Actions to if we get the `/system/check-installation` issue there.  GitHub uses Ubuntu ARM64, idea see what works there, no Apple-ism....   But this did not "fix" the /system/check-installation "bad image" problem on ARM64.  This largely tried the option we use in UTM, but did see if other QEMU options or packaging might fix. 

## Stuck CoPilot on using an Intel Mac with ARM64 images using `brew`'s `qemu-system-aarch64` 
After many iteration of trying and testing QEMU setting with CHR ARM64 images, and deep dive into the structure of the package.  The whole story is catalog in http://github.com/tikoci/mikropkl project, mainly in the Lab/**/NOTES.md files, with some in AGENTS.md/CLAUDE.md (that might have more details of learnings).  The TL;DR: MikroTik has fix something to avoid the error in ARM64 CHR with QEMU  **OR** QEMU needs to support emulate 

## Research and Findings

ARM64 investigation  [gory details](https://github.com/tikoci/mikropkl/blob/main/Lab/qemu-arm64/NOTES.md).  More CHR learned were captured in other CLAUDE/AGENTS too.  

The report linked at top summarized it well here:

> **The deeper reason is architectural:** we extracted and disassembled the checker binary from both x86 and ARM64 CHR images. The **x86 checker always succeeds** — after scanning for hardware files, it unconditionally runs a fallback program (`/bin/milo`) and returns success. The **ARM checker has no such fallback** — when hardware descriptor files are missing, it returns failure, which RouterOS reports as "damaged system package: bad image." This is a design difference in MikroTik's firmware, not a QEMU configuration problem.

> We explored whether different QEMU settings could resolve this:
> - **Using a different CPU model** (we tried four variants including ones that match real Armada7040 hardware): no effect — the check doesn't care about CPU model, it cares about hardware descriptors
> - **Disabling ACPI** to force QEMU to expose better hardware info: RouterOS then can't find the disk at all, because it relies on ACPI to discover the virtual storage controller
> - **Using MMIO transport** (virtio-blk-device) with ACPI disabled: RouterOS kernel doesn't have virtio-mmio drivers — stalls at boot
> - **Injecting SMBIOS data** to mimic MikroTik hardware: changes board-name display but doesn't affect the check
> - **Patching the device tree** with Marvell hardware identifiers: kernel ignores the DTB when ACPI is present
> - **qcow2 instead of raw disk format**: no difference — disk format is irrelevant
> - **Different UEFI firmware**: no effect — the firmware starts fine either way, the problem is downstream in RouterOS itself
> 
> Every path leads to either "boot works, check fails" or "disk not found, nothing works." There's no configuration of QEMU's standard virtual machine type that satisfies RouterOS's hardware expectations for ARM64.

_"We" in above.  AI wrote up NOTES and tests scripts ... I asked for a "report" (long prompt) and reviewed and light edited the [report-arm64-chr-check-installation-failures](https://github.com/tikoci/mikropkl/blob/main/Lab/report-arm64-chr-check-installation-failures.md) - the NOTES.md were all CoPilot+Sonnet's doing (read them all but it more itself it keep track of what done/tried... in case I come back... But CoPilot knows how slice-and-dice CHR now, see tooling below._

## macOS tools for FAT and disk images

I did not know these, CoPilot did:

```
# List files on FAT filesystem without mounting
mdir -i /tmp/efi.fat ::
mdir -i /tmp/efi.fat ::/EFI/BOOT/

# Extract kernel from FAT partition
mcopy -i /tmp/efi.fat ::/EFI/BOOT/BOOTAA64.EFI /tmp/kernel

# Identify kernel type
file /tmp/kernel

# Mount CHR image partition on macOS (read-only)
hdiutil attach -nomount chr-7.22.img
# then: diskutil list to find partition device, mount manually

# Check QEMU firmware file sizes (pflash must match)
ls -la /usr/local/share/qemu/edk2-*
ls -la /opt/homebrew/share/qemu/edk2-*     # Apple Silicon
```
(`brew install mtools` get the FAT `mcopy`/`mdir` commands ... learn something new everyday.  )

[//]: #.

## Post 84

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/84](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/84)
- Created: `2026-03-20T05:58:51.316Z`
- Likes on this post: 0

## CHR with QEMU Tests using GitHub CI

`mikropkl` which builds the UTM images now has a GitHub Action "workflow" that tests via QEMU path.  I turned this support into a "standard feature" of the UTM images.   QEMU test use options, largely, same as UTM image uses (and QEMU setting can, for the most part, be added to UTM, if needed).   Both do use same package, since the "UTM Packages" are just ZIP files to Linux.

This means there are finally some "sanity tests" tests.  I do test the images before any get marked at "Released" in GitHub.  I published 7.22 and 7.23beta3 with new QEMU support.  See [`mikropkl` README.md](https://github.com/tikoci/mikropkl/blob/main/README.md) for details

### QEMU on macOS "Silicon" (aarch64) 

This is on GitHub using QEMU directly (via `brew install qemu`) but **using a "real" Mac** (as GitHub Action Runner).  

**Note** One **critical** problem is Mac-on-GitHub do not support Hypervisor.framework, it been disabled.  This is need for UTM or QEMU, or Apple Virtualization.  So test below are using QEMU `tcg` emulation.  But all images do boot and work.  

The `qemu.sh` script is same as in "UTM bundles" - but does detect the hypervisor support, so the "real" Mac test, the included `qemu.sh` did correctly "downgrade".  

From https://github.com/tikoci/mikropkl/actions/runs/23327705043/job/67852461389

#### Example test (1 of 5)

It actually a long to show all test.  But here is what one looks like.  All images purposed are changed, showing just apple.aarch64 (for 7.23beta2) here:

Boot chr.aarch64.apple.7.23beta2
    Config: arch=aarch64 mem=1024M cpus=2 disks=1
    Runner: aarch64, KVM=0 → expected accel=tcg
    Port: 9180, Timeout: 60s
  Starting chr.aarch64.apple.7.23beta2 (port 9180, accel=tcg,tb-size=256)...
  QEMU PID=15445 — log: /tmp/qemu-chr.aarch64.apple.7.23beta2.log
  Serial:  socat - UNIX-CONNECT:/tmp/qemu-chr.aarch64.apple.7.23beta2-serial.sock
  Monitor: socat - UNIX-CONNECT:/tmp/qemu-chr.aarch64.apple.7.23beta2-monitor.sock
    Serial capture PID=15449 → /tmp/qemu-chr.aarch64.apple.7.23beta2-serial.log
    ✓ Binary: qemu-system-aarch64
    ✓ Accelerator: tcg
    ✓ UEFI pflash present
    ✓ Port forwarding: host 9180 → guest 80
    Attempt 1/12: not ready (qemu_pid=15445 state=R< cpu= 99.8%) — waiting 5s
    Attempt 2/12: not ready (qemu_pid=15445 state=S< cpu= 20.1%) — waiting 5s
    Attempt 3/12: not ready (qemu_pid=15445 state=S< cpu= 12.0%) — waiting 5s
    ✓ RouterOS HTTP up after 30s
    ✓ GET /system/resource
    ✓ GET /interface
    ✓ GET /ip/address
    ✓ GET /ip/route
    ✓ GET /ipv6/address
    ✓ GET /ipv6/route
    /system/resource:
      {
          "architecture-name": "arm64",
          "board-name": "CHR QEMU QEMU Virtual Machine",
          "build-time": "2026-03-13 09:52:01",
          "cpu": "ARM64",
          "cpu-count": "2",
          "cpu-load": "7",
          "free-hdd-space": "72286208",
          "free-memory": "819560448",
          "platform": "MikroTik",
          "total-hdd-space": "86183936",
          "total-memory": "1073741824",
          "uptime": "24s",
          "version": "7.23beta2 (development)",
          "write-sect-since-reboot": "1048",
    ⊘ Skipping check-installation on aarch64 (see CLAUDE.md)
  2026/03/20 03:25:29 socat[15449] W exiting on signal 15
    ✓ chr.aarch64.apple.7.23beta2: ALL CHECKS PASSED
Boot chr.aarch64.qemu.7.23beta2
Boot chr.x86_64.apple.7.23beta2
Boot chr.x86_64.qemu.7.23beta2
Boot rose.chr.aarch64.qemu.7.23beta2
Boot rose.chr.x86_64.qemu.7.23beta2

#### MacOS results for all images

**Note** Test for X86 on ARM are skipped, the emulation is too slow.  As noted, `tsg` mode is used, which from previous tests is actually **extremely** slow at X86 virtualization on ARM (it's a known thing actually, not CHR's fault here & esoteric case mainly as an "extreme test") - so the X86 on ARM is always skipped.  X86 test always run **all** builds, including ARM64 ones (see further below).

This is the summary from "mac-15":

══════════════════════════════════════════════════════════
Boot timing — aarch64/Darwin runner (3 passed, 0 failed, 3 skipped)
══════════════════════════════════════════════════════════
  ✓ chr.aarch64.apple.7.23beta2: 30s (tcg)
  ✓ chr.aarch64.qemu.7.23beta2: 30s (tcg)
  ⊘ chr.x86_64.apple.7.23beta2: skipped (x86_64 on aarch64)
  ⊘ chr.x86_64.qemu.7.23beta2: skipped (x86_64 on aarch64)
  ✓ rose.chr.aarch64.qemu.7.23beta2: 30s (tcg)
  ⊘ rose.chr.x86_64.qemu.7.23beta2: skipped (x86_64 on aarch64)
══════════════════════════════════════════════════════════

### "UTM Package" on **ARM64/`aarch64`** with Ubuntu

From GitHub Action: https://github.com/tikoci/mikropkl/actions/runs/23327681129/job/67852387907

#### Summary
══════════════════════════════════════════════════════════
Boot timing — aarch64/Linux runner (3 passed, 0 failed, 3 skipped)
══════════════════════════════════════════════════════════
  ✓ chr.aarch64.apple.7.22: 29s (tcg)
  ✓ chr.aarch64.qemu.7.22: 29s (tcg)
  ⊘ chr.x86_64.apple.7.22: skipped (x86_64 on aarch64)
  ⊘ chr.x86_64.qemu.7.22: skipped (x86_64 on aarch64)
  ✓ rose.chr.aarch64.qemu.7.22: 22s (tcg)
  ⊘ rose.chr.x86_64.qemu.7.22: skipped (x86_64 on aarch64)
══════════════════════════════════════════════════════════

### "UTM Package" on **Intel/`x86_64`** with Ubuntu

From GitHub Action: https://github.com/tikoci/mikropkl/actions/runs/23327705043/job/67852461392

#### Summary

══════════════════════════════════════════════════════════
Boot timing — x86_64/Linux runner (6 passed, 0 failed, 0 skipped)
══════════════════════════════════════════════════════════
  ✓ chr.aarch64.apple.7.23beta2: 29s (tcg)
  ✓ chr.aarch64.qemu.7.23beta2: 30s (tcg)
  ✓ chr.x86_64.apple.7.23beta2: 13s (kvm)
  ✓ chr.x86_64.qemu.7.23beta2: 13s (kvm)
  ✓ rose.chr.aarch64.qemu.7.23beta2: 29s (tcg)
  ✓ rose.chr.x86_64.qemu.7.23beta2: 13s (kvm)
══════════════════════════════════════════════════════════

### 7.22 GitHub Test (Overview Page)

The same test, except skipping Mac (e.g. emulated QEMU is not particular valid since most "actually real" Mac's support the Hypervisor.framework. From https://github.com/tikoci/mikropkl/actions/runs/23327681129

## QEMU Support Doc

For deeper overview of how the `qemu.sh` used but test works on downloaded imaged, see https://github.com/tikoci/mikropkl/blob/main/Files/QEMU.md

_Stay tuned for more updates_

[//]: #.

## Post 85

- Original post: [https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/85](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805/85)
- Created: `2026-03-21T17:20:26.982Z`
- Likes on this post: 1

Please check out my new site around much of the CHR image/repackaging/etc work here.

https://tikoci.github.io/chr-images.html

[Forum attachment omitted: Screenshot 2026-03-20 at 6.26.33 AM](https://tikoci.github.io/chr-images.html)

## Please see [updated "top post"](https://forum.mikrotik.com/t/chr-using-apple-virtualization-qemu-for-linux-ready-to-use/173805) above for more details, with a summary of the related work in GitHub tikoci/*.

For our "long time readers" of the thread, here is one more piece of the puzzle of CHR - guest tools...

## Lab Report: Guest Tool Support in CHR 7.22 and 7.23beta

As part of my "remodeling" of `mikropkl` (which make the UTM package, and now `qemu.sh`/`qemu.cfg` included too), I had the clunkers (here, CoPilot using Claude Sonnet or Opus) run some "experiments" on CHR.  One I did not mention here checking out the "Guest Tool" of RouterOS as viewed from QEMU.  "Guest tools" let the Hypervisor (or with QEMU, scripts linked to the hypervisor) do things like a proper shutdown, get stats, and, apparently, even **issue commands**.  

Nothing in packages, `qemu.sh`, or else `mikropkl` **uses** QGA yet.  But it be one way to install packages more automatically, or get stats.  I looked this since most of current `mikropkl` project is focused on building "UTM" packages (which are ZIP files) _without_ repackage if not needed.  But like to "expand" the QEMU stuff and support local use better than download images directory (e.g. use `sh` or `bun` script locally to "build" a CHR)...and the "guest tool" likely can automate package install, and collect stats from RouterOS POV (which can be checked against qemu's elaborate set details on its performance available via some socket while a machine is running.    

TL;DR: two findings about "QGA":
* X86 works **better than documented** using VirtIO-based Guest Tools from QEMU. 
* ARM64 has **no support at all**

AI wrote a report here - based on real testing using the python - on the test/results of trying CHR against the full set of guest tool operations to figure out which one worked, and which ones did not.  See: 

https://github.com/tikoci/mikropkl/blob/main/Lab/qemu-guest-agent/NOTES.md
