import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveServerDir(metaUrl, overrideDir) {
  if (overrideDir) {
    return overrideDir;
  }

  const moduleDir = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(moduleDir, "..", "..");
}
