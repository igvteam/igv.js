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

/**
 * Created by jrobinso on 9/25/17.
 */

var igv = (function (igv) {


    igv.FeatureUtils = {

        packFeatures: function (features, maxRows, sorted) {

            var start;
            var end;

            if (!features) return;

            maxRows = maxRows || 10000;

            if(!sorted) {
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
                    packedRows = [],
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

                while (allocatedCount < features.length && packedRows.length < maxRows) {


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
        }

    }


    return igv;
})(igv || {});
