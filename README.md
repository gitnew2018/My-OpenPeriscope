<img align="right" src="https://raw.githubusercontent.com/Pmmlabs/OpenPeriscope/master/images/openperiscope.png">
# OpenPeriscope
Unofficial in-browser client for Periscope (userscript)

### Using as standalone application

You can use pre-built executables from [Releases page](https://github.com/gitnew2018/My-OpenPeriscope/releases), or 

1. Download NW.js v0.12.3: http://dl.nwjs.io/v0.12.3/
1. Unpack it and add path to PATH enviroment variable
1. Copy ffmpegsumo.dll (libffmpegsumo.so for Linux) from Google Chrome 41 directory to NW.js directory
1. Download and unpack [ffmpeg static build](https://ffmpeg.zeranoe.com/builds/) to OpenPeriscope directory
1. Download and install NPM (bundled with node.js): https://nodejs.org/download/release/latest/
1. Run in repo directory
```
 npm install
 nw . 
 ```
If you want to update pre-built version, you can use [this instructions](https://github.com/Pmmlabs/OpenPeriscope/wiki#how-to-update-portable-version-exe)

### Using as userscript

1. Install [userscript manager](https://greasyfork.org/help/installing-user-scripts)
1. Click to [link](https://raw.githubusercontent.com/gitnew2018/My-OpenPeriscope/master/Periscope_Web_Client.user.js) and then "Install"
1. Navigate to http://example.net

In this case posting to chat will not work.

### Features added in my version

* New broadcasts after refresh are highlited (marked in code as /* drkchange0 */)
* Now thumbnail previews open in new window(drkchange1)
* Download button changes(drkchange2)
* You can select users who's braodcasts will be recorded(drkchange3)
* New video downloader based on Node.js. It's more reliable imho(drkchange4 and whole downloaderNode.js file)
* Preserve scroll position when switching to other subpages(drkchange5)
* Download Manager (drkchange6)
* Dark theme (changes in style.css)
* some other minor tweaks.

### Screenshot

![screenshot](https://user-images.githubusercontent.com/37026885/37880128-0360d5be-3084-11e8-8f32-77ae48a4896a.png)

### Donate to original autor
Buy me a beer: [paypal.me/pmmlabs](https://paypal.me/pmmlabs)<br>
Bitcoin: [1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn](bitcoin:1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn) 

More info in original repository https://github.com/Pmmlabs/OpenPeriscope
