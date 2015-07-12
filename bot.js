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


'use strict';
var net = require('net'),
	process = require('process'),
	EventEmitter = require('async-cancelable-events'),
	//EventEmitter = require('events').EventEmitter,
	config = require('./config'),
	Message = require('./message'),
	util = require('util'),
	path = require('path');

/**
 * Construct-a-bot
 *
 * @constructor
 * @param {Object} config - see 'config_sample.js' for an example
 */
function Bot(config) {
	EventEmitter.call(this);
	this.config = config;
	if (config.dummy) {
		// oh, ok :(
		return;
	}
	var that = this;
	var conn = net.connect(config.port, config.host, function() {
		console.log('Connected to ' + config.host + ':' + config.port);
			if (config.pass) that.writeln('PASS ' + config.pass);
			that.writeln('NICK ' + config.nick);
			that.writeln('USER ' + config.user + ' 8 * :' + config.rname);
	});
	conn.setEncoding('utf-8');
	this.socket = conn;

	this.nick = config.nick;
	this.modules = {
		'base': {
			'cmd_loadmod': this.cmd_loadmod
		}
	};
	this.ready = false;
	var ready = false;
	this.nick = config.nick;
	this.socket.on('data', function(data) {
		var lines = data.split('\r\n');
		var el;
		for (el = 0; el < lines.length; el++) {
			lines[el] = lines[el].trim().replace(/ +/, ' ');
			if (/^\s*$/.test(lines[el])) {
				continue;
			}
			//				sender    Code 			 dest  stuff
			var match = /^(:.+? )?([A-Za-z0-9]+?) ([^:]+?)? ?(:.+)?$/.exec(lines[el]);
			if (!match) {
				console.error('!! Regexp didn\'t match: "'+lines[el]+'"');
				continue;
			}
			var msgObj = {
				'sender': (match[1] || '').slice(1,-1),
				'code': match[2],
				'dest': match[3],
				'msg': (match[4] || '').slice(1).trim()
			};
			if (ready) {
				that._onLine(msgObj, lines[el]);
			} else {
				if (msgObj['code'] == '376') {
					console.log('we are go');					
					that.writeln('JOIN ' + that.config.chans.join(','));
					ready = true;
				}
			}
		}
	});

}

util.inherits(Bot, EventEmitter);

/**
 * Write a raw IRC message to the socket
 *
 * @param {string} line - the line to be sent. '\r\n' will be added automatically.
 *
 */
Bot.prototype.writeln = function writeln(line) {
	console.log('-->', line);
	this.socket.write(line + '\r\n');
}

/**
 * Load a module.
 * Any errors thrown will be caught and returned to the caller, else null will be returned.
 * 
 * @param {string} what - the name of the module to load. Should be located in config.moduleFolder, relative to process.cwd()
 * @return {?Error} any error that occurred
 */
Bot.prototype.loadMod = function loadMod(what) {
	var e;
	var fullPath = path.join(process.cwd(), this.config.moduleFolder || 'modules', what + '.js');
	if (fullPath in require.cache) {
		delete this.modules[what];
		delete require.cache[fullPath];
	}

	try {
		return this.registerMod(what, require(fullPath));
	} catch (e) {
		console.log(e.stack);
		return e;
	}
}

/**
 * Register a module.
 * If you have already require'd() a module and want to load it, use this
 *
 * @param {string} name - the module's name
 * @param {object} obj  - the module's object
 * @return {?Error} any error that occurred
 */
Bot.prototype.registerMod = function registerMod(what, obj) {
	try {
		if (what in this.modules) {
			throw "Trying to overwrite a module!";
		}
		this.modules[what] = obj;
		if (this.modules[what].init) this.modules[what].init(this);
	} catch (e) {
		console.log(e.stack);
		return e;
	}
	return null;
}

/**
 * Initial line handler
 * This fires all the other events
 * You *really* shouldn't call this *at all*
 *
 * @param {Object<string,string>} msg - the parsed line of chat
 * @param {string} rawLine - the raw line of chat
 */
Bot.prototype._onLine = function _onLine(msg, rawLine) {
	console.log(msg);
	var res;

	msg = new Message(this, msg.code, msg.sender, msg.dest, msg.msg, false);
	if (msg.getSenderNick() == this.nick) {
		if (msg.getType() == 'NICK' && msg.getSenderNick() == this.nick) {
			this.nick = msg.getMessage();
			console.log('Nick change to ' + this.nick);
		}
		return;
	}

	// shifty
	if (msg.getType() == 'PRIVMSG' && msg.isSenderSuperuser()) {
		if (msg.getMessage()[0] == '%') {
			try {
				msg.reply(eval(msg.getMessage().slice(1)));
			} catch (e) {
				msg.reply(e);
			}
			return;
		}
	}

	// handle pings
	if (msg.getType() == 'PING') {
		this.writeln('PONG :' + msg.getMessage());
		return;
	}

	if (msg.getType() == 'PRIVMSG') {
		if (msg.getMessage().slice(0, this.config.prefix.length) == this.config.prefix || msg.getMessage().startsWith(this.nick)) {
			let mod = null;
			msg.makeCommand();
			res = this._modMethodHelper('cmd_' + msg.getCommand(), msg);
			if (res === true) {
				return; // handled
			} else if (res !== false) {
				msg.reply('An error occurred: ' + res);
				console.log('Sick error in cmd_' + msg.getCommand() + ' event:', res);
				console.log(res.stack);
				return;
			}
		}


		res = this._modMethodHelper('onMsg', msg);
		if (res === true) {
			return; // handled
		} else if (res !== false) {
			msg.reply('An error occurred: ' + res);
			console.log('Sick error in onMsg event:', res);
			console.log(res.stack);
			return;
		}
	}

	// 1. post raw IRC event
	res = this._modMethodHelper('rawLine', msg);
	if (res === true) {
		return; // handled
	} else if (res !== false) {
		msg.reply('An error occurred: ' + res);
		console.log('Sick error in rawLine event:', res);
		console.log(res.stack);
		return;
	}
}

/**
 * Internal use only
 * calls a method in all loaded modules
 *
 * @param {string} name - method's name
 * @return {boolean|Error} true if method called, false if no method, Error if error occurred
 */
Bot.prototype._modMethodHelper = function _modMethodHelper(name) {
	var args = [];
	for (var i in arguments) {
		if (i == 0) continue;
		args.push(arguments[i]);
	}
	for (var mod in this.modules) {
		if (this.modules.hasOwnProperty(mod) && this.modules[mod].hasOwnProperty(name)) {
			try {
				if (this.modules[mod][name].apply(this.modules[mod], args)) {
					return true;
				}
			} catch (e) {
				return e;
			}
		}
	}
	return false;
}

/**
 * @param {Message} msg
 * @return {boolean} always true
 */
Bot.prototype.cmd_loadmod = function cmd_loadmod(msg) {
	if (msg.isSenderSuperuser()) {
		var res = msg.getBot().loadMod(msg.getArgs()[0]);
		if (res !== null) {
			e.reply('An error occurrred: ' + res.stack);
		}

	} else msg.reply("Nope.");
	return true;
}


module.exports = Bot;


