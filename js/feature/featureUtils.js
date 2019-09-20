/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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

const FeatureUtils = {

    packFeatures: function (features, maxRows, sorted) {

        var start;
        var end;

        if (!features) return;

        maxRows = maxRows || 10000;

        if (!sorted) {
            features.sort(function (a, b) {
                return a.start - b.start;
            });
        }


        if (features.length === 0) {
            return [];

        } else {

            var bucketList = [],
                allocatedCount = 0,
                lastAllocatedCount = 0,
                nextStart,
                row,
                index,
                bucket,
                feature,
                gap = 2,
                bucketStart;

            start = features[0].start;
            end = features[features.length - 1].start;

            bucketStart = Math.max(start, features[0].start);
            nextStart = bucketStart;

            features.forEach(function (alignment) {

                var buckListIndex = Math.max(0, alignment.start - bucketStart);
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });


            row = 0;


            while (allocatedCount < features.length && row <= maxRows) {


                while (nextStart <= end) {

                    bucket = undefined;

                    while (!bucket && nextStart <= end) {

                        index = nextStart - bucketStart;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No buckets at this index
                        } else {
                            bucket = bucketList[index];
                        }

                    } // while (bucket)

                    if (!bucket) {
                        break;
                    }
                    feature = bucket.pop();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    feature.row = row;

                    nextStart = feature.end + gap;
                    ++allocatedCount;

                } // while (nextStart)

                row++;
                nextStart = bucketStart;

                if (allocatedCount === lastAllocatedCount) break;   // Protect from infinite loops

                lastAllocatedCount = allocatedCount;

            } // while (allocatedCount)

        }
    },


    /**
     * Find features overlapping the given interval.  It is assumed that all features share the same chromosome.
     *
     * TODO -- significant overlap with FeatureCache, refactor to combine
     *
     * @param featureList
     * @param start
     * @param end
     */
    findOverlapping: function (featureList, start, end) {

        if (!featureList || featureList.length === 0) {
            return [];
        } else {
            const tree = buildIntervalTree(featureList);
            const intervals = tree.findOverlapping(start, end);

            if (intervals.length === 0) {
                return [];
            } else {
                // Trim the list of features in the intervals to those
                // overlapping the requested range.
                // Assumption: features are sorted by start position

                featureList = [];

                intervals.forEach(function (interval) {
                    const intervalFeatures = interval.value;
                    const len = intervalFeatures.length;
                    for (let i = 0; i < len; i++) {
                        const feature = intervalFeatures[i];
                        if (feature.start > end) break;
                        else if (feature.end >= start) {
                            featureList.push(feature);
                        }
                    }
                });

                featureList.sort(function (a, b) {
                    return a.start - b.start;
                });

                return featureList;
            }
        }

    }
}


/**
 * Build an interval tree from the feature list for fast interval based queries.   We lump features in groups
 * of 10, or total size / 100,   to reduce size of the tree.
 *
 * @param featureList
 */
function buildIntervalTree(featureList) {

    const tree = new IntervalTree();
    const len = featureList.length;
    const chunkSize = Math.max(10, Math.round(len / 100));

    featureList.sort(function (f1, f2) {
        return (f1.start === f2.start ? 0 : (f1.start > f2.start ? 1 : -1));
    });

    for (let i = 0; i < len; i += chunkSize) {
        const e = Math.min(len, i + chunkSize);
        const subArray = featureList.slice(i, e);
        const iStart = subArray[0].start;
        let iEnd = iStart;
        subArray.forEach(function (feature) {
            iEnd = Math.max(iEnd, feature.end);
        });
        tree.insert(iStart, iEnd, subArray);
    }

    return tree;
}

export default FeatureUtils;
