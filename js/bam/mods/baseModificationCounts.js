import {byteToUnsignedInt, modificationName} from "./baseModificationUtils.js"
import {complementBase} from "../../util/sequenceUtils.js"
import BaseModificationKey from "./baseModificationKey.js"

class BaseModificationCounts {

    /**
     * Set of all modification seen.
     */
    allModifications = new Set()  //LinkedHashSet<Key>

    simplexModifications = new Set()

    /**
     * Maxixum likelihood (i.e. maximum of all modifications present) for each position and base moodification key*
     */
    maxLikelihoods = new Map()

    /**
     * Maximum likelihood including no-modification (1 - sum(likelihoods)) for each position and base moodification key*
     */
    nomodLikelihoods = new Map()

    lastThreshold


    /**
     * Increment modification counts for each position spanned by the supplied alignments.  Currently both thresholded
     * and total counts are tallied to support different coloring schemes.
     *
     * @param alignment
     */
    incrementCounts(alignment) {

        // Only works with block formats
        if (!alignment.blocks) return

        const baseModificationSets = alignment.getBaseModificationSets()    //List<BaseModificationSet>
        if (baseModificationSets) {

            for (let block of alignment.blocks) {

                //        /*
                //          start: scPos,
                //                 seqOffset: seqOffset,
                //                 len: c.len,
                //                 type: 'S'
                //          */

                if(block.type === 'S') continue // Soft clip

                for (let blockIdx = 0; blockIdx < block.len; blockIdx++) {

                    let readIdx = blockIdx + block.seqOffset
                    let canonicalBase = 0
                    let maxLH = -1
                    let maxKey
                    let noModLH = 255

                    for (let bmset of baseModificationSets) {

                        //String modification = bmset.getModification();
                        const key = BaseModificationKey.getKey(bmset.base, bmset.strand, bmset.modification)
                        this.allModifications.add(key)
                        const likelihoods = bmset.likelihoods   //List<BaseModificationSet>

                        if (bmset.containsPosition(readIdx)) {

                            const lh = byteToUnsignedInt(likelihoods.get(readIdx))
                            noModLH -= lh
                            if (lh > maxLH) {
                                canonicalBase = bmset.canonicalBase
                                maxLH = lh
                                maxKey = key
                            }

                            // Count the modification with highest likelihood, which might be the likelihood of no-modification
                            if (canonicalBase != 0) {
                                const position = block.start + blockIdx

                                const noModKey = BaseModificationKey.getKey(canonicalBase, '+', "NONE_" + canonicalBase)
                                this.allModifications.add(noModKey)

                                const pushLikelihood = (position, byteLikelihood, modKey, likelihoods) => {
                                    let t = likelihoods.get(modKey)
                                    if (!t) {
                                        t = new Map()
                                        likelihoods.set(modKey, t)
                                    }
                                    let byteArrayList = t.get(position)
                                    if (!byteArrayList) {
                                        byteArrayList = []
                                        t.set(position, byteArrayList)
                                    }
                                    byteArrayList.push(byteLikelihood)
                                }

                                // mono color counts -- does not include no-modification
                                pushLikelihood(position, maxLH, maxKey, this.maxLikelihoods)

                                // 2-color counts, which include no-modification
                                if (noModLH > maxLH) {
                                    pushLikelihood(position, noModLH, noModKey, this.nomodLikelihoods)
                                } else {
                                    pushLikelihood(position, maxLH, maxKey, this.nomodLikelihoods)
                                }
                            }
                        }
                    }
                }
            }
        }
    }


    getCount(position, key, threshold, includeNoMods) {

        this.lastThreshold = threshold
        const scaledThreshold = threshold * 255

        const t = includeNoMods ? this.nomodLikelihoods.get(key) : this.maxLikelihoods.get(key)
        if (!t) {
            return 0
        }

        const byteArrayList = t.get(position)
        if (!byteArrayList) {
            return 0
        } else {
            let count = 0
            for (let byteLikelihood of byteArrayList) {
                const lh = byteToUnsignedInt(byteLikelihood)
                if (lh >= scaledThreshold) {
                    count++
                }
            }
            return count
        }
    }

    getLikelihoodSum(position, key, threshold, includeNoMods) {
        this.lastThreshold = threshold
        const scaledThreshold = threshold * 255
        const t = includeNoMods ? this.nomodLikelihoods.get(key) : this.maxLikelihoods.get(key)
        const byteArrayList = t.get(position)
        if (!byteArrayList) {
            return 0
        } else {
            let count = 0
            for (let byteLikelihood of byteArrayList) {
                const lh = byteToUnsignedInt(byteLikelihood)
                if (lh >= scaledThreshold) {
                    count += lh
                }
            }
            return count
        }
    }


    getValueString(position, colorOption) {
        let buffer = ''
        buffer += ("<br>---------<br>")
        buffer += ("Modifications with likelihood > " + (lastThreshold * 100) + "%")

        for (let key of this.maxLikelihoods.keys()) {
            const t = maxLikelihoods.get(key)
            if (key.modification.startsWith("NONE_")) {
                //    continue;
            }
            if (t.has(position)) {
                let includeNoMods = colorOption === "basemod2"
                const count = this.getCount(position, key, lastThreshold, includeNoMods)
                if (count > 0) {
                    const likelihoodSum = getLikelihoodSum(position, key, lastThreshold, includeNoMods)
                    const averageLikelihood = (likelihoodSum / count) * .3921568      // => 100/255
                    const modName = modificationName(key.modification)
                    buffer.append("<br>&nbsp;&nbsp;" + modName + " (" + key.base + key.strand + "): " + count + "  @ average likelihood " + averageLikelihood + "%")
                }
            }
        }
        return buffer
    }

    // Search modification keys for "simplex" data,  e.g. C+m without corresponding G-m, indicating only 1 strand of molecule was read or recorded
    computeSimplex() {
        const minusStranMods = new Set(Array.from(this.allModifications)
            .filter(key => key.strand === "-")
            .map(key => key.modification))
        for (let key of this.allModifications) {
            if (key.strand === "+" && !minusStranMods.has(key.modification)) {
                this.simplexModifications.add(key.modification)
                this.simplexModifications.add("NONE_" + key.getCanonicalBase())  // Mix of simplex & duplex keys for same base not supported.
            }
        }
    }
}


export default BaseModificationCounts
