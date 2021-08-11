import NonIndexedFasta from "./nonIndexedFasta.js";
import FastaSequence from "./indexedFasta.js";

async function loadFasta(reference) {

    let fasta;
    if ((typeof reference.fastaURL === 'string' && reference.fastaURL.startsWith('data:')) || reference.indexed === false) {
        fasta = new NonIndexedFasta(reference);
    } else {
        fasta = new FastaSequence(reference);
    }
    await fasta.init();
    return fasta;
}

export {loadFasta}
