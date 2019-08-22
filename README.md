<img align="right" src="https://raw.githubusercontent.com/Pmmlabs/OpenPeriscope/master/images/openperiscope.png">
# My-OpenPeriscope
Unofficial in-browser client for Periscope (userscript)


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

### Features added in my version

* New broadcasts after refresh are highlited
* Now thumbnail previews of replays open in new window even in suerscript
* Download button changes
* You can select users who's braodcasts will be recorded
* New video downloader based on Node.js. It's more reliable imho(downloaderNode.js file)
* Preserve scroll position when switching to other subpages
* Download Manager
* Persistent links between refreshes
* Rename video if one with same name exists
* Copy link with name and cookies to be used in my periscope nodejs downloader,available in userscript only
* Display full size avatars from google profiles
* Dark theme (changes in style.css)
* some other minor tweaks.
* -----(added after 1 release)-----
* Option to log broadcasts to text file with link to replay
* Profile avatar and link in chat messages + some styling
* Generate proper uuid for chat messages
* Generate partial replay links
* M3U links optional, on/off in settings
* PeriscopeDownloader links optional, on/off in settings
* Generated links stay grayed-out when no response is received
* Changed Following broadcast feed to include deleted broadcasts and now broadcasts appear in new order.
* "Sort by watching" is now toggle
* "Show interesting only" - displays only the ones that you clicked on "get stream link"
* When "Enable automatic downloading of the following items" or "Enable notifications" is on, replay links are saved and displayed on their boradcast card
* In standalone version transitions in css caused heavy cpu usage. Now all are off.
* Added checkbox to activate auto getting partial replay links
* Added filters. Hide replays, producer or by language
* Saved broadcasts now have prefixes:PV_ PR_ R_(private, partial replay, replay)
* Update state of broadcasts, updating thumbnails is optional
* Seach by @username not only by user id
* Screenlist now changed to screenPreviewer
* Added input field to download manager to quickly download from web link
* You can download private broadcasts that were deleted
* Added Download whole broadcast button(combine partial replay with live running broadcast into one)
* Now following section has option to display broadcasts in classic order, as in periscope app
* You can login with session ID, Thanks to kewalsk
* Option to refresh following section on load, Thanks to Max104t
* Option to open multiple preview windows, Thanks to Max104t

## Known issues
* App crashes when opening live broadcast in new window
* Autodownloading broadcasts of following users also downloads private broadcasts - not easy to fix, use `selected users broadcasts`
* Some broadcasts are marked as deleted but are still running - This happens when periscope removes this broadcast from following feed
* Sign in with twitter and with phone not working - first requires moving to newer version of NWJS and the second just doesn't work ;)

If you notice any other bug please report.

### Donate to original autor
Buy pmmlabs a beer: [paypal.me/pmmlabs](https://paypal.me/pmmlabs)<br>
Bitcoin: [1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn](bitcoin:1F1hXcaTjS1UFUqqMzLvVyz4wDSbRJU4Tn) 

More info in original repository https://github.com/Pmmlabs/OpenPeriscope
