const _which = require("which");

async function which(cmd) {
  return new Promise(resolve => {
    _which(cmd, (err, data) => resolve(err ? null : data));
  });
}

(async function () {
  if (process.env.FORCE_TESTS) {
    return process.exit(0); // caller knows what they are doing
  }
  const gitUploadPack = await which("git-upload-pack");
  if (!!gitUploadPack) {
    return process.exit(0);
  }
  const os = require("os");
  if (os.platform() === "win32") {
    console.error(`
Jest tests will not run properly on Windows )':
- it seems that Jest is doing something odd with
  processes, such that git can't find git-upload-pack
  from the ming64 folder on a regular git installation.
- tests run from within Webstorm though ?!
`);
  } else {
    const git = await which("git");
    if (!!git) {
      console.error(`
'git' appears to be in your path, but 'git-upload-pack' does not. Tests
will fail unless it is.
`);
    } else {
      console.error(`
No 'git' found in your path. No tests can possibly be run.
`);
    }
  }
  process.exit(1);
})();
