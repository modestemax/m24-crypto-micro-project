const { subscribe } = require('common/redis');
const { tme } = require('f.telegram/src/bot');

subscribe('TRADE_PROGRESS', async trade => {
    const { message_id } = await tme.sendMessage(msg);
})