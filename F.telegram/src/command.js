const debug = require('debug')('F:commands');
const _ = require('lodash');
const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');
const { publish, subscribe, redisGet } = require('common/redis');
const { candleUtils } = require('common');
const { change24H } = candleUtils;
const { resetMessage } = require("./assets-messages");

serviceStatusHandler();

const commands = {
	"start"(message) {
		message.lines([
			"This bot is for trading",
			"Check Services Status: /check_services",
			"Get Error Stack: /error_stack",
			"Get 24h change buy symbol: /top5"
		]);
	},
	"reset"(message) {
		resetMessage();
		message.lines(["Messages Reset OK"])
	},
	"check_services"(message) {
		message.send("Checking Services Status")
			.then(() => publish('m24:service_status_check', { chat_id: message.chat.id }));
	},
	"error_stack"(message) {
		message.send("Enter the error stack number!");

		message.answer(async (message) => {
			let stack = (await redisGet('errorstack' + message.text.trim())) || "Error Stack not found";
			message.send(stack)
		});
	},
	"sell"(message) {
		message.send("Not Implemented)!");
		// message.send("Enter sell price or sell percentage (prefixed with 'p')!");

		// message.answer(async (message) => {
		// 	if(message.text[0]==='p'){
		// 		publish('user:sell:percent')
		// 	}
		// 	message.send(stack)
		// });
	},
	"top5"(message) {
		publish('m24:algo:get_top5', { chat_id: message.chat.id })
	},
	"top"(message) {
		message.send("Enter top percent number");

		message.answer(async (message) => {
			publish('m24:algo:top', { chat_id: message.chat.id, n: +message.text.trim() })
		});

	},
	"reset_top"(message) {
		message.send("Enter asset or all");

		message.answer(async (message) => {
			publish('m24:algo:reset', { chat_id: message.chat.id, asset: message.text.trim().toUpperCase() })
			message.send("reset done");
		});

	},
	"restart_bot"(message) {
		console.log('restart command received from ' + message.from.username)
		tme.sendMessage({ chat_id: M24_LOG_CHAT_ID, text: 'restart command received from ' + message.from.username });
		message.send("Restarting BOT in 5 seconds");
		setTimeout(() => publish('m24:restart'), 5e3);

	}
}

for (cmd in commands) {
	bot.cmd("/" + cmd, commands[cmd]);
}


function serviceStatusHandler() {
	subscribe('m24:service_status', async (data) => {
		debug('service status received', data);
		tme.sendMessage(JSON.parse(data));
	});
}