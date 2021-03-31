import { dirname, join as joinPath } from "path";
import { fileExists, readTextFile } from "yafs";

export async function readVersionInfo(): Promise<string> {
    let previous,
        current = __dirname;
    while (current !== previous) {
        const test = joinPath(current, "package.json");
        if (await fileExists(test)) {
            const
                contents = await readTextFile(test),
                pkg = JSON.parse(contents);
            return `${ pkg.name } ${ pkg.version }`;
        }
        previous = current;
        current = dirname(current);
    }
    throw new Error(`Can't find package.json, travelling up from ${ __dirname }`);
}
