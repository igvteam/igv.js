/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
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

    const MAX_GZIP_BLOCK_SIZE = (1 << 16);

    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.FeatureSource = function (config) {

        this.config = config || {};

        this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType);

        if (config.sourceType === "ga4gh") {
            this.reader = new igv.Ga4ghVariantReader(config);
        } else if (config.sourceType === "immvar") {
            this.reader = new igv.ImmVarReader(config);
        } else if (config.type === "eqtl") {
            if (config.sourceType === "gtex-ws") {
                this.reader = new igv.GtexReader(config);
            }
            else {
                this.reader = new igv.GtexFileReader(config);
            }
        } else if (config.sourceType === "bigquery") {
            this.reader = new igv.BigQueryFeatureReader(config);
        } else if (config.sourceType === 'ucscservice') {
            this.reader = new igv.UCSCServiceReader(config.source);
        } else if (config.sourceType === 'custom' || config.source !== undefined) {    // Second test for backward compatibility
            this.reader = new igv.CustomServiceReader(config.source);
        }
        else {
            // Default for all sorts of ascii tab-delimited file formts
            this.reader = new igv.FeatureFileReader(config);
        }
        this.visibilityWindow = config.visibilityWindow;

    };

    igv.FeatureSource.prototype.getFileHeader = function () {

        var self = this,
            maxRows = this.config.maxRows || 500;


        if (self.header) {
            return Promise.resolve(self.header);
        } else {
            if (typeof self.reader.readHeader === "function") {

                return self.reader.readHeader()

                    .then(function (header) {

                        // Non-indexed readers will return features as a side effect.  This is an important,
                        // if unfortunate, performance hack
                        if (header) {

                            self.header = header;

                            var features = header.features;

                            if (features) {

                                if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                    features = (new igv.GFFHelper(self.config.format)).combineFeatures(features);
                                }

                                // Assign overlapping features to rows
                                packFeatures(features, maxRows);
                                self.featureCache = new igv.FeatureCache(features);

                                // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                                if (self.config.searchable) {
                                    addFeaturesToDB(features);
                                }
                            }
                        }

                        if (header && header.format) {
                            self.config.format = header.format;
                        }

                        return header;
                    })
            }
            else {
                self.header = {};
                return Promise.resolve(self.header);
            }
        }

    };

    function addFeaturesToDB(featureList) {

        featureList.forEach(function (feature) {
            if (feature.name) {
                igv.browser.featureDB[feature.name.toUpperCase()] = feature;
            }
        });

    }


    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @param bpPerPixel
     */

    igv.FeatureSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;


        var genomicInterval,
            featureCache,
            maxRows,
            str;

        genomicInterval = new igv.GenomicInterval(chr, bpStart, bpEnd);
        featureCache = self.featureCache;
        maxRows = self.config.maxRows || 500;
        str = chr.toLowerCase();

        if ("all" === str) {

            if (self.reader.supportsWholeGenome) {
                if (featureCache && featureCache.range === undefined) {
                    return Promise.resolve(getWGFeatures(featureCache.allFeatures()));
                }
                else {
                    return self.reader.readFeatures(chr)

                        .then(function (featureList) {

                            if (featureList && typeof featureList.forEach === 'function') {  // Have result AND its an array type
                                if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                    featureList = (new igv.GFFHelper(self.config.format)).combineFeatures(featureList);
                                }
                                self.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one

                                // Assign overlapping features to rows
                                packFeatures(featureList, maxRows);
                            }
                            return (getWGFeatures(self.featureCache.allFeatures()));
                        });
                }
            } else {
                return Promise.resolve(null);
            }
        }

        else if (featureCache && (featureCache.range === undefined || featureCache.range.containsRange(genomicInterval))) {
            return Promise.resolve(self.featureCache.queryFeatures(chr, bpStart, bpEnd));
        }
        else {
            // TODO -- reuse cached features that overelap new region

            if (self.sourceType === 'file' && (self.visibilityWindow === undefined || self.visibilityWindow <= 0)) {
                // Expand genomic interval to grab entire chromosome
                genomicInterval.start = 0;
                var chromosome = igv.browser ? igv.browser.genome.getChromosome(chr) : undefined;
                genomicInterval.end = (chromosome === undefined ? Number.MAX_VALUE : chromosome.bpLength);
            }

            return self.reader.readFeatures(chr, genomicInterval.start, genomicInterval.end)
                .then(
                    function (featureList) {

                        if (featureList && typeof featureList.forEach === 'function') {  // Have result AND its an array type

                            var isQueryable = self.reader.indexed || self.config.sourceType !== "file";

                            if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                featureList = (new igv.GFFHelper(self.config.format)).combineFeatures(featureList);
                            }

                            self.featureCache = isQueryable ?
                                new igv.FeatureCache(featureList, genomicInterval) :
                                new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one


                            // Assign overlapping features to rows
                            packFeatures(featureList, maxRows);

                            // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                            if (self.config.searchable) {
                                addFeaturesToDB(featureList);
                            }

                            // Finally pass features for query interval to continuation
                            return self.featureCache.queryFeatures(chr, bpStart, bpEnd);
                        }
                        else {
                            return null;
                        }

                    })
        }

    };


    function packFeatures(features, maxRows) {

        if (features == null || features.length === 0) {
            return;
        }

        // Segregate by chromosome

        var chrFeatureMap = {},
            chrs = [];
        features.forEach(function (feature) {

            var chr = feature.chr,
                flist = chrFeatureMap[chr];

            if (!flist) {
                flist = [];
                chrFeatureMap[chr] = flist;
                chrs.push(chr);
            }

            flist.push(feature);
        });

        // Loop through chrosomosomes and pack features;

        chrs.forEach(function (chr) {

            pack(chrFeatureMap[chr], maxRows);
        });


        // Assigns a row # to each feature.  If the feature does not fit in any row and #rows == maxRows no
        // row number is assigned.
        function pack(featureList, maxRows) {

            var rows = [];

            featureList.sort(function (a, b) {
                return a.start - b.start;
            })


            rows.push(-1000);
            featureList.forEach(function (feature) {

                var i,
                    r,
                    len = Math.min(rows.length, maxRows),
                    start = feature.start;

                for (r = 0; r < len; r++) {
                    if (start >= rows[r]) {
                        feature.row = r;
                        rows[r] = feature.end;
                        return;
                    }
                }
                feature.row = r;
                rows[r] = feature.end;


            });
        }
    }


    // TODO -- filter by pixel size
    function getWGFeatures(features) {

        var wgFeatures,
            wgChromosomeNames,
            genome;

        genome = igv.browser.genome;

        wgChromosomeNames = new Set(genome.wgChromosomeNames);

        wgFeatures = [];

        features.forEach(function (f) {

            var wg,
                queryChr;

            queryChr = genome.getChromosomeName(f.chr);
            if (wgChromosomeNames.has(queryChr)) {

                wg = Object.assign({}, f);
                wg.start = igv.browser.genome.getGenomeCoordinate(f.chr, f.start);
                wg.end = igv.browser.genome.getGenomeCoordinate(f.chr, f.end);

                wgFeatures.push(wg);
            }
        });


        return wgFeatures;
    }

    return igv;
})
(igv || {});
