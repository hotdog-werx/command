#!/usr/bin/env node

// Bundles src/main.ts into the self-contained artifacts in dist/ that the
// GitHub Actions runner executes directly (runners never install the npm
// dependencies, so the bundle must contain them):
//   dist/index.js      - the bundled Action entrypoint (committed to the repo)
//   dist/index.js.map - linked source map for the bundle
//   dist/licenses.txt - licenses of every bundled dependency
// esbuild replaces ncc here; typechecking is owned by `mise run action:typecheck`.

import {rm, mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import * as esbuild from 'esbuild'

const root = process.cwd()

// License file names searched (in order) within each bundled package
const licenseFiles = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.txt',
  'UNLICENSE',
  'UNLICENSE.txt'
]

await rm('dist', {recursive: true, force: true})
await mkdir('dist', {recursive: true})

const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  sourcemap: 'linked',
  outfile: 'dist/index.js',
  metafile: true,
  legalComments: 'none',
  logLevel: 'info'
})

// Walk the metafile inputs and collect the license of every bundled package
// (pnpm paths look like node_modules/.pnpm/<pkg>@<ver>/node_modules/<name>/...)
const packages = new Map() // package directory -> {name, license, text}
for (const file of Object.keys(result.metafile.inputs)) {
  const parts = file.split('/')
  const idx = parts.lastIndexOf('node_modules')
  if (idx === -1 || idx === parts.length - 1) continue

  // the package directory is right after the last 'node_modules' segment
  // (two segments when the package name is scoped)
  const depth = parts[idx + 1].startsWith('@') ? 2 : 1
  const pkgDir = parts.slice(0, idx + 1 + depth).join('/')
  if (packages.has(pkgDir)) continue

  const pkg = JSON.parse(
    await readFile(path.join(root, pkgDir, 'package.json'), 'utf8')
  )

  let text = ''
  for (const candidate of licenseFiles) {
    try {
      text = await readFile(path.join(root, pkgDir, candidate), 'utf8')
      break
    } catch {
      // try the next candidate
    }
  }

  packages.set(pkgDir, {
    name: pkg.name,
    license: pkg.license ?? 'UNKNOWN',
    text: text.trim()
  })
}

// Write dist/licenses.txt in the same format ncc produced
const licenses = [...packages.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(pkg => `${pkg.name}\n${pkg.license}\n${pkg.text}`)
  .join('\n\n')

await writeFile('dist/licenses.txt', `${licenses}\n`)

const output = result.metafile.outputs['dist/index.js']
console.log(`✅ bundled dist/index.js (${(output.bytes / 1024).toFixed(1)} KB)`)
console.log(`✅ wrote dist/licenses.txt (${packages.size} packages)`)