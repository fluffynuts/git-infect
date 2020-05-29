import "expect-even-more-jest";
import { Sandbox } from "filesystem-sandbox";
import { SimpleGit } from "simple-git/promise";
import GitFactory from "simple-git/promise";
const path = require("path");

describe(`infect`, () => {
    it.skip(`should infect a single victim from patient zero`, async () => {
        // Arrange
        const
            sandbox = new Sandbox();


        // Act
        // Assert
    });

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
    });


    class Repository {
        public get fullpath() {
            return this._fullpath;
        }

        private get git(): SimpleGit {
            if (!this._git) {
                this._git = GitFactory(this._fullpath)
            }
            return this._git as SimpleGit;
        }

        private _git: SimpleGit | undefined;

        constructor(private _fullpath: string) {
        }

        async init(): Promise<void> {
            // TODO
            await this.git.init(false);
            // - git init
            // - must have at least one commit, so let's add an empty .gitignore
        }

        async createBranch(andCheckOut: boolean = true): Promise<void> {
            // TODO
            // - create the branch
            // - check it out
        }

        async addAll(): Promise<void> {
        }

        async commit(message: string): Promise<void> {
        }

        public static clone(
            srcPath: string,
            targetPath: string) {
            // TODO
        }
    }

    afterEach(async () => await Sandbox.destroyAll());
});
