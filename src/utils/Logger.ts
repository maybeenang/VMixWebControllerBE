// make logger util chalk with format [TYPE] [DATETIME] message, and colorize the type AND datetime and dont colorize the message

import chalk from "chalk";

export default class Logger {
  static log(message: string, data?: any) {
    console.log(
      chalk.green(
        `[LOG] [${new Date().toTimeString().split(" ")[0]}] `,
        message
      ),
      data ? data : ""
    );
  }

  static error(message: string, error?: Error) {
    console.log(
      chalk.red(
        `[ERROR] [${new Date().toTimeString().split(" ")[0]}] `,
        message,
        error
      )
    );
  }

  static warn(message: string) {
    console.log(
      chalk.yellowBright(
        `[WARN] [${new Date().toTimeString().split(" ")[0]}] `,
        message
      )
    );
  }

  static info(message: string, data?: any) {
    console.log(
      chalk.yellow(
        `[INFO] [${new Date().toTimeString().split(" ")[0]}] `,
        message
      ),
      data ? data : ""
    );
  }
}
