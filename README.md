<img align="right" src="https://raw.githubusercontent.com/Pmmlabs/OpenPeriscope/master/images/openperiscope.png">
# OpenPeriscope
Unofficial in-browser client for Periscope (userscript)

### Features added in my version

* New broadcasts after refresh are highlited (marked in code as /* drkchange00 */)
* Now thumbnail previews of replays open in new window(drkchange01)
* Download button changes(drkchange02)
* You can select users who's braodcasts will be recorded(drkchange03)
* New video downloader based on Node.js. It's more reliable imho(drkchange04 and whole downloaderNode.js file)
* Preserve scroll position when switching to other subpages(drkchange05)
* Download Manager (drkchange06)
* Persistent links between refreshes (drkchange07)
* Rename video if one with same name exists (drkchange08)
* Copy link with name and cookies to be used in my periscope nodejs downloader,available in userscript only (drkchange09)
* Display full size avatars from google profiles (drkchange10)
* Dark theme (changes in style.css)
* some other minor tweaks.
* -----(added after 1 release)-----
* Option to log broadcasts to text file with link to replay(drkchange11)
* Profile avatar and link in chat messages + some styling (drkchange12 and style.css)
* Generate proper uuid for chat messages (drkchange13).
* Generate partial replay links (drkchange14)
* M3U links optional, on/off in settings (drkchange15)
* PeriscopeDownloader links optional, on/off in settings (drkchange16)
* Generated links stay grayed-out when no response is received (drkchange17)

### Using as standalone application

You can use pre-built executables from [Releases page](https://github.com/gitnew2018/My-OpenPeriscope/releases), or build it by yourself from source [guide link](https://github.com/gitnew2018/My-OpenPeriscope/wiki).

### Using as userscript

1. Install [userscript manager](https://greasyfork.org/help/installing-user-scripts)
1. Click to [link](https://raw.githubusercontent.com/gitnew2018/My-OpenPeriscope/master/Periscope_Web_Client.user.js) and then "Install"
1. Navigate to http://example.net

In this case posting to chat will not work.

In userscript version, "Download" link is absent, so you can use downloaderNode (or other program) to download broadcasts:

[My standalone periscope nodejs downloader](https://github.com/gitnew2018/nodejs_peri_downloader)

### Screenshot

![screenshot](https://user-images.githubusercontent.com/37026885/37880128-0360d5be-3084-11e8-8f32-77ae48a4896a.png)

### Donate to original autor
Buy me a beer: [paypal.me/pmmlabs](https://paypal.me/pmmlabs)<br>
Bitcoin: [1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn](bitcoin:1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn) 

More info in original repository https://github.com/Pmmlabs/OpenPeriscope
