import "expect-even-more-jest";
import { Sandbox } from "filesystem-sandbox";
import { Repository } from "./repository";
import * as path from "path";

describe(`test repository wrapper`, () => {
    it(`should be able to init`, async () => {
        // Arrange
        const
            sandbox = new Sandbox(),
            dir = await sandbox.mkdir("origin"),
            repo = new Repository(dir);
        // Act
        await repo.init();
        // Assert
        expect(path.join(dir, ".git"))
            .toBeFolder()
    });

    it(`should be able to add and commit`, async () => {
        // Arrange
        const
            sandbox = new Sandbox(),
            dir = await sandbox.mkdir("origin"),
            commitMessage = ":memo: add doc",
            repo = new Repository(dir)
        // Act
        await repo.init();
        await sandbox.writeFile("origin/readme.md", "# This is the readme");
        await repo.addAll();
        const beforeCommit = await repo.status();
        expect(beforeCommit.files)
            .toContainEqual(expect.objectContaining({
                path: "readme.md"
            }));
        await repo.commit(commitMessage);

        // Assert
        const result = await repo.status();
        expect(result.files)
            .toBeEmptyArray();
        const logResult = await repo.log({

        });
        expect(logResult.all)
            .toHaveLength(1);
        expect(logResult.latest)
            .toEqual(expect.objectContaining({
                message: commitMessage
            }));
    });
});
