import IGVGraphics from "../igv-canvas.js"

const shim = .01
const diagnosticColor = "rgb(251,128,114)"
const colorStripWidth = 4
const axesXOffset = colorStripWidth + 1
function paintAxis(ctx, width, height, colorOrUndefined) {

    if (undefined === this.dataRange || undefined === this.dataRange.max || undefined === this.dataRange.min) {
        return
    }

    IGVGraphics.fillRect(ctx, 0, 0, width, height, { fillStyle: 'white' })
    if (colorOrUndefined) {
        IGVGraphics.fillRect(ctx, width - colorStripWidth - 2, 0, colorStripWidth, height, { fillStyle: colorOrUndefined })
    }

    const flipAxis = (undefined === this.flipAxis) ? false : this.flipAxis

    const xTickStart = 0.95 * width - 8 - axesXOffset
    const xTickEnd   = 0.95 * width - axesXOffset

    const properties =
        {
            font: 'normal 10px Arial',
            textAlign: 'right',
            fillStyle: 'black',
            strokeStyle: 'black',
        }

    // tick
    IGVGraphics.strokeLine(ctx, xTickStart, shim * height, xTickEnd, shim * height, properties)
    IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? this.dataRange.min : this.dataRange.max), xTickStart + 4, shim * height + 12, properties)

    const y = (1.0 - shim) * height

    // tick
    IGVGraphics.strokeLine(ctx, xTickStart, y, xTickEnd, y, properties)
    IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? this.dataRange.max : this.dataRange.min), xTickStart + 4, y - 4, properties)

    // vertical axis
    IGVGraphics.strokeLine(ctx, xTickEnd, shim * height, xTickEnd, y, properties)

    function prettyPrint(number) {

        if (number === 0) {
            return "0"
        } else if (Math.abs(number) >= 10) {
            return number.toFixed()
        } else if (Math.abs(number) >= 1) {
            return number.toFixed(1)
        } else {
            return number.toFixed(2)
        }
    }
}

export default paintAxis
