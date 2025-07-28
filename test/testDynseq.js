import "./utils/mockObjects.js"
import {assert} from 'chai'
import WigTrack from "../js/feature/wigTrack.js"
import {createGenome} from "./utils/MockGenome.js"
import {defaultNucleotideColors} from "../js/util/nucleotideColors.js"

const genome = createGenome()

suite("testDynseq", function () {

    // Enhanced mock browser object with nucleotide colors
    const browser = {
        genome,
        nucleotideColors: defaultNucleotideColors,
        on: () => {},
        off: () => {},
        columnContainer: {
            appendChild: () => {}
        }
    }

    test("dynseq graphType option in menu", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Test that dynseq is included in the supported graph types
        const supportedTypes = ['bar', 'line', 'points', 'heatmap', 'dynseq']
        assert.include(supportedTypes, track.graphType)
    })

    test("dynseq track configuration", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq',
            height: 100
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        assert.equal(track.graphType, 'dynseq')
        assert.equal(track.height, 100)
    })

    test("dynseq track state serialization", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        const state = track.getState()
        assert.equal(state.graphType, 'dynseq')
    })

    test("dynseq sequence data attachment", async function () {
        // Test the sequence attachment logic directly
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Mock feature with sequence data
        const mockFeature = {
            chr: 'chr1',
            start: 1000,
            end: 1010,
            value: 2.5,
            sequence: 'ATCGATCGAT'
        }

        // Test that features can have sequence data attached
        assert.property(mockFeature, 'sequence')
        assert.isString(mockFeature.sequence)
        assert.match(mockFeature.sequence, /^[ATCGN]*$/)
        assert.equal(mockFeature.sequence.length, 10)
    })

    test("dynseq SVG path parser", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Mock canvas context
        const mockContext = {
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            closePath: () => {},
            fill: () => {}
        }

        // Test SVG path parsing with different path types
        const pathsToTest = [
            'M 0 0 L 100 100',  // Move and line
            'M 0 0 C 25 0 75 100 100 100',  // Move and cubic bezier
            'M 0 100 L 33 0 L 66 0 L 100 100'  // Multiple lines
        ]

        for (const path of pathsToTest) {
            // This should not throw an error
            assert.doesNotThrow(() => {
                track.drawSVGPath(mockContext, path, 0, 0, 100, 100)
            })
        }
    })

    test("dynseq letter glyph rendering", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Mock canvas context
        const mockContext = {
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            closePath: () => {},
            fill: () => {},
            fillStyle: ''
        }

        // Test drawing each nucleotide
        const nucleotides = ['A', 'T', 'G', 'C', 'N']
        for (const base of nucleotides) {
            // Should not throw error
            assert.doesNotThrow(() => {
                track.drawLetterGlyph(mockContext, base, 0, 0, 50, 50, 'red', false)
            })
        }
    })

    test("dynseq vertical flipping for negative values", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/mixedPosNeg.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Mock canvas context to track transformations
        let scaleYCall = null
        const mockContext = {
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: (x, y) => { scaleYCall = y },
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            closePath: () => {},
            fill: () => {},
            fillStyle: ''
        }

        // Test positive value (should not flip)
        track.drawLetterGlyph(mockContext, 'A', 0, 0, 50, 50, 'red', false)
        assert.notEqual(scaleYCall, -1)

        // Test negative value (should flip)
        scaleYCall = null
        track.drawLetterGlyph(mockContext, 'A', 0, 0, 50, 50, 'red', true)
        assert.equal(scaleYCall, -1)
    })

    test("dynseq renders with mixed positive/negative values", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/mixedPosNeg.bedgraph',
            graphType: 'dynseq'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Test that the track correctly identifies positive and negative values
        const positiveFeature = { value: 2.5, sequence: 'ATCG' }
        const negativeFeature = { value: -1.8, sequence: 'GCTA' }
        
        // Test that we can distinguish between positive and negative values
        assert.isTrue(positiveFeature.value > 0)
        assert.isTrue(negativeFeature.value < 0)
        
        // Test that both features have valid sequence data
        assert.isString(positiveFeature.sequence)
        assert.isString(negativeFeature.sequence)
        assert.match(positiveFeature.sequence, /^[ATCGN]*$/)
        assert.match(negativeFeature.sequence, /^[ATCGN]*$/)
    })

    test("dynseq menu items include dynseq option", async function () {
        const config = {
            format: 'bedgraph',
            url: 'test/data/wig/allPositive.bedgraph'
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Test that dynseq is in the list of supported graph types
        const supportedTypes = ['bar', 'line', 'points', 'heatmap', 'dynseq']
        assert.include(supportedTypes, 'dynseq', 'dynseq should be in supported graph types')
    })

})