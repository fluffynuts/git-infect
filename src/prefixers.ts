import { LogPrefixer } from "./git-broadcast";
export type StringMutator = (input: string) => string;

export function makePrefixer(
    fn: LogPrefixer,
    prefix: string
): StringMutator {
    return fn.bind(null, prefix);
}

export function makeOk(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "👍");
}

export function makeConstruction(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "🚧");
}

export function makeSuccess(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "✅");
}

export function makeFail(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "⛔");
}

export function makeInfo(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "ℹ");
}

export function makeWarn(
    fn: LogPrefixer
): StringMutator {
    return makePrefixer(fn, "⚠");
}
