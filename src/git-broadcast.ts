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
            const allTargets = (await matchBranches(to)).filter(b => b !== opts.from);
            if (allTargets.length === 0) {
                if (opts.ignoreMissingBranches) {
                    continue;
                }
                throw new Error(`Can't match branch spec '${ to }'`);
            }
            for (const target of allTargets) {
                try {
                    await gitCheckout(target);
                } catch (e) {
                    // can't check it out; just ignore it? perhaps there's a more
                    // deterministic plan, but for now, this will do
                    // in particular, this is triggered by git branch --list -a *
                    // bringing back the symbolic remotes/origin/HEAD, which isn't something
                    // we'd want to merge into anyway
                    continue;
                }
                if (await branchesAreEquivalent(opts.from, target)) {
                    continue;
                }
                await gitMerge(opts.from);
            }
        }
        if (startBranch) {
            await gitCheckout(startBranch);
        }
    });
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
