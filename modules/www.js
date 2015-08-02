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
	uri = require('url');

 (function(www) {

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
 		console.log('request ' + url);
 		request(url, function(error, response, body) {
 			if (response.headers['content-type'].startsWith('text/html')) {
 				var titleRegexp = /<title(?: .*?)?>(.*)<\/title>/;
 				if (titleRegexp.test(body)) {
 					var title = titleRegexp.exec(body)[1];
 					msg.say(title + ' • ' + parsed.protocol + '//' + parsed.host);
 				} else {
 					msg.say('[No title] • ' + parsed.protocol + '//' + parsed.host);
 				}
 			} else {
 				msg.say(url + ': ' + response.headers['content-type'] + ', Unknown length');
 			}
 		});
 	}

 	www.onMsg = function(msg) {
 		console.log('Got msg');
 		if (www.httpRegex.test(msg.getMessage())) {
 			var match, m = msg.getMessage();
 			if (www.httpRegex.test(m)) {
 				var match = www.httpRegex.exec(m);
 				var url = match[1];
 				getURLTitle(msg, url);
 			}
 			//msg.reply("Nice URL");
 		}
 		return true;
 	}

 })(module.exports)