/**
 * Summarize wig data in bins of size "bpPerPixel" with the given window function.
 *
 * @param features  wig (numeric) data
 * @param bpPerPixel  size of bin in base pairs
 * @param windowFunction  mean, min, or max
 * @returns {*|*[]}
 */
function summarizeWigData(features, bpPerPixel, windowFunction = "mean") {

    if (bpPerPixel <=1 || !features || features.length === 0) {
        return features
    }

    // Assumed features are sorted by position.  Wig features cannot overlap.  Note, UCSC "reductionLevel" == bpPerPixel
    const chr = features[0].chr
    const start = features[0].start
    const sumData = []
    const weights = []
    const binSize = Math.floor(bpPerPixel)
    const firstBin = Math.floor(start / binSize)
    const summaryFeatures = []

    for (let f of features) {

        const startBin = Math.floor(f.start / binSize)
        const endBin = Math.floor(f.end / binSize)

        let startWeight, endWeight
        if (endBin == startBin) {
            startWeight = endWeight = (f.end - f.start) / binSize
        } else {
            startWeight = (1 - (f.start - startBin * binSize)) / binSize
            endWeight = (f.end - endBin * binSize) / binSize
        }

        // Loop through bins this feature overlaps, updating the weighted sum for each bin or min/max, depending on window function
        for (let b = startBin - firstBin; b <= endBin - firstBin; b++) {

            const first = sumData[b] === undefined
            switch (windowFunction) {
                case "min":
                    sumData[b] = first ? f.value : Math.min(sumData[b], f.value)
                    break
                case "max":
                    sumData[b] = first ? f.value : Math.max(sumData[b], f.value)
                    break
                case "mean":
                    const weight = (b === startBin) ? startWeight : (b === endBin) ? endWeight : 1
                    weights[b] = first ? weight : weights[b] + weight
                    const weightedValue = weight * f.value
                    sumData[b] = first ? weightedValue : sumData[b] + weightedValue
            }

        }
    }

    for (let b = 0; b < sumData.length; b++) {
        let value = ("mean" === windowFunction) ? sumData[b] / weights[b] : sumData[b]
        if (value > 0) {
            summaryFeatures.push({chr, start: (firstBin + b) * binSize, end: (firstBin + b) * binSize, value})
        }
    }

    return summaryFeatures

}

export default summarizeWigData