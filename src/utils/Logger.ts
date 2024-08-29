// make logger util chalk with format [TYPE] [DATETIME] message, and colorize the type AND datetime and dont colorize the message

import chalk from "chalk";

export default class Logger {
  static log(message: string) {
    console.log(chalk.green(`[LOG] [${new Date().toISOString()}] `, message));
  }

  static error(message: string, error?: Error) {
    console.log(
      chalk.red(`[ERROR] [${new Date().toISOString()}] `, message, error)
    );
  }

  static warn(message: string) {
    console.log(chalk.red(`[WARN] [${new Date().toISOString()}] `, message));
  }

  static info(message: string, data?: any) {
    console.log(
      chalk.yellow(`[INFO] [${new Date().toISOString()}] `, message),
      data ? data : ""
    );
  }
}
