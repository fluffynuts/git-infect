#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import { infect, InfectionOptions } from "./infect";

function parseArgs() {
    return yargs.option("patient-zero", {
        type: "string",
        alias: "0",
        description: "branch from which commits are spread",
        default: "origin/master",
        demandOption: true
    }).option("victims", {
        type: "string",
        alias: "v",
        default: ["*"],
        description: "branch, branches or glob (eg feature/*) to which commits from patient 0 are spread"
    }).array("victims")
        .help()
        .argv as unknown as InfectionOptions; // types out of yargs come out a little... funny
}

(async function() {
    try {
        const args = parseArgs();
        await infect(args);
    } catch (e) {
        console.error(chalk.red(e));
        process.exit(1);
    }
})();
