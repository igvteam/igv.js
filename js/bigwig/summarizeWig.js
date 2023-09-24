function summarizeWigData(features, bpPerPixel, windowFunction = "mean") {
    console.log("Features size: " + features.length + "    bpPerPixel: " + bpPerPixel)
    if (bpPerPixel < 2) {
        return features
    }

    // Assumed features are sorted by position.  Wig features cannot overlap.  Note, UCSC "reductionLevel" == bpPerPixel
    const chr = features[0].chr
    const start = features[0].start
    const sumData = []
    const validCount = []

    const binSize = Math.floor(bpPerPixel)

    const firstBin = Math.floor(start / binSize)
    const summaryFeatures = []

    for (let f of features) {

        const startBin = Math.floor(f.start / binSize)
        const endBin = Math.floor(f.end / binSize)

        // if (endBin - startBin <= 1) {

        let startWeight, endWeight
        if(endBin == startBin) {
            startWeight = endWeight = (f.end - f.start) / binSize
        } else {
            startWeight = (1 - (f.start - startBin * binSize)) / binSize
            endWeight = (f.end - endBin * binSize) / binSize
        }
        //const startWeight = 1
        //const endWeight = 1

        for (let b = startBin - firstBin; b <= endBin - firstBin; b++) {

            const weight = (b === startBin) ? startWeight : (b === endBin) ? endWeight : 1
            validCount[b] = (validCount[b] === undefined) ? weight : validCount[b] + weight
            const weightedValue = weight * f.value

            if (sumData[b] === undefined) {
                sumData[b] = "mean" === windowFunction ? weightedValue : f.value
            } else {
                switch (windowFunction) {
                    case "min":
                        sumData[b] = Math.min(sumData[b], f.value)
                        break
                    case "max":
                        sumData[b] = Math.max(sumData[b], f.value)
                        break
                    case "mean":
                        sumData[b] = sumData[b] + weightedValue
                }
            }
        }
        // } else {
        //    summaryFeatures.push(f)
        // }
    }

    for (let b = 0; b < sumData.length; b++) {
        let value = ("mean" === windowFunction) ? sumData[b] / validCount[b] : sumData[b]
        if (value > 0) {
            summaryFeatures.push({chr, start: (firstBin + b) * binSize, end: (firstBin + b) * binSize, value})
        }
    }

    summaryFeatures.sort((a,b) => a.start - b.start)
    console.log("Summary features size = " + summaryFeatures.length)
    return summaryFeatures

}

export default summarizeWigData()