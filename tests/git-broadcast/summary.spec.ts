import { BroadcastResult } from "../../src/git-broadcast";
import * as faker from "faker";
import {
    createSummary,
    parseSummary
} from "../../src/summary";

describe(`create-summary`, () => {
    it(`should print out the one merged, pushed branch with author info`, async () => {
        // Arrange
        const
            mergedBranch = {
                authorName: faker.name.findName(),
                authorEmail: faker.internet.email(),
                target: faker.random.alphaNumeric(),
                pushed: true
            },
            data = {
                pushedAll: true,
                from: "master",
                to: [],
                ignoreMissingBranches: true,
                unmerged: [],
                merged: [ mergedBranch ]
            } as BroadcastResult;
        // Act
        const result = createSummary(data);
        // Assert
        const parsed = parseSummary(result);
        expect(parsed)
            .toEqual(data);
    });
});
