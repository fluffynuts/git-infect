import { BroadcastResult, FailedMerge, MergeInfo } from "./git-broadcast";

// creates a human-readable summary of the merge process
export function createSummary(result: BroadcastResult): string[] {
    return [
        `from: ${ result.from }`,
        `to: ${ result.to.join(",") }`,
        `ignoreMissingBranches: ${ result.ignoreMissingBranches }`,
        ...summariseMerged(result.merged),
        ...summariseUnmerged(result.unmerged)
    ];
}

function summariseMerged(merged: MergeInfo[]): string[] {
    return summarise("merged", merged);
}

function summariseUnmerged(unmerged: FailedMerge[]): string[] {
    return summarise("unmerged", unmerged);
}

function summarise(tag: string, infos: MergeInfo[]): string[] {
    if (infos.length === 0) {
        return [];
    }
    return [ `${ tag }:` ].concat(
        infos.map(m => `  ${ m.target } merged pushed:${ m.pushed } (${ m.authorName } <${ m.authorEmail }>)`)
    );
}

enum LineState {
    other,
    inMerged,
    inUnmerged
}

function tryParseFromLine(line: string, result: BroadcastResult): boolean {
    return tryParseLine(
        line,
        "from",
        from => result.from = from
    );
}

function tryParseToLine(line: string, result: BroadcastResult): boolean {
    return tryParseLine(
        line,
        "to",
        to => result.to = to.split(",")
    );
}

function tryParseIgnoreMissingBranchesLine(line: string, result: BroadcastResult): boolean {
    return tryParseLine(
        line,
        "ignoreMissingBranches",
        b => result.ignoreMissingBranches = parseBool(b)
    )
}

const truthy = new Set<string>([
    "true",
    "1",
    "yes"
]);

function parseBool(b: string): boolean {
    return truthy.has((b || "").toLowerCase());
}

function tryParseLine(
    line: string,
    startsWith: string,
    whenMatches: (value: string) => void
): boolean {
    const
        re = new RegExp(`^${startsWith}: (.*)`),
        match = line.match(re);
    if (!match) {
        return false;
    }
    whenMatches(match[1]);
    return true;
}

// parses the human-readable summary into data that a piped
// process could use, eg for notifications
export function parseSummary(
    lines: string[]
): BroadcastResult {
    return lines.reduce(
        (acc, cur) => {

            return acc;
        }, {
            ignoreMissingBranches: false,
            merged: [],
            from: "",
            pushedAll: false,
            unmerged: [],
            to: []
        });
}
