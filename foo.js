/**
 * foo.js
 * Checks for external resources being loaded on WMF wikis
 * and JavaScript exceptions
 *
 * Released into the Public domain.
 */

var page = require('webpage').create();
/*
var system = require('system').create();
page.onResourceRequested = function(request) {
	console.log(JSON.stringify(request));
};
page.onResourceReceived = function(response) {
	console.log(JSON.stringify(response));
};
page.open(system.args[1], function(status) {
	console.log(status);
	phantom.exit();
});
*/

/**
 * Checks if the url is whitelisted
 * @param {string} url
 * @return {bool}
 */
function isUrlOk(url) {
	var pattern, out, host, index, WHITELIST = [
			"wikimedia.org",
			"wikipedia.org",
			"wiktionary.org",
			"wikisource.org",
			"wikiquote.org",
			"wikibooks.org",
			"wikinews.org",
			"wikidata.org",
			"wikivoyage.org",
			"mediawiki.org",
			"wikiversity.org",
			"toolserver.org", // hoo said this is fine
			"tools.wmflabs.org", // hoo said this is fine
			"wikimediafoundation.org",
		];
	// Assume data uris (fonts, images, etc.) are safe
	if ( url.indexOf('data:') === 0 ) {
		return true;
	}
	// from http://www.pixelstech.net/article/index.php?id=1339769805
	pattern=/(.+:\/\/)?([^\/]+)(\/.*)*/i;
	out = pattern.exec(url);
	//console.log(out[2]);
	for ( index in WHITELIST ) {
		host = WHITELIST[index];
		if (out[2].indexOf(host, out[2].length - host.length) !== -1) {
			return true;
		}
	}

	return false;
}

function analyzePages(sites) {
	var url;
	if (!sites) {
		phantom.exit();
	}
	url = sites.shift();
	if (!url) {
		// ???
		phantom.exit();
	}
	console.log('--- ' + url + ' ---');
	// Set some hooks
	page.onResourceRequested = function(request) {
		if (!isUrlOk(request.url)) {
			console.log('BAD: ' + request.url);
		}
//		console.log(JSON.stringify(request));
	};
	page.onResourceReceived = function(response) {
		//console.log(JSON.stringify(response));
	};
	page.open(url, function(status) {
		// ok, page finished loading do it again!
		analyzePages(sites);
	})
}

/**
 * Calls callback with an array of sites
 * @param {Object} page
 * @param {Function} callback
 */
function getAllWikis(page, callback) {
	var url = 'https://meta.wikimedia.org/w/api.php?action=sitematrix&format=json';
	page.open(url, function(status) {
		console.log('Fetched sitematrix.');
		var j = JSON.parse(page.plainText),
			sites = [];
		//console.log(JSON.stringify(j));
		for ( var key in j.sitematrix) {
			if (key == "count") {
				continue;
			}
			if (key == "specials") {
				for (var index in j.sitematrix[key]) {
					var site = j.sitematrix[key][index];
					if (!site.private) {
						sites.push(site.url);
					}
				}
			} else {
				for ( var index in j.sitematrix[key].site ) {
					sites.push(j.sitematrix[key].site[index].url);
				}
			}
		}
		//console.log(JSON.stringify(sites));
		callback(sites);
	});
}

/**
 * Logs into a wiki, not actually used yet.
 * @param {Object} page
 * @param {string} url just domain with protocol
 * @param {Function} callback
 */
function login(page, url, callback) {
	var data = 'action=login&lgname=legoktm another test&lgpassword=PASSWORD&format=json';
	url += '/w/api.php';
	page.open(url, 'post', data, function(status) {
		var j;
		console.log(page.plainText);
		j = JSON.parse(page.plainText);
		data += '&lgtoken=' + j.login.token;
		page.open(url, 'post', data, function(status) {
			// @todo check success?
			callback();
		});
	});
}

//login(page, 'https://en.wikipedia.org');
getAllWikis(page, analyzePages);
