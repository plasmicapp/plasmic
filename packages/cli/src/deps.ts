import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: {},
  transports: [
    new winston.transports.Console({
      format: winston.format.printf(
        (info) => `${info.message}`
        //info => `${moment().format("HH:mm:ss")}:${info.level}\t${info.message}`
      ),
      stderrLevels: ["error"],
    }),
    //new winston.transports.File({ filename: "error.log", level: "error" }),
    //new winston.transports.File({ filename: "combined.log", level: "info" }),
  ],
});
