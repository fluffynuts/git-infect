import { Sandbox } from "filesystem-sandbox";

module.exports = async function setup() {
    await Sandbox.destroyAny();
};
