import IGVGraphics from "../igv-canvas.js"


class SampleGroup {

    constructor(name, index) {
        this.name = name
        this.index = index
        this.count = 1
    }
}


function drawGroupDividers(context, pixelTop, pixelWidth, pixelHeight, offset, sampleHeight, groups, groupMarginHeight) {

    if (groups.size < 2) return

    const pixelBottom = pixelTop + pixelHeight
    context.save()
    context.fillStyle = 'black'
    let y = offset - groupMarginHeight / 2
    for (const group of groups.values()) {
        y += group.count * sampleHeight + groupMarginHeight
        if(y > pixelTop && y < pixelBottom) {
            IGVGraphics.dashedLine(context, 0, y, pixelWidth, y)
        }
    }
    context.restore()
}

export {drawGroupDividers}