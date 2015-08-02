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
	util = require('util'),
	url = require('url');

(function(ud) {
	var UD_API_DEFINE = 'http://api.urbandictionary.com/v0/define';
	function getUrbanDefinition(term, cb) {
		request({
			'uri': UD_API_DEFINE,
			'qs': {
				'term': term
			}
		}, function(error, response, body) {
			if (error) {
				cb(error + '');
				console.log('Failed to grab UD API:', error);
				console.log(error.stack);
			} else if (response.statusCode != 200) {
				cb('Invalid response from server - ' + response.statusCode);
			} else {
				var json = JSON.parse(body);
				var definition = json.list[0].definition;
				if (definition.length > 150) {
					definition = Array.prototype.slice.call(definition, 0, 147).join('') + '...';
				}
				var example = json.list[0].example.replace(/\r\n/g, ' ');
				if (example.length > 150) {
					example = Array.prototype.slice.call(example, 0, 147).join('') + '...';
				}
				cb(json.list[0].word + ': ' + definition + ' • example: ' + example + ' • ' + json.list[0].permalink);
			}
		})
	}

	ud.cmd_ud = function(msg) {
		getUrbanDefinition(msg.getArgs().join(' '), function(a) {
			msg.reply(a);
		});
	};



})(module.exports);