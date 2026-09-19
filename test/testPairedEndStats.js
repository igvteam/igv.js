import "./utils/mockObjects.js"
import {assert} from 'chai'
import PairedEndStats from "../js/bam/pairedEndStats.js"

// Deterministic generator, so distribution assertions do not flake.  Math.imul keeps the multiply in 32
// bits -- a plain multiply overflows 2^53 and the low bits are lost to rounding, which collapses the
// period to a few hundred draws for some seeds.
function makeRandom(seed) {
    let s = seed >>> 0
    return () => {
        s = (Math.imul(s, 1103515245) + 12345) >>> 0
        return s / 4294967296
    }
}

function makeNormal(seed) {
    const random = makeRandom(seed)
    return (mean, stdDev) => {
        let u = 0, v = 0
        while (u === 0) u = random()
        while (v === 0) v = random()
        return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    }
}

function properPair(fragmentLength) {
    return {isProperPair: () => true, fragmentLength}
}

/**
 * A window of "count" proper pairs from a library with a mean insert size of 350, of which
 * "discordantFraction" span a 10kb deletion.
 */
function window(count, discordantFraction, seed = 1) {
    const normal = makeNormal(seed)
    const discordant = Math.round(count * discordantFraction)
    const alignments = []
    for (let i = 0; i < count - discordant; i++) {
        alignments.push(properPair(Math.round(Math.abs(normal(350, 60)))))
    }
    for (let i = 0; i < discordant; i++) {
        alignments.push(properPair(10000 + Math.round(normal(0, 500))))
    }
    return alignments
}

suite("testPairedEndStats", function () {

    test("thresholds bracket a clean library", function () {
        const stats = new PairedEndStats({})
        stats.addSample(window(5000, 0))

        // 99.5th percentile of N(350, 60) is ~505, 0.1th is ~165
        assert.isAbove(stats.maxTLEN, 450)
        assert.isBelow(stats.maxTLEN, 600)
        assert.isAbove(stats.minTLEN, 100)
        assert.isBelow(stats.minTLEN, 250)
    })

    test("a discordant population does not move the thresholds", function () {
        // The bug this guards: a plain 99.5th percentile jumps from ~500 to ~9000 at 0.5% contamination,
        // which silently disables large-TLEN coloring for the whole session.
        const clean = new PairedEndStats({})
        clean.addSample(window(5000, 0))

        for (const fraction of [0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2]) {
            const stats = new PairedEndStats({})
            stats.addSample(window(5000, fraction))
            assert.isBelow(stats.maxTLEN, 2 * clean.maxTLEN,
                `maxTLEN ran away at ${fraction * 100}% discordant pairs: ${stats.maxTLEN}`)
            assert.isBelow(stats.maxTLEN, 1000)
        }
    })

    test("thresholds do not depend on the order windows are loaded", function () {
        const a = window(600, 0, 11)
        const b = window(600, 0.2, 22)      // a window centered on a structural variant
        const c = window(600, 0, 33)

        const forward = new PairedEndStats({})
        for (const w of [a, b, c]) forward.addSample(w)

        const reverse = new PairedEndStats({})
        for (const w of [c, b, a]) reverse.addSample(w)

        assert.equal(forward.maxTLEN, reverse.maxTLEN)
        assert.equal(forward.minTLEN, reverse.minTLEN)
        assert.equal(forward.totalCount, reverse.totalCount)
    })

    test("a single unrepresentative window cannot set the thresholds alone", function () {
        // Loading the SV window first must not freeze its statistics for the session
        const stats = new PairedEndStats({})
        stats.addSample(window(600, 0.2, 22))
        const afterSV = stats.maxTLEN
        stats.addSample(window(5000, 0, 44))

        assert.isBelow(stats.maxTLEN, 1000)
        assert.notEqual(stats.maxTLEN, afterSV, "thresholds were frozen after the first window")
    })

    test("no thresholds until enough pairs are pooled", function () {
        const stats = new PairedEndStats({})
        stats.addSample(window(50, 0))

        assert.isUndefined(stats.maxTLEN)
        assert.isUndefined(stats.minTLEN)

        stats.addSample(window(50, 0, 2))
        assert.isDefined(stats.maxTLEN)
    })

    test("unpaired windows contribute nothing", function () {
        const stats = new PairedEndStats({})
        stats.addSample([{isProperPair: () => false, fragmentLength: 0}])

        assert.equal(stats.totalCount, 0)
        assert.isUndefined(stats.maxTLEN)
    })

    test("a 100th percentile does not silently disable the threshold", function () {
        const stats = new PairedEndStats({maxTLENPercentile: 100})
        stats.addSample(window(1000, 0))

        assert.isDefined(stats.maxTLEN, "index ran off the end of the sample")
        assert.isAbove(stats.maxTLEN, 0)
    })

    test("a zero min percentile pins minTLEN to 0", function () {
        const stats = new PairedEndStats({minTLENPercentile: 0})
        stats.addSample(window(1000, 0))

        assert.equal(stats.minTLEN, 0)
    })

    test("recomputing is idempotent", function () {
        const stats = new PairedEndStats({})
        stats.addSample(window(1000, 0))
        const {minTLEN, maxTLEN} = stats

        stats.compute()
        assert.equal(stats.maxTLEN, maxTLEN)
        assert.equal(stats.minTLEN, minTLEN)
    })

    test("the sample is capped", function () {
        const stats = new PairedEndStats({})
        for (let i = 0; i < 30; i++) {
            stats.addSample(window(5000, 0, i + 1))
        }

        assert.equal(stats.isizes.length, 20000)
        assert.isDefined(stats.maxTLEN)
    })

    test("no single window can fill the pool", function () {
        // A deep coverage load supplies far more proper pairs than the pool holds.  If it were allowed to
        // fill it, no later window could move the thresholds and pooling would be pointless.
        const stats = new PairedEndStats({})
        stats.addSample(window(30000, 0))

        assert.isBelow(stats.isizes.length, 20000)
        assert.isAtMost(stats.isizes.length, 1000)
    })

    test("the sample spans the whole loaded window", function () {
        // The container delivers alignments in position order, so taking the first N would sample only
        // the left edge of the loaded range.  Put a cluster of deletion-spanning pairs there and check
        // it cannot capture the thresholds on its own.
        const normal = makeNormal(77)
        const alignments = []
        for (let i = 0; i < 2000; i++) alignments.push(properPair(10000 + Math.round(normal(0, 500))))
        for (let i = 0; i < 28000; i++) alignments.push(properPair(Math.round(Math.abs(normal(350, 60)))))

        const stats = new PairedEndStats({})
        stats.addSample(alignments)

        assert.isBelow(stats.maxTLEN, 1000, "the leftmost reads of the window set the thresholds")
    })

    test("a later window still moves the thresholds after a deep first load", function () {
        const stats = new PairedEndStats({})
        stats.addSample(window(30000, 0.9, 5))      // pathological first window
        const afterFirst = stats.maxTLEN

        for (let i = 0; i < 20; i++) stats.addSample(window(30000, 0, i + 40))
        assert.notEqual(stats.maxTLEN, afterFirst, "the first window owned the pool")
        assert.isBelow(stats.maxTLEN, 1000)
    })
})
