if (typeof GM_xmlhttpRequest === 'undefined') {  // for NW.js
    GM_xmlhttpRequest = function(options) {
        // re-implementation of GM_xmlhttpRequest for Node.js
        // platforms like NW.js
    
        var onload = options.onload;
        options.onload = null;
        var u = url.parse(options.url);
        options.host = u.host;
        options.hostname = u.hostname;
        options.path = u.path;
        options.protocol = u.protocol;
        var chunks = '';
        var chunks2 = [];// needed for binary decryption key
        var req = https.request(options, function (res) {
            // res.setEncoding('utf8');
            res.on('data', function (chunk) {
                chunks += chunk;
                chunks2.push(chunk);
            });
            res.on('end', function() {
                onload({
                    status: res.statusCode,
                    responseText: chunks,
                    finalUrl: res.headers['location'],
                    responseArray: chunks2
                });
            });
        });
        req.on('error', function (e) {
            console.error(e);
        });
        if (options.data)
            req.write(options.data);
        req.end();
        return req;
    };
}

function ApiWorker(
    http_method, ///< the HTTP method like `POST` `GET`
    api_root,    ///< The host-name+directory like 'https://api.periscope.tv/api/v2/'
    method,      ///< The method called. This will get appended to the api_root
    headers,     ///< HTTP headers
    params,      ///< form data to be used with HTTP method like `POST` 
    callback,    ///< Call back for success
    callback_fail ///< Call back for failed
    ) {
    if (!params)
        params = {};
    if (loginTwitter && loginTwitter.cookie)
        params.cookie = loginTwitter.cookie;
    Progress.start();
    var xhrIndex = XHR.length;
    var req = GM_xmlhttpRequest({
        method: http_method,
        url: api_root + method,
        headers: headers,
        timeout: 10000,
        data: JSON.stringify(params),
        onload: function (r) {
            Progress.stop();
            XHR.splice(xhrIndex, 1);
            var response, debug = $('#debug').length && $('#debug')[0].checked;
            switch (r.status) {
                case 200:
                    try {
                        response = JSON.parse(r.responseText);
                    } catch (e) {
                        if (debug)
                            console.warn('JSON parse error:', e);
                    }
                    if (!!response && callback)
                        callback(response);
                    $(window).trigger('scroll');    // for lazy load
                    break;
                case 406:
                    alert(JSON.parse(r.responseText).errors[0].error);
                    break;
                case 401:
                    SignOut();
                    break;
                default:
                    response = 'API error: ' + r.status + ' ' + r.responseText;
                    if (callback_fail && Object.prototype.toString.call(callback_fail) === '[object Function]')
                        callback_fail(response);
            }
            if (debug)
                console.log('Method:', method, 'params:', params, 'response:', response);
        }
    });
    XHR.push(req);
}

var PeriscopeWrapper = {
    default_api_root: 'https://api.periscope.tv/api/v2/',
    default_headers: {
        'User-Agent': 'Periscope/2699 (iPhone; iOS 8.1.2; Scale/2.00)'
    },
    V1_GET_ApiChannels: function(callback, url, authorization_token, langDt) {
        Progress.start();
        PeriscopeWrapper.V2_POST_Api('authorizeToken', {
            service: 'channels'
        }, function (authorizeToken) {
            this.authorization_token = authorizeToken.authorization_token;
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    Authorization: this.authorization_token,
                    'X-Periscope-User-Agent': 'Periscope/2699 (iPhone; iOS 8.1.2; Scale/2.00)',
                    locale: (langDt ? langDt.find('.lang').val() : "")
                },
                onload: function (r) {
                    Progress.stop();
                    if (r.status == 200) {
                        var response = JSON.parse(r.responseText);
                        if ($('#debug')[0].checked)
                            console.log('channels ' + url + ' : ', response);
                        callback(response);
                    }
                    else
                        console.log('channels error: ' + r.status + ' ' + r.responseText);
                }
            });
        });
    },
    V2_POST_Api: function(method, params, callback, callback_fail) {
        ApiWorker('POST', PeriscopeWrapper.default_api_root, method, PeriscopeWrapper.default_headers, params, callback, callback_fail);
    }
}
