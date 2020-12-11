import { spawn, SpawnOptions } from "child_process";

export interface ProcessResult {
    cmd: string;
    args: string[];
    options?: ExecOptions;
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
    opts?: ExecOptions
): Promise<ProcessResult> {
    return new Promise((_resolve, _reject) => {
        let completed = false;
        const options: ExecOptions = {
            cwd: process.cwd(),
            ...opts
        };
        const
            result: ProcessResult = {
                cmd,
                args,
                options,
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
        console.log("spawned:", {
            cmd,
            args: JSON.stringify(args),
            options: JSON.stringify(options, null, 2)
        });
        if (!child.stdout) {
            throw new Error(`No stdout acquired for ${ cmd } "${ args.join(", ") }"`);
        }
        child.stdout?.on("data", d => appendLines(result.stdout, d));
        child.stderr?.on("data", d => appendLines(result.stderr, d));
        child.on("error", e => rejectWith(e));
        child.on("close", code => {
            console.log("process close", JSON.stringify({
                result,
                child
            }, null, 2));
            return code ? rejectWith(code) : resolve();
        });
    });
}

export class ExecError extends Error {
    private static generateMessage(msg: string, result: ProcessResult): string {
        return [
            msg,
            ``,
            `attempted to run:`,
            `cmd: ${result.cmd}`,
            `args: ${JSON.stringify(result.args || [])}`,
            `opts: ${JSON.stringify(result.options)}`,
            `exit code: ${result.exitCode}`,
            `stdout:\n${result.stdout.join("\n")}`,
            `stderr:\n${result.stderr.join("\n")}`
        ].join("\n");
    }

    public get result(): ProcessResult {
        return this._result;
    }

    constructor(private _result: ProcessResult) {
        super(ExecError.generateMessage("Exec fails", _result));
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
