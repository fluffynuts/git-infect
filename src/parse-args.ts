import yargs from "yargs";
import { BroadcastOptions } from "./git-broadcast";
import { readVersionInfo } from "./read-version-info";

export interface CliOptions extends BroadcastOptions {
    verbose: boolean;
    printSummary: boolean;
}

export async function parseArgs() {
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
        }).option("print-summary", {
            boolean: true,
            default: false,
            description: "print out a summary of operations at the end - useful for piping into another process, eg a notifier"
        })
        .version(await readVersionInfo())
        .help()
        .argv as unknown as CliOptions; // types out of yargs come out a little... funny
}
