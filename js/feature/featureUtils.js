import pack from "./featurePacker.js"

const DEFAULT_MAX_WG_COUNT = 10000

/**
 * Return a collection of "whole genome" features wrapping the supplied features, possibly downsampled.  The purpose
 * is to support painting features in "whole genome view".
 *
 * @param allFeatures - dictionary (object), keys are chromosome names, values are lists of features
 * @param genome
 * @param maxWGCount - optional, maximum # of whole genome features to computer
 * @returns {*[]}
 */
async function computeWGFeatures(allFeatures, genome, maxWGCount) {

    const makeWGFeature = (f) => {
        const wg = Object.assign({}, f)
        wg.chr = "all"
        wg.start = genome.getGenomeCoordinate(f.chr, f.start)
        wg.end = genome.getGenomeCoordinate(f.chr, f.end)
        wg._f = f
        // Don't draw exons in whole genome view
        if (wg["exons"]) delete wg["exons"]
        return wg
    }

    const wgChromosomeNames = new Set(genome.wgChromosomeNames)
    const wgFeatures = []
    let count = 0
    for (let c of genome.wgChromosomeNames) {

        if (Array.isArray(allFeatures)) {
            const featureDict = {}
            for (let f of allFeatures) {
                const chr = genome.getChromosomeName(f.chr)
                if (!featureDict.hasOwnProperty(chr)) {
                    featureDict[chr] = []
                }
                featureDict[chr].push(f)
            }
            allFeatures = featureDict
        }

        const features = allFeatures[c]

        if (features) {
            const max = maxWGCount || DEFAULT_MAX_WG_COUNT
            for (let f of features) {
                let queryChr = genome.getChromosomeName(f.chr)
                if (wgChromosomeNames.has(queryChr)) {
                    if (wgFeatures.length < max) {
                        wgFeatures.push(makeWGFeature(f))
                    } else {
                        //Reservoir sampling
                        const samplingProb = max / (count + 1)
                        if (Math.random() < samplingProb) {
                            const idx = Math.floor(Math.random() * (max - 1))
                            wgFeatures[idx] = makeWGFeature(f)
                        }
                    }
                }
                count++
            }
        }
    }

    wgFeatures.sort(function (a, b) {
        return a.start - b.start
    })

    return wgFeatures
}

/**
 * Assigns a row to each feature such that features do not overlap.
 *
 * @param features
 * @param maxRows
 * @param filter Function thta takes a feature and returns a boolean indicating visibility
 */
function packFeatures(features, maxRows, filter) {

    maxRows = maxRows || 1000
    if (features == null || features.length === 0) {
        return
    }
    // Segregate by chromosome
    const chrFeatureMap = {}
    const chrs = []
    for (let feature of features) {
        if(filter && !filter(feature)) {
            feature.row = undefined;
        } else {
            const chr = feature.chr
            let flist = chrFeatureMap[chr]
            if (!flist) {
                flist = []
                chrFeatureMap[chr] = flist
                chrs.push(chr)
            }
            flist.push(feature)
        }
    }

    // Loop through chrosomosomes and pack features;
    for (let chr of chrs) {
        pack(chrFeatureMap[chr], maxRows)
    }
}


/**
 * Return the index at which a new feature should be inserted in the sorted featureList.  It is assumed
 * that featureList is sorted by the compare function.  If featureList has 1 or more features with compare === 0
 * the new feature should be inserted at the end.
 *
 * @param featureList
 * @param center
 * @param direction -- forward === true, reverse === false
 * @returns {feature}
 */

function findFeatureAfterCenter(featureList, center, direction = true) {

    const featureCenter = (feature) => (feature.start + feature.end) / 2

    const compare = direction ?
        (o1, o2) => o1.start - o2.start + o1.end - o2.end :
        (o2, o1) => o1.start - o2.start + o1.end - o2.end
    const sortedList = Array.from(featureList)
    sortedList.sort(compare)

    let low = 0
    let high = sortedList.length
    while (low < high) {
        let mid = Math.floor((low + high) / 2)
        if(direction) {
            if (featureCenter(sortedList[mid]) <= center) {
                low = mid + 1
            } else {
                high = mid
            }
        } else {
            if (featureCenter(sortedList[mid]) >= center) {
                low = mid + 1
            } else {
                high = mid
            }

        }
    }
    return sortedList[low]
}

export {computeWGFeatures, packFeatures, findFeatureAfterCenter}