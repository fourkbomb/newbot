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


(function(re) {
	re.userSpokenCache = {};
	//			s/ @nick      mode   sep  pat sep sub sep flags
	var magicRE = /^(\w+?.? )?(s)(.)(.*?)(\3)(.*?)?(\3([gi0-9]+)?)?$/;
	re.onMsg = function onMsg(msg) {
		var text = msg.getMessage();
		console.log('onMsg',text);
		if (magicRE.test(text)) {
			// re match
			var match = magicRE.exec(text);
			var dest = match[1] ? match[1].trim().replace(/[:,]$/, '') : msg.getSenderNick();
			if (dest in re.userSpokenCache) {
				var lines = re.userSpokenCache[dest];
				var flags = match[8] || '';
				var eligible = new RegExp(match[4], flags);
				for (var i = 0; i < lines.length; i++) {
					if (eligible.test(lines[i])) {
						break;
					}
				}
				if (i >= lines.length) {
					msg.notice('No match!');
					return;
				}
				var repl = lines[i];
				var toSub = match[6] || '';
				if (toSub == match[3] && !match[7]) toSub = ''; // weird bug
				repl = repl.replace(eligible, toSub);
				re.userSpokenCache[dest][i] = repl;
				if (repl.trim() == '') {
					msg.say(msg.getSenderNick() + (match[1] ? ' thinks ' + dest + ' meant to say' : ' said') + ' nothing');
				} else {
					msg.say(msg.getSenderNick() + (match[1] ? ' thinks ' + dest : '') + ' meant: ' + repl);
				}
			} else {
				msg.reply((match[1] ? match[1] + ' has' : 'You have') + 'n\'t said anything for me to hear yet!');
			}
		} else {
			if (msg.getSenderNick() in re.userSpokenCache) {
				if (re.userSpokenCache[msg.getSenderNick()].length >= 5) {
					re.userSpokenCache[msg.getSenderNick()].pop();
				}
				re.userSpokenCache[msg.getSenderNick()].unshift(text);
			} else {
				re.userSpokenCache[msg.getSenderNick()] = [text];
			}
		}
	};
})(module.exports);