import igvxhr from "../../js/igvxhr.js";

var cBio = {


    fetchStudies: function () {

        let url = "http://www.cbioportal.org/api/studies?projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC";
        return igvxhr.loadJson(url);
    },

    fetchSamplesByStudy: function (study) {

        let url = "https://www.cbioportal.org/api/studies/" + study + "/samples";

        return igvxhr.loadJson(url)

            .then(function (samples) {

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
            })
    },

    fetchCopyNumberByStudy: function (study) {

        this.fetchSamplesByStudy(study)

            .then(function (sampleStudyList) {

                let url = "https://www.cbioportal.org/api/copy-number-segments/fetch?projection=SUMMARY";
                let body = JSON.stringify(sampleStudyList);

                return igvxhr.loadJson(url, {method: "POST", sendData: body})

            })
    },

    initMenu: function (div, browser) {

        let self = this;

        this.fetchStudies()

            .then(function (studies) {

                studies.forEach(function (study) {

                    let sampleCount = study["cnaSampleCount"];
                    if (sampleCount > 0) {

                        self.fetchSamplesByStudy(study.studyId)

                            .then(function (sampleStudyList) {


                                let name = study["shortName"] + " (" + sampleCount + ")";
                                let body = JSON.stringify(sampleStudyList);

                                let trackDiv = document.createElement('div');
                                trackDiv.textContent = name;
                                trackDiv.addEventListener('click', function (event) {

                                    let trackJson = {
                                        "name": name,
                                        "type": "seg",
                                        "displayMode": "EXPANDED",
                                        "sourceType": "custom",
                                        "source": {
                                            "url": "https://www.cbioportal.org/api/copy-number-segments/fetch?projection=SUMMARY",
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
                                        },

                                    }
                                    browser.loadTrack(trackJson);

                                });

                                div.appendChild(trackDiv);

                            });
                    }
                });


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

export default cBio;