const
  gulp = requireModule("gulp-with-help"),
  path = require("path"),
  fs = require("fs"),
  _glob = require("glob"),
  _rimraf = require("rimraf");

gulp.task("flatten-dist", async () => {
  await rimraf("dist/tests");
  const toMove = await glob("dist/src/*");
  for (let item of toMove) {
    await mv(item, `dist/${path.basename(item)}`);
  }
  await rimraf("dist/src");
});

function rimraf(p) {
  return new Promise((resolve, reject) => {
    _rimraf(p, err => {
      return err ? reject(err): resolve();
    })
  });
}

function glob(pattern) {
  return new Promise((resolve, reject) => {
    _glob(pattern, (err, data) => {
      return err ? reject(err) : resolve(data);
    });
  });
}

function mv(from, to) {
  return new Promise((resolve, reject) => {
    fs.rename(from, to, err => {
      return err ? reject(err) : resolve();
    });
  });
}
