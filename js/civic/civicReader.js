var igv = (function (igv) {


        igv.CivicReader = function (config) {
            this.config = config;
        }

        igv.CivicReader.prototype.readFeatures = function (chr, start, end) {


            const self = this;

            return igv.xhr.loadJson(this.config.url + "/variants/?count=5000")

                .then(function (json) {

                    const records = json.records;
                    const features = [];

                    for (let record of records) {

                        if (record.coordinates) {

                            const id = record.id;
                            const coordinates = record.coordinates;

                            if (coordinates.chromosome) {
                                features.push(
                                    new CivicVariant(
                                        coordinates.chromosome,
                                        coordinates.start - 1,     // UCSC 0 convention
                                        coordinates.stop,
                                        record
                                    ));
                            }

                            if (coordinates.chromosome2) {
                                features.push(
                                    new CivicVariant(
                                        coordinates.chromosome2,
                                        coordinates.start2 - 1,     // UCSC 0 convention
                                        coordinates.stop2,
                                        record
                                    ));
                            }
                        }

                    }
                    return features;
                });
        }


        function CivicVariant(chr, start, end, record) {
            this.chr = chr;
            this.start = start;
            this.end = end;
            this.id = record.id;
            this.entrezName = record.entrez_name;
            this.name = record.name;
            this.actionabilityScore = record.civic_actionability_score;

            if (record.coordinates.reference_bases) {
                this.refBases = record.coordinates.reference_bases;
            }
            if (record.coordinates.variant_bases) {
                this.altBases = record.coordinates.variant_bases
            }

            // Color based on actionability score
            if (this.actionabilityScore === undefined) {
                this.color = "lightgray";
            }
            else {
                let alpha;
                if (this.actionabilityScore <= 10) {
                    alpha = 0.2;
                }
                else {
                    const v = Math.min(30, this.actionabilityScore);
                    alpha = 0.2 + 0.8 * Math.log10((v - 10) / 2);
                }
                this.color = igv.Color.addAlpha("rgb(50,0, 200)", alpha);
            }


        }

        CivicVariant.prototype.popupData = function () {


            const link = "<a target='_blank' href='https://civicdb.org/links/variants/" + this.id + "'>CIViC</a>";

            let cravatLink;
            const isSnp =
                this.refBases !== this.altBases &&
                this.refBases && this.refBases.length === 1 &&
                this.altBases && this.altBases.length === 1;

            if (isSnp) {
                const ref = this.refBases;
                const alt = this.altBases;
                cravatLink = "<a target='_blank' " +
                    "href='http://www.cravat.us/CRAVAT/variant.html?variant=chr7_140808049_+_" + ref + "_" + alt + "'>CRAVAT " + ref + "->" + alt + "</a>";

            }

            const pd = [link];
            pd.push("<hr/>");

            if (cravatLink) {
                pd.push(cravatLink);
            }
            pd.push("<hr/>");

            pd.push({name: "Name", value: this.name});
            pd.push({name: "Entrez Name", value: this.entrezName});
            pd.push({name: "Actionability Score", value: this.actionabilityScore});
            pd.push("<hr/>");
            pd.push({name: "Location", value:
                    (this.chr + ":" +
                        igv.numberFormatter(this.start + 1) + ":" +
                        igv.numberFormatter(this.end))});

            return pd;

        }

        return igv;


    }
)(igv || {});