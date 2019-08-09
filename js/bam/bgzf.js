var BLOCK_HEADER_LENGTH = 18;
var BLOCK_LENGTH_OFFSET = 16;  // Location in the gzip block of the total block size (actually total block size - 1)
var BLOCK_FOOTER_LENGTH = 8; // Number of bytes that follow the deflated data
var MAX_COMPRESSED_BLOCK_SIZE = 64 * 1024; // We require that a compressed block (including header and footer, be <= this)
var GZIP_OVERHEAD = BLOCK_HEADER_LENGTH + BLOCK_FOOTER_LENGTH + 2; // Gzip overhead is the header, the footer, and the block size (encoded as a short).
var GZIP_ID1 = 31;   // Magic number
var GZIP_ID2 = 139;  // Magic number
var GZIP_FLG = 4; // FEXTRA flag means there are optional fields


// Uncompress data,  assumed to be series of bgzipped blocks
function unbgzf(data, lim) {

    var oBlockList = [],
        ptr = 0,
        totalSize = 0;

    lim = lim || data.byteLength - 18;

    while (ptr < lim) {

        try {
            var ba = new Uint8Array(data, ptr, 18);

            var xlen = (ba[11] << 8) | (ba[10]);
            var si1 = ba[12];
            var si2 = ba[13];
            var slen = (ba[15] << 8) | (ba[14]);
            var bsize = (ba[17] << 8) | (ba[16]) + 1;

            var start = 12 + xlen + ptr;    // Start of CDATA
            var bytesLeft = data.byteLength - start;
            var cDataSize = bsize - xlen - 19;
            if (bytesLeft < cDataSize) break;

            const a = new Uint8Array(data, start, bytesLeft);
            var inflate = new Zlib.RawInflate(a);
            var unc = inflate.decompress();


            ptr += inflate.ip + 26

            totalSize += unc.byteLength;
            oBlockList.push(unc);

        } catch (e) {
            console.error(e)
            break;
        }
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

function bgzBlockSize(data) {

    const ba = new Uint8Array(data);
    const bsize = (ba[17] << 8) | (ba[16]) + 1;
    return bsize;


}

// From Thomas Down's zlib implementation

const testArray = new Uint8Array(1);
const hasSubarray = (typeof testArray.subarray === 'function');
const hasSlice = false; /* (typeof testArray.slice === 'function'); */ // Chrome slice performance is so dire that we're currently not using it...

function arrayCopy(src, srcOffset, dest, destOffset, count) {
    if (count == 0) {
        return;
    }
    if (!src) {
        throw "Undef src";
    } else if (!dest) {
        throw "Undef dest";
    }

    if (srcOffset == 0 && count == src.length) {
        arrayCopy_fast(src, dest, destOffset);
    } else if (hasSubarray) {
        arrayCopy_fast(src.subarray(srcOffset, srcOffset + count), dest, destOffset);
    } else if (src.BYTES_PER_ELEMENT == 1 && count > 100) {
        arrayCopy_fast(new Uint8Array(src.buffer, src.byteOffset + srcOffset, count), dest, destOffset);
    } else {
        arrayCopy_slow(src, srcOffset, dest, destOffset, count);
    }

}

function arrayCopy_slow(src, srcOffset, dest, destOffset, count) {

    // dlog('_slow call: srcOffset=' + srcOffset + '; destOffset=' + destOffset + '; count=' + count);

    for (var i = 0; i < count; ++i) {
        dest[destOffset + i] = src[srcOffset + i];
    }
}

function arrayCopy_fast(src, dest, destOffset) {
    dest.set(src, destOffset);
}

export {unbgzf, bgzBlockSize};

