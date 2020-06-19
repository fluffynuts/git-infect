import { Logger, stringify } from "./console-logger";

export class CollectingLogger implements Logger {
    public debugLogs: string[] = [];
    public errorLogs: string[] = [];
    public infoLogs: string[] = [];

    debug(...args: any[]): void {
        this.debugLogs.push(stringify(args));
    }

    error(...args: any[]): void {
        this.errorLogs.push(stringify(args));
    }

    info(...args: any[]): void {
        this.infoLogs.push(stringify(args));
    }
}
