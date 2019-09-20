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

import IntervalTree from "../intervalTree.js";

/**
 * Object for caching lists of features.  Supports effecient queries for sub-range  (chr, start, end)
 *
 * @param featureList
 * @param The genomic range spanned by featureList (optional)
 * @constructor
 */

const FeatureCache = function (featureList, genome, range) {

    this.treeMap = this.buildTreeMap(featureList, genome);
    this.range = range;
    this.count = featureList.length;
}

FeatureCache.prototype.containsRange = function (genomicRange) {
    // No range means cache contains all features
    return (this.range === undefined || this.range.contains(genomicRange.chr, genomicRange.start, genomicRange.end));
}

FeatureCache.prototype.queryFeatures = function (chr, start, end) {

    const tree = this.treeMap[chr];

    if (!tree) return [];

    const intervals = tree.findOverlapping(start, end);

    if (intervals.length === 0) {
        return [];
    } else {
        // Trim the list of features in the intervals to those
        // overlapping the requested range.
        // Assumption: features are sorted by start position

        const featureList = [];
        const all = this.allFeatures[chr];
        if (all) {
            for (let interval of intervals) {
                const indexRange = interval.value;
                for (let i = indexRange.start; i < indexRange.end; i++) {
                    let feature = all[i];
                    if (feature.start > end) break;
                    else if (feature.end >= start) {
                        featureList.push(feature);
                    }
                }
            }
            featureList.sort(function (a, b) {
                return a.start - b.start;
            });
        }
        return featureList;
    }
};

/**
 * Returns all features, unsorted.
 *
 * @returns {Array}
 */
FeatureCache.prototype.getAllFeatures = function () {

    return this.allFeatures;

}

FeatureCache.prototype.buildTreeMap = function (featureList, genome) {

    const treeMap = {};
    const chromosomes = [];
    this.allFeatures = {};

    if (featureList) {
        for (let feature of featureList) {

            let chr = feature.chr;
            // Translate to "official" name
            if (genome) {
                chr = genome.getChromosomeName(chr);
            }

            let geneList = this.allFeatures[chr];
            if (!geneList) {
                chromosomes.push(chr);
                geneList = [];
                this.allFeatures[chr] = geneList;
            }
            geneList.push(feature);
        }


        // Now build interval tree for each chromosome
        for (let chr of chromosomes) {
            const chrFeatures = this.allFeatures[chr];
            chrFeatures.sort(function (f1, f2) {
                return (f1.start === f2.start ? 0 : (f1.start > f2.start ? 1 : -1));
            });
            treeMap[chr] = buildIntervalTree(chrFeatures);
        }
    }

    return treeMap;
};

/**
 * Build an interval tree from the feature list for fast interval based queries.   We lump features in groups
 * of 10, or total size / 100,   to reduce size of the tree.
 *
 * @param featureList
 */
function buildIntervalTree(featureList) {

    const tree = new IntervalTree();
    const len = featureList.length;
    const chunkSize = Math.max(10, Math.round(len / 10));

    for (let i = 0; i < len; i += chunkSize) {
        const e = Math.min(len, i + chunkSize);
        const subArray = new IndexRange(i, e); //featureList.slice(i, e);
        const iStart = featureList[i].start;
        //
        let iEnd = iStart;
        for (let j = i; j < e; j++) {
            iEnd = Math.max(iEnd, featureList[j].end);
        }
        tree.insert(iStart, iEnd, subArray);
    }

    return tree;
}


class IndexRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

export default FeatureCache;