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
	m.cmd_test = function(msg) {
		msg.reply("Welcome to nginx!");
		return true;
	}
	/**
	* @param {Message} msg
	*/
	m.onMsg = function(msg) {
		//console.log('my moment!', msg.wasAddressed());
		if (msg.wasAddressed()) {
			if (msg.isSenderSuperuser()) {
				msg.reply(":o");
			} else {
				msg.reply(msg.getMessageWithoutAddress());
			}
		}
		return true;
	}
})(module.exports);