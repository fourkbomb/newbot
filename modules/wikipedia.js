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
var uri = require('url');
var xml2js = require('xml2js');

 (function(wp) {
 	var WP_API_BASE = 'https://en.wikipedia.org/w/api.php';

 	wp.cmd_wp = function(msg) {
 		var query = {
 			'action': 'opensearch',
 			'limit': '3',
 			'namespace': '0',
 			'format': 'xml',
 			'search': msg.getArgs().join(' ')
 		};

 		request({
 			'uri': WP_API_BASE,
 			'qs': query
 		}, function(error, response, body) {
 			if (error) {
 				console.log('Failed to query wikipedia for ' + query.search + ':', error);
 				console.log(error.stack);
 				msg.reply("An error occurred connecting to Wikipedia: " + error);
 			} else if (response.statusCode != 200) {
 				console.log('Non-200 response code from wikipedia for ' + query.search + ' - ' + response.statusCode);
 				msg.reply("Wikipedia is not OK! HTTP " + response.statusCode);
 			} else {
 				xml2js.parseString(body, function(err, res) {
 					var item = res.SearchSuggestion.Section[0].Item[0];
 					msg.reply(item.Text[0]._ + ' • ' + item.Description[0]._ + ' • ' + item.Url[0]._);
 				})
 			}
 		});

 	}
 	wp.cmd_wikipedia = wp.cmd_wp;

 	wp['en_wikipedia_org'] = function(url, cb) {
 		url = uri.parse(url);
 		console.dir(url);
 		if (url.query) return false;
 		var query = {
 			'format': 'json',
 			'action': 'query', 
 			'prop': 'extracts',
 			'titles': url.pathname.split('/')[2].replace('_', ' ')
 		};
 		request({
 			'uri': WP_API_BASE,
 			'qs': query
 		}, function(error, response, body) {
 			//Rozelle Tram Depot - Wikipedia, the free encyclopedia • https://en.wikipedia.org 
 			if (error) {
 				cb("An error occurred connecting to Wikipedia: " + error);
 				console.log(error);
 				console.log(error.stack);
 			} else if (response.statusCode != 200) {
 				cb("Non-200 response from Wikipedia.");
 			} else {
 				var j = JSON.parse(body).query.pages;
 				var keys = Object.keys(j);
 				for (var i = 0; i < keys.length; i++) {
 					if (j[keys[i]].title) break;
 				}
 				var extract = j[keys[i]].extract.replace(/<\/?\w.*?>/g, '');
 				extract = Array.prototype.slice.call(extract, 0, 300).join('');
 				extract = extract.split('. ').slice(0,-1).join('. ');
 				cb(j[keys[i]].title + ' • ' + extract + '.');
 			}
 		});
 		return true;
 	}
 })(module.exports);
