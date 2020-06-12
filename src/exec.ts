import { spawn, SpawnOptions } from "child_process";

export interface ProcessResult {
    stdout: string[];
    stderr: string[];
    exitCode: number;
    error?: Error;
}

interface ExecOptions extends SpawnOptions {
    trimOutputs?: boolean; // when true, trim off empty lines at the end
}

const lineTrimRe = /(\r|\n|\r\n)$/;

// runs a command and returns the result
export async function exec(
    cmd: string,
    args: string[],
    options?: ExecOptions
): Promise<ProcessResult> {
    return new Promise((_resolve, _reject) => {
        let completed = false;
        const
            result: ProcessResult = {
                stdout: [],
                stderr: [],
                exitCode: 0,
            },
            isComplete = () => {
                if (completed) {
                    return true;
                }
                completed = true;
                return false;
            },
            trim = options?.trimOutputs === undefined || options?.trimOutputs
                ? trimLines
                : passThrough,
            resolve = (): any => {
                return isComplete() || _resolve(trim(result));
            },
            rejectWith = (err: Error | number) => {
                if (isComplete()) {
                    return;
                }
                if (typeof err === "number") {
                    result.exitCode = err;
                } else {
                    result.error = err;
                }
                _reject(new ExecError(trim(result)));
            },
            child = spawn(cmd, args, options as SpawnOptions);
        if (!child.stdout) {
            throw new Error(`No stdout acquired for ${ cmd } "${ args.join(", ") }"`);
        }
        child.stdout?.on("data", d => appendLines(result.stdout, d));
        child.stderr?.on("data", d => appendLines(result.stderr, d));
        child.on("error", e => rejectWith(e));
        child.on("close", code => code ? rejectWith(code) : resolve());
    });
}

export class ExecError extends Error {
    private generateMessage(): string {
        return [
            this.message,
            this.stack,
            ``,
            `exit code: ${this._result.exitCode}`,
            `stderr:\n${this._result.stderr.join("\n")}`
        ].join("\n");
    }

    constructor(private _result: ProcessResult) {
        super("MOO");
        this.message = `Exec fails:\n${this.generateMessage()}`;
    }

}

function trimLines(from: ProcessResult): ProcessResult {
    return {
        ...from,
        stderr: trimEmptyElements(from.stderr),
        stdout: trimEmptyElements(from.stdout)
    }
}

function trimEmptyElements(arr: string[]): string[] {
    let foundData = false;
    return arr.reverse().reduce(
        (acc: string[], cur: string) => {
            if (foundData) {
                acc.push(cur);
            } else if (cur !== "") {
                foundData = true;
                acc.push(cur);
            }
            return acc;
        }, [] as string[]
    ).reverse();
}

function passThrough<T>(value: T): T {
    return value;
}

function appendLines(target: string[], data: Buffer) {
    target.push.apply(
        target,
        data.toString()
            .split("\n")
            .map(l => l.replace(lineTrimRe, ""))
    );
}
