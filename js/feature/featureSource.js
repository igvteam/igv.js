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

import FeatureFileReader from "./featureFileReader.js";
import FeatureCache from "./featureCache.js";
import CustomServiceReader from "./customServiceReader.js";
import UCSCServiceReader from "./ucscServiceReader.js";
import GFFHelper from "./gffHelper.js";
import GtexReader from "../gtex/gtexReader.js";
import ImmVarReader from "../gtex/immvarReader.js";
import TrackBase from "../trackBase.js";
import Ga4ghVariantReader from "../google/ga4ghVariantReader.js";
import CivicReader from "../civic/civicReader.js";
import GenomicInterval from "../genome/genomicInterval.js";

const MAX_GZIP_BLOCK_SIZE = (1 << 16);

var queryableFormats = new Set(["bigwig", "bw", "bigbed", "bb", "tdf"]);

/**
 * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
const FeatureSource = function (config, genome) {

    this.config = config || {};
    this.genome = genome;

    this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType);

    // Default GFF filter -- these feature types will be filtered out
    if (undefined === config.filterTypes) {
        config.filterTypes = ['chromosome', 'gene']
    }

    if (config.features && Array.isArray(config.features)) {
        let features = config.features;
        packFeatures(features);
        if (config.mappings) {
            mapProperties(features, config.mappings)
        }
        this.featureCache = new FeatureCache(features, genome);
        this.static = true;
    } else if (config.sourceType === "ga4gh") {
        this.reader = new Ga4ghVariantReader(config, genome);
        this.queryable = true;
    } else if (config.sourceType === "immvar") {
        this.reader = new ImmVarReader(config);
        this.queryable = true;
    } else if (config.type === "eqtl" && config.sourceType === "gtex-ws") {
        this.reader = new GtexReader(config);
        this.queryable = true;
    } else if (config.sourceType === 'ucscservice') {
        this.reader = new UCSCServiceReader(config.source);
        this.queryable = true;
    } else if (config.sourceType === 'custom' || config.source !== undefined) {    // Second test for backward compatibility
        this.reader = new CustomServiceReader(config.source);
        this.queryable = config.source.queryable !== undefined ? config.source.queryable : true;
    } else if ("civic-ws" === config.sourceType) {
        this.reader = new CivicReader(config);
        this.queryable = false;
    } else {
        this.reader = new FeatureFileReader(config, genome);
        if (config.queryable !== undefined) {
            this.queryable = config.queryable
        } else if (queryableFormats.has(config.format)) {
            this.queryable = queryableFormats.has(config.format) || this.reader.indexed;
        } else {
            // Leav undefined -- will defer until we know if reader has an index
        }
    }

    this.supportsWG = !this.queryable;   // Can be dynamically changed

};

FeatureSource.prototype.supportsWholeGenome = function () {
    return this.supportsWG;
}

FeatureSource.prototype.getFileHeader = async function () {

    if (!this.header) {
        if (this.reader && typeof this.reader.readHeader === "function") {

            const header = await this.reader.readHeader()
            if (header) {
                this.header = header;
                // Non-indexed readers will return features as a side effect (entire file is read).
                const features = header.features;
                if (features) {
                    this.ingestFeatures(features);
                }
                if (header.format)
                    this.config.format = header.format;
            }
            this.header = header;
        } else {
            this.header = {};
        }
    }
    return this.header

};

function addFeaturesToDB(featureList) {
    let self = this;

    featureList.forEach(function (feature) {
        if (feature.name) {
            //TODO igv.browser => igv.Globals or igv.FeatureDB
            self.config.browser.featureDB[feature.name.toUpperCase()] = feature;
        }
    });

}

/**
 * Required function for all data source objects.  Fetches features for the
 * range requested.
 *
 * @param chr
 * @param bpStart
 * @param bpEnd
 * @param bpPerPixel
 */
FeatureSource.prototype.getFeatures = async function (chr, bpStart, bpEnd, bpPerPixel, visibilityWindow) {

    const reader = this.reader;
    const genome = this.genome;
    const queryChr = genome ? genome.getChromosomeName(chr) : chr;
    const featureCache = await getFeatureCache.call(this)
    const isQueryable = this.queryable;

    if ("all" === chr.toLowerCase()) {
        if (isQueryable) {   // queryable sources don't support whole genome view
            return [];
        } else {
            if (featureCache.count > 500000) {
                this.supportsWG = false;
                return [];
            } else {
                return this.getWGFeatures(featureCache.getAllFeatures());
            }
        }
    } else {
        return featureCache.queryFeatures(queryChr, bpStart, bpEnd);
    }


    async function getFeatureCache() {

        let intervalStart = bpStart;
        let intervalEnd = bpEnd;
        let genomicInterval = new GenomicInterval(queryChr, intervalStart, intervalEnd);

        if (this.featureCache &&
            (this.static || this.featureCache.containsRange(genomicInterval) || "all" === chr.toLowerCase())) {
            return this.featureCache;
        } else {

            // If a visibility window is defined, potentially expand query interval.
            // This can save re-queries as we zoom out.  Visibility window <= 0 is a special case
            // indicating whole chromosome should be read at once.
            if (undefined !== visibilityWindow) {
                if (visibilityWindow <= 0) {
                    // Whole chromosome
                    intervalStart = 0;
                    intervalEnd = Number.MAX_VALUE;
                } else if (visibilityWindow > (bpEnd - bpStart)) {
                    const expansionWindow = Math.min(4.1 * (bpEnd - bpStart), visibilityWindow)
                    intervalStart = Math.max(0, (bpStart + bpEnd - expansionWindow) / 2);
                    intervalEnd = bpStart + expansionWindow;
                }
            }
            genomicInterval = new GenomicInterval(queryChr, intervalStart, intervalEnd);

            let featureList = await reader.readFeatures(queryChr, genomicInterval.start, genomicInterval.end)

            if (this.queryable === undefined) {
                this.queryable = reader.indexed;
            }

            if (featureList) {
                this.ingestFeatures(featureList, genomicInterval);
            } else {
                this.featureCache = new FeatureCache();     // Empty cache
            }

            return this.featureCache;

        }
    }
};

FeatureSource.prototype.ingestFeatures = function (featureList, genomicInterval) {

    if ("gtf" === this.config.format || "gff3" === this.config.format || "gff" === this.config.format) {
        featureList = (new GFFHelper(this.config)).combineFeatures(featureList);
    }

    // Assign overlapping features to rows
    if (this.config.format !== "wig") {
        const maxRows = this.config.maxRows || 500
        packFeatures(featureList, maxRows);
    }

    // Note - replacing previous cache with new one
    this.featureCache = this.queryable ?
        new FeatureCache(featureList, this.genome, genomicInterval) :
        new FeatureCache(featureList, this.genome);


    // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
    if (this.config.searchable) {
        addFeaturesToDB.call(this, featureList);
    }
}

function packFeatures(features, maxRows) {


    maxRows = maxRows || 1000;
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

        const rows = [];
        featureList.sort(function (a, b) {
            return a.start - b.start;
        })
        rows.push(-1000);

        for(let feature of featureList) {
            let r = 0
            const len = Math.min(rows.length, maxRows)
            for (r = 0; r < len; r++) {
                if (feature.start > rows[r]) {
                    feature.row = r;
                    rows[r] = feature.end;
                    break;
                }
            }
            feature.row = r;
            rows[r] = feature.end;
        }
    }
}

// TODO -- filter by pixel size
FeatureSource.prototype.getWGFeatures = function (allFeatures) {

    const genome = this.genome;
    const wgChromosomeNames = new Set(genome.wgChromosomeNames);
    const wgFeatures = [];

    for (let c of genome.wgChromosomeNames) {

        const features = allFeatures[c];

        if (features) {
            for (let f of features) {
                let queryChr = genome.getChromosomeName(f.chr);
                if (wgChromosomeNames.has(queryChr)) {

                    const wg = Object.create(Object.getPrototypeOf(f));
                    Object.assign(wg, f);

                    wg.realChr = f.chr;
                    wg.realStart = f.start;
                    wg.realEnd = f.end;

                    wg.chr = "all";
                    wg.start = genome.getGenomeCoordinate(f.chr, f.start);
                    wg.end = genome.getGenomeCoordinate(f.chr, f.end);

                    // Don't draw exons in whole genome view
                    if (wg["exons"]) delete wg["exons"]

                    wg.popupData = function (genomeLocation) {
                        const clonedObject = Object.assign({}, this)
                        clonedObject.chr = this.realChr
                        clonedObject.start = this.realStart
                        clonedObject.end = this.realEnd
                        delete clonedObject.realChr
                        delete clonedObject.realStart
                        delete clonedObject.realEnd
                        return TrackBase.extractPopupData(clonedObject, genome.id)
                    }

                    wgFeatures.push(wg);
                }
            }
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

export default FeatureSource;
