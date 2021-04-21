/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Regents of the University of California and Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {igvxhr} from "../../node_modules/igv-utils/src/index.js";

const cBioUtils = {

    fetchStudies: async function (baseURL) {

        baseURL = baseURL || "https://www.cbioportal.org/api";
        let url = baseURL + "/studies?projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC";
        return igvxhr.loadJson(url);
    },

    fetchSamplesByStudy: async function (study, baseURL) {

        baseURL = baseURL || "https://www.cbioportal.org/api"
        let url = baseURL + "/studies/" + study + "/samples";
        const samples = await igvxhr.loadJson(url);
        let sampleStudyList = [];
        samples.forEach(function (sampleJson) {
            sampleStudyList.push(
                {
                    "sampleId": sampleJson["sampleId"],
                    "studyId": study
                }
            )
        })
        return sampleStudyList;
    },

    // Copy number
    // {
    //     "uniqueSampleKey": "VENHQS1PUi1BNUoyLTAxOmFjY190Y2dh",
    //     "uniquePatientKey": "VENHQS1PUi1BNUoyOmFjY190Y2dh",
    //     "patientId": "TCGA-OR-A5J2",
    //     "start": 3218610,
    //     "end": 4749076,
    //     "segmentMean": -0.2239,
    //     "studyId": "acc_tcga",
    //     "sampleId": "TCGA-OR-A5J2-01",
    //     "chromosome": "1",
    //     "numberOfProbes": 958
    // }

    fetchCopyNumberByStudy: async function (study, baseURL) {
        baseURL = baseURL || "https://www.cbioportal.org/api";
        const sampleStudyList = await this.fetchSamplesByStudy(study);
        const url = baseURL + "/copy-number-segments/fetch?projection=SUMMARY";
        const body = JSON.stringify(sampleStudyList);
        const json = await igvxhr.loadJson(url, {method: "POST", sendData: body});
        for (let j of json) {
            j.chr = j["chromosome"];
            j.value = j["segmentMean"];
            j.sampleKey = j["uniqueSampleKey"];
            j.sample = j["sampleId"];
        }
        return json;
    },

    fetchMutationsByStudy: async function (study, baseURL) {
        baseURL = baseURL || "https://www.cbioportal.org/api";
        const sampleStudyList = await this.fetchSamplesByStudy(study);
        const url = baseURL + "/molecular-profiles/ov_tcga_pub_mutations/mutations/fetch?projection=DETAILED";
        const sampleList = sampleStudyList.map(ss => ss.sampleId);
        const body =  JSON.stringify({"sampleIds":["TCGA-13-1489-01"]}) ;// JSON.stringify({sampleIds: sampleList});
        const json = await igvxhr.loadJson(url, {method: "POST", sendData: body});
        return json;
    },


}


// Example json

// Copy number
// {
//     "uniqueSampleKey": "VENHQS1PUi1BNUoyLTAxOmFjY190Y2dh",
//     "uniquePatientKey": "VENHQS1PUi1BNUoyOmFjY190Y2dh",
//     "patientId": "TCGA-OR-A5J2",
//     "start": 3218610,
//     "end": 4749076,
//     "segmentMean": -0.2239,
//     "studyId": "acc_tcga",
//     "sampleId": "TCGA-OR-A5J2-01",
//     "chromosome": "1",
//     "numberOfProbes": 958
// }

export default cBioUtils;

