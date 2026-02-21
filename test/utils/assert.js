/**
 * Chai-compatible assert shim built on node:assert.
 * Covers the exact subset of chai assert methods used in the igv.js test suite.
 * The export is callable directly (assert(val)) as well as via named methods.
 */
import nodeAssert from 'node:assert'

function assert(val, msg) { nodeAssert.ok(val, msg) }

assert.ok           = (val, msg)          => nodeAssert.ok(val, msg)
assert.fail         = (msg)               => nodeAssert.fail(msg)
assert.equal        = (a, b, msg)         => nodeAssert.strictEqual(a, b, msg)
assert.notEqual     = (a, b, msg)         => nodeAssert.notStrictEqual(a, b, msg)
assert.deepEqual    = (a, b, msg)         => nodeAssert.deepStrictEqual(a, b, msg)
assert.match        = (str, re, msg)      => nodeAssert.match(str, re, msg)
assert.doesNotThrow = (fn, msg)           => nodeAssert.doesNotThrow(fn, msg)
assert.isOk         = (val, msg)          => nodeAssert.ok(val, msg)
assert.isNotOk      = (val, msg)          => nodeAssert.ok(!val, msg)
assert.isTrue       = (val, msg)          => nodeAssert.strictEqual(val, true, msg)
assert.isNull       = (val, msg)          => nodeAssert.strictEqual(val, null, msg)
assert.isUndefined  = (val, msg)          => nodeAssert.strictEqual(val, undefined, msg)
assert.isString     = (val, msg)          => nodeAssert.strictEqual(typeof val, 'string', msg)
assert.include      = (haystack, needle, msg) => nodeAssert.ok(haystack.includes(needle), msg)
assert.property     = (obj, prop, msg)    => nodeAssert.ok(prop in obj, msg)
assert.isAtLeast    = (val, min, msg)     => nodeAssert.ok(val >= min, msg)

export { assert }
