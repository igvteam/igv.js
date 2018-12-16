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

    var queryableFormats = new Set(["bigwig", "bw", "bigbed", "bb", "tdf"]);

    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.FeatureSource = function (config, genome) {

        this.config = config || {};
        this.genome = genome;

        this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType);

        if (config.features && Array.isArray(config.features)) {

            let features = config.features;
            if (config.mappings) {
                mapProperties(features, config.mappings)
            }
            this.queryable = false;
            this.featureCache = new igv.FeatureCache(features, genome);
            this.static = true;

        }
        else if (config.sourceType === "ga4gh") {
            this.reader = new igv.Ga4ghVariantReader(config, genome);
            this.queryable = true;
        } else if (config.sourceType === "immvar") {
            this.reader = new igv.ImmVarReader(config);
            this.queryable = true;
        } else if (config.type === "eqtl" && config.sourceType === "gtex-ws") {
            this.reader = new igv.GtexReader(config);
            this.queryable = true;
        } else if (config.sourceType === "bigquery") {
            this.reader = new igv.BigQueryFeatureReader(config);
            this.queryable = true;
        } else if (config.sourceType === 'ucscservice') {
            this.reader = new igv.UCSCServiceReader(config.source);
            this.queryable = true;
        } else if (config.sourceType === 'custom' || config.source !== undefined) {    // Second test for backward compatibility
            this.reader = new igv.CustomServiceReader(config.source);
            this.queryable = config.source.queryable !== undefined ? config.source.queryable : true;
        }
        else if ("civic-ws" === config.sourceType) {
            this.reader = new igv.CivicReader(config);
            this.queryable = false;
        }
        else {
            this.reader = new igv.FeatureFileReader(config, genome);
            if (config.queryable != undefined) {
                this.queryable = config.queryable
            } else if (queryableFormats.has(config.format)) {
                this.queryable = true;
            }
            else {
                // Leav undefined -- will defer until we know if reader has an index
            }
        }

        this.visibilityWindow = config.visibilityWindow;

    };

    igv.FeatureSource.prototype.supportsWholeGenome = function () {
        return !this.queryable;
    }

    igv.FeatureSource.prototype.getFileHeader = function () {

        const self = this;
        const genome = this.genome;
        const maxRows = this.config.maxRows || 500;


        if (self.header) {
            return Promise.resolve(self.header);
        } else {
            if (self.reader && typeof self.reader.readHeader === "function") {

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
                                self.featureCache = new igv.FeatureCache(features, genome);

                                // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                                if (self.config.searchable) {
                                    addFeaturesToDB.call(self, features);
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
        let self = this;

        featureList.forEach(function (feature) {
            if (feature.name) {
                //TODO igv.browser => igv.Globals or igv.FeatureDB
                self.config.browser.featureDB[feature.name.toLowerCase()] = feature;
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

    igv.FeatureSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel, visibilityWindow) {

        const self = this;
        const reader = this.reader;
        const genome = this.genome;
        const supportWholeGenome = this.config.supportWholeGenome;
        const queryChr = genome ? genome.getChromosomeName(chr) : chr;
        const maxRows = self.config.maxRows || 500;

        return getFeatureCache()

            .then(function (featureCache) {

                const isQueryable = self.queryable;

                if ("all" === chr.toLowerCase()) {
                    if (isQueryable) {    // Strange test -- what it really means is are we querying for specific regions
                        return [];
                    }
                    else {
                        return self.getWGFeatures(featureCache.getAllFeatures());
                    }
                }
                else {
                    return self.featureCache.queryFeatures(queryChr, bpStart, bpEnd);
                }

            })


        function getFeatureCache() {

            var genomicInterval;

            let intervalStart = bpStart;
            let intervalEnd = bpEnd;

            genomicInterval = new igv.GenomicInterval(queryChr, intervalStart, intervalEnd);

            if (self.featureCache &&
                (self.static || self.featureCache.containsRange(genomicInterval) || "all" === chr.toLowerCase())) {

                return Promise.resolve(self.featureCache);
            }
            else {

                // If a visibility window is defined, potentially expand query interval.
                // This can save re-queries as we zoom out.  Visibility window <= 0 is a special case
                // indicating whole chromosome should be read at once.
                if (visibilityWindow <= 0) {
                    // Whole chromosome
                    intervalStart = 0;
                    intervalEnd = Number.MAX_VALUE;
                }
                else if (visibilityWindow > (bpEnd - bpStart)) {
                    const expansionWindow = Math.min(4.1 * (bpEnd - bpStart), visibilityWindow)
                    intervalStart = Math.max(0, (bpStart + bpEnd - expansionWindow) / 2);
                    intervalEnd = bpStart + expansionWindow;
                }
                genomicInterval = new igv.GenomicInterval(queryChr, intervalStart, intervalEnd);


                return reader.readFeatures(queryChr, genomicInterval.start, genomicInterval.end)

                    .then(function (featureList) {

                        if (self.queryable === undefined) self.queryable = reader.indexed;

                        if (featureList) {

                            if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                featureList = (new igv.GFFHelper(self.config.format)).combineFeatures(featureList);
                            }

                            // Assign overlapping features to rows
                            packFeatures(featureList, maxRows);

                            // Note - replacing previous cache with new one
                            self.featureCache = self.queryable ?
                                new igv.FeatureCache(featureList, genome, genomicInterval) :
                                new igv.FeatureCache(featureList, genome);


                            // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                            if (self.config.searchable) {
                                addFeaturesToDB.call(self, featureList);
                            }
                        }
                        else {
                            self.featureCache = new igv.FeatureCache();     // Empty cache
                        }

                        return self.featureCache;

                    })
            }
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
    igv.FeatureSource.prototype.getWGFeatures = function (features) {

        const genome = this.genome;

        const wgChromosomeNames = new Set(genome.wgChromosomeNames);

        const wgFeatures = [];

        for (let f of features) {

            let queryChr = genome.getChromosomeName(f.chr);

            if (wgChromosomeNames.has(queryChr)) {

                const wg = Object.create(Object.getPrototypeOf(f));
                Object.assign(wg, f);

                wg.chr = "all";
                wg.start = genome.getGenomeCoordinate(f.chr, f.start);
                wg.end = genome.getGenomeCoordinate(f.chr, f.end);

                // Don't draw exons in whole genome view
                if(wg["exons"]) delete wg["exons"]

                wgFeatures.push(wg);
            }
        }

        wgFeatures.sort(function (a, b) {
            return a.start - b.start;
        });

        return wgFeatures;

    }


    function mapProperties(features, mappings) {
        let mappingKeys = Object.keys(mappings);
        features.forEach(function (f) {
            mappingKeys.forEach(function (key) {
                f[key] = f[mappings[key]];
            });
        });
    }

    return igv;
})
(igv || {});
