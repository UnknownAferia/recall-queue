import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf, json } = format;

const redactSecrets = format((info) => {
  if (typeof info.message === "string") {
    info.message = info.message
      .replace(/mongodb(?:\+srv)?:\/\/[^\s@]+@/gi, "mongodb://[REDACTED]@")
      .replace(
        /[\w-]{20,}\.[\w-]{6,}\.[\w-]{20,}/g,
        "[REDACTED_DISCORD_TOKEN]",
      );
  }

  return info;
});

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

export const logger = createLogger({
  level: "info",

  format: combine(
    redactSecrets(),
    timestamp({
      format: "DD.MM.YYYY HH:mm:ss",
    }),
    logFormat,
  ),

  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({
          format: "HH:mm:ss",
        }),
        logFormat,
      ),
    }),

    new transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    new transports.File({
      filename: "logs/combined.log",
    }),

    new transports.File({
      filename: "logs/error.jsonl",
      level: "error",
      format: combine(redactSecrets(), timestamp(), json()),
    }),

    new transports.File({
      filename: "logs/combined.jsonl",
      format: combine(redactSecrets(), timestamp(), json()),
    }),
  ],
});
