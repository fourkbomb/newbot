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
var fs = require('fs');
 (function(todo) {
 	todo.todo_db = {};
 	if (fs.existsSync('./todo.json')) {
 		try {
 			todo.todo_db = JSON.parse(fs.readFileSync('./todo.json'));
 		} catch (e) {
 			console.log('Error loading todo db:', e);
 			console.log(e.stack);
 		}
 	}

 	todo.saveDb = function saveDb() {
		fs.writeFile('./todo.json', JSON.stringify(todo.todo_db), function(e) {
			if (e) {
				console.log('Failed to write ./todo.json:', e);
				console.log(e.stack);
			}
		});
 	}

 	todo.cmd_todo = function(msg) {
 		if (msg.getSenderNick() in todo.todo_db) {
 			if (msg.getArgs().length == 0) {
 				var db = todo.todo_db[msg.getSenderNick()];
 				var res = '';
 				for (var i = 0; i < db.length; i++) {
 					res += '[' + i + ']' + ' ' + db[i] + '; ';
 				}
 				msg.reply(res.slice(0, -2));
 			} else {
 				todo.todo_db[msg.getSenderNick()].push(msg.getArgs().join(' '));
 				todo.saveDb();
 			}
 		} else {
 			if (msg.getArgs().length == 0) {
 				msg.reply('You don\'t have anything to do.');
 			} else {
 				todo.todo_db[msg.getSenderNick()] = [msg.getArgs().join(' ')];
 				todo.saveDb();
 			}
 		}
 	}

 	todo.cmd_tododel = function(msg) {
 		if (!(msg.getSenderNick() in todo.todo_db)) {
 			msg.reply('You don\'t have anythig to delete from your todo list');
 		} else {
 			if (msg.getArgs().length == 0) {
 				todo.todo_db[msg.getSenderNick()].pop();
 				if (todo.todo_db[msg.getSenderNick()].length == 0) delete todo.todo_db[msg.getSenderNick()];
 				todo.saveDb();
 			} else {
 				var ary = msg.getArgs()[0].split(',');
 				for (var i = 0; i < ary.length; i++) {
 					if (Number.isNaN(Number(ary[i]))) {
 						msg.notice(ary[i] + " is not a number!");
 						break;
 					}
 					todo.todo_db[msg.getSenderNick()].splice(Number(ary[i]), 1);
 				}
 				if (todo.todo_db[msg.getSenderNick()].length == 0) delete todo.todo_db[msg.getSenderNick()];
 				todo.saveDb();
 			}
 		}
 	}

 	todo.cmd_todoins = function(msg) {
 		if (msg.getArgs().length < 2) {
 			msg.reply('Usage: ' + msg.getBot().getConfig().prefix + 'todoins <index> <message>');
 			return;
 		}
 		if ((!msg.getSenderNick() in todo.todo_db)) {
 			msg.reply('You don\'t have a todo list.');
 			return;
 		}
 		var idx = Number(msg.getArgs()[0]);
 		if (Number.isNaN(idx)) {
 			msg.reply('"' + msg.getArgs()[0] + '" is not a number!');
 			return;
 		}
 		var m = msg.getArgs().slice(1).join(' ');
 		todo.todo_db[msg.getSenderNick()].splice(Number(idx), 0, m);
 		todo.saveDb();

 	}
 })(module.exports);