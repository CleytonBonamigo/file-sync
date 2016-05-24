var winston = require('winston');

winston.level = 'debug';
winston.remove(winston.transports.Console);
winston.add(winston.transports.File, { filename: 'somefile.log' });
winston.log('debug', 'Now my debug messages are written to console!');

console.log(new Date().toDateString());