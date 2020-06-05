import { exec, ProcessResult } from "./exec";

export interface BroadcastOptions {
    in?: string;
    from?: string;
    to?: string[],
    ignoreMissingBranches?: boolean;
}

const defaultOptions: BroadcastOptions = {
    from: undefined,
    to: ["*"],
    ignoreMissingBranches: false
}

const currentBranchRe = /^\*\s/;

type AsyncAction = (() => Promise<any>);

export async function gitBroadcast(
    providedOptions: BroadcastOptions) {
    const opts = {
        ...defaultOptions,
        ...providedOptions
    }
    await runIn(opts.in, async () => {
        const startBranch = await findCurrentBranch();
        if (!opts.from) {
            opts.from = await findBestMaster();
        } else {
            await gitCheckout(opts.from);
            await git("pull", "--rebase");
        }
        for (const to of (opts.to || [])) {
            const allTargets = await matchBranches(to);
            if (allTargets.length === 0) {
                if (opts.ignoreMissingBranches) {
                    continue;
                }
                throw new Error(`Can't match branch spec '${ to }'`);
            }
            for (const target of allTargets) {
                await gitCheckout(target);
                await gitMerge(opts.from);
            }
        }
        if (startBranch) {
            await gitCheckout(startBranch);
        }
    });
}

function gitCheckout(branch: string): Promise<ProcessResult> {
    return git("checkout", branch);
}
function gitMerge(branch: string): Promise<ProcessResult> {
    return git("merge", branch);
}
function git(...args: string[]): Promise<ProcessResult> {
    return exec("git", args);
}

async function runIn(
    dir: string | undefined,
    action: AsyncAction) {
    const start = process.cwd();
    try {
        if (dir) {
            process.chdir(dir);
        }
        await action();
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
    return current
        ? current.replace(currentBranchRe, "")
        : current;
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
