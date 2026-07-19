import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

export const logger = createLogger({
    level: "info",

    format: combine(
        timestamp({
            format: "DD.MM.YYYY HH:mm:ss"
        }),
        logFormat
    ),

    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                timestamp({
                    format: "HH:mm:ss"
                }),
                logFormat
            )
        }),

        new transports.File({
            filename: "logs/error.log",
            level: "error"
        }),

        new transports.File({
            filename: "logs/combined.log"
        })
    ]
});