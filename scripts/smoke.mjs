#!/usr/bin/env node
/**
 * Smoke check for the browser bundle shape.
 *
 * Validates the hand-written client bundle without a browser: the module
 * loader wrapper, the apply/inject exports, the injected style tag id, and
 * absence of leftover diagnostics. Run before pushing changes.
 *
 *   node scripts/smoke.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const problems = []
const mustInclude = [
  ['module loader wrapper', 'window.__ModuleLoader__.load({'],
  ['apply export', 'exports.apply = apply;'],
  ['inject export', 'exports.inject = inject;'],
  ['style tag guard', 'data-plugin-css='],
  ['archive service call', 'workspaces.archiveSession('],
]
for (const [label, needle] of mustInclude) {
  if (!client.includes(needle)) problems.push(`missing ${label}: ${JSON.stringify(needle)}`)
}
for (const needle of ['dshArDebug', 'dryRun', 'syncNow']) {
  if (client.includes(needle)) problems.push(`leftover diagnostics: ${needle}`)
}

// client-modules keys its graph rows by PACKAGE NAME and rejects a bundle that
// registers anything else ("loaded without registering \"<pkg>\""), so the id
// handed to __ModuleLoader__.load must equal package.json's name — never the
// host plugin row id. Compared against the manifest rather than a literal, so
// the next package rename cannot leave the two out of sync again.
const registered = /__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/.exec(client)
if (registered === null) {
  problems.push('cannot read the module-loader registration id')
}
else if (registered[1] !== manifest.name) {
  problems.push(
    `module-loader id ${JSON.stringify(registered[1])} must equal the package name ${JSON.stringify(manifest.name)}`,
  )
}

if (problems.length > 0) {
  console.error('smoke failed:')
  for (const p of problems) console.error('  -', p)
  process.exit(1)
}
console.log('smoke ok: bundle shape intact')
