import "./utils/mockObjects.js"
import {assert} from 'chai'
import {renderFeature} from "../js/feature/render/renderFeature.js"

suite("testRenderFeature", function () {

    // A feature spanning pixels 100-300, so its label is centered at x = 200
    const feature = {chr: "chr1", start: 100, end: 300, strand: "+", name: "GENE1", row: 0}

    const track = {
        color: "rgb(0,0,150)",
        displayMode: "EXPANDED",
        featureHeight: 14,
        expandedRowHeight: 30,
        margin: 10,
        arrowSpacing: 30,
        config: {},
        browser: {qtlSelections: {hasPhenotype: () => false}},
        getColorForFeature: () => "rgb(0,0,150)"
    }

    function drawOptions(axis) {
        const options = {
            pixelWidth: 1000,
            viewportWidth: 1000,
            pixelXOffset: 0,
            bpPerPixel: 1,
            drawLabel: true,
            rowLastLabelX: {}
        }
        if (axis) options.axis = axis
        return options
    }

    function labelDrawnWith(axis) {
        const ctx = new RecordingContext()
        renderFeature.call(track, feature, 0, 1, 100, ctx, drawOptions(axis))
        const label = ctx.texts.find(t => t.text === "GENE1")
        assert.isDefined(label, "label was not drawn")
        return label
    }

    test("label is drawn upright, centered on its feature, with no axis", function () {
        const label = labelDrawnWith(undefined)
        assert.equal(label.scaleX, 1)
        assert.equal(label.x, 200)
        assert.equal(label.textAlign, "center")
    })

    test("label is mirrored about its center on a y-axis track", function () {
        const label = labelDrawnWith("y")
        assert.equal(label.scaleX, -1)
        assert.equal(label.x, 200)
        assert.equal(label.textAlign, "center")
    })
})

/**
 * A minimal 2D context that tracks the current transform and records each text drawn,
 * with its anchor in canvas coordinates and the horizontal scale in effect.
 */
class RecordingContext {

    constructor() {
        this.matrix = [1, 0, 0, 1, 0, 0]
        this.stack = []
        this.texts = []
        this.textAlign = "start"
        this.fillStyle = undefined
        this.strokeStyle = undefined
    }

    save() {
        this.stack.push({matrix: [...this.matrix], textAlign: this.textAlign, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle})
    }

    restore() {
        const s = this.stack.pop()
        if (s) Object.assign(this, s)
    }

    transform(a, b, c, d, e, f) {
        const [m0, m1, m2, m3, m4, m5] = this.matrix
        this.matrix = [
            m0 * a + m2 * b, m1 * a + m3 * b,
            m0 * c + m2 * d, m1 * c + m3 * d,
            m0 * e + m2 * f + m4, m1 * e + m3 * f + m5
        ]
    }

    translate(x, y) { this.transform(1, 0, 0, 1, x, y) }

    scale(x, y) { this.transform(x, 0, 0, y, 0, 0) }

    rotate(angle) {
        const c = Math.cos(angle), s = Math.sin(angle)
        this.transform(c, s, -s, c, 0, 0)
    }

    fillText(text, x, y) {
        const [a, b, c, d, e, f] = this.matrix
        this.texts.push({text, x: a * x + c * y + e, y: b * x + d * y + f, scaleX: a, textAlign: this.textAlign})
    }

    strokeText(text, x, y) { this.fillText(text, x, y) }

    measureText(text) {
        return {width: 6 * text.length, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2}
    }

    fillRect() {}
    clearRect() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
    fill() {}
    closePath() {}
}
