import { parseAuthorDetailsFrom } from "../../src/git-broadcast";

describe(`author details`, () => {
    describe(`parseAuthorDetailsFrom`, () => {
        it(`should return the author details from a valid line`, async () => {
            // Arrange
            const
                line = "Author: Bob Saget <bob@saget.com>",
                expected = {
                    name: "Bob Saget",
                    email: "bob@saget.com"
                };
            // Act
            const result = await parseAuthorDetailsFrom(line);
            // Assert
            expect(result)
                .toEqual(expected);
        });
    });
});
