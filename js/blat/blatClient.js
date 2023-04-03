/*
http://genome.ucsc.edu/cgi-bin/hgBlat
?userSeq=CTAATCAtctacactggtttctactgaaatgtctgttgtcatagacttaattgtgtcttcagatacagcagttctgttatttctgagttttacctggggcaagagaatctttagcaagtttaaaggcacctatatctggaatcacccctccctccagatgaatatcacagactctcccattaaaggtcttgccTTCCTTGATAGCATCATCACTCCA
&type=DNA
&db=hg38
&output=json
 */

import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {decodePSL} from "../feature/decode/ucsc.js"
import BlatTrack from "./blatTrack.js"


//const blatServer = "https://genome.ucsc.edu/cgi-bin/hgBlat"
//const blatServer = "https://igv.org/services/blat.php"
const blatServer = "http://localhost:8000/blat.php"


async function blat(userSeq, db) {


    const results = await postData(blatServer, userSeq, db)

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
