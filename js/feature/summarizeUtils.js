export function summarizeData(features, startBP, bpPerPixel, windowFunction = "mean") {
    if (bpPerPixel <= 1 || !features || features.length === 0 || windowFunction === "none") {
        return features
    }

    // Assume features are sorted by position.  Wig features cannot overlap.  Note, UCSC "reductionLevel" == bpPerPixel
    const chr = features[0].chr
    const binSize = bpPerPixel
    const summaryFeatures = []

    const finishBin = (bin) => {
        const start = startBP + bin.bin * binSize
        const end = start + binSize
        let value
        switch (windowFunction) {
            case "mean":
                value = bin.sumData / bin.count
                break
            case "max":
                value = bin.max
                break
            case "min":
                value = bin.min
                break
            default:
                throw Error(`Unknown window function: ${windowFunction}`)
        }
        const description = `${windowFunction} of ${bin.count} values`
        summaryFeatures.push({chr, start, end, value, description})
    }

    let currentBinData
    for (let f of features) {
        // Loop through bins this feature overlaps, updating the weighted sum for each bin or min/max,
        // depending on window function
        let startBin = Math.floor((f.start - startBP) / binSize)
        const endBin = Math.floor((f.end - startBP) / binSize)

        if (currentBinData && startBin === currentBinData.bin) {
            currentBinData.add(f)
            startBin++
        }

        if (!currentBinData || endBin > currentBinData.bin) {
            if (currentBinData) {
                finishBin(currentBinData)
            }

            // Feature stretches across multiple bins.
            if (endBin > startBin) {
                const end = startBP + endBin * binSize
                summaryFeatures.push({chr, start: f.start, end, value: f.value})
            }

            currentBinData = new SummaryBinData(endBin, f)
        }
    }
    if (currentBinData) {
        finishBin(currentBinData)
    }

    // Consolidate
    const c = []
    let lastFeature = summaryFeatures[0]
    for (let f of summaryFeatures) {
        if (lastFeature.value === f.value && f.start <= lastFeature.end) {
            lastFeature.end = f.end
        } else {
            c.push(lastFeature)
            lastFeature = f
        }
    }
    c.push(lastFeature)

    return c
}

class SummaryBinData {
    constructor(bin, feature) {
        this.bin = bin
        this.sumData = feature.value
        this.count = 1
        this.min = feature.value
        this.max = feature.value
    }

    add(feature) {
        this.sumData += feature.value
        this.max = Math.max(feature.value, this.max)
        this.min = Math.min(feature.value, this.min)
        this.count++
    }

    get mean() {
        return this.sumData / this.count
    }
} 