import IGVGraphics from "../igv-canvas.js"

const NULL_GROUP = 'None'
const GROUP_MARGIN_HEIGHT = 16

function drawGroupDividers(context, pixelTop, pixelWidth, pixelHeight, offset, sampleHeight, groups) {

    if (!groups || groups.size < 2) return

    const pixelBottom = pixelTop + pixelHeight
    context.save()
    context.fillStyle = 'black'
    let y = offset - GROUP_MARGIN_HEIGHT / 2
    for (const group of groups.values()) {
        y += group.count * sampleHeight + GROUP_MARGIN_HEIGHT
        if (y > pixelBottom) {
            break
        }
        if (y > pixelTop) {
            IGVGraphics.dashedLine(context, 0, y, pixelWidth, y)
        }
    }
    context.restore()
}

export {drawGroupDividers, NULL_GROUP, GROUP_MARGIN_HEIGHT}