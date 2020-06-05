#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import { gitBroadcast, BroadcastOptions } from "./git-broadcast";

function parseArgs() {
    return yargs
        .option("from", {
            type: "string",
            alias: "f",
            description: "source branch which is to be merged into recipients",
            default: "origin/master",
            demandOption: true
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
        .help()
        .argv as unknown as BroadcastOptions; // types out of yargs come out a little... funny
}

(async function() {
    try {
        const args = parseArgs();
        await gitBroadcast(args);
    } catch (e) {
        console.error(chalk.red(e));
        process.exit(1);
    }
})();
