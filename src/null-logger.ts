import { Logger } from "./console-logger";

export class NullLogger implements Logger {
    public logPrefix: string = "";
    debug(): void {
        // intentionally does nothing
    }

    error(): void {
        // intentionally does nothing
    }

    info(): void {
        // intentionally does nothing
    }

    warn(args: any): void {
        // intentionally does nothing
    }
}
