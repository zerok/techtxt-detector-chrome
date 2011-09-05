(function() {
    var $ext = chrome.extension,
        cacheTimeout = 1000 * 60 * 60; // 1h

    function makeAbsoluteUrl(url) {
        var loc = document.location,
            absUrl = "";
        if (url.indexOf('://') !== -1) {
            return url;
        }
        absUrl = loc.protocol + '//' + loc.hostname; 
        if (loc.port !== '80') {
            absUrl += ':' + loc.port;
        }
        if (url.indexOf('/') === 0) {
            return absUrl + url;
        } else {
            return absUrl + loc.pathname + url;
        }
    }

    function findUrl(callback) {
        if (typeof localStorage['techtxt.url'] !== 'undefined') {
            var oldTS = null,
                now = new Date().getTime();
            if (typeof localStorage['techtxt.createdAt'] !== 'undefined') {
                oldTS = parseInt(localStorage['techtxt.createdAt'], 10);
                if (isNaN(oldTS)) {
                    oldTS = 0;
                }
            }
            if (now - oldTS < cacheTimeout) {
                return callback(localStorage['techtxt.url']);
            }
        }
        var url = null,
            callback_ = function(url_) {
                if (url_ !== '') {
                    url_ = makeAbsoluteUrl(url_);
                }
                localStorage['techtxt.url'] = url_;
                localStorage['techtxt.createdAt']= new Date().getTime();
                callback(url_);
            };
        url = findUrlInDom(document);
        if (url === "") {
            findUrlOnDomain(document, callback_);
        } else {
            callback_(url);
        }
    }

    /**
     * Checks the DOM for a reference to a tech.txt file and returns it if
     * found. Otherwise false is returned.
     */
    function findUrlInDom(doc) {
        var links = doc.querySelectorAll('head>link'),
            linkCnt = links.length,
            link = null;
        for (var i = 0; i < linkCnt; i++) {
            link = links[i];
            if (link.getAttribute('rel') === 'tech.txt') {
                return link.getAttribute('href');
            }
        }
        return "";
    }

    /**
     * Check if there exists something like http://domain.com/tech.txt
     */
    function findUrlOnDomain(doc, callback) {
        var loc = doc.location,
            url = loc.protocol + '//' + loc.host + '/tech.txt',
            req = new XMLHttpRequest(),
            lockKey = 'techtxt-lookup-in-progress';
        // Don't do a lookup on file://
        if (loc.protocol === 'file:') return callback(false);
        // Make sure that the XHR is only done once per document
        if (typeof localStorage[lockKey] !== 'undefined' && localStorage[lockKey]) return;
        localStorage[lockKey] = true;
        req.open('HEAD', url, true);
        req.onreadystatechange = function(evt) {
            if (req.readyState === 4) {
                delete localStorage[lockKey];
                if (req.status < 400 && req.status >= 200) {
                    callback(url);
                } else {
                    callback("");
                }
            }
        };
        req.send(null);
    }
    
    $ext.onRequest.addListener(function(data, sender, sendResponse) {
        if (typeof data === 'string' && data === 'url') {
            sendResponse(localStorage['techtxt.url']);
            return;
        }
        findUrl(function(url) {
            sendResponse({
                tabId: data.tabId,
                url: url
            });
        });
    });
})();
