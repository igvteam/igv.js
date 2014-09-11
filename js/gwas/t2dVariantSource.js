// Experimental class for fetching features from an mpg webservice.

var igv = (function (igv) {


    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.MpgFeatureSource = function (config) {

        this.url = config.url;
        this.trait = config.trait;


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

        var source = this;

        if(this.cache && this.cache.chr === queryChr) {  // && cache.end > bpStart && cache.start < bpEnd) {
            success(this.cache.features);
        }

        else {

            function loadFeatures() {

                var dataLoader = new igv.DataLoader(this.url),
                    data = {
                        "user_group": "ui",
                        "filters": [
                            {"operand": "CHROM",  "operator": "EQ","value": "1", "filter_type": "STRING" },
                            {"operand": "PVALUE", "operator": "LTE", "value": 5E-2, "filter_type": "FLOAT"}
                        ],
                        "trait": source.trait
                    };

                dataLoader.postJson(data, function (result) {

                        if (result) {

                            var variants = JSON.parse(result).variants;

                            variants.sort(function(a, b) {
                                return a.POS - b.POS;
                            });

                            source.cache = {
                                chr: queryChr,
                                start: bpStart,
                                end: bpEnd,
                                features: variants
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
