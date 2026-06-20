import fs from "fs";
import path from "path";
import { register } from "tsconfig-paths";

interface TsConfigCompilerOptions {
  baseUrl?: string;
  outDir?: string;
  paths?: Record<string, string[]>;
}

interface TsConfigShape {
  compilerOptions?: TsConfigCompilerOptions;
}

function resolveProjectRoot(): string {
  return path.resolve(__dirname, "..");
}

function loadTsConfig(projectRoot: string): TsConfigShape {
  const tsConfigPath = path.join(projectRoot, "tsconfig.json");
  const raw = fs.readFileSync(tsConfigPath, "utf8");

  return JSON.parse(raw) as TsConfigShape;
}

function resolveRuntimeBaseUrl(projectRoot: string, compilerOptions: TsConfigCompilerOptions): string {
  const configuredOutDir = compilerOptions.outDir ?? "dist";
  return path.join(projectRoot, configuredOutDir);
}

function registerPaths(): void {
  const projectRoot = resolveProjectRoot();
  const tsConfig = loadTsConfig(projectRoot);
  const compilerOptions = tsConfig.compilerOptions ?? {};
  const paths = compilerOptions.paths ?? {};

  register({
    baseUrl: resolveRuntimeBaseUrl(projectRoot, compilerOptions),
    paths,
  });
}

registerPaths();

