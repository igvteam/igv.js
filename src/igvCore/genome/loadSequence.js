import NonIndexedFasta from "./nonIndexedFasta.js"
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
        fasta = new ChromSizes(reference.fastaURL || reference.url)
    } else if ("2bit" === reference.format || reference.twoBitURL) {
        fasta = new CachedSequence(new Twobit(reference))
    } else if (isDataURL(reference.fastaURL) || !reference.indexURL) {
        fasta = new NonIndexedFasta(reference)
    } else if("gbk" === reference.format || reference.gbkURL) {
        // Genbank files do not crete a fasta object
    } else {
        console.warn('loadSequence: Whoops! Should not get here')
    }

    await fasta.init()
    return fasta
}

export {loadSequence}
