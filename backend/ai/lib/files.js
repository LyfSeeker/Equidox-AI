import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AI_ROOT = path.resolve(__dirname, "..");

export function readAiFile(...parts) {
  const full = path.join(AI_ROOT, ...parts);
  return fs.readFileSync(full, "utf8");
}

export function readAiJson(...parts) {
  return JSON.parse(readAiFile(...parts));
}

export function listAiDir(...parts) {
  const full = path.join(AI_ROOT, ...parts);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full);
}
