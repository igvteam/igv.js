/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

var igv = (function (igv) {

    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @param thefilename
     * @constructor
     */
    igv.AneuFeatureSource = function (config, thefilename) {

        this.config = config || {};

        if (igv.isFilePath(this.config.url)) {
            this.filename = getPath(this.config.url.name) + thefilename;
        } else {
            this.config.url = getPath(this.config.url) + thefilename;
            this.filename = thefilename;
            this.headURL = this.config.headURL || thefilename;
        }

        this.parser = getParser("aneu");

        function getPath(urlorfile) {
            var last,
                path;

            last = urlorfile.lastIndexOf("/");
            path = urlorfile.substring(0, last + 1);

            return path;
        }

        function getParser(format) {
            return new igv.FeatureParser(format);
        }

    };

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     */
    igv.AneuFeatureSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success) {

        var self = this,
            range = new igv.GenomicInterval(chr, bpStart, bpEnd),
            featureCache = this.featureCache;

        if (featureCache && (featureCache.range === undefined || featureCache.range.containsRange(range))) {//}   featureCache.range.contains(queryChr, bpStart, bpEnd))) {
            var features = this.featureCache.queryFeatures(chr, bpStart, bpEnd);
            // console.log("getFeatures: got "+features.length+" cached features on chr "+chr);
            success(features);

        }
        else {
            //  console.log("getFeatures: calling loadFeatures");
            this.loadFeatures(function (featureList) {
                    //  console.log("Creating featureCache with "+featureList.length+ " features");
                    self.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one
                    // Finally pass features for query interval to continuation

                    var features = self.featureCache.queryFeatures(chr, bpStart, bpEnd);
                    //  console.log("calling success "+success);
                    //  console.log("features from queryCache "+features);
                    success(features);

                },
                range);   // Currently loading at granularity of chromosome
        }

    };


    /**
     * Get the feature cache.  This method is exposed for use by cursor.  Loads all features (no index).
     * @param success
     */
    igv.AneuFeatureSource.prototype.getFeatureCache = function (success) {

        var self = this;

        if (this.featureCache) {
            success(this.featureCache);
        }
        else {
            this.loadFeatures(function (featureList) {
                //self.featureMap = featureMap;
                self.featureCache = new igv.FeatureCache(featureList);
                // Finally pass features for query interval to continuation
                success(self.featureCache);

            });
        }
    }

    /**
     *
     * @param continuation
     * @param range -- genomic range to load.
     */
    igv.AneuFeatureSource.prototype.loadFeatures = function (continuation, range) {

        var self = this,
            options,
            success,
            features;

        options = {
            headers: self.config.headers,           // http headers, not file header
            tokens: self.config.tokens,           // http headers, not file header
            withCredentials: self.config.withCredentials
        };

        success = function (data) {
            self.header = self.parser.parseHeader(data);
            features = self.parser.parseFeatures(data);
            continuation(features);   // <= PARSING DONE HERE
        };

        igvxhr.loadString(self.config.url, options).then(success);

    };

    return igv;
})
(igv || {});