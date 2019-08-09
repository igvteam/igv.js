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
const IGVMath = {

    lerp: (v0, v1, t) => {
        return (1 - t) * v0 + t * v1;
    },

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
                t2 += v * v;
                n++;
            }
        }
        return n > 0 ? {mean: t / n, stdev: Math.sqrt(t2 - t * t / n)} : {mean: 0, stdev: 0};
    },

    median: function (numbers) {
        // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
        var median = 0, numsLen = numbers.length;
        numbers.sort();

        if (
            numsLen % 2 === 0 // is even
        ) {
            // average of two middle numbers
            median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
        } else { // is odd
            // middle number only
            median = numbers[(numsLen - 1) / 2];
        }

        return median;
    },

    // Fast percentile function for "p" near edges.  This needs profiled for p in middle (e.g. median)
    percentile: function (array, p) {

        if (array.length === 0) return undefined;

        var k = Math.floor(array.length * ((100 - p) / 100));
        if (k === 0) {
            array.sort(function (a, b) {
                return b - a
            });
            return array[k];
        } else {
            return selectElement(array, k);
        }

    },


    clamp: function (value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    log2: function (x) {
        return Math.log(x) / Math.LN2;
    }

};

igv.Rect = {

    make: function (x, y, width, height) {
        var r;

        r = this.makeRectZero();

        r.origin.x = x;
        r.origin.y = y;

        r.size.width = width;
        r.size.height = height;

        return r;
    },

    makeRectZero: function () {
        return {origin: {x: 0, y: 0}, size: {width: 0, height: 0}};
    },

    makeWithCenterAndSize: function (center, size) {
        var halfSize,
            r;

        halfSize = this.makeSize(size.width / 2.0, size.height / 2.0);

        r = this.make(center.x - halfSize.width, center.y - halfSize.height, size.width, size.height);

        return r;
    },

    makePoint: function (x, y) {
        return {x: x, y: y};
    },

    makeSize: function (width, height) {
        return {width: width, height: height};
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


function BinaryHeap() {
    this.content = [];
}

BinaryHeap.prototype = {
    push: function (element) {
        // Add the new element to the end of the array.
        this.content.push(element);
        // Allow it to bubble up.
        this.bubbleUp(this.content.length - 1);
    },

    pop: function () {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it sink down.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.sinkDown(0);
        }
        return result;
    },

    remove: function (node) {
        var length = this.content.length;
        // To remove a value, we must search through the array to find
        // it.
        for (var i = 0; i < length; i++) {
            if (this.content[i] != node) continue;
            // When it is found, the process seen in 'pop' is repeated
            // to fill up the hole.
            var end = this.content.pop();
            // If the element we popped was the one we needed to remove,
            // we're done.
            if (i == length - 1) break;
            // Otherwise, we replace the removed element with the popped
            // one, and allow it to float up or sink down as appropriate.
            this.content[i] = end;
            this.bubbleUp(i);
            this.sinkDown(i);
            break;
        }
    },

    size: function () {
        return this.content.length;
    },

    bubbleUp: function (n) {
        // Fetch the element that has to be moved.
        var element = this.content[n], score = element;
        // When at 0, an element can not go up any further.
        while (n > 0) {
            // Compute the parent element's index, and fetch it.
            var parentN = Math.floor((n + 1) / 2) - 1,
                parent = this.content[parentN];
            // If the parent has a lesser score, things are in order and we
            // are done.
            if (score >= parent)
                break;

            // Otherwise, swap the parent with the current element and
            // continue.
            this.content[parentN] = element;
            this.content[n] = parent;
            n = parentN;
        }
    },

    sinkDown: function (n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = element;

        while (true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) * 2, child1N = child2N - 1;
            // This is used to store the new position of the element,
            // if any.
            var swap = null;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N],
                    child1Score = child1;
                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore)
                    swap = child1N;
            }
            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = child2;
                if (child2Score < (swap == null ? elemScore : child1Score))
                    swap = child2N;
            }

            // No need to swap further, we are done.
            if (swap == null) break;

            // Otherwise, swap and continue.
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
        }
    }
};

export default IGVMath;
