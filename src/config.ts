import { readFileSync } from "fs";
import { dirname, resolve } from "path"
import * as JSONC from "jsonc-parser";

interface Config {
  databaseFileLocation: string,
  port: number
}

export default function getConfig(): Config {
  const appDir = dirname(resolve(process.argv[1]));
  const configFile = resolve(appDir, "../", "./config.jsonc");
  console.log("Loading config from " + configFile);
  const config: Config = JSONC.parse(readFileSync(configFile, "utf-8"))
  console.log("Loaded config:")
  console.table(config);
  return config;
}