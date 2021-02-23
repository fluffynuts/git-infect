#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import { BroadcastOptions, gitBroadcast } from "./git-broadcast";
import { ConsoleLogger, LogLevel } from "./console-logger";
import { dirname, join as joinPath } from "path";
import { fileExists, readTextFile } from "yafs";

interface CliOptions extends BroadcastOptions {
    verbose: boolean;
}

async function parseArgs() {
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
            default: [ "*" ],
            description: "branch, branches or glob (eg feature/*) which will have the source branch merged in"
        })
        .array("to")
        .option("ignore-missing-branches", {
            boolean: true,
            default: false,
            description: "when set finding no matches for a particular 'to' glob will not cause an error to be raised"
        })
        .option("in", {
            type: "string",
            alias: "i",
            description: "run in the specified folder instead of the current working directory"
        })
        .option("verbose", {
            boolean: true,
            alias: "v",
            description: "output more logging info",
            default: false
        })
        .option("push", {
            boolean: true,
            alias: "p",
            description: "push successfully-merged branches",
            default: true
        }).option("git-user", {
            type: "string",
            description: "username to use when attempting to push commits"
        }).option("git-token", {
            type: "string",
            description: "token to use as password when pushing commits"
        }).option("push", {
            boolean: true,
            default: false,
            description: "attempt to push successfully-merged branches when complete (may require git-user and git-token)"
        }).version(await readVersionInfo())
        .help()
        .argv as unknown as CliOptions; // types out of yargs come out a little... funny
}

async function readVersionInfo(): Promise<string> {
    let previous,
        current = __dirname;
    while (current !== previous) {
        const test = joinPath(current, "package.json");
        if (await fileExists(test)) {
            const
                contents = await readTextFile(test),
                pkg = JSON.parse(contents);
            return `${pkg.name} ${pkg.version}`;
        }
        previous = current;
        current = dirname(current);
    }
    throw new Error(`Can't find package.json, travelling up from ${__dirname}`);
}

(async () => {
    try {
        const args = await parseArgs();
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
