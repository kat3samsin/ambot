var slackToken = process.env.SLACK_TOKEN;
var witToken = process.env.WIT_TOKEN;

var prompt = require('prompt');

var schema = {
	properties: {
	  email: {
		required: true
	  },
	  password: {
		hidden: true
	  }
	}
};

prompt.start();
prompt.get(schema, function (err, result) {
	var email = result.email;
	var password = result.password

	var Ambot = require('./ambot.js')(slackToken, witToken);
	console.log(JSON.stringify(Ambot));
	Ambot.start(email, password);
});

