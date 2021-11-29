import NonIndexedFasta from "./nonIndexedFasta.js"
import FastaSequence from "./indexedFasta.js"
import {isDataURL} from "../util/igvUtils.js"
import ChromSizes from "./chromSizes.js"

async function loadFasta(reference) {

    let fasta
    if ("chromsizes" === reference.format) {
        fasta = new ChromSizes(reference.fastaURL)
    } else if (isDataURL(reference.fastaURL) || reference.indexed === false) {
        fasta = new NonIndexedFasta(reference)
    } else {
        fasta = new FastaSequence(reference)
    }
    await fasta.init()
    return fasta
}

export {loadFasta}
