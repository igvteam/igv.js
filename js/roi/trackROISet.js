import FeatureSource from '../feature/featureSource.js'
import IGVGraphics from "../igv-canvas.js"
import { ROI_DEFAULT_COLOR, screenCoordinates } from "./ROISet.js"

class TrackROISet {

    constructor(config, genome) {
        this.name = config.name
        this.featureSource = config.featureSource || FeatureSource(config, genome)
        this.color = config.color || ROI_DEFAULT_COLOR
    }

    async getFeatures(chr, start, end) {
        return this.featureSource.getFeatures({chr, start, end})
    }

    draw(drawConfiguration) {

        const { context, bpPerPixel, bpStart, pixelTop, pixelHeight, pixelWidth, features, } = drawConfiguration

        if (!features) {
            return
        }

        const bpEnd = bpStart + (pixelWidth * bpPerPixel) + 1
        for (let { start:regionStartBP, end:regionEndBP } of features) {

            if (regionEndBP < bpStart) {
                continue
            }

            if (regionStartBP > bpEnd) {
                break
            }

            const { x, width } = screenCoordinates(regionStartBP, regionEndBP, bpStart, bpPerPixel)
            IGVGraphics.fillRect(context, x, pixelTop, width, pixelHeight, { fillStyle: this.color })
        }
    }
}

export default TrackROISet
