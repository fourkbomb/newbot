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
var entities = require('entities');
(function(e) {
	const ABC_ELECTION_DATA = 'http://www.abc.net.au/dat/news/elections/federal/2016/results/OnlineLists.jsonp.js';
	const ABC_SEAT_STATUS = 'http://www.abc.net.au/dat/news/elections/federal/2016/results/OnlinePartyGroupTrends.jsonp.js';
	const ABC_SEAT_PRIMARIES = 'http://www.abc.net.au/dat/news/elections/federal/2016/results/OnlineElectorate{code}.jsonp.js';
	var CUR_SEAT_DATA = {};
	var electorates = {};
	var do_changes = true;
	var cached_msg;
	var msgQueue = [];
	var watched_seats = ['Cowan', 'Capricornia', 'Hindmarsh', 'Forde'];
	var firstRun = true;
	var captureOPGT = false;
	var lastOPGT = "";
	var GROUP_TRENDS = {};
	function callback_OnlineLists(obj) {
		var old = JSON.parse(JSON.stringify(electorates));
		CUR_SEAT_DATA = obj.Erads.Elections.Election.Chambers.Chamber;
		var es = CUR_SEAT_DATA.Electorates.Electorate;
		for (var s = 0; s < es.length; s++) {
			var name = es[s].LongName.replace(' (*)', '');
			electorates[name] = es[s];
		}
		if (do_changes) showChanges(old, electorates);
	}

	function showChanges(old, nnew) {
		if (old == {}) return;
		for (var k in watched_seats) {
			k = watched_seats[k];
			console.log(k);
			if (genmsg(old[k], k) != genmsg(nnew[k], k)) {
				console.log('# CHANGED ###################################################3');
				var res = genmsg(nnew[k], k);
				msgQueue.push('Update: ' + res);
			}
		}
	}

	function sendMsgQ() {
		if (msgQueue.length != 0 && cached_msg != null)
			cached_msg.say(msgQueue.shift());
	}


	function poll() {
		request({
			'uri': ABC_ELECTION_DATA
		}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				try {
					eval(body);
				} catch (e) {
					console.log(e, e.message);
				}
			} else {
				console.log(error);
				console.log(body);
			}
		});

	}

	e.cmd_ctxtEval = function(msg) {
		msg.reply(eval(msg.getArgs().join(' ')));
	}

	e.cmd_watch = function(msg) {
		watched_seats.push(msg.getArgs().join(' '));
		msg.reply('watched ' + msg.getArgs().join(' '));
	}

	e.cmd_unwatch = function(msg) {
		var arg = msg.getArgs().join(' ');
		var idx = watched_seats.indexOf(arg);
		if (idx != -1) {
			watched_seats.splice(idx, 1);
			msg.reply('unwatched ' + msg.getArgs().join(' '));
		} else {
			msg.reply('seat isn\'t watched!');
		}
	}

	e.cmd_watched = function(msg) {
		msg.reply('Watched seats: ' + watched_seats.join(', '));
	}


	poll();
	var id = setInterval(poll, 30000);
	var id2 = setInterval(sendMsgQ, 1000);

	e.unload = function() {
		clearInterval(id);
		clearInterval(id2);
		clearInterval(id3);
	}

	function zfill(str) {
		if (str.length == 1) str = '0' + str;
		return str;
	}

	function genmsg(e, seat) {
		if (e == null) return "No results yet for " + seat + ".";
		var p = e.ElectoratePredictionSuppressed;
		if (e.Swingdial == null || e.LeadingCandidate == null) return "No results yet for " + seat + ".";
		var sd = e.Swingdial.Candidate;
		if (!p) {
			p = e.ElectoratePrediction;
		}
		if (p == null) return "No results yet for " + seat + ".";
		var cdt0 = sd[0].Party.PartyCode;
		var cdt1 = sd[1].Party.PartyCode;
		var date = new Date(e.LastUpdateTime);
		var message = "Results for " + seat + ": ";
		message += p.Result2CPPct + "% " + e.LeadingCandidate.Party.PartyCode
		if (cdt0 != e.LeadingCandidate.Party.PartyCode) {
			message += " (v " + cdt0 + "), ";
		} else {
			message += " (v " + cdt1 + "), ";
		}
		message += p.Result2CPSwingString + ". Prediction: " + p.PredictionString + ". ";
		message += "Currently held by " + e.HoldingParty.ShortName + " with a " + e.Margin + "% margin. ";
		message += + e.CountedPct + "% counted. Updated at " + date.getUTCHours() + ":" + zfill(date.getMinutes().toString()) + ".";
		return message;
	}

	function generate_seat(msg, e, seat) {
		if (msg == null) return;
		cached_msg = msg;
		msg.say(genmsg(e, seat));
	}



	e.cmd_seat = function(msg) {
		var seat = msg.getArgs().join(' ');
		if (seat in electorates) {
			var e = electorates[seat];
			generate_seat(msg, e, seat);
		} else {
			msg.reply("No such seat!");
		}
	}

	function callback_OnlineElectorate(obj) {
		var e = obj.Erads.Elections.Election.Chambers.Chamber.Electorates.Electorate;
		var msg = "Results for " + e.LongName + "(" + e.StateCategory.CategoryCode + "): ";
		var cand = e.Candidates.Candidate;
		for (var i = 0; i < cand.length; i++) {
			if (cand[i].BallotPosition.startsWith("9")) continue;
			msg += cand[i].Party.PartyCode + ": " + cand[i].PredictedPrimary.Percent + "% (" +
				cand[i].PredictedPrimary.Swing + "% swing)" + ", ";
		}
		msg += e.CountedPct + "% counted, " + e.NoOfPollingPlaces.Reporting2CP + "(2CP)," + e.NoOfPollingPlaces.ReportingPrimary + "(Primary)/" + e.NoOfPollingPlaces.Total + " booths counted.";
		if (e.IsKeySeat) {
			msg += " Key Seat!";
		}
		cached_msg.say(msg);

	}

	e.cmd_primary = function(msg) {
		cached_msg = msg;
		var seat = msg.getArgs().join(' ');
		if (seat in electorates) {
			var id = electorates[seat].ElectorateCode;
			var url = ABC_SEAT_PRIMARIES.replace('{code}', id);
			var name = 'callback_OnlineElectorate' + id;
			request({
				'uri': url
			}, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					try {
						eval(body.replace(name, 'callback_OnlineElectorate'));
					} catch (e) {
						console.log(e, e.message);
					}
				} else {
					console.log(error);
					console.log(body);
				}
			});
		} else {
			msg.reply("No such seat!");
		}
	}

	function callback_OnlinePartyGroupTrends(obj) {
		GROUP_TRENDS = obj.Erads.Elections.Election.Chambers.Chamber.Trends.Trend;
		var trend = GROUP_TRENDS[0];
		var parties = trend.PartyGroups.PartyGroup;
		var msg = "Current seat counts: ";
		for (var i = 0; i < parties.length; i++) {
			var p = parties[i];
			msg += p.PartyGroupCode.replace("L/NP", "LNP") + ": " + p.SeatsExcludingEarlyVotes.Won + " won, " 
				if (p.SeatsExcludingEarlyVotes.Likely > 0)
					msg += p.SeatsExcludingEarlyVotes.Likely + " likely - ";
			msg += p.PredictedPrimary.Percent + "% primary, (" + p.PredictedPrimary.Swing + "% swing), ";
		}
		var pred = trend.PredictionStringSuppressed;
		if (pred) {
			msg += "AEC preliminary prediction: " + pred;
		} else {
			msg += "AEC prediction: " + trend.PredictionString;
		}
		msg += ". " + trend.CountedPct + "% counted.";
		if (captureOPGT) {
			captureOPGT = false;
			OPGT_poll_callback(msg);
		} else {
			lastOPGT = msg;
			cached_msg.say(msg);
		}
	}

	function OPGT_poll_callback(msg) {
		if (firstRun) {
			lastOPGT = msg;
			firstRun = false;
			return;
		}
		if (msg != lastOPGT) {
			cached_msg.say("Update: " + msg);
		}
	}


	e.cmd_seats = function(msg) {
		if (msg)
			cached_msg = msg;
		request({
			'uri': ABC_SEAT_STATUS
		}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				try {
					eval(body);
				} catch(e) {
					console.log(e, e.message);
				}
			} else {
				console.log(error);
				console.log(body);
			}
		});
	}

	var id3 = setInterval(function() {
		captureOPGT = true;
		e.cmd_seats(false);
	}, 1000 * 60 * 5);



})(module.exports);
