var winston = require('winston');
var moment = require('moment');

moment().utcOffset('+09:00');

var logger = new (winston.Logger)({
    transports:[
        new (require('winston-daily-rotate-file'))({
            level: 'debug',
            filename: 'collector_worker',
            dirname: __dirname + '/../log',
            datePattern: '.yyyy-MM-dd',
            timestamp: function() {
                return moment().format('YYYY-MM-DD HH:mm:ss');
            },
            json: false,
            colorize: true,
            humanReadableUnhandledException: true
        }),
		new (winston.transports.Console)({
            level: 'debug',
            datePattern: '.yyyy-MM-dd',
            timestamp: function() {
                return moment().format('YYYY-MM-DD HH:mm:ss');
            },
            json: false,
            colorize: true,
            humanReadableUnhandledException: true
        })
    ],
    exceptionHandlers: [
        new (require('winston-daily-rotate-file'))({
            level: 'debug',
            filename: 'collector_worker_exception',
            dirname: __dirname + '/../log',
            datePattern: '.yyyy-MM-dd',
            timestamp: function() {
                return moment().format('YYYY-MM-DD HH:mm:ss');
            },
            json: false,
            colorize: true,
            humanReadableUnhandledException: true
        }),
		new (winston.transports.Console)({
            level: 'debug',
            datePattern: '.yyyy-MM-dd',
            timestamp: function() {
                return moment().format('YYYY-MM-DD HH:mm:ss');
            },
            json: false,
            colorize: true,
            humanReadableUnhandledException: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding) {
        logger_us.info(message);
    }
};
