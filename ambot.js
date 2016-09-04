var Botkit = require('botkit');
var Witbot = require('witbot');
var request = require('request');

var request = require('request');
var headers = {
    "User-Agent-x": "SuiteScript-Call",
    "Content-Type": "application/json",
    "Authorization": "NLAuth nlauth_account={}, nlauth_email={}, nlauth_signature={}, nlauth_role=3"
};
var options = {
    url: 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=527&deploy=1',
    headers: headers
};

function callback(error, response, body) {
	if (!error && response.statusCode == 200) {
		var info = JSON.parse(body);
		console.log(info);
	}
}

request(options, callback);

var Ambot = function(slackToken, witToken){
	this.slackToken = slackToken;
	this.witToken = witToken;
};

Ambot.prototype.start = function(email, password) {
	var controller = Botkit.slackbot({ debug: false });

	controller.spawn({
		token: this.slackToken,
	}).startRTM(function(err, bot, payload) {
		if (err) {
			throw new Error('Error connecting to Slack! Error: ', err);
		}
		console.log('Connected to Slack!');
	});

	var witbot = Witbot(this.witToken);

	controller.hears(['.*'], 'direct_message,direct_mention', function(bot, message) {
		var wit = witbot.process(message.text, bot, message);
		wit.hears('hello', 0.50, function(bot, message, outcome) {
			this.sayHello(bot, message, outcome);
		});
		
		wit.hears('help', 0.50, function(bot, message, outcom){

		});

		wit.hears('grantAccess', 0.50, function(bot, message, outcom){

		});

		wit.hears('whoIs', 0.50, function(bot, message, outcom){

		});

		wit.otherwise(function(bot, message) {
			bot.reply(message, 'Ay ambot!');
		});
	});
};

Ambot.prototype.sayHello = function(bot, message, outcome) {
	bot.startConversation(message, function (_, convo) {
		convo.say('Hello, I\'m Ambot!');
		convo.ask('What should I call you?', function(response, convo) {
			convo.ask('You want me to call you `' + response.text + '`?', 
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
				bot.reply(message, 'OK! Updating my database.');

				controller.storage.users.get(message.user, function(err, user) {
					if (!user) {
						user = {
							id: message.user,
						};
					}
					user.name = convo.extractResponse('nickname');
					controller.storage.users.save(user, function(err, id) {
						bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
					});
				});
			} else {
				// this happens if the conversation ended prematurely for some reason
				bot.reply(message, 'OK, nevermind!');
			}
		});
	});
};

Ambot.prototype.grantAccess = function(bot, message, outcome) {

};

Ambot.prototype.whoIs = function(bot, message, outcome) {

};

module.exports = Ambot;
