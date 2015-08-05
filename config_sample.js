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


/*
 * newbot config
 */
module.exports = {
	// host of the IRC server
	'host': 'chat.freenode.net',
	// port of the IRC server
	'port': 6697,
	// enable ssl?
	'ssl': true,
	// list of modules to load before joining all channels
	'mods': [],
	// nick of the bot
	'nick': 'BOT_____1',
	// username
	'user': 'newbot',
	// password to be used for /PASS
	'pass': false, // if no pass
	// real name
	'rname': 'Wouldn\'t you like to know?',
	// location of modules
	'moduleFolder': 'modules',
	// command prefix
	'prefix': ']',
	// super users
	'superusers': /fo?rkbo?mb/,
	// channels to auto-join
	'chans': ['##newbotthebestbot'],
	// Google API key, optional. Modules depending on this will not add functionality if this is not set.
	'google_api_key': false,
	// Google Custom Search Engine ID. Instructions on creating a proper search engine are here: http://stackoverflow.com/a/11206266/2197297
	// Only necessary if you wish to use the 'google' module.
	'google_cs_id': false,
	// Grok Learning information. Only necessary if you wish to use the 'grok' module
	'grok': {
		'ck_discourse': null, // the 'grok_discourse' cookie
		'ck_session': null, // the 'grok_session' cookie
		'ck_t': null, // the '_t' cookie
		'ignore_threads': [12942, 12975], // thread IDs to not notify about
		'notify_chan': '##ncss_challenge' // channel to send new post notifications to.
	}
	// does nothing
	'config_path': 'config.js'
};
