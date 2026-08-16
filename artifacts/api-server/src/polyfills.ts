import util from "node:util";

// @tensorflow/tfjs-node@4.23.0-rc.0 calls util.isNullOrUndefined, which was
// removed from Node.js in v22. Without this shim, TensorFlow ops throw inside
// the async pipeline and the awaiting promise never settles, hanging photo uploads.
if (typeof (util as any).isNullOrUndefined !== "function") {
  (util as any).isNullOrUndefined = (value: unknown) =>
    value === null || value === undefined;
}