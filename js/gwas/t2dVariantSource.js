// Experimental class for fetching features from an mpg webservice.

var igv = (function (igv) {


    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.T2DVariantSource = function (config) {

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
    igv.T2DVariantSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        var source = this;

        if (this.cache && this.cache.chr === chr && this.cache.end > bpEnd && this.cache.start < bpStart) {
            success(this.cache.features);
        }

        else {

            function loadFeatures() {

                // Get a minimum 10mb window around the requested locus
                var window = Math.max(bpEnd - bpStart, 10000000) / 2,
                    center = (bpEnd + bpStart) / 2,
                    queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),
                    queryStart = Math.max(0, center - window),
                    queryEnd = center + window,
                    dataLoader = new igv.DataLoader(this.url),
                    data = {
                        "user_group": "ui",
                        "filters": [
                            {"operand": "CHROM", "operator": "EQ", "value": queryChr , "filter_type": "STRING" },
                            {"operand": "POS", "operator": "GT", "value": queryStart, "filter_type": "FLOAT" },
                            {"operand": "POS", "operator": "LT", "value": queryEnd, "filter_type": "FLOAT" },
                            {"operand": "PVALUE", "operator": "LTE", "value": 5E-2, "filter_type": "FLOAT"}
                        ],
                        "trait": source.trait
                    };


                dataLoader.postJson(data, function (result) {

                        if (result) {

                            var variants = JSON.parse(result).variants;

                            if (variants) {
                                variants.sort(function (a, b) {
                                    return a.POS - b.POS;
                                });

                                source.cache = {
                                    chr: chr,
                                    start: queryStart,
                                    end: queryEnd,
                                    features: variants
                                };
                                success(variants);
                            }
                            else {
                                success(null);
                            }
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
