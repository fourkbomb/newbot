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

(function(m) {
	/**
	* @param {Bot} bot
	*/
	m.init = function(bot) {
		console.log('Hello, world!');
	}
	/**
	* @param {Message} msg
	*/
	var SHIA = ['Go and do your maths',
		'Do it, just do it!',
		'Don’t let your dreams be dreams.',
		'Yesterday you said tomorrow.',
		'So just do it!',
		'Make your dreams come true.',
		'Just do it.',
		'Some people dream of success, while you’re going to wake up and work hard at it.',
		'Nothing is impossible… you should get to the point where anyone else would quit and you’re not going to stop there.',
		'NO! What are you waiting for?!',
		'DO IT!',
		'JUST DO IT!',
		'YES YOU CAN!',
		'JUST DO IT!',
		'If you’re tired of starting over, stop giving up.'];
var idx = 0;
	m.onMsg = function(msg) {
		//console.log('my moment!', msg.wasAddressed());
		var match = 'auscompgeek';
		if (msg.getSenderHost().slice(-match.length) == match) {
			msg.reply(SHIA[idx++]);
			idx %= SHIA.length;
			return true;
		}
		
	}
})(module.exports);
