import { BroadcastOptions } from "./types";

export interface TruncatedOutput {
    primary: string[];
    secondary: string[];
}

export function truncateLongOutput(
    lines: string[],
    opts: BroadcastOptions
): TruncatedOutput {
    const
        limit = opts.maxErrorLines ?? 10;
    if (lines.length <= limit) {
        return {
            primary: lines,
            secondary: []
        }
    }
    return {
        primary: lines.slice(0, limit),
        secondary: lines.slice(limit)
    }
}

