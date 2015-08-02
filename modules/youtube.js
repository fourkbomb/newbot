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
 var util = require('util');

 (function(yt) {
 	var YOUTUBE_BASE_API = 'https://www.googleapis.com/youtube/v3/';
 	var api_key;

 	yt.init = function init(bot) {
 		api_key = bot.getConfig().google_api_key;
 	}

 	function commify(bigNum) {
 		bigNum = String(bigNum);
 		var result = '';
 		for (var i = 0; i < bigNum.length; i++) {
 			if (i > 0 && i % 3 == 0) {
 				result = ',' + result;
 			}
 			result = bigNum[bigNum.length - (i+1)] + result;
 		}
 		return result;
 	}

 	function getYoutubeMsg(id, callback) {
 		var query = {
 			'id': id,
 			'part': 'statistics,snippet',
 			'key': api_key
 		}
 		request({
 			'uri': YOUTUBE_BASE_API + 'videos',
 			'qs': query
 		}, function(error, response, body) {
 			if (!error && response.statusCode === 200) {
 				var r = JSON.parse(body).items[0];
 				var likePct = Number(r.statistics.likeCount) / (Number(r.statistics.likeCount) + Number(r.statistics.dislikeCount));
 				likePct *= 100;
 				likePct = Math.round(likePct);
 				callback(r.snippet.title + ' • ' + r.snippet.channelTitle + ' • ' + likePct + '% like • '
 					+ commify(r.statistics.commentCount) + ' comments • ' + commify(r.statistics.viewCount) + ' views • '
 					+ 'http://youtu.be/' + id);
 			} else {
 				callback("[Failed to get video metadata] - http://youtu.be/" + id);
 			}
 		})
 	}

 	yt['youtube_com'] = function(url, cb) {
 		var u = uri.parse(url, true);
 		if (u.pathname != '/watch') return false;
 		if (u.query.v) {
 			getYoutubeMsg(u.query.v, cb);
 			return true;
 		}
 		return false;
 	}

 	yt['www_youtube_com'] = yt['youtube_com'];
 	yt['youtu_be'] = function(url, cb) {
 		var u = uri.parse(url);
 		if (u.pathname.length > 1) {
 			getYoutubeMsg(Array.prototype.slice.call(u.pathname, 1).join(''), cb);
 			return true;
 		}
 		return false;
 	}

 	yt.cmd_youtube = function(msg) {
 		var query = {
 			'q': msg.getArgs().join(' '),
 			'key': api_key,
 			'part': 'id',
 			'maxResults': 4
 		};
 		request({
 			'uri': YOUTUBE_BASE_API + 'search',
 			'qs': query
 		}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				var r = JSON.parse(body);
				var idx = 0;
				while (!r.items[idx].id.videoId) idx++;
				var id = r.items[idx].id.videoId;
				getYoutubeMsg(id, function(m) {
					msg.reply(m);
				});

			} else if (error) {
				msg.reply("An error occurred reaching YouTube: " + error);
				console.log(error);
			} else {
				msg.reply("YouTube returned a not-OK response: " + response.statusCode);
				console.log('response.statusCode:', response.statusCode, "body:", body);
			}
		});
 	}

 	yt.cmd_ytid = function(msg) {
 		getYoutubeMsg(msg.getArgs()[0], function(m) {
 			msg.reply(m);
 		});
 	}

 	yt.cmd_yt = yt.cmd_youtube;
 })(module.exports);