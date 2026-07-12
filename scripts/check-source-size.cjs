#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const defaultLimit = 1000;

const sourceExtensions = new Set([".js", ".ts", ".tsx"]);
const normalize = (filePath) => path.relative(root, filePath).replaceAll("\\", "/");

const collectFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });

const files = collectFiles(sourceRoot)
  .map((filePath) => ({
    filePath,
    relativePath: normalize(filePath),
  }))
  .filter(
    ({ relativePath }) =>
      !relativePath.startsWith("src/data/") &&
      !/\.test\.[jt]sx?$/.test(relativePath) &&
      !relativePath.endsWith(".d.ts")
  )
  .map(({ filePath, relativePath }) => ({
    relativePath,
    lines: fs.readFileSync(filePath, "utf8").split(/\r?\n/).length,
    limit: defaultLimit,
  }))
  .sort((a, b) => b.lines - a.lines);

const failures = files.filter(({ lines, limit }) => lines > limit);
if (failures.length > 0) {
  failures.forEach(({ relativePath, lines, limit }) =>
    console.error(`ERREUR - ${relativePath}: ${lines} lignes (maximum ${limit})`)
  );
  process.exitCode = 1;
} else {
  const largest = files
    .slice(0, 5)
    .map(({ relativePath, lines }) => `${relativePath} (${lines})`)
    .join(", ");
  console.log(`OK - taille des sources maîtrisée. Plus gros fichiers : ${largest}`);
}
