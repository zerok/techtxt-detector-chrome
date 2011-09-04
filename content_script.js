(function() {
    var $ext = chrome.extension;

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
            return absUrl + pathname + url;
        }
    }

    function findUrl(callback) {
        if (typeof localStorage['techtxt_url'] !== 'undefined') {
            callback(localStorage['techtxt_url']);
        }
        var url = null,
            _callback = function(url) {
                url = makeAbsoluteUrl(url);
                localStorage['techtxt_url'] = url;
                callback(url);
            };
        url = findUrlInDom(document);
        if (url === null) {
            findUrlOnDomain(document, _callback);
        } else {
            _callback(url);
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
            sendResponse(localStorage['techtxt_url']);
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
