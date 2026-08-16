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

const problems = []
const mustInclude = [
  ['module loader wrapper', 'window.__ModuleLoader__.load({'],
  ['plugin id', 'id: "easy-archive"'],
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

if (problems.length > 0) {
  console.error('smoke failed:')
  for (const p of problems) console.error('  -', p)
  process.exit(1)
}
console.log('smoke ok: bundle shape intact')
