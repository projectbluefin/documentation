const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const webPublic = "/home/jorge/src/website/public";

const ASSET_SPECS = [
  {
    targetRel: path.join(
      "static",
      "img",
      "portal",
      "characters",
      "achillobator.webp",
    ),
    sourceRel: path.join("characters", "achillobator.webp"),
    sha256: "ad6097e6c005ad1c2b2d0171a73c61304efe5a692be3a2c3649fa30623ef04fa",
    size: 123950,
  },
  {
    targetRel: path.join(
      "static",
      "img",
      "portal",
      "characters",
      "leaping.webp",
    ),
    sourceRel: path.join("characters", "leaping.webp"),
    sha256: "d86c26f123132fb278ecb14b6f686d551cb7312c9353d57ead162ee3977886d4",
    size: 64920,
  },
  {
    targetRel: path.join(
      "static",
      "img",
      "portal",
      "characters",
      "dakota.webp",
    ),
    sourceRel: path.join("characters", "dakota.webp"),
    sha256: "a37ca93e61f873b4e1d5b3fd8d63f5883c7f58fbee63b5182e3b4a2865275294",
    size: 81286,
  },
  {
    targetRel: path.join(
      "static",
      "img",
      "portal",
      "characters",
      "alamosaurus.webp",
    ),
    sourceRel: path.join("characters", "alamosaurus.webp"),
    sha256: "2436b54be6536d0081351359436f8eabc3f373e1d861ed2816487b9f629eaacd",
    size: 103462,
  },
  {
    targetRel: path.join("static", "img", "portal", "characters", "utah.webp"),
    sourceRel: path.join("characters", "utah.webp"),
    sha256: "8fbb3081b3efdac6bf03cd039cdddf6c27c912121de4bdc6c38a3a7179343735",
    size: 106204,
  },
  {
    targetRel: path.join(
      "static",
      "img",
      "portal",
      "wolves",
      "Always There.webp",
    ),
    sourceRel: path.join(
      "img",
      "wallpapers",
      "wolves",
      "people",
      "Always There.webp",
    ),
    sha256: "25eb40ff39db684309649ede1dbd2b00d99f59d9b8ab7661aca5b2ecbcd0feb5",
    size: 61620,
  },
];

test("picker and card assets exist, have correct size, and match expected sha256 checksums", () => {
  for (const asset of ASSET_SPECS) {
    const targetPath = path.join(root, asset.targetRel);
    assert.ok(
      fs.existsSync(targetPath),
      `copied asset must exist: ${targetPath}`,
    );

    const targetBuf = fs.readFileSync(targetPath);
    assert.equal(
      targetBuf.length,
      asset.size,
      `copied asset must have expected byte size ${asset.size}: ${targetPath}`,
    );

    const actualHash = crypto
      .createHash("sha256")
      .update(targetBuf)
      .digest("hex");
    assert.equal(
      actualHash,
      asset.sha256,
      `copied asset must match expected sha256: ${targetPath}`,
    );

    // If website source exists locally, also assert byte-for-byte identity
    const sourcePath = path.join(webPublic, asset.sourceRel);
    if (fs.existsSync(sourcePath)) {
      const sourceBuf = fs.readFileSync(sourcePath);
      assert.equal(
        targetBuf.compare(sourceBuf),
        0,
        `copied asset must be byte-identical to source: ${targetPath}`,
      );
    }
  }
});
