/*
 * newbot config
 */
module.exports = {
	// host of the IRC server
	'host': 'chat.freenode.net',
	// port of the IRC server
	'port': 6667,
	// does nothing right now, coming soon(tm)
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
	'chans': ['##newbotthebestbot']
};