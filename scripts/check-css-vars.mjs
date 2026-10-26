// Validation test: every `var(--egov-*)` referenced in inline styles must be
// defined in globals.css. Catches the invisible-button bug where LoginPage
// styled itself with design tokens that were never declared (white-on-white).
// Run: node scripts/check-css-vars.mjs   (also `npm test`)
import { readFileSync, readdirSync } from "node:fs"
import assert from "node:assert"

const root = new URL("..", import.meta.url)
const css = readFileSync(new URL("src/globals.css", root), "utf8")

const defined = new Set([...css.matchAll(/--egov-[a-z0-9-]+(?=\s*:)/g)].map(m => m[0]))

function tsxFiles(dir) {
  return readdirSync(new URL(dir + "/", root), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? tsxFiles(`${dir}/${e.name}`) : e.name.endsWith(".tsx") ? [`${dir}/${e.name}`] : []
  )
}

const missing = []
for (const file of tsxFiles("src")) {
  const src = readFileSync(new URL(file, root), "utf8")
  for (const m of src.matchAll(/var\((--egov-[a-z0-9-]+)\)/g)) {
    if (!defined.has(m[1])) missing.push(`${file}: ${m[1]}`)
  }
}

assert.deepStrictEqual(missing, [], `Undefined --egov-* CSS vars referenced:\n  ${missing.join("\n  ")}`)
console.log(`✓ all referenced --egov-* vars are defined (${defined.size} tokens)`)
