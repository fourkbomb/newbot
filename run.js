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


var Bot = require('./lib/bot');
var config = require('./config');
var util = require('util'),
	path = require('path');
var b = new Bot(config);
console.log(util.inspect(Bot.prototype));
b.connect();

var fake_module = {
	'cmd_reload': function(msg) {
		if (msg.isSenderSuperuser()) {
			msg.reply("I'll be unresponsive for a second or so, hold on...");
			// get the socket, clear out event listeners and reload the bot modules
			b.clearCache();
			var sock = b.getSock();
			sock.removeAllListeners();

			Bot = require('./lib/bot');
			config = require('./config');
			b = new Bot(config);
			b.connect(sock);
			b.registerMod('run', fake_module);
			msg.setBot(b);
			msg.reply("I'm back!");
		}
	}
}
b.registerMod('run', fake_module);

// you can do whatever here - load modules, etc