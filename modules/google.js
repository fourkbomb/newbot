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
var request = require('request');
var entities = require('entities');
(function(g) {
	var api_key;
	var cs_id;

	g.init = function(bot) {
		api_key = bot.getConfig().google_api_key;
		cs_id = bot.getConfig().google_cs_id;
	} 
	/** 
	 * @type {string}
	 * @const
	 */
	var GOOGLE_SEARCH_API_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

	function makeIRCFriendly(string) {
		return entities.decodeHTML(string).replace(/<b>/g, "\x02").replace(/<\/b>/g, "\x0F").replace(/<br>/g, "");
	}

	function getGoogleMsg(json, bot, callback) {
		var res = 'Result: ';
		if (json.items.length > 0) {
			var sr = json.items[0];
			res += makeIRCFriendly(sr.htmlTitle) + " - ";
			res += makeIRCFriendly(sr.htmlSnippet) + " - ";
			if (bot.hasRoleProvider('urlshortener')) {
				bot.callRoleProvider('urlshortener', sr.link, function(error, result) {
					if (error)
						res += sr.link;
					else res += result;
					callback(res);
				})
			} else {
				callback(res + sr.link);
			}
		} else {
			callback("No results found!");
		}
	}

	g.cmd_google = function(msg) {
		var query = {
			'key': api_key,
			'cx': cs_id,
			'q': msg.getArgs().join(' ')
		};
		request({
			'uri': GOOGLE_SEARCH_API_ENDPOINT,
			'qs': query
		}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				getGoogleMsg(JSON.parse(body), msg.getBot(), function(m) {
					msg.reply(m);
				});

			} else if (error) {
				msg.reply("An error occurred reaching Google: " + error);
				console.log(error);
			} else {
				msg.reply("Google returned a not-OK response: " + response.statusCode);
				console.log('response.statusCode:', response.statusCode, "body:", body);
			}
		});
	}

	g.cmd_g = g.cmd_google;

})(module.exports);