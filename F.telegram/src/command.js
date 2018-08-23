const debug = require('debug')('F;commands');
const { bot, tme, M24_LOG_CHAT_ID, M24_CHAT_ID } = require('./bot');
const { publish, redisSet,getRedis, redisGet } = require('common/redis');
const { candleUtils } = require('common');
const { change24H } = candleUtils;
const { resetMessage } = require("./assets-messages");

serviceStatusHandler();

const commands = {
	"start"(message) {
		message.lines(["This bot is for trading",
			"Check Services Status: /check_services",
			"Get Error Stack: /error_stack",
			"Get 24h change buy symbol: /24h"
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
	"24h"(message) {
		message.send("Enter symbol");

		message.answer(async (message) => {
			let change = await change24H({ exchange: 'binance', symbolId: message.text })
			message.send(change + "%")
		});
	}
}

for (cmd in commands) {
	bot.cmd("/" + cmd, commands[cmd]);
}


function serviceStatusHandler() {
	const redisSub = getRedis();
	redisSub.on('pmessage', async (pattern, channel, data) => {
		//debug(channel + ' received');
		if (channel === 'm24:service_status') {
			debug('service status received', data);
			tme.sendMessage(JSON.parse(data));
		}
	});
	redisSub.psubscribe('m24:service_status');
}