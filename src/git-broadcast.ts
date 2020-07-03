import { exec, ExecError, ProcessResult } from "./exec";
import { Logger } from "./console-logger";
import { NullLogger } from "./null-logger";
import chalk from "chalk"

export interface BroadcastOptions {
    in?: string;
    from?: string;
    to?: string[],
    ignoreMissingBranches?: boolean;
    logger?: Logger;
    push?: boolean;
    gitUser?: string;
    gitToken?: string;
}

const defaultOptions: BroadcastOptions = {
    from: undefined,
    to: ["*"],
    ignoreMissingBranches: false
}
const currentBranchRe = /^\*\s/;

type AsyncFunc<T> = (() => Promise<T>);

interface FailedMerge {
    target: string;
    info: ProcessResult
}

export interface MergeAttempt {
    merged?: string;
    unmerged?: FailedMerge;
}

export interface BroadcastResult {
    from: string;
    to: string[];
    ignoreMissingBranches: boolean
    merged: string[];
    unmerged: FailedMerge[];
}

export async function gitBroadcast(
    providedOptions: BroadcastOptions
): Promise<BroadcastResult> {
    const opts = {
        ...defaultOptions,
        ...providedOptions
    } as BroadcastOptions;
    const logger = opts.logger ?? new NullLogger();
    return await runIn(opts.in, async () => {
        const remotes = await findRemotes();
        let startBranch = await findCurrentBranch();
        const headRef = (await findBranchWhichIsHeadRef()) ?? "master";
        if (!startBranch) {
            // can't assume master is the head ref any more
            // -> but can fall back on that as a last resort
            await git("checkout", headRef);
            startBranch = await findCurrentBranch();
        }
        if (!startBranch) {
            throw new Error("don't know where to start from!");
        }
        if (!opts.from) {
            opts.from = headRef; // await findBestMaster();
        }
        logger.info(`checking out: ${ opts.from }`)
        await gitCheckout(opts.from);
        logger.info(`pulling latest on ${ opts.from }`);
        await git("pull", "--rebase");

        const result = await tryMergeAll(
            opts,
            remotes,
            logger);
        if (startBranch) {
            await gitCheckout(startBranch);
        }
        logger.debug(`all targets have been visited!`);
        // TODO: push changes
        return result;
    });
}

async function tryMergeAll(
    opts: BroadcastOptions,
    remotes: string[],
    logger: Logger
): Promise<BroadcastResult> {
    const result: BroadcastResult = {
        from: opts.from as string,
        to: opts.to as string[],
        ignoreMissingBranches: opts.ignoreMissingBranches as boolean,
        merged: [] as string[],
        unmerged: [] as FailedMerge[]
    };
    for (const to of (opts.to || [])) {
        const rawMatches = await matchBranches(to);
        const allTargets = uniq(
            rawMatches
                .filter(b => b !== opts.from)
                .map(b => stripRemote(b, remotes))
        );
        if (allTargets.length === 0) {
            if (opts.ignoreMissingBranches) {
                continue;
            }
            throw new Error(`Can't match branch spec '${ to }'`);
        }
        for (const target of allTargets) {
            const mergeAttempt = await tryMerge(logger, target, opts)
            if (!!mergeAttempt.unmerged) {
                result.unmerged.push(mergeAttempt.unmerged);
            } else if (!!mergeAttempt.merged) {
                result.merged.push(mergeAttempt.merged);
            }
        }
    }
    return result;
}

async function tryMerge(
    logger: Logger,
    target: string,
    opts: BroadcastOptions
): Promise<MergeAttempt> {
    const result = {} as MergeAttempt;
    if (opts.from === undefined) {
        throw new Error("");
    }
    try {
        logger.info(`check out target: ${ target }`);
        await gitCheckout(target);
    } catch (e) {
        logger.error(`cannot check out ${ target }; skipping`);
        // can't check it out; just ignore it? perhaps there's a more
        // deterministic plan, but for now, this will do
        // in particular, this is triggered by git branch --list -a *
        // bringing back the symbolic remotes/origin/HEAD, which isn't something
        // we'd want to merge into anyway
        return result;
    }
    if (!(await findCurrentBranch())) {
        logger.error(`can't find current branch!`);
        return result;
    }
    if (await branchesAreEquivalent(opts.from, target)) {
        logger.debug(`${ target } is equivalent to ${ opts.from }`);
        return result;
    }
    try {
        logger.info(`start merge: ${ opts.from } -> ${ target }`);
        await gitMerge(opts.from);
        logger.info(chalk.green(`successfully merged ${ opts.from } -> ${ target }`));
        result.merged = target;
    } catch (e) {
        const
            err = e as ExecError,
            message = err.result?.stdout?.join("\n") ?? e.message ?? e;
        logger.error(`merge fails: ${ message }`);
        await gitAbortMerge();
        result.unmerged = {
            target,
            info: e.result
        };
    }
    return result;
}

function stripRemote(
    branchName: string,
    remotes: string[]
): string {
    for (const remote of remotes) {
        const strip = `remotes/${ remote }/`;
        if (branchName.startsWith(strip)) {
            return branchName.substr(strip.length);
        }
    }
    return branchName;
}

function uniq<T>(a: T[]): T[] {
    return Array.from(new Set(a));
}

async function branchesAreEquivalent(
    b1: string,
    b2: string
) {
    const
        shas1 = await revParse(b1),
        shas2 = await revParse(b2);
    // TODO: could print out how far ahead one branch is from another
    return arraysAreEqual(shas1, shas2);
}

async function findRemotes(): Promise<string[]> {
    const
        result = await git("remote", "-v"),
        lines = result.stdout,
        remoteNames = lines.map(l => l.split(/\s/)[0]);
    return uniq(remoteNames);
}

function arraysAreEqual(
    a1: string[],
    a2: string[]) {
    if (a1.length !== a2.length) {
        return false;
    }
    // do this in reverse-order: if there's a mismatch, it's more likely
    // at the tip
    for (let i = a1.length - 1; i > -1; i--) {
        if (a1[i] !== a2[i]) {
            return false;
        }
    }
    return true;
}

async function revParse(branch: string): Promise<string[]> {
    const raw = await git("rev-parse", branch);
    return raw.stdout;
}

function gitCheckout(branch: string): Promise<ProcessResult> {
    return git("checkout", branch);
}

function gitMerge(branch: string): Promise<ProcessResult> {
    return git("merge", branch);
}

function gitAbortMerge(): Promise<ProcessResult> {
    return git("merge", "--abort");
}

function git(...args: string[]): Promise<ProcessResult> {
    return exec("git", args);
}

async function runIn<T>(
    dir: string | undefined,
    action: AsyncFunc<T>) {
    const start = process.cwd();
    try {
        if (dir) {
            process.chdir(dir);
        }
        return await action();
    } finally {
        process.chdir(start);
    }
}

async function findBestMaster() {
    const listing = await matchBranches("*master");
    const withoutRemotesPrefix = listing
        .map(
            l => l.replace(/^remotes\//, "")
        );
    const originMaster = withoutRemotesPrefix.find(l => l === "origin/master")
    if (originMaster) {
        return originMaster;
    }
    const master = withoutRemotesPrefix.find(l => l === "master");
    if (master) {
        return master;
    }
    throw new Error(
        `Can't automatically determine which branch to broadcast from (tried origin/master, master). Please specify a from branch.`
    )
}

async function findCurrentBranch(): Promise<string | undefined> {
    const
        all = await listBranchesRaw(),
        current = all.find(a => a.startsWith("*"));
    const result = current
        ? current.replace(currentBranchRe, "")
        : current;
    if (result?.match(/detached at /)) {
        return undefined; // not on a branch; we're detached!
    }
    return result;
}

async function findBranchWhichIsHeadRef(): Promise<string | undefined> {
    const
        all = await listBranchesRaw("*"),
        headRef = all.map(b => {
            const match = b.match(/HEAD -> (.*)/);
            return match
                ? match[1]
                : ""
        }).filter(b => !!b)[0]; // should get something like "origin/master"
    // we don't want "origin" (or whatever the upstream is called)
    return headRef.split("/").slice(1).join("/");
}

async function listBranchesRaw(spec?: string): Promise<string[]> {
    if (!spec) {
        spec = "*";
    }
    return (
        await git("branch", "-a", "--list", spec)
    ).stdout;
}

async function matchBranches(spec: string): Promise<string[]> {
    const result = await listBranchesRaw(spec);
    return result.map(
        // remove the "current branch" marker
        line => line.replace(currentBranchRe, "")
    ).map(line => line.trim());
}
