import {byteToUnsignedInt} from "./baseModificationUtils.js"

class BaseModificationCounts {


    // static  Key5mC : new Key('C', '+', "m");
    // static  Key5mCcomplement : new Key('G', '-', "m");
    // static  Key5hmC : new Key('C', '+', "hm");
    // static  Key5hmCcomplement : new Key('G', '-', "hm");

    /**
     * Set of all modification seen.
     */
    allModifications = new Set()  //LinkedHashSet<Key>

    /**
     * Map for counts for each modification (e.g. m, h, etc). Key is base+modification identifier,
     * value is map of genomic position -> count
     */
    counts = new Map() //Map<Key, Map<Integer, Integer>>

    /**
     * Map for capturing modification likelihood "pileup", key is modification identifier,
     * value is map of genomic position -> sum of likelihoods for modifications at that position
     */
    likelihoodSums = new Map()  //Map<Key, Map<Integer, Integer>>

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

                // Loop through read sequence index ("i")
                for (let i = block.seqOffset; i < block.seqOffset + block.len; i++) {

                    for (let bmset of baseModificationSets) {

                        //String modification = bmset.getModification();
                        const key =  Key.getKey(bmset.base, bmset.strand, bmset.modification)
                        const likelihoods = bmset.likelihoods   //List<BaseModificationSet>

                        if (bmset.containsPosition(i)) {

                            let lh = byteToUnsignedInt(likelihoods.get(i))

                            let modCounts = this.counts.get(key)  //Map<Integer, Integer>
                            if (!modCounts) {
                                modCounts = new Map()
                                this.counts.set(key, modCounts)
                            }

                            let modLikelihoods = this.likelihoodSums.get(key)  //Map<Integer, Integer>
                            if (!modLikelihoods) {
                                modLikelihoods = new Map()
                                this.likelihoodSums.set(key, modLikelihoods)
                            }

                            const blockIdx = i - block.seqOffset
                            const position = block.start + blockIdx   // genomic position

                            const c = modCounts.has(position) ? modCounts.get(position) + 1 : 1


                            const l = modLikelihoods.has(position) ? modLikelihoods.get(position) + lh : lh
                            modCounts.set(position, c)
                            modLikelihoods.set(position, l)

                        }
                        this.allModifications.add(key)
                    }
                }
            }
        }
    }

    getCount(position, key) {
        const modCounts = this.counts.get(key)   //Map<Integer, Integer>
        if (modCounts && modCounts.has(position)) {
            return modCounts.get(position)
        } else {
            return 0
        }
    }

    getLikelhoodSum(position, key) {
        const modLikelihoods = this.likelihoodSums.get(key)
        if (modLikelihoods && modLikelihoods.has(position)) {
            return modLikelihoods.get(position)
        } else {
            return getCount(position, key) * 255
        }
    }


    getValueString(position, colorOption) {
        let buffer = ''
        for (let key of counts.keys()) {
            const modification = key.modification
            const modCounts = counts.get(key)
            if (modCounts.containsKey(position)) {
                const count = modCounts.get(position)
                const lh = Math.floor(((100 / 255) * getLikelhoodSum(position, key)) / count)
                buffer += ("Modification: " + modification + " (" + count + "  @ " + lh + "%)<br>")
            }
        }
        return buffer
    }

// /**
//  * For debugging
//  */
// public void dump() {
//     for (Map.Entry<Key, Map<Integer, Integer>> entry : counts.entrySet()) {
//
//         String modification = entry.getKey().toString();
//         Map<Integer, Integer> modCounts = entry.getValue();
//         System.out.println("Modification: " + modification);
//         for (Map.Entry<Integer, Integer> modKey : modCounts.entrySet()) {
//             System.out.println(modKey.getKey() + "  " + modKey.getValue());
//         }
//     }
// }


}


class Key {

    static instances = new Map()

    static getKey(base, strand, modification) {

        const s = "" + base + strand + modification
        if (!Key.instances.has(s)) {
            Key.instances.set(s, new Key(base, strand, modification))
        }
        return Key.instances.get(s)
    }

    // char base;
    // char strand;
    // String modification;
    constructor(base, strand, modification) {
        this.base = base
        this.strand = strand
        this.modification = modification
    }

    getCanonicalBase() {
        return this.strand === '+' ? this.base : SequenceUtil.complement(this.base)
    }


    toString() {
        return "" + this.base + this.strand + this.modification
    }
}

export default BaseModificationCounts
export {Key}  // Export for unit tests

