import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, open } from "node:fs/promises";
import path from "node:path";

export async function inspectLocalFile(baseDir, relativePath) {
  const fullPath = path.resolve(baseDir, relativePath);
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) {
      return { exists: false, full_path: fullPath, error: "not-a-file" };
    }
    const hash = await sha256(fullPath);
    const signature = await readSignature(fullPath);
    return {
      exists: true,
      full_path: fullPath,
      size_bytes: info.size,
      extension: path.extname(fullPath).toLowerCase(),
      sha256: hash,
      signature_status: classifySignature(path.extname(fullPath).toLowerCase(), signature),
      signature_hex: signature.toString("hex")
    };
  } catch (error) {
    return { exists: false, full_path: fullPath, error: error.code || error.message };
  }
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", resolve);
  });
  return hash.digest("hex");
}

async function readSignature(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
}

function classifySignature(ext, signature) {
  if (signature.length === 0) return "empty";
  if (ext === ".pdf") return signature.toString("utf8", 0, 4) === "%PDF" ? "matches" : "mismatch";
  if (ext === ".png") return signature.toString("hex", 0, 4) === "89504e47" ? "matches" : "unknown-or-placeholder";
  if (ext === ".jpg" || ext === ".jpeg") return signature[0] === 0xff && signature[1] === 0xd8 ? "matches" : "unknown-or-placeholder";
  if (ext === ".mp4") return signature.toString("utf8", 4, 8) === "ftyp" ? "matches" : "unknown-or-placeholder";
  return "not-checked";
}
