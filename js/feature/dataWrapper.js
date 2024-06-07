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
        return new StringDataWrapper(data)
    } else {
        return new ByteArrayDataWrapper(data)
    }
}


// Data might be a string, or an UInt8Array
class StringDataWrapper {

    constructor(string) {
        this.data = string
        this.ptr = 0
    }

    nextLine() {
        var start = this.ptr,
            idx = this.data.indexOf('\n', start),
            data = this.data

        if (idx > 0) {
            this.ptr = idx + 1   // Advance pointer for next line
            if (idx > start && data.charAt(idx - 1) === '\r') {
                // Trim CR manually in CR/LF sequence
                return data.substring(start, idx - 1)
            }
            return data.substring(start, idx)
        } else {
            var length = data.length
            this.ptr = length
            // Return undefined only at the very end of the data
            return (start >= length) ? undefined : data.substring(start)
        }
    }
}

class ByteArrayDataWrapper {

    /**
     *
     * @param {Uint8Array} array
     */
    constructor(array) {
        this.data = array
        this.length = this.data.length
        this.ptr = 0
    }

    /**
     * Decode the next line as a UTF-8 string.  From: https://gist.github.com/Yaffle/5458286
     * @returns {undefined|string}
     */
    nextLine() {
        if(this.ptr >= this.data.length) {
            return undefined
        }
        let i = this.ptr
        const octets = this.data
        let string = ""
        let maybeCR = false
        while (i < octets.length) {
            var octet = octets[i]
            var bytesNeeded = 0
            var codePoint = 0
            if (octet <= 0x7F) {
                bytesNeeded = 0
                codePoint = octet & 0xFF
            } else if (octet <= 0xDF) {
                bytesNeeded = 1
                codePoint = octet & 0x1F
            } else if (octet <= 0xEF) {
                bytesNeeded = 2
                codePoint = octet & 0x0F
            } else if (octet <= 0xF4) {
                bytesNeeded = 3
                codePoint = octet & 0x07
            }
            if (octets.length - i - bytesNeeded > 0) {
                var k = 0
                while (k < bytesNeeded) {
                    octet = octets[i + k + 1]
                    codePoint = (codePoint << 6) | (octet & 0x3F)
                    k += 1
                }
            } else {
                codePoint = 0xFFFD
                bytesNeeded = octets.length - i
            }
            i += bytesNeeded + 1

            const c = String.fromCodePoint(codePoint)
            if(c === '\r') {
                maybeCR = true
            } else if( c === '\n') {
                break
            } else {
                if(maybeCR) {
                    // Add cr's unless immediately followed by a line feed.
                    string += '\r'
                    maybeCR = false
                }
                string += c
            }
        }
        this.ptr = i
        return string
    }


}

export default getDataWrapper
