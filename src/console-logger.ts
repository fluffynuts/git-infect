import chalk from "chalk";

type LogFunction = (...args: any[]) => void;
type PassThrough<T> = (o: T) => T;

export interface Logger {
    info: LogFunction;
    error: LogFunction;
    debug: LogFunction;
}

export enum LogLevel {
    debug = 0,
    info = 1,
    error = 2
}

function noop() {
    // intentionally left blank
}

export class ConsoleLogger implements Logger {

    public get error() {
        return this._error;
    }

    public get info() {
        return this._info;
    }

    public get debug() {
        return this._debug;
    }

    private readonly _error: LogFunction;
    private readonly _info: LogFunction;
    private readonly _debug: LogFunction;

    constructor(level?: LogLevel) {
        if (level === undefined) {
            level = LogLevel.info;
        }

        this._debug = level > LogLevel.debug
            ? noop
            : this._makeLogger(console.debug.bind(console), chalk.gray.bind(chalk));
        this._info = level > LogLevel.info
            ? noop
            : this._makeLogger(console.log.bind(console), chalk.yellow.bind(chalk));
        this._error = this._makeLogger(console.error, chalk.red.bind(chalk))
    }

    private _makeLogger(logger: LogFunction, colorizer: PassThrough<string>): LogFunction {
        return (...args: any[]) =>
            logger(
                colorizer(
                    stringify(args)
                )
            );
    }
}


export function stringify(...args: any[]) {
    return args.map(a => {
        return typeof a === "string"
            ? a
            : JSON.stringify(a)
    }).join(" ");
}
