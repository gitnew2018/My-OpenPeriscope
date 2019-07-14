'use strict';
const fs = require('fs'),
    url = require('url'),
    https = require('https'),
    keepAliveAgent = new https.Agent({
        keepAlive: true
    }),
    crypto = require('crypto');

process.stdin.on('data', function (msg) {
    if (msg.toString() === 'q') {
        process.send('Stopped by User');
        process.exit();
    }
});

var g_m3u_url = process.argv[2],
    g_DOWNLOAD_DIR = process.argv[3],
    g_fileName = process.argv[4],
    g_cookies = process.argv[5] || '',
    g_savedDecryptionKey = process.argv[6] || null, /////////////
    g_live_stream = null,
    g_liveTimeout,
    g_timingOut = false,
    g_allChunks = [],
    g_chunksToDownload = [],
    g_cTodownload = [],
    g_live_End,
    g_retries = 70, // number of errors that can happen before downloding stops.
    g_beginnig = true, //skip first timeout
    g_timeoutInterval,
    g_decryptionKey,
    g_chunkIvList = {},//  videochunk name + Initialization vector pairs
    g_chunksNotAvailable = 0,
    g_nokey = 0,
    g_encrypted = null;

g_savedDecryptionKey != 'undefined' ? (g_decryptionKey = new Buffer(g_savedDecryptionKey, 'base64')) : g_decryptionKey = null;

//to debug this downloader use this function below as you would console.log
//no need to restart app just start downloading next file after you saved changes to this file
//you can use JSON.stringify(*array*,null,2) to pretty-print your logs
//you can output multiple log files just change g_fileName.txt to something else.
//fs.appendFile(g_DOWNLOAD_DIR + '/' + g_fileName + '.txt', (/* what to log to a file */ + '\n'), 'utf8', function () {/*what to do after log file was created*/});
    
get_playlist(g_m3u_url);

function request_options(requestUrl, meth) {
    var options = {
        hostname: url.parse(requestUrl).hostname,
        path: url.parse(requestUrl).path,
        agent: keepAliveAgent
    };
    meth ? (options.method = meth) : '';
    g_cookies ? options.headers = {
        'cookie': g_cookies
    } : '';
    return options;
}

function get_playlist(urlLink) {
    var options = request_options(urlLink);
    https.get(options, function (res) {
        var responseParts = [];
        res.setEncoding('utf8');
        res.on('data', function (dataChunk) {
            responseParts.push(dataChunk);
        });
        res.on('end', function () {
            var m3u_response = responseParts.join('').trim();
// fs.appendFile(g_DOWNLOAD_DIR + '/' + g_fileName + '.txt', (m3u_response + '\n'), 'utf8', function () {});
            g_live_End = ((m3u_response.lastIndexOf('#EXT-X-ENDLIST') !== -1) && !(m3u_response.indexOf('#EXT-X-PLAYLIST-TYPE:VOD') !== -1));
            var m3uLines = m3u_response.split('\n')
            var vid_chunks_list = m3uLines.filter(function (line) { //list of video chunks on current m3u playlist.
                return !/(^#.+)/.test(line);
            });

            g_encrypted === null ? (g_encrypted = m3u_response.includes('#EXT-X-KEY')) : '';
            if ((g_decryptionKey === null) && g_encrypted) {
                var keyURI = (/(^#EXT-X-KEY:.+)/m.exec(m3u_response))[0].split('"')[1];
                getKey(keyURI,0)
            }
            
            if (g_encrypted) { //if encrypted fill g_chunkIvList with, video chunk name and it's initalization vector, objects
                for (var i = 0; i < m3uLines.length; i++) {
                    if (!/(^#.+)/.test(m3uLines[i])){//finds chunkxxxx.ts lines
                        g_chunkIvList[m3uLines[i]] = m3uLines[i - 2].split(',')[2].split('=')[1].slice(2) //{chunkxxxx0.ts : d37d7010a581ce952a7c9fffdb22fd77, ...}
                    }
                }
            }
            
            if (g_live_stream && !g_live_End && m3u_response.indexOf('#EXTM3U') !== -1) { //live running
                g_beginnig = false;
                download_live(vid_chunks_list);
            } else {
                if (m3u_response.indexOf('#EXT-X-PLAYLIST-TYPE:VOD') !== -1) { //VOD
                    if (vid_chunks_list.length) {
                        g_allChunks = vid_chunks_list;
                        download_vod()
                    }else{
                        (process.send('Error Nothing to download'),process.exit());
                    }

                } else if (m3u_response.indexOf('#EXT-X-STREAM-INF') !== -1) { // multiple qulities playlist. some producer videos have it.
                    var availableStreamsURLs = m3u_response.split('\n').filter(function (line) { //list of available streams.
                        return /^\/.+/gm.test(line);
                    });
                    g_m3u_url = url.resolve('https://' + url.parse(urlLink).host + '/', availableStreamsURLs[availableStreamsURLs.length - 1]);//pick the best quality one
                    get_playlist(g_m3u_url);

                } else if (m3u_response.indexOf('#EXTM3U') !== -1) { // live
                    download_live(vid_chunks_list);
                    if (g_live_End && !g_chunksToDownload.length && !g_cTodownload.length) { //end of live
                        process.send('End of broadcast');
                        process.exit();
                    } else if ((g_live_stream !== false) && !g_live_End) { // live start
                        g_live_stream = true;
                        download_live(vid_chunks_list);
                        setInterval(get_playlist.bind(null, g_m3u_url), 4000);//periodically check for updated playlist
                    }

                } else {
                    process.send('Warning error, status code: ' + res.statusCode)
                    // no valid playlist
                    if (g_live_stream === null) { //some broadcasts begin with no valid playlists, treat it as live, with timeout
                        g_live_stream = true;
                        setInterval(get_playlist.bind(null, g_m3u_url), 4000);//periodically check for updated playlist
                    }
                    timeout_check(60);
                }
            }
        }).on('error', function (e) {
            process.send('Warning error when trying to get m3u file: ' + e) //display on card
            process.send(e) //save for log
            setTimeout(get_playlist.bind(null, g_m3u_url), 1000);
            timeout_check(30);
        });
    });
}

function getKey(keyURI, i) {
    var options = request_options(keyURI);
    var dataParts = [];
    https.get(options, function (res) {
        if (res.statusCode == 200) {
            res.on('data', function (chunk) {
                dataParts.push(chunk);
            }).on('end', function () {
                g_decryptionKey = Buffer.concat(dataParts);
            });
        } else {
            process.send('Warning No access to decryption key, statusCode:' + res.statusCode);
            process.exit();
        }
    }).on('error', function (e) {
        i += 1;
        process.send('Warning download Key error: ' + e);
        if (i === 2) {
            process.exit();
        }
        getKey(keyURI, i)
    });
}

function decrypt(encryptedBuffer, chunk_name){
    var iv = new Buffer(g_chunkIvList[chunk_name], "hex");
    var decrypt = crypto.createDecipheriv('aes-128-cbc', g_decryptionKey, iv);
    var decryptedBuffer = Buffer.concat([decrypt.update(encryptedBuffer), decrypt.final()]);
    return decryptedBuffer;
}

function timeout_check(time) {
    if (((g_chunksToDownload.length === 0) && !g_timingOut && !g_live_End) || (g_live_stream === null && !g_beginnig)) {
        var counter = 4;//4 because of 4s interval
        g_timingOut = true;
        g_liveTimeout = setTimeout(function () {
            process.send('Time out');
            process.exit();
        }, time * 1000);
        g_timeoutInterval = setInterval(function(){
            counter++;
            counter > 10 ? process.send('No new video chunks in the last ' + counter + 's') : '';
        }, 1000);
    } else if (((g_chunksToDownload.length !== 0) || (g_live_stream === null)) && g_timingOut) { // cancel timeout
        clearTimeout(g_liveTimeout);
        clearInterval(g_timeoutInterval)
        g_timingOut = false;
        process.send(' ');
    }
}

function download_live(vid_chunks) {
    vid_chunks.forEach(function (vid_chunk) {
        if (g_allChunks.lastIndexOf(vid_chunk) !== -1){ //already downloaded 
        }else{
            g_allChunks.push(vid_chunk);
            g_chunksToDownload.push(vid_chunk);
        }
    });

    timeout_check(120);
    !g_beginnig ?  process.send('Uptime: ' + formatTime(Math.floor(process.uptime()))) : '';

    if((g_encrypted && g_decryptionKey)||(!g_encrypted)){
        if (!g_cTodownload.length && g_chunksToDownload.length) {
            var i = 0;
            g_cTodownload = g_chunksToDownload.slice();
            g_cTodownload.forEach(function () {
                g_chunksToDownload.shift();
            });
            download_file_recur(i);
        }
    }else{
        (g_nokey === 3) ? process.exit() :'';
        g_nokey += 1;
        setTimeout(download_live.bind(null, vid_chunks), 1000);//if key not available try again after some time /async workaround
    }

    function download_file_recur(i) {
        if (i === g_cTodownload.length) {
            g_cTodownload = [];
        } else {
            var file_url = url.resolve(g_m3u_url, g_cTodownload[i]); //replace /playlist.m3u8 with /chunk_i.ts in url to get chunk url.
            var options = request_options(file_url);
            var dataParts = [];

            https.get(options, function (res) {
                res.on('data', function (data) {
                    dataParts.push(data);
                });
                res.on('end', function () {
                    var chunkBuffer = Buffer.concat(dataParts);
                
                    if(res.headers['content-length'] === chunkBuffer.length.toString()){
                        if (g_encrypted){
                            chunkBuffer = decrypt(chunkBuffer, g_cTodownload[i]);
                        }

                        fs.appendFile(g_DOWNLOAD_DIR + g_fileName + '.ts', chunkBuffer, { //concatenate incoming live video chunks
                            encoding: 'binary'
                        }, function (err) {
                            if (err) {
                                process.send('Error appending live chunk: ' + err.code); // log error and try to continue
                                if (err.code === 'ENOENT') {
                                    process.send('Error no folder |  Exiting.');
                                    throw err;
                                }
                                if (g_retries > 0) {
                                    g_retries -= 1;
                                    download_file_recur(i);
                                } else {
                                    process.send('Error appending live chunk |  Exiting: ' + err.code);
                                    process.send(err);
                                    throw err;
                                }
                            } else {
                                i += 1;
                                download_file_recur(i);
                            }
                        });
                    }else{
                        download_file_recur(i)
                    }
                });
            }).on('error', function (e) {
                process.send('Warning download file error: ' + e);
                if (g_retries > 0) {
                    g_retries -= 1;
                    setTimeout(download_file_recur.bind(null, i), 500);
                } else {
                    process.send('Error downloading file|  Exiting: '+ e);
                    process.send(e);
                    throw e;
                }
            }).setTimeout(20000, function() {
                    this.abort();
            });
        }
    }
}
function download_vod() {
    if((g_encrypted && g_decryptionKey)||(!g_encrypted)){
        var i = 0;
        download_vod_recur(i);
    }else{
        (g_nokey === 3) ? process.exit() :'';
        g_nokey += 1;
        setTimeout(download_vod, 1000);//if key not available try again after some time /async workaround
    }

    function download_vod_recur(i) {
        if (i === g_allChunks.length) {
            g_chunksNotAvailable ? process.send('Finished, missing ' + g_chunksNotAvailable + ' parts') : process.send('Done');
            process.exit();
        } else {
            var progress = Math.round((i / g_allChunks.length) * 100) + '%';
            process.send(progress);

            var file_url = url.resolve(g_m3u_url, g_allChunks[i]); //replace /playlist.m3u8 with /chunk_i.ts in url to get chunk url.
            var options = request_options(file_url);
            var dataParts = [];

            https.get(options, function (res) {
                res.on('data', function (data) {
                    dataParts.push(data);
                });
                res.on('end', function () {
                    if (res.statusCode == 404) {
                        process.send('404')
                        fs.appendFile(g_DOWNLOAD_DIR + '/' + g_fileName + '.txt', (file_url + ' <= was not found, Video is incomplete: ' + res.statusCode + ' chunk number: ' + i + '\n'), 'utf8', function () {});
                        g_chunksNotAvailable += 1;
                        i += 1;
                        download_vod_recur(i);
                    } else {
                        var chunkBuffer = Buffer.concat(dataParts);

                        if (res.headers['content-length'] === chunkBuffer.length.toString()) {
                            if (g_encrypted) {
                                chunkBuffer = decrypt(chunkBuffer, g_allChunks[i]);
                            }

                            fs.appendFile(g_DOWNLOAD_DIR + g_fileName + '.ts', chunkBuffer, { //concatenate incoming live video chunks
                                encoding: 'binary'
                            }, function (err) {
                                if (err) {
                                    process.send('Error appending vod chunk: ' + err.code); // log error and try to continue
                                    if (err.code === 'ENOENT') {
                                        process.send('Error no folder |  Exiting.');
                                        throw err;
                                    }
                                    if (g_retries > 0) {
                                        g_retries -= 1;
                                        download_vod_recur(i);
                                    } else {
                                        process.send('Error appending live chunk |  Exiting: ' + err.code);
                                        throw err;
                                    }
                                } else {
                                    i += 1;
                                    download_vod_recur(i);
                                }
                            });
                        } else {
                            download_vod_recur(i)
                        }
                    }
                }).on('error', function (e) {
                    process.send('Warning download file error: ' + e);
                    if (g_retries > 0) {
                        g_retries -= 1;
                        setTimeout(download_vod_recur.bind(null, i), 500);
                    } else {
                        process.send('Error downloading file|  Exiting: ' + e);
                        process.send(e);
                        throw e;
                    }
                }).setTimeout(20000, function () {
                    this.abort();
                });
            })
        }
    }
}

function formatTime(time) {
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = time % 60;
    var ret = '';
    if (hrs > 0) {
        ret += '' + hrs + ':' + (mins < 10 ? "0" : '');
    }
    ret += '' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    return ret;
}