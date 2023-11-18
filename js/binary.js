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



class BinaryParser {
    constructor(dataView, littleEndian = true) {

        this.littleEndian = littleEndian
        this.position = 0
        this.view = dataView
        this.length = dataView.byteLength
    }

    setPosition(position) {
        this.position = position
    }

    available() {
        return this.length - this.position
    }

    remLength() {
        return this.length - this.position
    }

    hasNext() {
        return this.position < this.length - 1
    }

    getByte() {
        const retValue = this.view.getUint8(this.position, this.littleEndian)
        this.position++
        return retValue
    }

    getShort() {
        const retValue = this.view.getInt16(this.position, this.littleEndian)
        this.position += 2
        return retValue
    }

    getUShort() {
        const retValue = this.view.getUint16(this.position, this.littleEndian)
        this.position += 2
        return retValue
    }


    getInt() {
        const retValue = this.view.getInt32(this.position, this.littleEndian)
        this.position += 4
        return retValue
    }


    getUInt() {
        const retValue = this.view.getUint32(this.position, this.littleEndian)
        this.position += 4
        return retValue
    }

    getLong() {

        // DataView doesn't support long. So we'll try manually
        var b = []
        b[0] = this.view.getUint8(this.position)
        b[1] = this.view.getUint8(this.position + 1)
        b[2] = this.view.getUint8(this.position + 2)
        b[3] = this.view.getUint8(this.position + 3)
        b[4] = this.view.getUint8(this.position + 4)
        b[5] = this.view.getUint8(this.position + 5)
        b[6] = this.view.getUint8(this.position + 6)
        b[7] = this.view.getUint8(this.position + 7)

        let value = 0
        if (this.littleEndian) {
            for (let i = b.length - 1; i >= 0; i--) {
                value = (value * 256) + b[i]
            }
        } else {
            for (let i = 0; i < b.length; i++) {
                value = (value * 256) + b[i]
            }
        }
        this.position += 8
        return value
    }

    getString(len) {

        let s = ""
        let c
        while ((c = this.view.getUint8(this.position++)) !== 0) {
            s += String.fromCharCode(c)
            if (len && s.length === len) break
        }
        return s
    }

    getFixedLengthString(len) {

        let s = ""
        for (let i = 0; i < len; i++) {
            const c = this.view.getUint8(this.position++)
            if (c > 0) {
                s += String.fromCharCode(c)
            }
        }
        return s
    }

    getFloat() {

        var retValue = this.view.getFloat32(this.position, this.littleEndian)
        this.position += 4
        return retValue


    }

    getDouble() {

        var retValue = this.view.getFloat64(this.position, this.littleEndian)
        this.position += 8
        return retValue
    }

    skip(n) {
        this.position += n
        return this.position
    }


    /**
     * Return a BGZip (bam and tabix) virtual pointer
     * TODO -- why isn't 8th byte used ?
     * TODO -- does endian matter here ?
     * @returns {*}
     */
    getVPointer() {

        var position = this.position,
            offset = (this.view.getUint8(position + 1) << 8) | (this.view.getUint8(position)),
            byte6 = ((this.view.getUint8(position + 6) & 0xff) * 0x100000000),
            byte5 = ((this.view.getUint8(position + 5) & 0xff) * 0x1000000),
            byte4 = ((this.view.getUint8(position + 4) & 0xff) * 0x10000),
            byte3 = ((this.view.getUint8(position + 3) & 0xff) * 0x100),
            byte2 = ((this.view.getUint8(position + 2) & 0xff)),
            block = byte6 + byte5 + byte4 + byte3 + byte2
        this.position += 8

        return new VPointer(block, offset)
    }
}

class VPointer {
    constructor(block, offset) {
        this.block = block
        this.offset = offset
    }

    isLessThan(vp) {
        return this.block < vp.block ||
            (this.block === vp.block && this.offset < vp.offset)
    }

    isGreaterThan(vp) {
        return this.block > vp.block ||
            (this.block === vp.block && this.offset > vp.offset)
    }

    isEqualTo(vp) {
        return this.block === vp.block && this.offset === vp.offset
    }

    print() {
        return "" + this.block + ":" + this.offset
    }
}

export default BinaryParser
