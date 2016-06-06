/*
 *  Copyright 2015 Simon Shields
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var request = require('request'),
	uri = require('url'),
	util = require('util');

 (function(www) {

 	function commify(bigNum) {
 		bigNum = String(Math.round(bigNum));
 		var result = '';
 		for (var i = 0; i < bigNum.length; i++) {
 			if (i > 0 && i % 3 == 0) {
 				result = ',' + result;
 			}
 			result = bigNum[bigNum.length - (i+1)] + result;
 		}
 		return result;
 	}
 	function getSize(bytes) {
 		unitIdx = 0;
 		units = ['B', 'KB', 'MB', 'GB', 'TB'];
 		while (bytes > 10000 && unitIdx < units.length) {
 			bytes /= 1000;
 			unitIdx++;
 		}
 		return commify(bytes) + units[unitIdx];

 	}

 	www.httpRegex = /(?:^|\s)(https?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|]*)(?:$|\s)/;

 	function getURLTitle(msg, url) {
 		var mmh = function mMHelperCallback(resp) {
 			msg.say(resp);
 		}
 		var parsed = uri.parse(url);
 		var res = msg.getBot().modMethodHelper(parsed.hostname.replace(/\./g, '_'), url, mmh)
 		if (res) {
 			if (typeof res !== 'boolean') {
 				console.log('Failed to fetch URL:', url, res);
 				console.log(res.stack);
 			} else {
 				return;
 			}
 		}
 		var opts = {
 			'url': url,
 			'headers': {
 				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:41.0) Gecko/20100101 Firefox/41.0' // seems legit
 			}
 		};
 		request(opts, function(error, response, body) {
 			if (error) return;
 			if (response.headers['content-type'] && response.headers['content-type'].startsWith('text/html')) {
 				var titleRegexp = /<title(?: .*?)?>(.*)<\/title>/;
 				var host = parsed.host;
 				if (titleRegexp.test(body)) {
 					var title = titleRegexp.exec(body)[1];
 					msg.say(host + ': ' + title);
 				} else {
 					msg.say(host + ': [No title]');
 				}
 			} else {
 				var length = 'Unknown length';
 				if (response.headers['content-length']) {
 					length = getSize(response.headers['content-length']);
 				}
 				msg.say(url + ': ' + response.headers['content-type'] + ', ' + length);
 			}
 		});
 	}

 	www.onMsg = function(msg) {
 		if (www.httpRegex.test(msg.getMessage())) {
 			var match, m = msg.getMessage();
 			while (www.httpRegex.test(m)) {
 				var match = www.httpRegex.exec(m);
				m = m.replace(www.httpRegex, "");
 				var url = match[1];
 				getURLTitle(msg, url);
 			}
            return true;
 			//msg.reply("Nice URL");
 		}
 		return false;
 	}

 })(module.exports)
