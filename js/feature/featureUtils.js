import pack from "./featurePacker.js"
import IntervalTree from "./intervalTree.js"

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
async function computeWGFeatures(allFeatures, genome, chromAliasManager, maxWGCount) {


    const aliasTable = new Map()
    const chrTable = new Map()

    const makeWGFeature = (f) => {
        const wg = Object.assign({}, f)
        wg.chr = "all"


        if (f.chr2 && f.end2) {
            const c1 = aliasTable.get(f.chr1) || f.chr1
            const c2 = aliasTable.get(f.chr2) || f.chr2
            wg.start = genome.getGenomeCoordinate(c1, f.start1)
            wg.end = genome.getGenomeCoordinate(c2, f.end2)
        } else {
            const c = aliasTable.get(f.chr) || f.chr
            wg.start = genome.getGenomeCoordinate(c, f.start)
            wg.end = genome.getGenomeCoordinate(c, f.end)
        }
        wg._f = f
        // Don't draw exons in whole genome view
        if (wg["exons"]) delete wg["exons"]
        return wg
    }

    const wgChromosomeNames = new Set(genome.wgChromosomeNames)

    if (chromAliasManager) {
        for (let c of genome.wgChromosomeNames) {
            const alias = await chromAliasManager.getAliasName(c)
            aliasTable.set(c, alias)
            chrTable.set(alias, c)  // Reverse lookup
        }
    }

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

        // Look up the chromosome name in the alias table.  This maps names in genome => names in dataset.
        const queryChr = aliasTable.get(c) || c
        const features = allFeatures[queryChr]

        if (features) {
            const max = maxWGCount || DEFAULT_MAX_WG_COUNT
            for (let f of features) {
                if (f.dup) continue  // Skip duplicates, these are pseudo features for inter-chromosomal features

                // Reverse lookup for chromosome names, names in dataset => names in genome
                const chr = chrTable.get(f.chr) || f.chr
                const chr2 = f.chr2 ? (chrTable.get(f.chr2) || f.chr2) : chr
                if (wgChromosomeNames.has(chr) && wgChromosomeNames.has(chr2)) {
                    if (wgFeatures.length < max) {
                        wgFeatures.push(makeWGFeature(f))
                    } else {
                        //Reservoir sampling
                        const samplingProb = max / (count + 1)
                        if (Math.random() < samplingProb) {
                            const idx = Math.floor(Math.random() * (max - 1))
                            wgFeatures[idx] =  makeWGFeature(f)
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
        if (filter && !filter(feature)) {
            feature.row = undefined
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
        if (direction) {
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

/**
 * Find features overlapping the given interval.  It is assumed that all features share the same chromosome.
 *
 * @param featureList
 * @param start
 * @param end
 */
function findOverlapping(featureList, start, end) {

    if (!featureList || featureList.length === 0) {
        return []
    } else {
        const tree = buildIntervalTree(featureList)
        const intervals = tree.findOverlapping(start, end)

        if (intervals.length === 0) {
            return []
        } else {

            // Trim the list of features in the intervals to those
            // overlapping the requested range.
            // Assumption: features are sorted by start position

            const overlaps = []

            intervals.forEach(function (interval) {
                const intervalFeatures = interval.value
                const len = intervalFeatures.length
                for (let i = 0; i < len; i++) {
                    const feature = intervalFeatures[i]
                    if (feature.start > end) break
                    else if (feature.end > start) {
                        overlaps.push(feature)
                    }
                }
            })

            overlaps.sort(function (a, b) {
                return a.start - b.start
            })

            return overlaps
        }
    }
}

/**
 * Build an interval tree from the feature list for fast interval based queries.   We lump features in groups
 * of 10, or total size / 100,   to reduce size of the tree.
 *
 * @param featureList
 */
function buildIntervalTree(featureList) {

    const tree = new IntervalTree()
    const len = featureList.length
    const chunkSize = Math.max(10, Math.round(len / 100))

    featureList.sort(function (f1, f2) {
        return (f1.start === f2.start ? 0 : (f1.start > f2.start ? 1 : -1))
    })

    for (let i = 0; i < len; i += chunkSize) {
        const e = Math.min(len, i + chunkSize)
        const subArray = featureList.slice(i, e)
        const iStart = subArray[0].start
        let iEnd = iStart
        subArray.forEach(function (feature) {
            iEnd = Math.max(iEnd, feature.end)
        })
        tree.insert(iStart, iEnd, subArray)
    }

    return tree
}

export {computeWGFeatures, packFeatures, findFeatureAfterCenter}