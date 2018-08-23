console.log('\n\n'+process.env.APP_NAME+ ' Running '+ new Date()+'\n\n');

require('./signals')
require('./builder');
require('./saveIndicator');

