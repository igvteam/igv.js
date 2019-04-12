var igv = (function (igv) {

    var BLOCK_HEADER_LENGTH = 18;
    var BLOCK_LENGTH_OFFSET = 16;  // Location in the gzip block of the total block size (actually total block size - 1)
    var BLOCK_FOOTER_LENGTH = 8; // Number of bytes that follow the deflated data
    var MAX_COMPRESSED_BLOCK_SIZE = 64 * 1024; // We require that a compressed block (including header and footer, be <= this)
    var GZIP_OVERHEAD = BLOCK_HEADER_LENGTH + BLOCK_FOOTER_LENGTH + 2; // Gzip overhead is the header, the footer, and the block size (encoded as a short).
    var GZIP_ID1 = 31;   // Magic number
    var GZIP_ID2 = 139;  // Magic number
    var GZIP_FLG = 4; // FEXTRA flag means there are optional fields


    // Uncompress data,  assumed to be series of bgzipped blocks
    igv.unbgzf = function (data, lim) {

        var oBlockList = [],
            ptr = 0,
            totalSize = 0;

        lim = lim || data.byteLength - 18;

        while (ptr < lim) {

            var ba = new Uint8Array(data, ptr[0], 18);

            var xlen = (ba[11] << 8) | (ba[10]);
            var si1 = ba[12];
            var si2 = ba[13];
            var slen = (ba[15] << 8) | (ba[14]);
            var bsize = (ba[17] << 8) | (ba[16]) + 1;

            var start = 12 + xlen + ptr;    // Start of CDATA
            var length = data.byteLength - start;

            if (length < (bsize + 8)) break;

            const a = new Uint8Array(data, start, length)
            var inflate = new Zlib.RawInflate(a);
            var unc = inflate.decompress();
            ptr += inflate.ip + 26

            totalSize += unc.byteLength;
            oBlockList.push(unc);
        }

        // Concatenate decompressed blocks
        if (oBlockList.length == 1) {
            return oBlockList[0];
        } else {
            var out = new Uint8Array(totalSize);
            var cursor = 0;
            for (var i = 0; i < oBlockList.length; ++i) {
                var b = new Uint8Array(oBlockList[i]);
                arrayCopy(b, 0, out, cursor, b.length);
                cursor += b.length;
            }
            return out.buffer;
        }
    }

    // Uncompress data,  assumed to be series of bgzipped blocks
    // igv.unbgzf = function (data, lim) {
    //
    //     var oBlockList = [],
    //         ptr = [0],
    //         totalSize = 0;
    //
    //     lim = lim || data.byteLength - 18;
    //
    //     while (ptr[0] < lim) {
    //
    //         var ba = new Uint8Array(data, ptr[0], 18);
    //
    //         var xlen = (ba[11] << 8) | (ba[10]);
    //         var si1 = ba[12];
    //         var si2 = ba[13];
    //         var slen = (ba[15] << 8) | (ba[14]);
    //         var bsize = (ba[17] << 8) | (ba[16]) + 1;
    //
    //         var start = 12 + xlen + ptr[0];    // Start of CDATA
    //         var length = data.byteLength - start;
    //
    //         if (length < (bsize + 8)) break;
    //
    //         var unc = jszlib_inflate_buffer(data, start, length, ptr);
    //         ptr[0] += 8;    // Skipping CRC-32 and size of uncompressed data
    //
    //         totalSize += unc.byteLength;
    //         oBlockList.push(unc);
    //     }
    //
    //     // Concatenate decompressed blocks
    //     if (oBlockList.length == 1) {
    //         return oBlockList[0];
    //     } else {
    //         var out = new Uint8Array(totalSize);
    //         var cursor = 0;
    //         for (var i = 0; i < oBlockList.length; ++i) {
    //             var b = new Uint8Array(oBlockList[i]);
    //             arrayCopy(b, 0, out, cursor, b.length);
    //             cursor += b.length;
    //         }
    //         return out.buffer;
    //     }
    // }

    return igv;

})(igv || {});
