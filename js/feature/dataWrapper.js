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

function getDataWrapper(data) {

    if (typeof (data) == 'string' || data instanceof String) {
        return new StringDataWrapper(data);
    } else {
        return new ByteArrayDataWrapper(data);
    }
}


// Data might be a string, or an UInt8Array
class StringDataWrapper {

    constructor(string) {
        this.data = string;
        this.ptr = 0;
    }

    nextLine() {
        var start = this.ptr,
            idx = this.data.indexOf('\n', start),
            data = this.data;

        if (idx > 0) {
            this.ptr = idx + 1;   // Advance pointer for next line
            if (idx > start && data.charAt(idx - 1) === '\r') {
                // Trim CR manually in CR/LF sequence
                return data.substring(start, idx - 1);
            }
            return data.substring(start, idx);
        } else {
            var length = data.length;
            this.ptr = length;
            // Return undefined only at the very end of the data
            return (start >= length) ? undefined : data.substring(start);
        }
    }
}

class ByteArrayDataWrapper {

    constructor(array) {
        this.data = array;
        this.length = this.data.length;
        this.ptr = 0;
    }

    nextLine() {

        var c, result;
        result = "";

        if (this.ptr >= this.length) return undefined;

        for (var i = this.ptr; i < this.length; i++) {
            c = String.fromCharCode(this.data[i]);
            if (c === '\r') continue;
            if (c === '\n') break;
            result = result + c;
        }

        this.ptr = i + 1;
        return result;
    }

}

export default getDataWrapper;
