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

        let url = baseURL + "/studies/" + study.studyId + "/samples";
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

    fetchCopyNumberByStudy: async function (study, baseURL) {
        baseURL = baseURL || "https://www.cbioportal.org/api";
        const sampleStudyList = await this.fetchSamplesByStudy(study);
        let url = baseURL + "/copy-number-segments/fetch?projection=SUMMARY";
        let body = JSON.stringify(sampleStudyList);
        return igvxhr.loadJson(url, {method: "POST", sendData: body})
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

