var cBio = {


    fetchStudies: function () {

        let url = "http://www.cbioportal.org/api/studies?projection=DETAILED&pageSize=10000000&pageNumber=0&direction=ASC";
        return igv.xhr.loadJson(url);
    },

    fetchSamplesByStudy: function (study) {

        let url = "http://www.cbioportal.org/api/studies/" + study + "/samples";

        return igv.xhr.loadJson(url)

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

                let url = "http://www.cbioportal.org/api/copy-number-segments/fetch?projection=SUMMARY";
                let body = JSON.stringify(sampleStudyList);

                return igv.xhr.loadJson(url, {method: "POST", sendData: body})

            })
    },

    initMenu: function (div) {

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

                                    let gtexTrack = {
                                        "name": name,
                                        "type": "seg",
                                        "displayMode": "EXPANDED",
                                        "sourceType": "custom",
                                        "source": {
                                            "url": "http://www.cbioportal.org/api/copy-number-segments/fetch?projection=SUMMARY",
                                            "method": "POST",
                                            "contentType": "application/json",
                                            "body": body,
                                            "mappings": {
                                                "chr": "chromosome",
                                                "value": "segmentMean",
                                                "sample": "sampleId"
                                            },
                                            "queryable": false
                                        }
                                    }
                                    igv.browser.loadTrack(gtexTrack);

                                });

                                div.appendChild(trackDiv);

                            });
                    }
                });


            })

    }


}