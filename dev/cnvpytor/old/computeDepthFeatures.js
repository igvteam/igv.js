/**
 * Compute coverage depth as a collection of "wig" features from vcf "DP" field
 *
 * @param allVariants A dictionary-type object, keys = chromosomes, values = arrays of features.  It is assumed that
 *                    features are sorted by position
 * @param binSize  The bin size in base pairs
 * @returns array of wig fieatures
 */
function computeDepthFeatures(allVariants, binSize) {

    const chromosomes = Object.keys(allVariants)
    const wigFeatures = []

    for (let chr of chromosomes) {

        const variants = allVariants[chr]
        if (variants.length === 0) continue

        const firstSnp = variants[0]

        let sum = 0
        let count = 0
        let binStart = firstSnp.start = firstSnp.start % binSize   // Place start at integer multiple of binSize
        let binEnd = binStart + binSize

        for (let snp of variants) {
            const position = snp.start + 1    // Convert from 0-base to 1-base coords
            if (position > binEnd) {

                if (count > 0) {
                    const average = Math.round(sum / count)
                    wigFeatures.push({chr, start: binStart, end: binEnd, value: average})
                }

                // Start new bin
                sum = 0
                count = 0
                binStart = snp.start - snp.start % binSize
                binEnd = binStart + binSize
            }

            const dpValue = snp.getInfo("DP")
            if (dpValue) {
                sum += Number.parseInt(dpValue)
                count++
            }
        }

        // final bin
        if (count > 0) {
            const average = sum / count
            wigFeatures.push({chr, start: binStart, end: binEnd, value: average})
        }
    }

    return wigFeatures
}


export {computeDepthFeatures}