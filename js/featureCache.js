/**
 * FeatureCache class for managing cached genomic features
 */
class FeatureCache {
    constructor(chr, tileStart, tileEnd, bpPerPixel, features, roiFeatures, multiresolution, windowFunction) {
        this.chr = chr
        this.bpStart = tileStart
        this.bpEnd = tileEnd
        this.bpPerPixel = bpPerPixel
        this.features = features
        this.roiFeatures = roiFeatures
        this.multiresolution = multiresolution
        this.windowFunction = windowFunction
    }

    containsRange(chr, start, end, bpPerPixel, windowFunction) {
        if (windowFunction && windowFunction !== this.windowFunction) return false

        // For multi-resolution tracks allow for a 2X change in bpPerPixel
        const r = this.multiresolution ? this.bpPerPixel / bpPerPixel : 1

        return start >= this.bpStart && end <= this.bpEnd && chr === this.chr && r > 0.5 && r < 2
    }

    overlapsRange(chr, start, end) {
        return this.chr === chr && end >= this.bpStart && start <= this.bpEnd
    }
}

export default FeatureCache 