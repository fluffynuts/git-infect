import { debug } from "debug";
import { basename } from "path";

export type DebugFunction = (...args: any[]) => void;

export function mkdebug(at: string): DebugFunction {
    const ctx = basename(at).replace(/\.[^.]*$/, "");
    return debug(ctx);
}
