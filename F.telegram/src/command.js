const debug = require('debug')('F:commands');
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
	"top5"(message) {
		publish('m24:algo:get_top5')
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