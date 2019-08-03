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

    "use strict";

    /**
     * Object for caching lists of features.  Supports effecient queries for sub-range  (chr, start, end)
     *
     * @param featureList
     * @param The genomic range spanned by featureList (optional)
     * @constructor
     */

    igv.FeatureCache = function (featureList, genome, range) {

        this.treeMap = buildTreeMap(featureList, genome);
        this.range = range;
        this.allFeatures = featureList;

    }

    igv.FeatureCache.prototype.containsRange = function (genomicRange) {
        // No range means cache contains all features
        return (this.range === undefined || this.range.contains(genomicRange.chr, genomicRange.start, genomicRange.end));
    }

    igv.FeatureCache.prototype.queryFeatures = function (chr, start, end) {

        const tree = this.treeMap[chr];

        if (!tree) return [];

        const intervals = tree.findOverlapping(start, end);

        if (intervals.length == 0) {
            return [];
        }
        else {
            // Trim the list of features in the intervals to those
            // overlapping the requested range.
            // Assumption: features are sorted by start position

            const featureList = [];

            for (let interval of intervals) {
                const indexRange = interval.value;
                for (let i = indexRange.start; i <= indexRange.end; i++) {
                    let feature = this.allFeatures[i];
                    if (feature.start > end) break;
                    else if (feature.end >= start) {
                        featureList.push(feature);
                    }
                }
            }

            featureList.sort(function (a, b) {
                return a.start - b.start;
            });

            return featureList;
        }
    };

    /**
     * Returns all features, unsorted.
     *
     * @returns {Array}
     */
    igv.FeatureCache.prototype.getAllFeatures = function () {

        return this.allFeatures;

    }

    function buildTreeMap(featureList, genome) {

        const treeMap = {};
        const chromosomes = [];
        const featureCache = {};

        if (featureList) {

            featureList.forEach(function (feature) {

                let chr = feature.chr;

                // Translate to "official" name
                if (genome) {
                    chr = genome.getChromosomeName(chr);
                }

                let geneList = featureCache[chr];

                if (!geneList) {
                    chromosomes.push(chr);
                    geneList = [];
                    featureCache[chr] = geneList;
                }
                geneList.push(feature);
            });


            // Now build interval tree for each chromosome
            for (let i = 0; i < chromosomes.length; i++) {
                const chr = chromosomes[i];
                treeMap[chr] = buildIntervalTree(featureCache[chr]);
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

        var i, e, iStart, iEnd, tree, chunkSize, len, subArray;

        tree = new igv.IntervalTree();
        len = featureList.length;

        chunkSize = Math.max(10, Math.round(len / 10));

        featureList.sort(function (f1, f2) {
            return (f1.start === f2.start ? 0 : (f1.start > f2.start ? 1 : -1));
        });

        for (i = 0; i < len; i += chunkSize) {
            e = Math.min(len, i + chunkSize);
            subArray = new IndexRange(i, e); //featureList.slice(i, e);
            iStart = featureList[i].start;
            //
            iEnd = iStart;
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


    return igv;
})
(igv || {});
