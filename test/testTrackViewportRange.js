import "./utils/mockObjects.js"
import {assert} from 'chai'
import TrackViewport, {FeatureCache} from "../js/trackViewport.js"

/**
 * The parts of a TrackViewport that needsReload() and repaintDimensions() read, so the real methods can
 * be exercised without a browser.
 */
function viewportStub({chr = "chr1", start = 1000000, bpPerPixel = 1, clientWidth = 1200} = {}) {
    return {
        referenceFrame: {chr, start, bpPerPixel},
        viewportElement: {clientWidth},
        windowFunction: undefined,
        featureCache: undefined,
        repaintDimensions: TrackViewport.prototype.repaintDimensions,
        needsReload: TrackViewport.prototype.needsReload
    }
}

/** Cache the range loadFeatures() would have loaded for the viewport's current position. */
function cacheLoadedRange(vp) {
    const {chr, start, bpPerPixel} = vp.referenceFrame
    const bpWidth = vp.viewportElement.clientWidth * bpPerPixel
    vp.featureCache = new FeatureCache(
        chr,
        Math.floor(Math.max(0, start - bpWidth)),
        Math.ceil(start + bpWidth + bpWidth),
        bpPerPixel, [], [], false, vp.windowFunction)
}

suite("testTrackViewportRange", function () {

    test("a viewport with no cache needs reloading", function () {
        assert.isTrue(viewportStub().needsReload())
    })

    test("a freshly loaded viewport does not", function () {
        // The regression: repaintDimensions ends one base past what loadFeatures caches, so this was
        // true even immediately after a load and no viewport was ever filtered out.
        const vp = viewportStub()
        cacheLoadedRange(vp)

        assert.isFalse(vp.needsReload())
    })

    test("nor at any scale, including near position zero", function () {
        // Near the start of a chromosome loadFeatures clamps the cache at zero and repaintDimensions
        // does not, so without the same clamp the comparison asks for bases below the chromosome.
        for (const bpPerPixel of [0.1, 0.5, 1, 7.5, 1000]) {
            for (const clientWidth of [400, 1200, 1913]) {
                const vp = viewportStub({bpPerPixel, clientWidth})
                cacheLoadedRange(vp)

                assert.isFalse(vp.needsReload(), `${bpPerPixel} bp/px, ${clientWidth}px wide`)
            }
        }
    })

    test("zooming in does not, the range is already cached", function () {
        const vp = viewportStub({bpPerPixel: 1})
        cacheLoadedRange(vp)

        vp.referenceFrame.bpPerPixel = 0.5
        assert.isFalse(vp.needsReload())
    })

    test("zooming out does", function () {
        const vp = viewportStub({bpPerPixel: 1})
        cacheLoadedRange(vp)

        vp.referenceFrame.bpPerPixel = 8
        assert.isTrue(vp.needsReload())
    })

    test("moving the view does", function () {
        const vp = viewportStub({start: 1000000})
        cacheLoadedRange(vp)

        vp.referenceFrame.start = 1000600
        assert.isTrue(vp.needsReload())
    })

    test("changing chromosome does", function () {
        const vp = viewportStub()
        cacheLoadedRange(vp)

        vp.referenceFrame.chr = "chr2"
        assert.isTrue(vp.needsReload())
    })
})
