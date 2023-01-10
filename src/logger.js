const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.json()
    ),
    defaultMeta: { service: 'contract-manager' },
    transports: [
        new transports.Console()
    ]
});

module.exports = logger;