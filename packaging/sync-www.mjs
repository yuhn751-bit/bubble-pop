import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "shell", "dist");
const dest = join(here, "www");

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(source, dest, { recursive: true });
