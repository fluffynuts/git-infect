import { Sandbox } from "filesystem-sandbox";

module.exports = async function() {
    await Sandbox.destroyAny();
};
