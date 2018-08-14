const Bot = require("telega"); 
//const bot = new Bot("545101798:AAGM1TodXYaS0MreKKimt23KZlXTmmEH_pU");//m24
const bot = new Bot("496655496:AAFmg9mheE9urDt2oCQDIRL5fXjCpGYiAug"); //m24test

bot.cmd("/start", function(message) {
	message.lines([
		"This bot is for testing inline queries",
		"Command: /test"
    ]);
    message.lines([
		"Hello!",
		"This bot runs in inline mode and can make screenshots",
		"Just type: @<your bot username> <site url>"
	]);
});

bot.cmd("/test", function(message) {
	message.inline("Click:", [
		{
			text: "Cell 1",
			data: "1",
			row: 0
		},
		{
			text: "Cell 2",
			data: "2",
			row: 0
		},
		{
			text: "Cell 3",
			data: "3",
			row: 1
		}
	],true, function(message) {
		message.send(Object.keys(bot._inlines) + "\n" + "You clicked: ", message.data);
	});
});

bot.cmd("/ans", function(message) {
	message.send("MRC!");

	message.answer(function(message) {
		message.send("You wrote:", message.text);
	});
});

bot.inline(function(message) {
	if (!message.query) return;

	message.reply([
		{
			type: "photo",
			photo_url: "http://mini.s-shot.ru/1366x768/JPEG/1366/Z100/?" + encodeURIComponent(message.query),
			thumb_url: "http://mini.s-shot.ru/640x480/JPEG/640/Z100/?" + encodeURIComponent(message.query),
			width: 1366 / 2 + "",
			height: 768 / 2 + ""
		}
	]).catch(console.log);
});

bot.action("new_chat_member", function(message) {
	message.send("@" + (message.action_data.username || message.action_data.id) + ", Welcome!");
});
bot.action("left_chat_member", function(message) {
	message.send("@" + (message.action_data.username || message.action_data.id) + ", Bye!");
});
bot.action("new_chat_title", function(message) {
	message.send("@" + (message.action_data.username || message.action_data.id) + ", title!");
});

bot.start();

console.err = console.log;