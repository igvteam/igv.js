import IGVGraphics from "../igv-canvas.js"

const NULL_GROUP = 'None'
const GROUP_MARGIN_HEIGHT = 16

function doSortByAttributes(sampleInfo, sampleKeys) {


        const attributeNameSet = new Set(sampleInfo.attributeNames)
        const anySampleKey = sampleKeys[0]
        const dictionary = sampleInfo.getAttributes(anySampleKey)

        if (undefined === dictionary) {
            return false
        } else {
            const sampleAttributeNames = Object.keys(sampleInfo.getAttributes(anySampleKey))
            for (const name of sampleAttributeNames) {
                if (false === attributeNameSet.has(name)) {
                    return false
                }
            }
        }

    return true
}

/**
 * Draw horizontal lines to separate groups of samples.
 * @param context
 * @param pixelTop - the vertical start position in pixels relative to track top in which to draw the dividers.   For deep tracks that are scrolled, this can be non-zero.
 * @param pixelWidth - viewport width in pixels
 * @param pixelHeight - the vertical extent of the track to draw in pixels.
 * @param offset - an offset in pixels from the top of the track to the top of the first sample.  Normally this is zero, but if there is content above the samples, this will be non-zero.
 * @param sampleHeight - height of each sample in pixels
 * @param groups - Map of group name to group object, where group object has a count property
 */
function drawGroupDividers(context, pixelTop, pixelWidth, pixelHeight, offset, sampleHeight, groups) {

    if (!groups || groups.size === 0) return

    const pixelBottom = pixelTop + pixelHeight
    context.save()
    context.fillStyle = 'black'
    let y = offset + GROUP_MARGIN_HEIGHT / 2
    if (y > pixelTop) {
        IGVGraphics.dashedLine(context, 0, y, pixelWidth, y)
    }
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

export { doSortByAttributes, drawGroupDividers, NULL_GROUP, GROUP_MARGIN_HEIGHT }
