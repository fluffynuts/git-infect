import chalk from "chalk";

type LogFunction = (...args: any[]) => void;
type PassThrough<T> = (o: T) => T;

export interface Logger {
    info: LogFunction;
    warn: LogFunction;
    error: LogFunction;
    debug: LogFunction;
}

export enum LogLevel {
    debug = 0,
    info = 1,
    warn = 2,
    error = 3
}

function noop() {
    // intentionally left blank
}

function zpad(s: string | number, digits: number = 2) {
    s = (s || "").toString();
    while (s.length < digits) {
        s = `0${ s }`
    }
    return s;
}

function timestamp() {
    const
        now = new Date(),
        y = zpad(now.getFullYear()),
        m = zpad(now.getMonth() + 1),
        d = zpad(now.getDate()),
        H = zpad(now.getHours()),
        M = zpad(now.getMinutes()),
        S = zpad(now.getSeconds());
    return `${ y }-${ m }-${ d } ${ H }:${ M }:${ S }`;
}

export class ConsoleLogger implements Logger {

    public get error() {
        return this._error;
    }

    public get warn() {
        return this._warn;
    }

    public get info() {
        return this._info;
    }

    public get debug() {
        return this._debug;
    }

    public get level() {
        return this._level;
    }

    private readonly _error: LogFunction;
    private readonly _warn: LogFunction;
    private readonly _info: LogFunction;
    private readonly _debug: LogFunction;

    private readonly _level: LogLevel;

    constructor(level?: LogLevel) {
        if (level === undefined) {
            level = LogLevel.info;
        }

        this._level = level;

        this._debug = level > LogLevel.debug
            ? noop
            : this._makeLogger(console.debug.bind(console), chalk.gray.bind(chalk), "DEBUG");
        this._info = level > LogLevel.info
            ? noop
            : this._makeLogger(console.log.bind(console), chalk.yellow.bind(chalk), "INFO");
        this._warn = level > LogLevel.warn
            ? noop
            : this._makeLogger(console.warn.bind(console), chalk.magenta.bind(chalk), "WARN");
        this._error = this._makeLogger(console.error.bind(console), chalk.red.bind(chalk), "ERROR")
    }

    private _makeLogger(
        logger: LogFunction,
        colorizer: PassThrough<string>,
        prefix: string
    ): LogFunction {
        return (...args: any[]) => {
            const stampedPre = `[ ${ prefix } :: ${ timestamp() } ]`;
            if (typeof args[0] === "string") {
                args[0] = `${stampedPre} ${ args[0] }`;
            } else {
                args = [ stampedPre ].concat(args);
            }
            logger(
                ...args.map(a => colorizer(a))
            );
        }
    }
}


export function stringify(...args: any[]) {
    return args.map(a => {
        return typeof a === "string"
            ? a
            : JSON.stringify(a)
    }).join(" ");
}
