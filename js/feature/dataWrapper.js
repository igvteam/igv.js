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

function getDataWrapper (data) {

        if (typeof(data) == 'string' || data instanceof String) {
            return new StringDataWrapper(data);
        } else {
            return new ByteArrayDataWrapper(data);
        }
    }


// Data might be a string, or an UInt8Array
    var StringDataWrapper = function (string) {
        this.data = string;
        this.ptr = 0;
    }

    StringDataWrapper.prototype.nextLine = function () {
      while(this.ptr < this.data.length) {
        //return this.split(/\r\n|\n|\r/gm);
        var start = this.ptr,
            idx = this.data.indexOf('\n', start),
            trimmedLine = undefined;
          if (idx > 0) {
            this.ptr = idx + 1;   // Advance pointer for next line
            trimmedLine = idx === start ? undefined : this.data.substring(start, idx).trim();
          }
          else {
            // Last line
            this.ptr = this.data.length;
            trimmedLine = (start >= this.data.length) ? undefined : this.data.substring(start).trim();
          }

          // Return the line, or keep going to next non-blank line if it was empty or entirely whitespace.
          if (trimmedLine) {
            return trimmedLine;
          }
        }
    }

    // For use in applications where whitespace carries meaning
    // Returns "" for an empty row (not undefined like nextLine), since this is needed in AED
    StringDataWrapper.prototype.nextLineNoTrim = function () {
        var start = this.ptr,
            idx = this.data.indexOf('\n', start),
            data = this.data;

        if (idx > 0) {
            this.ptr = idx + 1;   // Advance pointer for next line
            if(idx > start && data.charAt(idx-1) === '\r') {
                // Trim CR manually in CR/LF sequence
                return data.substring(start, idx - 1);
            }
            return data.substring(start, idx);
        }
        else {
            var length = data.length;
            this.ptr = length;
            // Return undefined only at the very end of the data
            return (start >= length) ? undefined : data.substring(start);
        }
    }

    var ByteArrayDataWrapper = function (array) {
        this.data = array;
        this.length = this.data.length;
        this.ptr = 0;
    }

    ByteArrayDataWrapper.prototype.nextLine = function () {

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

    // The ByteArrayDataWrapper does not do any trimming by default, can reuse the function
    ByteArrayDataWrapper.prototype.nextLineNoTrim = ByteArrayDataWrapper.prototype.nextLine;


export default getDataWrapper;
