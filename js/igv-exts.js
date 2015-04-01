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

// Extensions to javascript core classes to support porting of igv

CanvasRenderingContext2D.prototype.strokeLine = function (x1, y1, x2, y2, lineWidth) {

    this.save();
    this.beginPath();
    if (lineWidth) {
        this.lineWidth = lineWidth;
    }
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.stroke();
    this.restore();
}

CanvasRenderingContext2D.prototype.drawArrowhead = function (x, y, size, lineWidth) {

    this.save();
    if (!size) {
        size = 5;
    }
    if (lineWidth) {
        this.lineWidth = lineWidth;
    }
    this.beginPath();
    this.moveTo(x, y - size / 2);
    this.lineTo(x, y + size / 2);
    this.lineTo(x + size, y);
    this.lineTo(x, y - size / 2);
    this.closePath();
    this.fill();
    this.restore();
}


CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, fill, stroke) {

    this.save();
    if (typeof stroke == "undefined") {
        stroke = true;
    }
    if (typeof radius === "undefined") {
        radius = 5;
    }
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    if (stroke) {
        this.stroke();
    }
    if (fill) {
        this.fill();
    }
    this.restore();
}

CanvasRenderingContext2D.prototype.polygon = function (x, y, fill, stroke) {

    this.save();
    if (typeof stroke == "undefined") {
        stroke = true;
    }

    this.beginPath();
    var len = x.length;
    this.moveTo(x[0], y[0]);
    for (var i = 1; i < len; i++) {
        this.lineTo(x[i], y[i]);
        // this.moveTo(x[i], y[i]);
    }

    this.closePath();
    if (stroke) {
        this.stroke();
    }
    if (fill) {
        this.fill();
    }
    this.restore();
}

CanvasRenderingContext2D.prototype.eqTriangle = function (side, cx, cy) {

    this.save();
    var h = side * (Math.sqrt(3) / 2);

    this.beginPath();
    this.moveTo(cx, cy - h / 2);
    this.lineTo(cx - side / 2, cy + h / 2);
    this.lineTo(cx + side / 2, cy + h / 2);
    this.lineTo(cx, cy - h / 2);
    this.closePath();

    this.stroke();
    this.fill();
    this.restore();
}


if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (aString) {
        if (this.length < aString.length) {
            return false;
        }
        else {
            return (this.substr(0, aString.length) == aString);
        }
    }
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (aString) {
        if (this.length < aString.length) {
            return false;
        }
        else {
            return (this.substr(this.length - aString.length, aString.length) == aString);
        }
    }
}

if (!String.prototype.contains) {
    String.prototype.contains = function (it) {
        return this.indexOf(it) != -1;
    };
}

if (!String.prototype.splitLines) {
    String.prototype.splitLines = function () {
        return this.split(/\r\n|\n|\r/gm);
    }
}

if (!Array.prototype.shuffle) {
    // Randomly shuffle contents of an array
    Array.prototype.shuffle = function () {
        for (var j, x, i = this.length; i; j = parseInt(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
        return this;
    };
}

if (!Array.prototype.swap) {
    Array.prototype.swap = function (a, b) {
        var tmp = this[a];
        this[a] = this[b];
        this[b] = tmp;
    }
}


if (!Array.prototype.heapSort) {

    Array.prototype.heapSort = function (compare) {

        var array = this,
            size = this.length,
            temp;
        buildMaxHeap(array);
        for (var i = size - 1; i > 0; i -= 1) {
            temp = array[0];
            array[0] = array[i];
            array[i] = temp;
            size -= 1;
            heapify(array, 0, size);
        }
        return array;

        function heapify(array, index, heapSize) {

            var left = 2 * index + 1,
                right = 2 * index + 2,
                largest = index;

            if (left < heapSize && compare(array[left], array[index]) > 0)
                largest = left;

            if (right < heapSize && compare(array[right], array[largest]) > 0)
                largest = right;

            if (largest !== index) {
                var temp = array[index];
                array[index] = array[largest];
                array[largest] = temp;
                heapify(array, largest, heapSize);
            }
        }

        function buildMaxHeap(array) {
            for (var i = Math.floor(array.length / 2); i >= 0; i -= 1) {
                heapify(array, i, array.length);
            }
            return array;
        }
    }
}

if (!Uint8Array.prototype.toText) {

    Uint8Array.prototype.toText = function () {

        // note, dont use forEach or apply -- will run out of stack
        var i, len, str;
        str = "";
        for (i = 0, len = this.byteLength; i < len; i++) {
            str += String.fromCharCode(this[i]);
        }
        return str;

    }

}

var log2 = Math.log(2);

if (!Math.log2) {
    Math.log2 = function (x) {
        return Math.log(x) / log2;
    }
}

// Implementation of bind().  This is included primarily for use with phantom.js, which does not implement it.
// Attributed to John Resig

if (!Function.prototype.bind) {
    Function.prototype.bind = function () {
        var fn = this,
            args = Array.prototype.slice.call(arguments),
            object = args.shift();
        return function () {
            return fn.apply(object,
                args.concat(Array.prototype.slice.call(arguments)));
        }
    }
}





