import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { MandiData } from "@/lib/types";

export const getMandiData = cache(async (): Promise<MandiData> => {
  const filePath = path.join(process.cwd(), "public", "data", "mandilens.json");
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as MandiData;
});
