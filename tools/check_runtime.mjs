import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

assert.notEqual(process.getuid(), 0, 'Runtime must run as a non-root user')
for (const path of ['/app/.git', '/app/.claude', '/app/docs', '/app/scripts', '/app/node_modules/@playwright/test']) {
    assert.equal(existsSync(path), false, `Development content in runtime: ${path}`)
}
assert.equal(existsSync('/app/.next/BUILD_ID'), true, 'Production build is missing')
assert.equal(existsSync('/app/public/fav.png'), true, 'Static assets are missing')
console.log('Production runtime contract passed')
