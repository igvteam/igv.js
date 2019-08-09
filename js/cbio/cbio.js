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

import igvxhr from "../igvxhr";

var igv = (function (igv) {


    igv.cBioUtils = {


        fetchStudies: function (baseURL) {

            baseURL = baseURL || "http://www.cbioportal.org/api";

            let url = baseURL + "/studies?projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC";
            return igvxhr.loadJson(url);
        },

        fetchSamplesByStudy: function (study, baseURL) {

            baseURL = baseURL || "http://www.cbioportal.org/api"

            let url = baseURL + "/studies/" + study.studyId + "/samples";

            return igvxhr.loadJson(url)

                .then(function (samples) {

                    let sampleStudyList = {
                        studyId: study.studyId,
                        study: study,
                        sampleIDs: []
                    }

                    for (let sampleJson of samples) {

                        sampleStudyList.sampleIDs.push(sampleJson["sampleId"]);
                    }

                    return sampleStudyList;
                })
        },

        fetchCopyNumberByStudy: function (study, baseURL) {

            baseURL = baseURL || "http://www.cbioportal.org/api";

            this.fetchSamplesByStudy(study)

                .then(function (sampleStudyList) {

                    let url = baseURL + "/copy-number-segments/fetch?projection=SUMMARY";
                    let body = JSON.stringify(sampleStudyList);

                    return igvxhr.loadJson(url, {method: "POST", sendData: body})

                })
        },

        initMenu: function (baseURL) {

            baseURL = baseURL || "http://www.cbioportal.org/api";

            const self = this;

            return this.fetchStudies(baseURL)

                .then(function (studies) {

                    const samplePromises = [];

                    for (let study of studies) {

                        let sampleCount = study["cnaSampleCount"];
                        if (sampleCount > 0) {
                            samplePromises.push(self.fetchSamplesByStudy(study.studyId, baseURL));
                        }
                    }

                    return Promise.all(samplePromises);
                })

                .then(function (sampleStudyListArray) {

                    const trackJson = [];

                    for (let sampleStudyList of sampleStudyListArray) {

                        const study = sampleStudyList.study;
                        const sampleCount = sampleStudyList.sampleIDs.length;

                        if (sampleCount > 0) {

                            const name = study["shortName"] + " (" + sampleCount + ")";
                            const body = JSON.stringify(sampleStudyList);

                            trackJson.push({
                                "name": name,
                                "type": "seg",
                                "displayMode": "EXPANDED",
                                "sourceType": "custom",
                                "source": {
                                    "url": baseURL + "/copy-number-segments/fetch?projection=SUMMARY",
                                    "method": "POST",
                                    "contentType": "application/json",
                                    "body": body,
                                    "queryable": false,
                                    "isLog": true,
                                    "mappings": {
                                        "chr": "chromosome",
                                        "value": "segmentMean",
                                        "sampleKey": "uniqueSampleKey",
                                        "sample": "sampleId"
                                    }
                                }
                            });
                        }
                    }

                    return trackJson;
                })
        }
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


    return igv;

})
(igv || {});
