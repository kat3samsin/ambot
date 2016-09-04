var Botkit = require('botkit');
var Witbot = require('witbot');

var slackToken = process.env.SLACK_TOKEN;
var witToken = process.env.WIT_TOKEN;

var controller = Botkit.slackbot({
	debug: false
});

controller.spawn({
	token: slackToken,
}).startRTM(function(err, bot, payload) {
	if (err) {
		throw new Error('Error connecting to Slack! Error: ', err);
	}
	console.log('Connected!');
});

var witbot = Witbot(witToken);

controller.hears(['.*'], 'direct_message,direct_mention', function(bot, message) {
	var wit = witbot.process(message.text, bot, message);
	wit.hears('hello', 0.50, function(bot, message, outcome) {
		sayHello(bot, message, outcome);
	});
});

function sayHello(bot, message, outcome) {
	bot.startConversation(message, function (_, convo) {
		convo.say('Hello! I\'m Ambot');
		convo.ask('What should I call you?', function (response, convo) {
			controller.hears('.*', 'direct_message,direct_mention', function(bot, message) {
			convo.say('I am so glad to hear it!')
			convo.next()
		  })
	  }

}