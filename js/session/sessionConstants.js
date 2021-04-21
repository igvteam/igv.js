

const refMap = {
    "1": "id",
    "2": "name",
    "3": "fastaURL",
    "4": "indexURL",
    "5": "cytobandURL"
}

function encodeReference(referenceObject) {

    const reverseMap = {};
    for(let key of Object.keys(refMap)) {
        reverseMap[refMap[key]] = key;
    }

    // "id": "hg19",
    //     "name": "Human (CRCh37/hg19)",
    //     "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
    //     "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta.fai",
    //     "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
    for(let key of Object.keys(referenceObject)) {
        if(reverseMap[key]) {
            referenceObject[reverseMap[key]] = referenceObject[key];
            delete referenceObject[key];
        }
    }
    return referenceObject;
}

function decodeReference(referenceObject) {

    for(let key of Object.keys(referenceObject)) {
        if(refMap[key]) {
            referenceObject[refMap[key]] = referenceObject[key];
            delete referenceObject[key];
        }
    }
    return referenceObject;

}

export {encodeReference, decodeReference}




