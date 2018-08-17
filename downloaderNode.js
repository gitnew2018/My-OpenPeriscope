'use strict';
const fs = require('fs'),
    url = require('url'),
    https = require('https'),
    keepAliveAgent = new https.Agent({
        keepAlive: true
    });
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
    g_TEMP = '/temp/',
    g_live_stream = null,
    g_liveTimeout,
    g_timingOut = false,
    g_allChunks = [],
    g_allChunksToDownload = [],
    g_readyToAppend = [],
    g_chunksToDownload = [],
    g_cTodownload = [],
    g_simultaneous_down = 10, //number of vod chunks to download at once.
    g_counter = 0,
    g_broadcastEnd,
    g_retries = 70, // number of errors that can happen before downloding stops.
    g_timeToRetry = 10, //in seconds
    g_retrying = false,
    g_beginnig = true, //skip first timeout
    g_timeoutInterval,
    vod = false;

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
            var m3u_response = responseParts.join('');
            g_broadcastEnd = m3u_response.lastIndexOf('#EXT-X-ENDLIST') !== -1;

            var vid_chunks_list = m3u_response.split('\n').filter(function (line) { //list of video chunks on current m3u playlist.
                return /(^chunk_.+)/gm.test(line);
            });

            if (g_live_stream && !g_broadcastEnd && m3u_response.indexOf('#EXTM3U') !== -1) { //live running
                m3u_response = '';
                g_beginnig = false;
                process_playlist(vid_chunks_list);
            } else {
                if (m3u_response.indexOf('#EXT-X-PLAYLIST-TYPE:VOD') !== -1) { //VOD
                    vod = true;
                    g_allChunks = vid_chunks_list;
                    mk_temp();
                } else if (m3u_response.indexOf('#EXT-X-STREAM-INF') !== -1) { // multiple qulities playlist. some producer videos have it.
                    var availableStreamsURLs = m3u_response.split('\n').filter(function (line) { //list of available streams.
                        return /^\/.+/gm.test(line);
                    });
                    g_m3u_url = url.resolve('https://' + url.parse(urlLink).host + '/', availableStreamsURLs[availableStreamsURLs.length - 1]);
                    get_playlist(g_m3u_url);
                } else if (m3u_response.indexOf('#EXTM3U') !== -1) { // live
                    process_playlist(vid_chunks_list);
                    if (g_broadcastEnd && !g_chunksToDownload.length && !g_cTodownload.length) { //end of live
                        process.send('End of broadcast');
                        process.exit();
                    } else if ((g_live_stream !== false) && !g_broadcastEnd) { // live start
                        g_live_stream = true;
                        process_playlist(vid_chunks_list);
                        setInterval(intervals, 4000);
                    }
                } else if (res.statusCode === 301) { // //private replay redirection link 
                    var prvCookies = res.headers['set-cookie'];
                    g_m3u_url = res.headers['location'];
                    for (var cookie in prvCookies) {
                        cookie = (prvCookies[cookie] + '').split(/\s/).shift();
                        g_cookies += cookie;
                    }
                    //example cookie: Token=1522222964; Service=proxsee; Digest=oUShA5IfUAxxhd8mwt2RwUy-aljqdjxxxG4G6PwlU;
                    get_playlist(g_m3u_url);
                } else {
                    // no valid playlist
                    if (g_live_stream === null) { //some broadcasts begin with no valid playlists, treat it as live, with timeout
                        g_live_stream = true;
                        setInterval(intervals, 4000);
                    }
                    timeout_check(60);
                }
            }
        });
    }).on('error', function (e) {
        process.send('Warning error when trying to get m3u file: ' + e.code) //display on card
        process.send(e) //save for log
        setTimeout(intervals, 1000);
        timeout_check(70);
    });
}

function intervals() {
    get_playlist(g_m3u_url); //periodically check for updated playlist
    download_live();
}

function process_playlist(vid_chunks) {
    if (vod) { //don't download everything at once to prevent issues with very long VODs 
        var chunksToDownload = [];
        var chunkUrl = [];
        g_allChunksToDownload = vid_chunks;
        g_allChunksToDownload.length < g_simultaneous_down ? g_simultaneous_down = g_allChunksToDownload.length : '';

        for (var i = 0; i < g_simultaneous_down; i++) {
            chunkUrl[i] = url.resolve(g_m3u_url, g_allChunksToDownload[i]); //replace /playlist.m3u8 with /chunk_i.ts in url to get chunk url.
            chunksToDownload.push(g_allChunksToDownload[i]);
            download_vod(chunkUrl[i], g_allChunksToDownload[i], chunksToDownload);
        }
    } else { //live
        vid_chunks.forEach(function (vid_chunk) {
            if (g_allChunks.lastIndexOf(vid_chunk) !== -1); //already downloaded 
            else {
                g_allChunks.push(vid_chunk);
                g_chunksToDownload.push(vid_chunk);
            }
        });
        timeout_check(120);
    }
    !g_beginnig ?  process.send('Uptime: ' + formatTime(Math.floor(process.uptime()))) : '';
}

function timeout_check(time) {
    if (((g_chunksToDownload.length === 0) && !g_timingOut && !g_broadcastEnd) || (g_live_stream === null && !g_beginnig)) {
        var counter = 3;
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

function download_live() {
    if (!g_cTodownload.length && g_chunksToDownload.length) {
        var i = 0;
        g_cTodownload = g_chunksToDownload.slice();
        g_cTodownload.forEach(function () {
            g_chunksToDownload.shift();
        });
        download_file_recur(i);
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
                   
                    if(res.headers['content-length'] == chunkBuffer.length){
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
                                    i += 1;
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

                    dataParts = [];
                });
            }).on('error', function (e) {
                process.send('Warning download file error: ' + e.code);
                if (g_retries > 0) {
                    g_retries -= 1;
                    setTimeout(download_file_recur.bind(null, i), 500);
                } else {
                    process.send('Error downloading file|  Exiting: '+ e.code);
                    process.send(e);
                    throw e;
                }
            }).setTimeout(30000, function() {
                console.log("request timeout");
                    this.abort();
            });
        }
    }
}

//create temp directory for video chunks, VOD
function mk_temp() {
    fs.mkdir(g_DOWNLOAD_DIR + g_TEMP, function (err) {
        if (err) {
            if (err.code == 'EEXIST') existing_chunks_checker(g_allChunks); // ignore the error if the folder already exists
            else process.send('Error MkDir: ' + err.code); // something else went wrong
        } else existing_chunks_checker(g_allChunks); // successfully created folder
    });
}

function download_vod(file_url, chunk_name, chunksToDownload) {
    var options = request_options(file_url);
    var dataParts = [];

    https.get(options, function (res) {
        if ((res.statusCode !== 200) && (g_retries > 0)) { //video chunk might be incomplete/empty. retry.
            g_retries -= 1;
            setTimeout(function (file_url, chunk_name, chunksToDownload) {
                download_vod.bind(null, file_url, chunk_name, chunksToDownload);
            }, 2000);
        } else {
            res.on('data', function (data) {
                dataParts.push(data);
            }).on('end', function () {
                var chunkBuffer = Buffer.concat(dataParts);

                if(res.headers['content-length'] == chunkBuffer.length){
                    fs.writeFile(g_DOWNLOAD_DIR + g_TEMP + chunk_name, chunkBuffer, function(){
                        g_readyToAppend.push(chunk_name); //add to list of downloaded video chunks for concatenation
                        g_allChunksToDownload.shift();
                        g_counter += 1;
                        if (g_counter === chunksToDownload.length) {
                            var progress = Math.round((g_readyToAppend.length / g_allChunks.length) * 100) + '%';
                            process.send(progress)
                            g_counter = 0;
                            process_playlist(g_allChunksToDownload);
                            if (g_readyToAppend.length >= g_allChunks.length) {
                                concat_all();
                            }
                        }
                    });
            }else{
                download_vod(file_url, chunk_name, chunksToDownload);
            }
            });
        }
    }).on('error', function (e) {
        process.send('Warning Download file error: ' + e.code)
        if (g_retries > 0) {
            if (!g_retrying) { //when multiple get requests fail, retry once
                g_retries -= 1;
                g_retrying = true;
                setTimeout(process_playlist.bind(null, g_allChunksToDownload), g_timeToRetry * 1000);
            }
        } else {
            process.send('Error Downloading file |  Exiting: ' + e.code);
            process.send(e);
            throw e;
        }
    }).setTimeout(30000, function() {
        console.log("request timeout");
            this.abort();
    });
}

// when downloading of VOD was somehow interrupted, this will check which video chunks were downloaded to prevent unnecessary redownloading. 
// it is very difficult to download whole VODs that are very long (3-24H), with this you can continue dowmnloading after crash or connection problems.  
function existing_chunks_checker() {
    var filesChecked = 0;
    var filesToVerify = [];
    var fileSizes = [];
    var allRequestsChecked = 0;
    var requestsCounter = 0;
    var numfilesToVerify = 0;
    var simultaneous_check = g_simultaneous_down * 2;
    g_allChunks.forEach(function (videoChunk) { //checking existance and size of dowloaded video chunks.
        fs.stat(g_DOWNLOAD_DIR + g_TEMP + videoChunk, function (err, stats) {
            if (stats) { // chunk downloaded already
                filesToVerify.push(videoChunk);
                fileSizes.push(stats.size);
                filesChecked += 1;
                if (filesChecked === g_allChunks.length) {
                    numfilesToVerify = filesToVerify.length;
                    divide_requests();
                }
            } else { // does not exist, download this chunk
                filesChecked += 1;
                g_allChunksToDownload.push(videoChunk);
                if ((filesChecked === g_allChunks.length) && !filesToVerify.length) {
                    process_playlist(g_allChunksToDownload);
                } else if (filesChecked === g_allChunks.length) {
                    numfilesToVerify = filesToVerify.length;
                    divide_requests();
                }
            }
        });
    });

    function divide_requests() { //prevent sending potentially thousands of requests at once.
        filesToVerify.length < simultaneous_check ? simultaneous_check = filesToVerify.length : '';
        for (var i = 0; i < simultaneous_check; i++) {
            request_file_size(filesToVerify[i], fileSizes[i], simultaneous_check);
        }
    }

    function request_file_size(videoChunk, fileSize, numAtOnce) { //comparing file size on disk to content length in header from https request.
        var chunkUrl = url.resolve(g_m3u_url, videoChunk);
        var options = request_options(chunkUrl, 'HEAD'); // get headers only
        var req = https.request(options, function (res) {
            allRequestsChecked += 1;
            requestsCounter += 1;
            filesToVerify.shift();
            fileSizes.shift();
            if (res.headers['content-length'] == fileSize) { // correct filesize, no need to redownload.
                g_readyToAppend.push(videoChunk);
            } else { //                                      // incomplete file, redownload
                g_allChunksToDownload.push(videoChunk);
            }
            if ((filesChecked === g_allChunks.length) && (allRequestsChecked === numfilesToVerify)) {
                process.send('verified size of ' + allRequestsChecked + ' files/' + g_allChunks.length + ', ' + g_readyToAppend.length + ' are OK.');
                if (g_allChunksToDownload.length) {
                    process_playlist(g_allChunksToDownload);
                } else {
                    concat_all();
                }
            } else if (requestsCounter === numAtOnce) {
                requestsCounter = 0;
                divide_requests();
            }
        });
        req.end();
        req.on('error', function (e) {
            process.send('Warning problem with size checking request: ' + e.code);
            process.send(e);
            allRequestsChecked += 1; //when problems with checking files online, add to download list.
            filesToVerify.shift();
            g_allChunksToDownload.push(videoChunk);
            if ((filesChecked === g_allChunks.length) && (allRequestsChecked === numfilesToVerify)) {
                process.send('verified size of ' + allRequestsChecked + ' files/' + g_allChunks.length + ', ' + g_readyToAppend.length + ' are OK.');
                if (g_allChunksToDownload.length) {
                    process_playlist(g_allChunksToDownload);
                } else {
                    concat_all();
                }
            } else if (requestsCounter === numAtOnce) {
                divide_requests();
            }
        }).setTimeout(10000, function() {
            console.log("request headers timeout");
                this.abort();
        });
    }

}

function concat_all() {
    var i = 0;
    process.send('Finished downloading, concatenating video parts.');

    (function concat_recur(i) {
        if (i === g_allChunks.length) { //finished concatenating
            var removedNum = 0;
            g_allChunks.forEach(function (item_to_del) { // delete all video chunks
                fs.unlink(g_DOWNLOAD_DIR + g_TEMP + item_to_del, function () {
                    removedNum += 1;
                    if (removedNum === g_allChunks.length) {
                        fs.rmdir(g_DOWNLOAD_DIR + g_TEMP, function () { //remove temp folder if empty
                            process.exit();
                        });
                    }
                });
            });
            process.send('Up time: ' + formatTime(Math.floor(process.uptime())));
            process.send('Saved as: ' + g_fileName + '.ts');
        } else {
            fs.readFile(g_DOWNLOAD_DIR + g_TEMP + g_allChunks[i], {
                encoding: 'binary'
            }, function (err, data) {
                if (err) { // on error skip this file and continue.
                    process.send('Warning Concat readfile error: ' + err.code)
                    process.send(err)
                    i += 1;
                    concat_recur(i);
                } else {
                    fs.appendFile(g_DOWNLOAD_DIR + g_fileName + '.ts', data, {
                        encoding: 'binary'
                    }, function (err) {
                        if (err !== null ? err.code == 'EBUSY' : false) { //if EBUSY ignore it and try again
                            concat_recur(i);
                        } else {
                            if (err) {
                                process.send('Error Concat append: ' + err.code)
                                g_retries -= 1;
                            } // log error and try to continue with next file
                            if (g_retries > 0) {
                                i += 1;
                                concat_recur(i);
                            } else {
                                process.send('Error Concat append|  Exiting.');
                                process.send(err);
                                throw err;
                            }
                        }
                    });
                }
            });
        }
    })(i)
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