#!/usr/bin/env zx
import * as fs from 'fs';

try {
  // Clear the dist directory to start fresh build.
  console.log(chalk.cyan('Cleaning dist directory'));
  //await fs.promises.rm('dist', { recursive: true, force: true });

  await $`rm -rf dist`;
  // Compile the esm build into its tmp directory
  console.log(chalk.yellow('Compiling ESM build'));
  await $`npx tsc -p tsconfig.esm.json --outDir dist/lib/esm`;
  // Compile the cjs build into its tmp directory
  console.log(chalk.yellow('Compiling CJS build'));
  await $`npx tsc -p tsconfig.cjs.json --outDir dist/lib/cjs`;
  // Compile the types build into its tmp directory
  console.log(chalk.yellow('Compiling Types build'));
  await $`npx tsc -p tsconfig.types.json --outDir dist/lib/types`;
  // Build the main package.json
  console.log(chalk.cyan('Rebuilding main package.json'));

  const workspacePackageJson = JSON.parse(
    await fs.promises.readFile('package.json', {
      encoding: 'utf-8',
    }),
  );

  const npmPackageJson = {
    name: workspacePackageJson.name,
    description: workspacePackageJson.description,
    version: workspacePackageJson.version,
    author: workspacePackageJson.author,
    keywords: workspacePackageJson.keywords,
    license: workspacePackageJson.license,
    url: workspacePackageJson.url,
    repository: workspacePackageJson.repository,
    peerDependencies: workspacePackageJson.dependencies,
    main: 'lib/cjs/index.js',
    module: 'lib/esm/index.js',
    types: 'lib/types/index.d.ts',
  };

  await fs.promises.writeFile(
    'dist/package.json',
    JSON.stringify(npmPackageJson, null, 2),
  );

  console.log(chalk.cyan('Copy README.md'));
  await $`cp README.md dist/README.md`;

  console.log(chalk.green('Compilation successful'));
} catch (error) {
  console.log(error);
  console.error(chalk.red('Compilation failed:'), chalk.red(error.message));
}
