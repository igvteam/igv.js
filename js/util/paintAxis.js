import IGVGraphics from "../igv-canvas.js"

const shim = .01
const diagnosticColor = "rgb(251,128,114)"
const colorStripWidth = 4
const axesXOffset = colorStripWidth + 1

function paintAxis(ctx, width, height, colorOrUndefined) {

    let axisMin = this.axisMin //|| this.dataRange ? this.dataRange.min : 0
    let axisMax = this.axisMax //|| this.dataRange ? this.dataRange.max : undefined
    if (undefined === axisMax && this.dataRange) {
        axisMin = this.dataRange.min || 0
        axisMax = this.dataRange.max
    }
    if (undefined === axisMax) {
        return
    }

    IGVGraphics.fillRect(ctx, 0, 0, width, height, {fillStyle: 'white'})
    if (colorOrUndefined) {
        IGVGraphics.fillRect(ctx, width - colorStripWidth - 2, 0, colorStripWidth, height, {fillStyle: colorOrUndefined})
    }

    const flipAxis = (undefined === this.flipAxis) ? false : this.flipAxis

    const xTickStart = 0.95 * width - 8 - axesXOffset
    const xTickEnd = 0.95 * width - axesXOffset

    const properties =
        {
            font: 'normal 10px Arial',
            textAlign: 'right',
            fillStyle: 'black',
            strokeStyle: 'black',
        }

    // tick
    IGVGraphics.strokeLine(ctx, xTickStart, shim * height, xTickEnd, shim * height, properties)
    IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? axisMin : axisMax), xTickStart + 4, shim * height + 12, properties)

    const y = (1.0 - shim) * height

    // tick
    IGVGraphics.strokeLine(ctx, xTickStart, y, xTickEnd, y, properties)
    IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? axisMax : axisMin), xTickStart + 4, y - 4, properties)

    // vertical axis
    IGVGraphics.strokeLine(ctx, xTickEnd, shim * height, xTickEnd, y, properties)

    function prettyPrint(number) {

        if (Number.isInteger(number)) {
            return number
        } else if (number % 1 === 0) {   // Number can be represented exactly as an integer
            return number
        } else if (Math.abs(number) >= 10) {
            return number.toFixed()
        } else if (Math.abs(number) >= 1) {
            return number.toFixed(1)
        } else if (Math.abs(number) >= 0.1) {
            return number.toFixed(2)
        } else {
            return number.toExponential(1)
        }
    }
}

export default paintAxis
