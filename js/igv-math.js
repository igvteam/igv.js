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
var igv = (function (igv) {

    igv.Math = {

        mean: function (array) {

            var t = 0, n = 0,
                i;
            for (i = 0; i < array.length; i++) {
                if (!isNaN(array[i])) {
                    t += array[i];
                    n++;
                }
            }
            return n > 0 ? t / n : 0;
        },

        meanAndStdev: function (array) {

            var v, t = 0, t2 = 0, n = 0, i;

            for (i = 0; i < array.length; i++) {

                v = array[i];

                if (!isNaN(v)) {
                    t += v;
                    t2 += v*v;
                    n++;
                }
            }

            return n > 0 ? {mean: t / n, stdev: Math.sqrt(t2 - t*t / n)} : {mean: 0, stdev: 0};
        },

        // Fast percentile function
        percentile: function (array, p) {

            if (array.length === 0) return undefined;

            var k = Math.floor(array.length * ((100 - p) / 100));
            if (k === 0) {
                array.sort(function (a, b) {
                    return b - a
                });
                return array[k];
            }

            return selectElement(array, k);

        }
    };


    function selectElement(array, k) {

        // Credit Steve Hanov http://stevehanov.ca/blog/index.php?id=122
        var heap = new BinaryHeap(),
            i;

        for (i = 0; i < array.length; i++) {

            var item = array[i];

            // If we have not yet found k items, or the current item is larger than
            // the smallest item on the heap, add current item
            if (heap.content.length < k || item > heap.content[0]) {
                // If the heap is full, remove the smallest element on the heap.
                if (heap.content.length === k) {
                    var r = heap.pop();
                }
                heap.push(item)
            }
        }

        return heap.content[0];
    }

    return igv;

})(igv || {});
