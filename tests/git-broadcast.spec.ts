import "expect-even-more-jest";
import { Sandbox } from "filesystem-sandbox";
import * as faker from "faker";
import { gitBroadcast } from "../src/git-broadcast";
import { Repository } from "./repository";
import { CollectingLogger } from "../src/collecting-logger";

describe(`git-broadcast`, () => {
    beforeEach(() => {
        // we're doing fs-ops here, give things a little more
        // time (though they generally won't need it)
        jest.setTimeout(60000);
    });
    it(`should broadcast to a single receiver from the default source`, async () => {
        // Arrange
        const
            sandbox = await Sandbox.create(),
            featureBranch = "feature/stuff",
            readmeContents = `initial: ${ faker.random.words() }`,
            updatedContents = `updated: ${ faker.random.words() }`,
            initialMessage = ":tada: initial commit",
            updatedMessage = ":memo: prior docs are all wrong!",
            originPath = await sandbox.mkdir("origin"),
            localPath = await sandbox.mkdir("local"),
            origin = Repository.create(originPath);
        await origin.init();
        await sandbox.writeFile("origin/readme.md", readmeContents);
        await origin.commitAll(initialMessage);
        await sandbox.writeFile("origin/readme.md", updatedContents);
        await origin.commitAll(updatedMessage);
        await origin.checkout("master");

        const local = await Repository.clone(originPath, localPath);
        await local.fetch();
        await local.resetHard("HEAD~1");
        await local.checkout("-b", featureBranch);

        const currentContents = await sandbox.readTextFile("local/readme.md");
        expect(currentContents)
            .toEqual(readmeContents); // should have readme reset
        // Act
        await gitBroadcast({
            in: localPath,
            to: [featureBranch]
        })
        // Assert
        await local.checkout(featureBranch);
        const log = await local.log();
        expect(log.latest.message)
            .toEqual(updatedMessage);
    });

    it(`should broadcast to a globbed single receiver from the default source`, async () => {
        // Arrange
        const
            sandbox = await Sandbox.create(),
            featureBranch = "feature/stuff",
            readmeContents = `initial: ${ faker.random.words() }`,
            updatedContents = `updated: ${ faker.random.words() }`,
            initialMessage = ":tada: initial commit",
            updatedMessage = ":memo: prior docs are all wrong!",
            originPath = await sandbox.mkdir("origin"),
            localPath = await sandbox.mkdir("local"),
            origin = Repository.create(originPath);
        await origin.init();
        await sandbox.writeFile("origin/readme.md", readmeContents);
        await origin.commitAll(initialMessage);
        await sandbox.writeFile("origin/readme.md", updatedContents);
        await origin.commitAll(updatedMessage);
        await origin.checkout("master");

        const local = await Repository.clone(originPath, localPath);
        await local.fetch();
        await local.resetHard("HEAD~1");
        await local.checkout("-b", featureBranch);

        const currentContents = await sandbox.readTextFile("local/readme.md");
        expect(currentContents)
            .toEqual(readmeContents); // should have readme reset
        // Act
        await gitBroadcast({
            in: localPath,
            to: ["feature/*"]
        })
        // Assert
        await local.checkout(featureBranch);
        const log = await local.log();
        expect(log.latest.message)
            .toEqual(updatedMessage);
    });

    it(`should broadcast to a globbed single receiver from the specified source`, async () => {
        // Arrange
        const
            sandbox = await Sandbox.create(),
            featureBranch = "feature/stuff",
            readmeContents = `initial: ${ faker.random.words() }`,
            updatedContents = `updated: ${ faker.random.words() }`,
            initialMessage = ":tada: initial commit",
            updatedMessage = ":memo: prior docs are all wrong!",
            originPath = await sandbox.mkdir("origin"),
            localPath = await sandbox.mkdir("local"),
            origin = Repository.create(originPath);
        await origin.init();
        await sandbox.writeFile("origin/readme.md", readmeContents);
        await origin.commitAll(initialMessage);
        await sandbox.writeFile("origin/readme.md", updatedContents);
        await origin.commitAll(updatedMessage);
        await origin.checkout("master");

        const local = await Repository.clone(originPath, localPath);
        await local.fetch();
        await local.resetHard("HEAD~1");
        await local.checkout("-b", featureBranch);

        const currentContents = await sandbox.readTextFile("local/readme.md");
        expect(currentContents)
            .toEqual(readmeContents); // should have readme reset
        // Act
        await gitBroadcast({
            in: localPath,
            from: "master",
            to: ["feature/*"]
        })
        // Assert
        await local.checkout(featureBranch);
        const log = await local.log();
        expect(log.latest.message)
            .toEqual(updatedMessage);
    });

    it(`should broadcast to all that aren't the source by default`, async () => {
        // Arrange
        const
            sandbox = await Sandbox.create(),
            featureBranch = "feature/stuff",
            readmeContents = `initial: ${ faker.random.words() }`,
            updatedContents = `updated: ${ faker.random.words() }`,
            initialMessage = ":tada: initial commit",
            updatedMessage = ":memo: prior docs are all wrong!",
            originPath = await sandbox.mkdir("origin"),
            localPath = await sandbox.mkdir("local"),
            origin = Repository.create(originPath);
        await origin.init();
        await sandbox.writeFile("origin/readme.md", readmeContents);
        await origin.commitAll(initialMessage);
        await sandbox.writeFile("origin/readme.md", updatedContents);
        await origin.commitAll(updatedMessage);
        await origin.checkout("master");

        const local = await Repository.clone(originPath, localPath);
        await local.fetch();
        await local.resetHard("HEAD~1");
        await local.checkout("-b", featureBranch);

        const currentContents = await sandbox.readTextFile("local/readme.md");
        expect(currentContents)
            .toEqual(readmeContents); // should have readme reset
        // Act
        await gitBroadcast({
            in: localPath,
            from: "master"
        })
        // Assert
        await local.checkout(featureBranch);
        const log = await local.log();
        expect(log.latest.message)
            .toEqual(updatedMessage);
    });

    it(`should default from master to *`, async () => {
        // Arrange
        const
            sandbox = await Sandbox.create(),
            featureBranch = "feature/stuff",
            readmeContents = `initial: ${ faker.random.words() }`,
            updatedContents = `updated: ${ faker.random.words() }`,
            initialMessage = ":tada: initial commit",
            updatedMessage = ":memo: prior docs are all wrong!",
            originPath = await sandbox.mkdir("origin"),
            localPath = await sandbox.mkdir("local"),
            origin = Repository.create(originPath);
        await origin.init();
        await sandbox.writeFile("origin/readme.md", readmeContents);
        await origin.commitAll(initialMessage);
        await sandbox.writeFile("origin/readme.md", updatedContents);
        await origin.commitAll(updatedMessage);
        await origin.checkout("master");

        const local = await Repository.clone(originPath, localPath);
        await local.fetch();
        await local.resetHard("HEAD~1");
        await local.checkout("-b", featureBranch);

        const currentContents = await sandbox.readTextFile("local/readme.md");
        expect(currentContents)
            .toEqual(readmeContents); // should have readme reset
        // Act
        await gitBroadcast({
            in: localPath
        })
        // Assert
        await local.checkout(featureBranch);
        const log = await local.log();
        expect(log.latest.message)
            .toEqual(updatedMessage);
    });

    describe(`when merge fails`, () => {
        it(`should abort`, async () => {
            // Arrange
            const
                sandbox = await Sandbox.create(),
                featureBranch = "feature/stuff",
                readmeContents = `initial: ${ faker.random.words() }`,
                updatedContents = `updated: ${ faker.random.words() }`,
                conflictingContents = `conflict: ${faker.random.words() }`,
                initialMessage = ":tada: initial commit",
                updatedMessage = ":memo: prior docs are all wrong!",
                conflictingMessage = ":fire: conflict!",
                originPath = await sandbox.mkdir("origin"),
                localPath = await sandbox.mkdir("local"),
                origin = Repository.create(originPath);
            await origin.init();
            await sandbox.writeFile("origin/readme.md", readmeContents);
            await origin.commitAll(initialMessage);
            await sandbox.writeFile("origin/readme.md", updatedContents);
            await origin.commitAll(updatedMessage);
            await origin.checkout("master");

            const local = await Repository.clone(originPath, localPath);
            await local.fetch();
            await local.resetHard("HEAD~1");
            await local.checkout("-b", featureBranch);
            await sandbox.writeFile("local/readme.md", conflictingContents);
            await local.commitAll(conflictingMessage);
            const beforeLog = await local.log();
            expect(beforeLog.latest.message)
                .toEqual(conflictingMessage);

            const currentContents = await sandbox.readTextFile("local/readme.md");
            expect(currentContents)
                .toEqual(conflictingContents); // should have readme updated
            const logger = new CollectingLogger();
            // Act
            const result = await gitBroadcast({
                in: localPath,
                logger
            })
            // Assert
            await local.checkout(featureBranch);
            const log = await local.log();
            expect(log.latest.message)
                .toEqual(conflictingMessage);
            expect(result.unmerged)
                .toContain(jasmine.objectContaining({ target: featureBranch }));
            expect(logger.errorLogs)
                .toContain(`failed to merge origin/master into ${featureBranch}`);
        });
    });

    afterEach(async () => await Sandbox.destroyAll());

});
