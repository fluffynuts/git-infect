import { exec, ExecError, ProcessResult } from "./exec";
import { Logger } from "./console-logger";
import { NullLogger } from "./null-logger";
import chalk from "chalk"
import { mkdebug } from "./mkdebug";

const debug = mkdebug(__filename);
export const unknownAuthor: AuthorDetails = {
    name: "Unknown",
    email: "unknown@no-reply.org"
};

export interface BroadcastOptions {
    in?: string;
    from?: string;
    to?: string[],
    fromRemote?: string;
    toRemote?: string;
    ignoreMissingBranches?: boolean;
    logger?: Logger;
    push?: boolean;
    gitUser?: string;
    gitToken?: string;
}

const defaultOptions: BroadcastOptions = {
    from: undefined,
    to: [ "*" ],
    ignoreMissingBranches: false,
    fromRemote: "origin",
    toRemote: "origin"
}
const currentBranchRe = /^\*\s/;

type AsyncFunc<T> = (() => Promise<T>);

export interface MergeInfo {
    target: string;
    authorEmail: string;
    authorName: string;
    pushed: boolean;
}

export interface FailedMerge extends MergeInfo {
    processResult: ProcessResult
}

export interface MergeAttempt {
    merged?: MergeInfo;
    unmerged?: FailedMerge;
}

export interface BroadcastResult {
    from: string;
    to: string[];
    ignoreMissingBranches: boolean
    merged: MergeInfo[];
    unmerged: FailedMerge[];
    pushedAll?: boolean;
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
        if (remotes.length > 1) {
            throw new Error("Multiple remotes are not supported (yet)");
        }
        if (!opts.from) {
            opts.from = await findDefaultBranch();
        }
        let startBranch = await findCurrentBranch();
        if (!startBranch) {
            if (!opts.from) {
                throw new Error(`Cannot determine default branch and no explicit branch set to start from`);
            }
            // can't assume master is the head ref any more
            // -> but can fall back on that as a last resort
            await git("checkout", opts.from);
            startBranch = await findCurrentBranch();
        }
        if (!startBranch) {
            throw new Error("don't know where to start from!");
        }

        try {
            // try to unshallow first
            await git("fetch", "--unshallow");
        } catch (e) {
            await git("fetch", "--all");
        }

        clearCaches();

        const result = await tryMergeAll(
            opts,
            remotes,
            logger
        );

        if (startBranch) {
            await gitCheckout(startBranch);
        }
        logger.debug(`all targets have been visited!`);
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
        merged: [] as MergeInfo[],
        unmerged: [] as FailedMerge[],
        pushedAll: undefined
    };
    for (const to of (opts.to || [])) {
        const rawMatches = await matchBranches(to);
        const allTargets = uniq(
            rawMatches
                .filter(b =>
                    // match branches already locally checked out
                    !b.startsWith("remotes/") ||
                    // match branches from the selected target remote
                    b.startsWith(`remotes/${ opts.toRemote }`)
                )
                .map(b => stripRemote(b, remotes))
                .filter(b => b !== opts.from)
        );

        debug({
            rawMatches,
            allTargets
        });

        if (allTargets.length === 0) {
            if (opts.ignoreMissingBranches) {
                continue;
            }
            throw new Error(`Can't match branch spec '${ to }'`);
        }
        for (const target of allTargets) {
            const mergeAttempt = await tryMerge(logger, target, opts)
            if (!!mergeAttempt.unmerged) {
                logger.debug(`adding ${ JSON.stringify(mergeAttempt.unmerged) } to the unmerged collection ):`);
                result.unmerged.push(mergeAttempt.unmerged);
            } else if (!!mergeAttempt.merged) {
                logger.debug(`adding ${ mergeAttempt.merged } to the merged collection (:`);
                result.merged.push(mergeAttempt.merged);
                if (opts.push) {
                    logger.debug(`attempting to push ${ target } to ${ opts.toRemote }`);
                    try {
                        await git("push", opts.toRemote as string, target);
                        mergeAttempt.merged.pushed = true;
                        logger.info(`${ target } pushed to ${ opts.toRemote }`);
                        if (result.pushedAll === undefined) {
                            result.pushedAll = true;
                        }
                    } catch (e) {
                        logger.error(`push of ${ target } to ${ opts.toRemote } fails: ${ e }`);
                        result.pushedAll = false;
                    }
                } else {
                    logger.warn(`successful merge of ${ target } will NOT be pushed back to ${ opts.toRemote } (disabled at cli)`)
                }
            }
        }
    }
    result.pushedAll = !!result.pushedAll;
    return result;
}

async function tryMerge(
    logger: Logger,
    target: string,
    opts: BroadcastOptions
): Promise<MergeAttempt> {
    const result = {} as MergeAttempt;
    if (opts.from === undefined) {
        throw new Error(`source for broadcast (--from) not specified\n:all options:\n${ JSON.stringify(opts, null, 2) }`);
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
    const fullyQualifiedFrom = `${ opts.fromRemote }/${ opts.from }`;
    if (await branchesAreEquivalent(fullyQualifiedFrom, target)) {
        logger.debug(`${ target } is equivalent to ${ opts.from }`);
        return result;
    }
    const
        authorDetails = await readAuthorDetailsForLatestCommit(),
        authorEmail = authorDetails.email,
        authorName = authorDetails.name;
    try {
        logger.info(`start merge: ${ fullyQualifiedFrom } -> ${ target }`);
        await gitMerge(fullyQualifiedFrom);
        logger.info(chalk.green(`successfully merged ${ opts.from } -> ${ target }`));
        result.merged = {
            target,
            authorEmail,
            authorName,
            pushed: false
        };
    } catch (e) {
        const
            err = e as ExecError,
            message = err.result?.stdout?.join("\n") ?? e.message ?? e;
        logger.error(`merge fails: ${ message }`);
        await tryDo(async () =>
            await gitAbortMerge()
        );
        result.unmerged = {
            target,
            authorEmail,
            authorName,
            pushed: false,
            processResult: e.result
        };
    }
    return result;
}

async function tryDo<T>(asyncAction: () => Promise<T>): Promise<T | void> {
    try {
        return await asyncAction();
    } catch (e) {
        // suppress
    }
}

export interface AuthorDetails {
    name: string;
    email: string;
}

export function parseAuthorDetailsFrom(line: string): AuthorDetails {
    const match = line.match(/Author: (.*) <(.*)>/i);
    if (!match) {
        return unknownAuthor;
    }
    return {
        name: match[1],
        email: match[2]
    };
}

async function readAuthorDetailsForLatestCommit(): Promise<AuthorDetails> {
    const
        processResult = await git("log", "-1");
    return (processResult.stdout || []).reduce(
        (acc, line) => {
            if (line.toLowerCase().startsWith("author:")) {
                return parseAuthorDetailsFrom(line);
            }
            return acc;
        }, unknownAuthor);
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
    return git("checkout", "-f", branch);
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

async function findDefaultBranch(): Promise<string | undefined> {
    const
        all = await listBranchesRaw(),
        headRef = all.map(b => {
            const match = b.match(/HEAD -> (.*)/);
            return match
                ? match[1]
                : ""
        }).filter(b => !!b)[0]; // should get something like "origin/master"
    if (!headRef) {
        return undefined;
    }
    // we don't want "origin" (or whatever the upstream is called)
    return headRef.split("/").slice(1).join("/");
}

const rawBranchResultCache: string[] = [];

export function clearCaches() {
    rawBranchResultCache.splice(0, rawBranchResultCache.length);
}

async function listBranchesRaw(spec?: string): Promise<string[]> {
    if (rawBranchResultCache.length) {
        return rawBranchResultCache;
    }
    const args = [ "branch", "-a", "--list" ];
    if (spec && spec !== "*") {
        args.push(spec);
    }
    const result = (
        await git.apply(null, args)
    ).stdout;

    rawBranchResultCache.splice(0, 0, ...result);
    return result;
}

async function matchBranches(spec: string): Promise<string[]> {
    const result = await listBranchesRaw(spec);
    return result.map(
        // remove the "current branch" marker
        line => line.replace(currentBranchRe, "")
    ).map(line => line.trim())
        .filter(line => line.indexOf(" -> ") === -1);
}
