/*
http://genome.ucsc.edu/cgi-bin/hgBlat
?userSeq=CTAATCAtctacactggtttctactgaaatgtctgttgtcatagacttaattgtgtcttcagatacagcagttctgttatttctgagttttacctggggcaagagaatctttagcaagtttaaaggcacctatatctggaatcacccctccctccagatgaatatcacagactctcccattaaaggtcttgccTTCCTTGATAGCATCATCACTCCA
&type=DNA
&db=hg38
&output=json
 */

import {decodePSL} from "../feature/decode/ucsc.js"

//const blatServer = "https://genome.ucsc.edu/cgi-bin/hgBlat"
const defaultBlatServer = "https://igv.org/services/blatUCSC.php"
//const blatServer = "http://localhost:8000/blatUCSC.php"


async function blat({url, userSeq, db}) {

    url = url || defaultBlatServer

    if(!db) {
        throw Error("Blat database is not defined")
    }

    const results = await postData(url, userSeq, db)

    const fields = results.fields

    const features = results.blat.map(decodePSL)

    return features
}

async function postData(url = "", userSeq, db) {

    const data = new URLSearchParams();
    data.append("userSeq", userSeq);
    data.append("db", db);

    const response = await fetch(url, { method: "post", body: data })
    return response.json(); // parses JSON response into native JavaScript objects
}



export {blat}
