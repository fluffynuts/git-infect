import { Logger } from "./console-logger";

export class NullLogger implements Logger {
    debug(): void {
        // intentionally does nothing
    }

    error(): void {
        // intentionally does nothing
    }

    info(): void {
        // intentionally does nothing
    }
}
