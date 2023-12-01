import NonIndexedFasta from "./nonIndexedFasta.js"
import FastaSequence from "./indexedFasta.js"
import {isDataURL} from "../util/igvUtils.js"
import ChromSizes from "./chromSizes.js"
import Twobit from "./twobit.js"
import CachedSequence from "./cachedSequence.js"

/**
 * Create a sequence object.  The referenced object can include multiple sequence references, in particular
 * fasta and 2bit URLs.  This is for backward compatibility, the 2bit URL has preference.
 *
 * @param reference
 * @returns {Promise<CachedSequence|ChromSizes|NonIndexedFasta>}
 */
async function loadSequence(reference) {

    let fasta
    if ("chromsizes" === reference.format) {
        fasta = new ChromSizes(reference.fastaURL)
    } else if ("2bit" === reference.format || reference.twoBitURL) {
        fasta = new CachedSequence(new Twobit(reference))
    } else if (isDataURL(reference.fastaURL) || reference.indexed === false) {
        fasta = new NonIndexedFasta(reference)
    } else {
        fasta = new CachedSequence(new FastaSequence(reference))
    }
    await fasta.init()
    return fasta
}

export {loadSequence}
