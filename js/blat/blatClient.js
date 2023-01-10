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
const blatServer = "https://igv.org/services/blat.php"


async function blat(userSeq, db) {

    const url = `${blatServer}?userSeq=${userSeq}&type=DNA&db=${db}&output=json`

    const results = await igvxhr.loadJson(url, {})

    const fields = results.fields

    const features = results.blat.map(decodePSL)

    return features
}

async function createBlatTrack(userSeq, browser) {

    const db = browser.genome.id   // TODO -- blat specific property

    const features = await blat(userSeq, db)

    const trackConfig = {
        type: 'blat',
        features: features
    }

    //const track = new BlatTrack(trackConfig, browser)

    const track = await browser.loadTrack(trackConfig)

    track.openTableView()

}


export {blat, createBlatTrack}