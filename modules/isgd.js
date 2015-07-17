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
 (function(isgd) {
 	var API_ENDPOINT = 'http://is.gd/create.php';
 	isgd.init = function(bot) {
 		//bot.registerRoleProvider('urlshortener', this);
 	}

 	isgd.urlshortener = function(url, cb) {
 		console.log(require('util').inspect(arguments));
 		request({
 			'uri': API_ENDPOINT,
 			'qs': {
 				'format': 'simple',
 				'url': url
 			}
 		}, function(error, response, body) {
 			if (typeof cb !== 'function') {
 				//console.log("I WAS LIED TO!", error, response, body);
 				return;
 			}
 			if (error) {
 				cb(error, null);
 			} else {
 				cb(null, body);
 			}
 		});
 		return true;
 	}
 })(module.exports);