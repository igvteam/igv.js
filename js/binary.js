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


    return igv;

})(igv || {});