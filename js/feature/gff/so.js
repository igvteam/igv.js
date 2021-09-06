/**
 * Some interpretations of the sequence ontology needed to assemble GFF transcripts.
 *
 */

const transcriptTypes = new Set(['transcript', 'primary_transcript', 'processed_transcript', 'mRNA', 'mrna',
    'lnc_RNA', 'miRNA', 'ncRNA', 'rRNA', 'scRNA', 'snRNA', 'snoRNA', 'tRNA']);
const cdsTypes = new Set(['CDS', 'cds']);
const codonTypes = new Set(['start_codon', 'stop_codon']);
const utrTypes = new Set(['5UTR', '3UTR', 'UTR', 'five_prime_UTR', 'three_prime_UTR', "3'-UTR", "5'-UTR"]);
const exonTypes = new Set(['exon', 'coding-exon']);

const transcriptPartTypes = new Set();
for (let cltn of [cdsTypes, codonTypes, utrTypes, exonTypes]) {
    for (let t of cltn) {
        transcriptPartTypes.add(t);
    }
}

function isExon(type) {
    return exonTypes.has(type)
}

function isIntron(type) {
    return type.includes("intron");
}

function isCoding(type) {
    return cdsTypes.has(type) || codonTypes.has(type);
}

function isUTR(type) {
    return utrTypes.has(type);
}

function isTranscript(type) {
    return transcriptTypes.has(type) || type.endsWith("RNA") || type.endsWith("transcript");
}

function isTranscriptPart(type) {
    return transcriptPartTypes.has(type) || type.endsWith("RNA") || isIntron(type);
}



export {isTranscript, isTranscriptPart, isExon, isIntron, isCoding, isUTR}
