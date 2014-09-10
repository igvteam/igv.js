// Experimental class for fetching features from an mpg webservice.

var igv = (function (igv) {


    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.MpgFeatureSource = function (url) {

        this.url = url;


    };

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param queryChr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     */
    igv.MpgFeatureSource.prototype.getFeatures = function (queryChr, bpStart, bpEnd, success, task) {

        if(this.cache && cache.chr === queryChr && cache.end > bpStart && cache.start < bpEnd) {
            success(cache.features);
        }

        else {

            function loadFeatures() {
                var dataLoader = new igv.DataLoader(this.url),
                    data = {
                        "user_group": "ui",
                        "filters": [
                            { "filter_type": "STRING", "operand": "CHROM", "operator": "EQ", "value": queryChr },
                            {"filter_type": "FLOAT", "operand": "POS", "operator": "GTE", "value": bpStart },
                            {"filter_type": "FLOAT", "operand": "POS", "operator": "LTE", "value": bpEnd }
                        ],
                        "columns": ["ID", "CHROM", "POS", "DBSNP_ID", "Consequence", "Protein_change"]
                    };
                dataLoader.postJson(data, function (result) {
                        if (result) {
                            var variants = JSON.parse(result).variants;
                            this.cache = {
                                chr: queryChr,
                                start: bpStart,
                                end: bpEnd
                            };
                            success(variants);
                        }
                        else {
                            success(null);
                        }
                    },
                    task);
            }

            loadFeatures.call(this);
        }
    }


    return igv;
})(igv || {});
