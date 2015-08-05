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
	moment = require('moment'),
	fs = require('fs');
//request.setMaxListeners(9001);
(function(grok){
	var USER_AGENT = 'newbot.grokscraper (like Gecko; rv:1.0) AppleWebKit/367.5 Gecko/20100101 Firefox/41.0';
	var DISCOURSE_URL = 'https://forum.groklearning.com';
	var DISCOURSE_API_QS = {}; // just in case.
	var catTitleMatch = /^ch15/;
	var catIDs = [];
	var grok_discourse = null;
	var grok_session = null;
	var grok_t = null;
	grok.notify_chan = null;
	var _bot;
	var categories = {};
	grok.seen_posts = {};
	grok.ignore_thread = [];
	grok.INTERVAL_ID = null;
	grok.init = function(bot) {
		_bot = bot;
		if (grok.INTERVAL_ID) return;
		var cfg = bot.getConfig().grok;
		grok_session = cfg.ck_session;
		grok_discourse = cfg.ck_discourse;
		grok_t = cfg.ck_t;
		grok.notify_chan = cfg.notify_chan;
		if (cfg.ignore_threads)
			grok.ignore_threads = cfg.ignore_threads;
		loadCategories();
		resetSeenPosts();
	}

	grok.unload = function() {
		console.log('clear grok.poll interval: ' + grok.INTERVAL_ID);
		clearInterval(grok.INTERVAL_ID);
	}

	function getCookie() {
		return 'grok_session=' + grok_session + '; _t=' + grok_t + '; grok_discourse=' + grok_discourse;
	}

	function loadCategories() {
		// Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:41.0) Gecko/20100101 Firefox/41.0
		console.log('Cookie string:',getCookie());
		request({
			'url': DISCOURSE_URL + '/categories.json',
			'headers': {
				'User-Agent': USER_AGENT,
				'Cookie': getCookie()
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var json = JSON.parse(body).category_list;
				for (var cat in json.categories) {
					if (catTitleMatch.test(json.categories[cat].slug)) {
						catIDs.push(json.categories[cat].id);
						categories[json.categories[cat].id] = json.categories[cat].name;
						console.log('Cat found -',json.categories[cat].slug,json.categories[cat].id);
					} else {
						console.log('Dud - ',json.categories[cat].slug,json.categories[cat].id);
					}
				}
			} else {
				console.log(error, response ? response.statusCode : '');
			}
		});
	}

	function forEachLatestPost(cb_during, cb_end) {

		request({
			'url': DISCOURSE_URL + '/latest.json',
			'qs': DISCOURSE_API_QS,
			'headers': {
				'User-Agent': USER_AGENT,
				'Cookie': getCookie()
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var json = JSON.parse(body).topic_list.topics;
				for (var topic in json) {
					cb_during(json[topic]);
				}
			}
			if (typeof cb_end == 'function') cb_end();
		});
	}

	function resetSeenPosts() {
		if (!grok_session) return;
		forEachLatestPost(function(json) {
			grok.seen_posts[getPostDateIdent(json)] = true;
		}, function() {
			if (grok.INTERVAL_ID) clearInterval(grok.INTERVAL_ID);
			grok.INTERVAL_ID = setInterval(grok.poll, 60000);
		})
	}

	function get_post_msg(json) {
		var is_new = false;
		if (json.posts_count == 1) {
			is_new = true;
		}
		var m = moment(is_new ? json.created_at : json.last_posted_at);
		var uname = json.last_poster_username;
		uname = uname.slice(0, -1) + '\u200D' + uname[uname.length - 1];
		var url = _bot.getConfig().grok.link_to_post ? ('https://forum.groklearning.com/t/-/' + json.id + '/' + json.posts_count) : 'https://ncss.ninja/t/' + json.id;
		if (is_new) {
			return "'\x02" + json.title + "\x0F' in " + categories[json.category_id] + " at \x02" + m.format("ddd, hh:mm:ss a") + "\x0F. "
						+ "by @\x02" + uname + "\x0F. "
						+ json.views + " views. \x02" + url + "\x0F"; 
		}
		return "'\x02" + json.title + "\x0F' in " + categories[json.category_id] + " at \x02" + m.format("ddd, hh:mm:ss a") + "\x0F. "
						+ json.posts_count + " post" + (json.posts_count == 1 ? "" : "s") + " - most recent by @" + uname + ". "
						+ json.like_count + " likes, " + json.views + " views. \x02" + url + "\x0F";
	}
	function getPostDateIdent(json) {
		var id = moment(json.last_posted_at).valueOf() + '$' + json.id;
		return id;
	}

	grok.poll = function () {
		if (!grok_session) return;
		var new_seen_posts = {};
		console.log('polling...');
		forEachLatestPost(function(json) { // for each
			if (catIDs.indexOf(json.category_id) == -1) return;
			if (grok.ignore_threads.indexOf(json.id) != -1) return;
			new_seen_posts[getPostDateIdent(json)] = true;
			if (getPostDateIdent(json) in grok.seen_posts) return;
			if (json.posts_count == 1) {
				_bot.writeln("PRIVMSG " + grok.notify_chan + " :New forum topic! " + get_post_msg(json));
			} else {
				_bot.writeln("PRIVMSG " + grok.notify_chan + " :New forum post in " + get_post_msg(json));
			}
		}, function() { // called at the end
			grok.seen_posts = new_seen_posts;
			console.log('done');
		});


	}
})(module.exports);
