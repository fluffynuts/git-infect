#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import { BroadcastOptions, gitBroadcast } from "./git-broadcast";
import { ConsoleLogger, LogLevel } from "./console-logger";

interface CliOptions extends BroadcastOptions {
    verbose: boolean;
}

function parseArgs() {
    return yargs
        .option("from", {
            type: "string",
            alias: "f",
            description: "source branch which is to be merged into recipients",
            default: undefined,
            demandOption: false
        })
        .option("to", {
            type: "string",
            alias: "t",
            default: ["*"],
            description: "branch, branches or glob (eg feature/*) which will have the source branch merged in"
        })
        .array("to")
        .option("ignore-missing-branches", {
            type: "boolean",
            default: false,
            description: "when set finding no matches for a particular 'to' glob will not cause an error to be raised"
        })
        .option("in", {
            type: "string",
            alias: "i",
            description: "run in the specified folder instead of the current working directory"
        })
        .option("verbose", {
            type: "boolean",
            alias: "v",
            description: "output more logging info",
            default: false
        })
        .option("push", {
            type: "boolean",
            alias: "p",
            description: "push successfully-merged branches",
            default: true
        })
        .help()
        .argv as unknown as CliOptions; // types out of yargs come out a little... funny
}

(async () => {
    try {
        const args = parseArgs();
        args.logger = args.verbose
            ? new ConsoleLogger(LogLevel.debug)
            : new ConsoleLogger(LogLevel.info);
        await gitBroadcast(args);
    } catch (e) {
        if (typeof e !== "string") {
            if (e.stack) {
                e = e.stack;
            } else if (e.message) {
                e = e.message;
            } else {
                e = e.toString();
            }
        }
        console.error(chalk.red(e));
        process.exit(1);
    }
})();
