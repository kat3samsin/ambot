var Botkit = require('botkit');
var Witbot = require('witbot');
var request = require('request');

module.exports = function(witToken, slackToken) {
	return new Ambot(witToken, slackToken);
};

var Ambot = function(slackToken, witToken) {
	this.slackToken = slackToken;
	this.witToken = witToken;
};

Ambot.prototype.start = function(email, password) {
	this.email = email;
	this.password = password;

	var controller = Botkit.slackbot({
		debug: false,
		json_file_store: './userdata'
	});

	controller.spawn({
		token: this.slackToken,
	}).startRTM(function(err, bot, payload) {
		if (err) {
			throw new Error('Error connecting to Slack! Error: ', err);
		}
		console.log('Connected to Slack!');
	});

	var witbot = Witbot(this.witToken);

	controller.hears('.*', 'direct_message,direct_mention', function(bot, message) {
		var wit = witbot.process(message.text, bot, message);

		wit.hears('hello', 0.50, function(bot, message, outcome) {
			console.log('i heard hello');
			this.sayHello(controller, bot, message, outcome);
		}.bind(this));

		wit.hears('help', 0.50, function(bot, message, outcome) {
			console.log('i heard help');
			this.help(controller, bot, message, outcome);
		}.bind(this));

		wit.hears('grantaccess', 0.50, function(bot, message, outcome) {
			console.log('i heard grantaccess');
		}.bind(this));

		wit.hears('whois', 0.50, function(bot, message, outcome) {
			this.whoIs(controller, bot, message, outcome);
		}.bind(this));

		wit.otherwise(function(bot, message) {
			bot.reply(message, 'Ay ambot! Try to type _help_.');
		});
	}.bind(this));
};

Ambot.prototype.sayHello = function(controller, bot, message, outcome) {
	var hellos = ['Hello', 'Hi', 'Hey', 'Howdy'];

	function greetUser(name) {
		var formattedMessage = {
			text: hellos[getRandomInt(0, hellos.length - 1)] + ' *' + name + '*! ',
			attachments: [{
				 text: 'Here\'s something to brighten your day!'
			}]
		};
		request({
			url: 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=funny+cat'}, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var imageUrl = JSON.parse(body).data.image_url;
					formattedMessage.attachments[0].image_url = imageUrl;
					bot.reply(message, formattedMessage);
				}
			});
	}

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	controller.storage.users.get(message.user, function(err, user) {
		if (user && user.name) {
			greetUser(user.name);
		} else {
			bot.startConversation(message, function(_, convo) {
				convo.say('Hello, I\'m Ambot!');
				convo.ask('What should I call you?', function(response, convo) {
					convo.ask('Are you sure you want me to call you *' + response.text + '*?',
					[{
						pattern: bot.utterances.yes,
						callback: function(response, convo) {
							convo.next();
						}
					}, {
						pattern: bot.utterances.no,
						callback: function(response, convo) {
							convo.stop();
						}
					}, {
						default: true,
						callback: function(response, convo) {
							convo.repeat();
							convo.next();
						}
					}]
				);
					convo.next();
				}, {'key': 'nickname'}); // store the results in a field called nickname

				convo.on('end', function(convo) {
					if (convo.status == 'completed') {
						bot.reply(message, 'Alright, updating my database...');

						controller.storage.users.get(message.user, function(err, user) {
							if (!user) {
								user = {
									id: message.user,
								};
							}
							user.name = convo.extractResponse('nickname');
							controller.storage.users.save(user, function(err, id) {
								greetUser(user.name);
							});
						});
					} else {
						// this happens if the conversation ended prematurely for some reason
						bot.reply(message, 'Nevermind!');
					}
				});
			});
		}
	});
};

Ambot.prototype.grantAccess = function(bot, message, outcome) {

};

Ambot.prototype.whoIs = function(controller, bot, message, outcome) {
	this.retrieveUser = function(bot, params) {
		function getEmail(name) {
			var matched = name.match(/<mailto:.*.com\|(.*.com)>/);
			if (matched && matched.length > 1) {
				return matched[1];
			}
		}
		var email = getEmail(params.user);
		if (email) {
			params.user = email;
		}

		bot.reply(message, 'Searching *' + params.user + '* on *' + params.account + '*...');

		params.request = '&action=' + (email ? 'searchbyemail' : 'searchbyname') + '&name=' + params.user;
		this.nsRequest(params, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(JSON.stringify(body));
				var employee = JSON.parse(body) ? (JSON.parse(body)[0] ? JSON.parse(body)[0].columns : null) : null;

				if (!employee) {
					bot.reply(message, '*' + params.user + '* not found!');
					return;
				}

				var formattedMessage = {
					text: 'here you go...',
					attachments: [{
						'text': 'Employee Details',
						'fields': [{
								'title': 'Entity Name',
								'value': employee.entityid,
								'short': true
							}, {
								'title': 'Subsidiary',
								'value': employee.subsidiary.name,
								'short': true
							}, {
								'title': 'Email',
								'value': employee.email,
								'short': true
							}
						],
					}]
				};
				if (employee.image) {
					formattedMessage.attachments[0].thumb_url = 'https://system.netsuite.com' + employee.image.name;
				}
				bot.reply(message, formattedMessage);
			}
		});
	};

	controller.storage.users.get(message.user, function(err, user) {
		if (user && user.accountNo) {
			this.retrieveUser(bot, {account: user.accountNo, user: outcome});
		} else {
			bot.startConversation(message, function(_, convo) {
				convo.ask('There is no account registered, what is your the Account ID?', function(response, convo) {
					convo.ask('Is this your Account ID: *' + response.text + '*?',
						[{
							pattern: bot.utterances.yes,
							callback: function(response, convo) {
								convo.next();
							}
						}, {
							pattern: bot.utterances.no,
							callback: function(response, convo) {
								convo.stop();
							}
						}, {
							default: true,
							callback: function(response, convo) {
								convo.repeat();
								convo.next();
							}
						}]
					);
					convo.next();
				}, {'key': 'accountno'}); // store the results in a field called accountno

				convo.on('end', function(convo) {
					if (convo.status == 'completed') {
						bot.reply(message, 'Got it! Updating my database...');

						controller.storage.users.get(message.user, function(err, user) {
							if (!user) {
								user = {id: message.user, };
							}
							user.accountNo = convo.extractResponse('accountno');

							controller.storage.users.save(user, function(err, id) {
								this.retrieveUser(bot, {account: user.accountNo, user: outcome});
							}.bind(this));
						}.bind(this));
					} else {
						// this happens if the conversation ended prematurely for some reason
						bot.reply(message, 'OK, nevermind!');
					}
				}.bind(this));
			}.bind(this));
		}
	}.bind(this));
};

Ambot.prototype.help = function(controller, bot, message, outcome) {
	formattedMessage = {
		text: 'Try to type...',
		attachments: [{
			mrkdwn_in: ['fields'],
			fields: [{
				title: 'Say hello',
				value: '_hi | hello | howdy | hey | kamusta_',
				short: true
			}, {
				title: 'Find someone',
				value: '_who is <name> | who is <email>_',
				short: true
			}]
		}]
	};
	bot.reply(message, formattedMessage);
};

Ambot.prototype.nsRequest = function(params, callback) {
	console.log('nsRequest acct: ' + params.account);
	var headers = {
		'User-Agent-x': 'SuiteScript-Call',
		'Content-Type': 'application/json',
		'Authorization': 'NLAuth nlauth_account=' + params.account + ', nlauth_email=' + this.email + ', nlauth_signature=' + this.password + ', nlauth_role=3'
	};

	var options = {
		url: 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=527&deploy=1',
		headers: headers
	};

	options.url += params.request;

	console.log('options: ' + JSON.stringify(options));

	request(options, callback);
	// callback.apply(this, [null, {statusCode: 200}, {result: ''}]); //dummy response
};
