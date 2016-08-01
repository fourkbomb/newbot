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
	Message = require('./message'),
	util = require('util'),
	path = require('path'),
    lastMsgReceivedTimeout = -1;

/**
 * Construct-a-bot
 *
 * @constructor
 * @param {Object} config - see 'config_sample.js' for an example
 */
function Bot(config) {
	EventEmitter.call(this);
	this.config = config;
}

util.inherits(Bot, EventEmitter);

/**
 * Connect to the IRC network.

 * @param {?net.Socket} socket to use instead of making a new one
 */
Bot.prototype.connect = function connect(socket) {
	if (this.config.dummy) {
		// oh, ok :(
		return;
	}
	if (!this.loaded) {
		this.reloadConfig();
	}
	this.loaded = true;
	var that = this;
	if (this.config.ssl) net = require('tls');
	var conn = socket ? socket : net.connect(this.config.port, this.config.host, function() {
		console.log('Connected to ' + that.config.host + ':' + that.config.port);
			if (that.config.pass) that.writeln('PASS ' + that.config.pass);
			that.writeln('NICK ' + that.config.nick);
			that.writeln('USER ' + that.config.user + ' 8 * :' + that.config.rname);
	});
	conn.setEncoding('utf-8');
	this.socket = conn;

	this.nick = this.config.nick;
	this.modules = {
		'core': {
			'cmd_loadmod': this.cmd_loadmod,
			'cmd_quit': this.cmd_quit
		}
	};
	console.log('loading modules...');
	for (var i = 0; i < that.config.mods.length; i++) {
		var res = that.loadMod(that.config.mods[i]);
		if (res) {
			console.error('Error loading module "' + that.config.mods[i] + '":', res);
			console.error(res.stack);
		}
	}
	console.log('loaded modules.');
	this.ready = socket ? true : false;
	var ready = this.ready;
    var that = this;
    var reconnect = function reconnect() {
        that.socket.end();
        that.connect();
    };

	this.socket.on('data', function(data) {
		var lines = data.split('\r\n');
		var el;
        if (lastMsgReceivedTimeout != -1) clearTimeout(lastMsgReceivedTimeout);
        lastMsgReceivedTimeout = setTimeout(reconnect, 300 * 1000 /* 300s */);
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
					that.writeln('JOIN ' + that.config.chans.join(','));
					ready = true;
				}
			}
		}
	});
};

Bot.prototype.addIgnore = function addIgnore(nick) {
	this.config.ignores.push(nick);
}

Bot.prototype.unIgnore = function unIgnore(nick) {
	this.config.ignores.splice(this.config.ignores.indexOf(nick));
}

/**
 * @return {net.Socket} the bot's raw socket
 */
Bot.prototype.getSock = function getSock() {
	return this.socket;
}


/**
 * reload the bot's config
 *
 * @return {boolean} true if successful
 */
Bot.prototype.reloadConfig = function reloadConfig() {
	if (!this.config.config_path || typeof this.config.config_path !== 'string') return false;
	console.log('reloading config from', this.config.config_path);
	delete require.cache[path.join(process.cwd(), this.config.config_path)];
	try {
		var config = require('../' + this.config.config_path);
	} catch (e) {
		console.error('failed to load config from "' + this.config.config_path + '":', e);
		console.error(e.stack);
		return false;
	}
	if (!config.config_path) {
		config.config_path = this.config.config_path; // so if you screw up you can still reload
	}

	this.config = config;
	return true;
}

/**
 * clear require.cache. might have unintended side-effects, who knows.
 */
Bot.prototype.clearCache = function clearCache() {
	for (var el in require.cache) {
		delete require.cache[el];
	}
}


/**
 * Write a raw IRC message to the socket
 *
 * @param {string} line - the line to be sent. '\r\n' will be added automatically.
 *
 */
Bot.prototype.writeln = function writeln(line) {
	line=line.replace(/\r/g, '').replace(/\n/g, '');
	console.log('-->', line);
	this.socket.write(line+ '\r\n');
}

/**
 * @param {string} name - name of module to check
 * @return {boolean} true if module 'name' is loaded
 */
Bot.prototype.isModuleLoaded = function isModuleLoaded(name) {
	return name in this.modules;
}

/**
 * @param {string} name - name of module to get
 * @return {Object=} module, or null if it's not loaded
 */
Bot.prototype.getModule = function getModule(name) {
	return this.modules[name];
}

/**
 * unloads a module and removes it from require.cache<br />
 * if a module has already been removed but still exists in require.cache,<br />
 * it will be removed from require.cache - and vice versa.
 *
 * @param {string} name - name of module to unload
 */
Bot.prototype.unloadModule = function unloadModule(name) {
	var fullPath = path.join(process.cwd(), this.config.moduleFolder || 'modules', name + '.js');
	if (this.isModuleLoaded(name) || fullPath in require.cache) {
		if (this.modules[name] && this.modules[name].unload) this.modules[name].unload();
		delete this.modules[name];
		delete require.cache[fullPath];
	}
}

/**
 * Load a module.<br />
 * Any errors thrown will be caught and returned to the caller, else null will be returned.
 * 
 * @param {string} what - the name of the module to load. Should be located in config.moduleFolder, relative to process.cwd()
 * @return {?Error} any error that occurred
 */
Bot.prototype.loadMod = function loadMod(what) {
	var e;
	var fullPath = path.join(process.cwd(), this.config.moduleFolder || 'modules', what + '.js');
	this.unloadModule(what);	

	try {
		return this.registerMod(what, require(fullPath));
	} catch (e) {
		console.log(e);
		console.log(e.stack);
		return e;
	}
}

/**
 * Register a module.<br />
 * If you have already <code>require</code>'d() a module and want to load it, use this
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
 * internal line handler<br />
 * This fires all the other events<br />
 * You *really* shouldn't call this *at all*
 *
 * @access private
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

	if (this.config.ignores.indexOf(msg.getSenderNick()) != -1) return;

	// handle pings
	if (msg.getType() == 'PING') {
		this.writeln('PONG :' + msg.getMessage());
		return;
	}

	if (msg.getType() == 'PRIVMSG') {
		if (msg.getMessage().slice(0, this.config.prefix.length) == this.config.prefix || msg.getMessage().startsWith(this.nick)) {
			let mod = null;
			msg.makeCommand();
			res = this.modMethodHelper('cmd_' + msg.getCommand(), msg);
			if (res === true) {
				return; // handled
			} else if (res !== false) {
				msg.reply('An error occurred: ' + res);
				console.log('Sick error in cmd_' + msg.getCommand() + ' event:', res);
				console.log(res.stack);
				return;
			}
		}


		res = this.modMethodHelper('onMsg', msg);
		if (res === true) {
			return; // handled
		} else if (res !== false) {
			msg.say('An error occurred: ' + res);
			console.log('Sick error in onMsg event:', res);
			console.log(res.stack);
			return;
		}
	}

	// 1. post raw IRC event
	res = this.modMethodHelper('rawLine', msg);
	if (res === true) {
		return; // handled
	} else if (res !== false) {
		msg.say('An error occurred: ' + res);
		console.log('Sick error in rawLine event:', res);
		console.log(res.stack);
		return;
	}
}

/**
 * calls a method in all loaded modules
 *
 * @param {string} name - method's name
 * @return {boolean|Error} true if method called, false if no method, Error if error occurred
 */
Bot.prototype.modMethodHelper = function modMethodHelper(name) {
	var args = [];
	for (var i in arguments) {
		if (i == 0) continue;
		args.push(arguments[i]);
	}
	console.log(name);
	for (var mod in this.modules) {
		if (this.modules.hasOwnProperty(mod) && this.modules[mod].hasOwnProperty(name)) {
			try {
				if (this.modules[mod][name].apply(this.modules[mod], args)) {
					console.log(' found in ' + mod);
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
 * command to load a module (once again, internal use only)
 * @access private
 * @param {Message} msg
 * @return {boolean} always true
 */
Bot.prototype.cmd_loadmod = function cmd_loadmod(msg) {
	if (msg.isSenderSuperuser()) {
		var res = msg.getBot().loadMod(msg.getArgs()[0]);
		if (res !== null) {
			msg.reply('An error occurrred: ' + res);
			return;
		}
		msg.reply("Success.");

	} else msg.reply("Nope.");
	return true;
}

/**
 * command to quit
 * @access private
 * @param {Message} msg
 * @return {boolean} true
 */
Bot.prototype.cmd_quit = function cmd_quit(msg) {
	if (msg.isSenderSuperuser()) {
		msg.getBot().writeln("QUIT :OOM killed");
	}
	setTimeout(function() {
		throw "Bot Quit!";
	}, 20);
	return true;
}

/**
 * get the bot's current nick
 * @return {string} nick
 */
Bot.prototype.getNick = function getNick() {
	return this.nick;
}

/**
 * get the bot's config.<br />
 * an example can be found in <a href="config_sample.js.html">config_sample.js</a>
 *
 * @return {Object<string,?>} config - the bot's config
 */
Bot.prototype.getConfig = function getConfig() {
	return this.config;
}

/**
 * @param {string} role - role to look up. (e.g. urlshortener)
 * @return {boolean} true if there is a role provider for 'role'
 */
Bot.prototype.hasRoleProvider = function hasRoleProvider(role) {
	for (var mod in this.modules) {
		if (this.modules[mod][role]) {
			return true;
		}
	}
	return false;
}

/**
 * Call a 'role' provider - which provides a common piece of functionality.<br />
 * For example, the 'urlshortener' provider might provide a url shortener.
 * Depending on the module used it could use goo.gl/bit.ly/is.gd/etc.<br />
 * <br />
 * Provide any arguments to the role provider here.<br />
 * For example, the 'urlshortener' would take a URL and a callback
 *
 * @param {String} role - role to request
 * 
 */
Bot.prototype.callRoleProvider = function callRoleProvider(role) {
	if (this.hasRoleProvider(role)) {
		var args = Array.prototype.slice.apply(arguments, [1]);
		args.unshift(role);
		console.log(args);
		return this.modMethodHelper.apply(this, args);
	}
}

module.exports = Bot;


