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

    // TODO -- big endian

    igv.BinaryParser = function (dataView, littleEndian) {

        this.littleEndian = (littleEndian ? littleEndian : true);
        this.position = 0;
        this.view = dataView;
        this.length = dataView.byteLength;
    }

    igv.BinaryParser.prototype.remLength = function() {
        return this.length - this.position;
    }

    igv.BinaryParser.prototype.hasNext = function () {
        return this.position < this.length - 1;
    }

    igv.BinaryParser.prototype.getByte = function () {
        var retValue = this.view.getUint8(this.position, this.littleEndian);
        this.position++;
        return retValue;
    }

    igv.BinaryParser.prototype.getShort = function () {

        var retValue = this.view.getInt16(this.position, this.littleEndian);
        this.position += 2
        return retValue;
    }


    igv.BinaryParser.prototype.getInt = function () {

        var retValue = this.view.getInt32(this.position, this.littleEndian);
        this.position += 4;
        return retValue;
    }


    igv.BinaryParser.prototype.getUInt = function () {
        var retValue = this.view.getUint32(this.position, this.littleEndian);
        this.position += 4;
        return retValue;
    }

    igv.BinaryParser.prototype.getLong = function () {

//        return this.view.getInt32(this.position += 8);
        var byte1 = this.view.getUint8(this.position++) & 0xff;
        var byte2 = this.view.getUint8(this.position++) & 0xff;
        var byte3 = this.view.getUint8(this.position++) & 0xff;
        var byte4 = this.view.getUint8(this.position++) & 0xff;
        var byte5 = this.view.getUint8(this.position++) & 0xff;
        var byte6 = this.view.getUint8(this.position++) & 0xff;
        var byte7 = this.view.getUint8(this.position++) & 0xff;
        var byte8 = this.view.getUint8(this.position++) & 0xff;
        return (byte8 << 56)
            + ((byte7 << 56) >>> 8)
            + ((byte6 << 56) >>> 16)
            + ((byte5 << 56) >>> 24)
            + ((byte4 << 56) >>> 32)
            + ((byte3 << 56) >>> 40)
            + ((byte2 << 56) >>> 48)
            + ((byte1 << 56) >>> 56);
    }

    igv.BinaryParser.prototype.getString = function (len) {

        var s = "";
        var c;
        while ((c = this.view.getUint8(this.position++)) != 0) {
            s += String.fromCharCode(c);
            if (len && s.length == len) break;
        }
        return s;
    }

    igv.BinaryParser.prototype.getFixedLengthString = function (len) {

        var s = "";
        var i;
        var c;
        for (i=0; i<len; i++) {
            c = this.view.getUint8(this.position++);
            if(c > 0) {
                s += String.fromCharCode(c);
            }
        }
        return s;
    }


    igv.BinaryParser.prototype.getFloat = function () {

        var retValue = this.view.getFloat32(this.position, this.littleEndian);
        this.position += 4;
        return retValue;


    }

    igv.BinaryParser.prototype.getDouble = function () {

        var retValue = this.view.getFloat64(this.position, this.littleEndian);
        this.position += 8;
        return retValue;
    }

    igv.BinaryParser.prototype.skip = function (n) {

        this.position += n;
        return this.position;
    }


    /**
     * Return a bgzip (bam and tabix) virtual pointer
     * TODO -- why isn't 8th byte used ?
     * @returns {*}
     */
    igv.BinaryParser.prototype. getVPointer = function() {

        var position = this.position,
            offset = (this.view.getUint8(position + 1) << 8) | (this.view.getUint8(position)),
            byte6 = ((this.view.getUint8(position + 6) & 0xff) * 0x100000000),
            byte5 = ((this.view.getUint8(position + 5) & 0xff) * 0x1000000),
            byte4 = ((this.view.getUint8(position + 4) & 0xff) * 0x10000),
            byte3 = ((this.view.getUint8(position + 3) & 0xff) * 0x100),
            byte2 = ((this.view.getUint8(position + 2) & 0xff)),
            block = byte6 + byte5 + byte4 + byte3 + byte2;
        this.position += 8;

        if (block == 0 && offset == 0) {
            return null;
        } else {
            return new VPointer(block, offset);
        }
    }


    function VPointer(block, offset) {
        this.block = block;
        this.offset = offset;
    }

    VPointer.prototype.print = function() {
        return "" + this.block + ":" + this.offset;
    }


    return igv;

})(igv || {});