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
     * @constructor
     */
    igv.BedFeatureSource = function (config) {

        this.config = config;
        if (config.localFile) {
            this.localFile = config.localFile;
            this.filename = config.localFile.name;
        }
        else {
            this.url = config.url;
            this.filename = config.url;
            this.indexUrl = config.indexUrl;
        }

        if (config.type) {
            this.type = config.type;
        }
        else {
            this.type = igv.inferFileType(this.filename);
        }

        // TODO -- move this code to a factory method
        if (this.type === "vcf") {
            this.parser = igv.vcfParser();
        } else if(this.type === "seg") {
            this.parser = igv.segParser();
        }

        else {
            this.parser = igv.bedParser(this.type);
        }

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
    igv.BedFeatureSource.prototype.getFeatures = function (queryChr, bpStart, bpEnd, success, task) {

        // TODO -- tmp hack until we implement chromosome aliasing
        //if (queryChr && queryChr.startsWith("chr")) queryChr = queryChr.substring(3);

        var myself = this,
            range = new igv.GenomicInterval(queryChr, bpStart, bpEnd),
            featureCache = this.featureCache;

        if (featureCache && (featureCache.range === undefined || featureCache.range.chr === queryChr)) {//}   featureCache.range.contains(queryChr, bpStart, bpEnd))) {
            success(this.featureCache.queryFeatures(queryChr, bpStart, bpEnd));
            return;
        }

        this.loadFeatures(function (featureList) {
                //myself.featureMap = featureMap;

                myself.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one

                // Record range queried if we have an index
                if (myself.index) myself.featureCache.range = range;

                // Finally pass features for query interval to continuation
                success(myself.featureCache.queryFeatures(queryChr, bpStart, bpEnd));

            },
            task, range);   // Currently loading at granularity of chromosome

    };

    igv.BedFeatureSource.prototype.allFeatures = function (success) {

        this.getFeatureCache(function (featureCache) {
            success(featureCache.allFeatures());
        });

    };

    /**
     * Get the feature cache.  This method is exposed for use by cursor.  Loads all features (index not used).
     * @param success
     */
    igv.BedFeatureSource.prototype.getFeatureCache = function (success) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache);
        }
        else {
            this.loadFeatures(function (featureList) {
                //myself.featureMap = featureMap;
                myself.featureCache = new igv.FeatureCache(featureList);
                // Finally pass features for query interval to continuation
                success(myself.featureCache);

            });
        }
    }

    /**
     *
     * @param success
     * @param task
     * @param reange -- genomic range to load.  For use with indexed source (optional)
     */
    igv.BedFeatureSource.prototype.loadFeatures = function (success, task, range) {

        var myself = this,
            idxFile = myself.indexUrl,
            queryChr = range ? range.chr : undefined;

        if (!idxFile) idxFile =  myself.url + ".idx" ;

        if (this.index === undefined && !myself.localFile && queryChr && this.type != "wig") {  // TODO -  handle local files

            igv.loadTribbleIndex(idxFile, myself.config, function (index) {
                myself.index = index;              // index might be null => no index, don't try again
                loadFeaturesWithIndex(index);
            });
            return;

        }
        else {
            loadFeaturesWithIndex(myself.index);
        }


        // TODO If there's an index add range bytes to the options


        function loadFeaturesWithIndex(index) {
            var parser = myself.parser,
                options = {
                    headers: myself.config.headers,
                    success: function (data) {
                        success(parser.parseFeatures(data));
                    },
                    task: task
                };

            if (index) {

                var chrIdx = index[queryChr];

                // TODO -- use chr aliaes
                if (!chrIdx && queryChr.startsWith("chr")) {
                    chrIdx = index[queryChr.substr(3)];
                }

                if (chrIdx) {
                    var blocks = chrIdx.blocks,
                        lastBlock = blocks[blocks.length - 1],
                        endPos = lastBlock.position + lastBlock.size,
                        range = {start: blocks[0].position, size: endPos - blocks[0].position + 1 };
                    options.range = range;
                    console.log("Using index");
                }
                else {
                    success(null);
                    return;
                }

            }

            if (myself.localFile) {
                igvxhr.loadStringFromFile(myself.localFile, options);
            }
            else {
                igvxhr.loadString(myself.url, options);
            }
        }
    }

    return igv;
})(igv || {});
