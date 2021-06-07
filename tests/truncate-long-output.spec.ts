import "expect-even-more-jest";
import * as faker from "faker";
import { BroadcastOptions } from "../src/types";
import { truncateLongOutput } from "../src/truncate-long-output";

describe(`truncateLongOutput`, () => {
    describe(`when have fewer lines than the limit`, () => {
        it(`should return all lines in primary`, async () => {
            // Arrange
            const
                lines = [
                    faker.random.words(),
                    faker.random.words()
                ],
                opts = {
                    maxErrorLines: 5
                } as BroadcastOptions;
            // Act
            const result = truncateLongOutput(lines, opts);
            // Assert
            expect(result.primary)
                .toEqual(lines);
            expect(result.secondary)
                .toBeEmptyArray();
        });
    });

    describe(`when have exactly the same number of lines as the limit`, () => {
        it(`should return all lines in primary`, async () => {
            // Arrange
            const
                lines = [
                    faker.random.words(),
                    faker.random.words()
                ],
                opts = {
                    maxErrorLines: 2
                } as BroadcastOptions;
            // Act
            const result = truncateLongOutput(lines, opts);
            // Assert
            expect(result.primary)
                .toEqual(lines);
            expect(result.secondary)
                .toBeEmptyArray();
        });
    });

    describe(`when have more lines than the limit`, () => {
        it(`should return {limit} lines in primary and the rest in secondary`, async () => {
            // Arrange
            const
                line1 = faker.random.words(),
                line2 = faker.random.words(),
                line3 = faker.random.words(),
                lines = [
                    line1,
                    line2,
                    line3
                ], opts = {
                    maxErrorLines: 2
                } as BroadcastOptions;
            // Act
            const result = truncateLongOutput(lines, opts)
            // Assert
            expect(result.primary)
                .toEqual([ line1, line2 ]);
            expect(result.secondary)
                .toEqual([ line3 ]);
        });
    });
});
