const isNode =
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;

const crossFetch = isNode ? require("node-fetch") : fetch;

class RemoteFile {

    constructor(args) {
        this.config = args;
        this.url = mapUrl(args.path || args.url);
    }


    async read(position, length) {

        //console.log(`${position} - ${position + length} (${length})`)

        const headers = this.config.headers || {};

        if (position !== undefined && length) {
            const rangeString = "bytes=" + position + "-" + (position + length - 1);
            headers['Range'] = rangeString;
        }

        let url = this.url.slice();    // slice => copy
        if (this.config.oauthToken) {
            const token = resolveToken(this.config.oauthToken);
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (this.config.apiKey) {
            url = addParameter(url, "key", this.config.apiKey);
        }

        const response = await crossFetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
            mode: 'cors',
        });

        const status = response.status;

        if (status >= 400) {
            const err = Error(response.statusText);
            err.code = status;
            throw err
        } else {
            return response.arrayBuffer()
        }

        /**
         * token can be a string, a function that returns a string, or a function that returns a Promise for a string
         * @param token
         * @returns {Promise<*>}
         */
        async function resolveToken(token) {
            if (typeof token === 'function') {
                return await Promise.resolve(token())    // Normalize the result to a promise, since we don't know what the function returns
            } else {
                return token
            }
        }

    }
}


function mapUrl(url) {

    if (url.includes("//www.dropbox.com")) {
        return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com")
    } else if (url.startsWith("ftp://ftp.ncbi.nlm.nih.gov")) {
        return url.replace("ftp://", "https://")
    } else {
        return url
    }
}


function addParameter(url, name, value) {
    const paramSeparator = url.includes("?") ? "&" : "?";
    return url + paramSeparator + name + "=" + value
}

class BufferedFile3 {

    constructor(args) {
        this.file = args.file;
        this.size = args.size || 2000;
        this.buffers = [];
        this.maxBuffersLength = args.maxBuffersLength || 10000;
    }

    async read(position, length) {


        let overlappingBuffers = this.buffers.filter( b => b.overlaps(position, position + length));

        // See if any buffers completely contain request, if so we're done
        for(let buffer of overlappingBuffers) {
            if(buffer.contains(position, position + length)) {
                const start = position;
                const bufferStart = buffer.start;
                const sliceStart = start - bufferStart;
                const sliceEnd = sliceStart + length;
                return buffer.slice(sliceStart, sliceEnd)
            }
        }


        if(overlappingBuffers.length === 0) {

            // No overlap with any existing buffer
            let size = Math.max(length, this.size);

            // Find index of first buffer to the right, if any, to potentially limit size
            this.buffers = this.buffers.sort((a, b) => a.start - b.start);
            const idx = binarySearch(this.buffers, (b) => b.start > position, 0);
            if(idx < this.buffers.length) {
                size = Math.min(size, this.buffers[idx].start - position);
            }

            const bufferStart = position;
            const bufferData = await this.file.read(bufferStart, size);
            const bufferLength = bufferData.byteLength;
            const buffer = new Buffer$1(bufferStart, bufferLength, bufferData);
            this.addBuffer(buffer);

            const sliceStart = position - bufferStart;
            const sliceEnd = sliceStart + length;
            return buffer.slice(sliceStart, sliceEnd)
        }


        // Some overlap.   Fill gaps
        overlappingBuffers = overlappingBuffers.sort((a, b) => a.start - b.start);
        const allBuffers = [];
        let currentEnd = position;
        for(let ob of overlappingBuffers) {
            if(currentEnd < ob.start) {
                const bufferStart = currentEnd;
                const bufferSize = ob.start - currentEnd;
                const bufferData = await this.file.read(bufferStart, bufferSize);
                const bufferLength = bufferData.byteLength;
                const buffer = new Buffer$1(bufferStart, bufferLength, bufferData);
                allBuffers.push(buffer);
            }
            allBuffers.push(ob);
            currentEnd = ob.end;
        }

        // Check end
        const requestedEnd = position + length;
        if(requestedEnd > currentEnd) {
            const bufferStart = currentEnd;
            const bufferSize = requestedEnd - bufferStart;
            const bufferData = await this.file.read(bufferStart, bufferSize);
            const bufferLength = bufferData.byteLength;
            const buffer = new Buffer$1(bufferStart, bufferLength, bufferData);
            allBuffers.push(buffer);
        }

        const newStart = allBuffers[0].start;
        allBuffers[allBuffers.length - 1].end;
        const newArrayBuffer = concatArrayBuffers(allBuffers.map(b => b.buffer));
        const newBuffer = new Buffer$1(newStart, newArrayBuffer.byteLength, newArrayBuffer);
        const sliceStart = position - newStart;
        const sliceEnd = sliceStart + length;

        // Replace the overlapping buffers with the new one
        const tmp = new Set(overlappingBuffers);
        const newBuffers = [];
        for(let b of this.buffers) {
            if(!tmp.has(b)) {
                newBuffers.push(b);
            }
        }
        newBuffers.push(newBuffer);
        this.buffers = newBuffers;

        return newBuffer.slice(sliceStart, sliceEnd)


    }

    addBuffer(buffer) {
        if (this.buffers.length > this.maxBuffersLength) {
            this.buffers = this.buffers.slice(1);
        }
        this.buffers.push(buffer);
    }



}

let Buffer$1 = class Buffer {

    constructor(bufferStart, bufferLength, buffer) {
        this.start = bufferStart;
        this.length = bufferLength;
        this.end = bufferStart + bufferLength;
        this.buffer = buffer;
    }

    slice(start, end) {
        if(start < 0 || end - start > this.buffer.byteLength) {
            throw Error("buffer bounds error")
        }
        return this.buffer.slice(start, end)
    }

    contains(start, end) {
        return start >= this.start && end <= this.end
    }

    overlaps(start, end) {
        return (start > this.start && start < this.end) || (end > this.start && end < this.end)
    }

    toString() {
        return `${this.start} - ${this.end}`

    }

};

/**
 * concatenates 2 array buffers.
 * Credit: https://gist.github.com/72lions/4528834
 *
 * @private
 * @param {ArrayBuffers} buffer1 The first buffer.
 * @param {ArrayBuffers} buffer2 The second buffer.
 * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
 */
function concatArrayBuffers(buffers) {
    const size = buffers.reduce((a,b) => a + b.byteLength, 0);
    const tmp = new Uint8Array(size);
    let offset = 0;
    for(let b of buffers) {
        tmp.set(new Uint8Array(b), offset);
        offset += b.byteLength;
    }
    return tmp.buffer
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 *
 * returns an index 0 ≤ i ≤ array.length such that the given predicate is false for array[i - 1] and true for array[i]* *
 */
function binarySearch(array, pred, min) {
    let lo = min - 1, hi = array.length;
    while (1 + lo < hi) {
        const mi = lo + ((hi - lo) >> 1);
        if (pred(array[mi])) {
            hi = mi;
        } else {
            lo = mi;
        }
    }
    return hi
}

let fs;
if (isNode) {
    fs = require('fs');
} else {
    fs = {
        openSync: () => {throw Error("NodeLocalFile only supported in node.js environments")},
        readSync: () => {throw Error("NodeLocalFile only supported in node.js environments")},
        statSync: () => {throw Error("NodeLocalFile only supported in node.js environments")},
    };
}

class NodeLocalFile {

    constructor(args) {
        this.path = args.path;
    }


    async read(position, length) {

        //console.log(`${position} - ${position + length} (${length})`)

        if(length === 0) {
            return new ArrayBuffer(0)
        }

        const fd = fs.openSync(this.path, 'r');
        position = position || 0;
        length = length || fs.statSync(this.path).size;
        const buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, position);

        fs.close(fd, function (error) {
            // TODO Do something with error
        });

        //TODO -- compare result.bytesRead with length
        const arrayBuffer = buffer.buffer;
        return arrayBuffer
    }
}

class BrowserLocalFile {

    constructor(blob) {
        this.file = blob;
    }

    async read(position, length) {

        if(length === 0) {
            return new ArrayBuffer()
        }

        const blob = (position != undefined && length) ?
            this.file.slice(position, position + length) :
            this.file;

        return blob.arrayBuffer()
    }
}

// esm/core.js
async function _unpack_struct_from_async(structure, async_buf, offset = 0) {
  var output = /* @__PURE__ */ new Map();
  for (let [key, fmt] of structure.entries()) {
    let value = await struct.unpack_from_async("<" + fmt, async_buf, offset);
    offset += struct.calcsize(fmt);
    if (value.length == 1) {
      value = value[0];
    }
    output.set(key, value);
  }
  return output;
}
function _unpack_struct_from(structure, buf, offset = 0) {
  var output = /* @__PURE__ */ new Map();
  for (let [key, fmt] of structure.entries()) {
    let value = struct.unpack_from("<" + fmt, buf, offset);
    offset += struct.calcsize(fmt);
    if (value.length == 1) {
      value = value[0];
    }
    output.set(key, value);
  }
  return output;
}
function assert(thing) {
  if (!thing) {
    thing();
  }
}
function _structure_size(structure) {
  var fmt = "<" + Array.from(structure.values()).join("");
  return struct.calcsize(fmt);
}
function _padded_size(size, padding_multiple = 8) {
  return Math.ceil(size / padding_multiple) * padding_multiple;
}
var dtype_to_format = {
  "u": "Uint",
  "i": "Int",
  "f": "Float"
};
function dtype_getter(dtype_str) {
  var big_endian = struct._is_big_endian(dtype_str);
  var getter, nbytes;
  if (/S/.test(dtype_str)) {
    getter = "getString";
    nbytes = ((dtype_str.match(/S(\d*)/) || [])[1] || 1) | 0;
  } else {
    let [_, fstr, bytestr] = dtype_str.match(/[<>=!@]?(i|u|f)(\d*)/);
    nbytes = parseInt(bytestr || 4, 10);
    let nbits = nbytes * 8;
    getter = "get" + dtype_to_format[fstr] + nbits.toFixed();
  }
  return [getter, big_endian, nbytes];
}
var Struct = class {
  constructor() {
    this.big_endian = isBigEndian();
    this.getters = {
      "s": "getUint8",
      "b": "getInt8",
      "B": "getUint8",
      "h": "getInt16",
      "H": "getUint16",
      "i": "getInt32",
      "I": "getUint32",
      "l": "getInt32",
      "L": "getUint32",
      "q": "getInt64",
      "Q": "getUint64",
      "f": "getFloat32",
      "d": "getFloat64"
    };
    this.byte_lengths = {
      "s": 1,
      "b": 1,
      "B": 1,
      "h": 2,
      "H": 2,
      "i": 4,
      "I": 4,
      "l": 4,
      "L": 4,
      "q": 8,
      "Q": 8,
      "f": 4,
      "d": 8
    };
    let all_formats = Object.keys(this.byte_lengths).join("");
    this.fmt_size_regex = "(\\d*)([" + all_formats + "])";
  }
  calcsize(fmt) {
    var size = 0;
    var match;
    var regex = new RegExp(this.fmt_size_regex, "g");
    while ((match = regex.exec(fmt)) !== null) {
      let n = parseInt(match[1] || 1, 10);
      let f = match[2];
      let subsize = this.byte_lengths[f];
      size += n * subsize;
    }
    return size;
  }
  _is_big_endian(fmt) {
    var big_endian;
    if (/^</.test(fmt)) {
      big_endian = false;
    } else if (/^(!|>)/.test(fmt)) {
      big_endian = true;
    } else {
      big_endian = this.big_endian;
    }
    return big_endian;
  }
  async unpack_from_async(fmt, async_buf, offset) {
    var offset = Number(offset || 0);
    const total_size = this.calcsize(fmt);
    const local_buffer = await async_buf.slice(offset, offset + total_size);
    let local_offset = 0;
    var view = new DataView64(local_buffer);
    var output = [];
    var big_endian = this._is_big_endian(fmt);
    var match;
    var regex = new RegExp(this.fmt_size_regex, "g");
    while ((match = regex.exec(fmt)) !== null) {
      let n = parseInt(match[1] || 1, 10);
      let f = match[2];
      let getter = this.getters[f];
      let size = this.byte_lengths[f];
      if (f == "s") {
        output.push(new TextDecoder().decode(local_buffer.slice(local_offset, local_offset + n)));
        local_offset += n;
      } else {
        for (var i = 0; i < n; i++) {
          output.push(view[getter](local_offset, !big_endian));
          local_offset += size;
        }
      }
    }
    return output;
  }
  unpack_from(fmt, buffer, offset) {
    var offset = Number(offset || 0);
    const total_size = this.calcsize(fmt);
    const local_buffer = buffer.slice(offset, offset + total_size);
    let local_offset = 0;
    var view = new DataView64(local_buffer);
    var output = [];
    var big_endian = this._is_big_endian(fmt);
    var match;
    var regex = new RegExp(this.fmt_size_regex, "g");
    while ((match = regex.exec(fmt)) !== null) {
      let n = parseInt(match[1] || 1, 10);
      let f = match[2];
      let getter = this.getters[f];
      let size = this.byte_lengths[f];
      if (f == "s") {
        output.push(new TextDecoder().decode(local_buffer.slice(local_offset, local_offset + n)));
        local_offset += n;
      } else {
        for (var i = 0; i < n; i++) {
          output.push(view[getter](local_offset, !big_endian));
          local_offset += size;
        }
      }
    }
    return output;
  }
};
var struct = new Struct();
function isBigEndian() {
  const array = new Uint8Array(4);
  const view = new Uint32Array(array.buffer);
  return !((view[0] = 1) & array[0]);
}
var DataView64 = class extends DataView {
  getUint64(byteOffset, littleEndian) {
    const left = BigInt(this.getUint32(byteOffset, littleEndian));
    const right = BigInt(this.getUint32(byteOffset + 4, littleEndian));
    let combined = littleEndian ? left + (right << 32n) : (left << 32n) + right;
    return Number(combined);
  }
  getInt64(byteOffset, littleEndian) {
    var low, high;
    if (littleEndian) {
      low = this.getUint32(byteOffset, true);
      high = this.getInt32(byteOffset + 4, true);
    } else {
      high = this.getInt32(byteOffset, false);
      low = this.getUint32(byteOffset + 4, false);
    }
    let combined = BigInt(low) + (BigInt(high) << 32n);
    return Number(combined);
  }
  getString(byteOffset, littleEndian, length) {
    const str_buffer = this.buffer.slice(byteOffset, byteOffset + length);
    const decoder = new TextDecoder();
    return decoder.decode(str_buffer);
  }
  getVLENStruct(byteOffset, littleEndian, length) {
    let item_size = this.getUint32(byteOffset, littleEndian);
    let collection_address = this.getUint64(byteOffset + 4, littleEndian);
    let object_index = this.getUint32(byteOffset + 12, littleEndian);
    return [item_size, collection_address, object_index];
  }
};
function bitSize(integer) {
  return integer.toString(2).length;
}
function _unpack_integer(nbytes, buf, offset = 0, littleEndian = true) {
  const local_buffer = buf.slice(offset, offset + nbytes);
  let bytes = new Uint8Array(local_buffer);
  if (!littleEndian) {
    bytes.reverse();
  }
  let integer = bytes.reduce((accumulator, currentValue, index) => accumulator + (currentValue << index * 8), 0);
  return integer;
}

// esm/datatype-msg.js
var DatatypeMessage = class {
  constructor(buf, offset) {
    this.buf = buf;
    this.offset = offset;
    this.dtype = this.determine_dtype();
  }
  async determine_dtype() {
    let datatype_msg = await _unpack_struct_from_async(DATATYPE_MSG, this.buf, this.offset);
    this.offset += DATATYPE_MSG_SIZE;
    let datatype_class = datatype_msg.get("class_and_version") & 15;
    if (datatype_class == DATATYPE_FIXED_POINT) {
      return this._determine_dtype_fixed_point(datatype_msg);
    } else if (datatype_class == DATATYPE_FLOATING_POINT) {
      return this._determine_dtype_floating_point(datatype_msg);
    } else if (datatype_class == DATATYPE_TIME) {
      throw "Time datatype class not supported.";
    } else if (datatype_class == DATATYPE_STRING) {
      return this._determine_dtype_string(datatype_msg);
    } else if (datatype_class == DATATYPE_BITFIELD) {
      throw "Bitfield datatype class not supported.";
    } else if (datatype_class == DATATYPE_OPAQUE) {
      return {
        datatype_class: DATATYPE_OPAQUE,
        size: datatype_msg.get("size")
      };
    } else if (datatype_class == DATATYPE_COMPOUND) {
      return this._determine_dtype_compound(datatype_msg);
    } else if (datatype_class == DATATYPE_REFERENCE) {
      return ["REFERENCE", datatype_msg.get("size")];
    } else if (datatype_class == DATATYPE_ENUMERATED) {
      return this.determine_dtype();
    } else if (datatype_class == DATATYPE_ARRAY) {
      throw "Array datatype class not supported.";
    } else if (datatype_class == DATATYPE_VARIABLE_LENGTH) {
      let vlen_type = this._determine_dtype_vlen(datatype_msg);
      if (vlen_type[0] == "VLEN_SEQUENCE") {
        let base_type = this.determine_dtype();
        vlen_type = ["VLEN_SEQUENCE", base_type];
      }
      return vlen_type;
    } else {
      throw "Invalid datatype class " + datatype_class;
    }
  }
  _determine_dtype_fixed_point(datatype_msg) {
    let length_in_bytes = datatype_msg.get("size");
    if (![1, 2, 4, 8].includes(length_in_bytes)) {
      throw "Unsupported datatype size";
    }
    let signed = datatype_msg.get("class_bit_field_0") & 8;
    var dtype_char;
    if (signed > 0) {
      dtype_char = "i";
    } else {
      dtype_char = "u";
    }
    let byte_order = datatype_msg.get("class_bit_field_0") & 1;
    var byte_order_char;
    if (byte_order == 0) {
      byte_order_char = "<";
    } else {
      byte_order_char = ">";
    }
    this.offset += 4;
    return byte_order_char + dtype_char + length_in_bytes.toFixed();
  }
  _determine_dtype_floating_point(datatype_msg) {
    let length_in_bytes = datatype_msg.get("size");
    if (![1, 2, 4, 8].includes(length_in_bytes)) {
      throw "Unsupported datatype size";
    }
    let dtype_char = "f";
    let byte_order = datatype_msg.get("class_bit_field_0") & 1;
    var byte_order_char;
    if (byte_order == 0) {
      byte_order_char = "<";
    } else {
      byte_order_char = ">";
    }
    this.offset += 12;
    return byte_order_char + dtype_char + length_in_bytes.toFixed();
  }
  _determine_dtype_string(datatype_msg) {
    return "S" + datatype_msg.get("size").toFixed();
  }
  _determine_dtype_vlen(datatype_msg) {
    let vlen_type = datatype_msg.get("class_bit_field_0") & 1;
    if (vlen_type != 1) {
      return ["VLEN_SEQUENCE", 0, 0];
    }
    let padding_type = datatype_msg.get("class_bit_field_0") >> 4;
    let character_set = datatype_msg.get("class_bit_field_1") & 1;
    return ["VLEN_STRING", padding_type, character_set];
  }
  _determine_dtype_compound(datatype_msg) {
    throw "Compound type not yet implemented!";
  }
};
var DATATYPE_MSG = /* @__PURE__ */ new Map([
  ["class_and_version", "B"],
  ["class_bit_field_0", "B"],
  ["class_bit_field_1", "B"],
  ["class_bit_field_2", "B"],
  ["size", "I"]
]);
var DATATYPE_MSG_SIZE = _structure_size(DATATYPE_MSG);
var COMPOUND_PROP_DESC_V1 = /* @__PURE__ */ new Map([
  ["offset", "I"],
  ["dimensionality", "B"],
  ["reserved_0", "B"],
  ["reserved_1", "B"],
  ["reserved_2", "B"],
  ["permutation", "I"],
  ["reserved_3", "I"],
  ["dim_size_1", "I"],
  ["dim_size_2", "I"],
  ["dim_size_3", "I"],
  ["dim_size_4", "I"]
]);
_structure_size(COMPOUND_PROP_DESC_V1);
var DATATYPE_FIXED_POINT = 0;
var DATATYPE_FLOATING_POINT = 1;
var DATATYPE_TIME = 2;
var DATATYPE_STRING = 3;
var DATATYPE_BITFIELD = 4;
var DATATYPE_OPAQUE = 5;
var DATATYPE_COMPOUND = 6;
var DATATYPE_REFERENCE = 7;
var DATATYPE_ENUMERATED = 8;
var DATATYPE_VARIABLE_LENGTH = 9;
var DATATYPE_ARRAY = 10;
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
}
var MIN_MATCH$1 = 3;
var MAX_MATCH$1 = 258;
var LENGTH_CODES$1 = 29;
var LITERALS$1 = 256;
var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
var D_CODES$1 = 30;
var DIST_CODE_LEN = 512;
var static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
var static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
var _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
var _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
var base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
var base_dist = new Array(D_CODES$1);
zero$1(base_dist);
var adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32;
var makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
var crcTable = new Uint32Array(makeTable());
var crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  }
  return crc ^ -1;
};
var crc32_1 = crc32;
var messages = {
  2: "need dictionary",
  1: "stream end",
  0: "",
  "-1": "file error",
  "-2": "stream error",
  "-3": "data error",
  "-4": "insufficient memory",
  "-5": "buffer error",
  "-6": "incompatible version"
};
var constants$2 = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8
};
var _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be non-object");
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
  assign,
  flattenChunks
};
var STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
var _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = (str) => {
  if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }
  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    if (c < 128) {
      buf[i++] = c;
    } else if (c < 2048) {
      buf[i++] = 192 | c >>> 6;
      buf[i++] = 128 | c & 63;
    } else if (c < 65536) {
      buf[i++] = 224 | c >>> 12;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    } else {
      buf[i++] = 240 | c >>> 18;
      buf[i++] = 128 | c >>> 12 & 63;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    }
  }
  return buf;
};
var buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  const len = max || buf.length;
  if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len; ) {
    let c = buf[i++];
    if (c < 128) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 65533;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 63;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 65533;
      continue;
    }
    if (c < 65536) {
      utf16buf[out++] = c;
    } else {
      c -= 65536;
      utf16buf[out++] = 55296 | c >> 10 & 1023;
      utf16buf[out++] = 56320 | c & 1023;
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) {
    max = buf.length;
  }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 192) === 128) {
    pos--;
  }
  if (pos < 0) {
    return max;
  }
  if (pos === 0) {
    return max;
  }
  return pos + _utf8len[buf[pos]] > max ? pos : max;
};
var strings = {
  string2buf,
  buf2string,
  utf8border
};
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream;
var BAD$1 = 30;
var TYPE$1 = 12;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
    do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }
      here = lcode[hold & lmask];
      dolen:
        for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op === 0) {
            output[_out++] = here & 65535;
          } else if (op & 16) {
            len = here & 65535;
            op &= 15;
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & (1 << op) - 1;
              hold >>>= op;
              bits -= op;
            }
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];
            dodist:
              for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) {
                        output[_out++] = from_source[from++];
                      }
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) {
                        output[_out++] = output[from++];
                      }
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
          } else if ((op & 64) === 0) {
            here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dolen;
          } else if (op & 32) {
            state.mode = TYPE$1;
            break top;
          } else {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
    } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};
var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;
var lbase = new Uint16Array([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
var lext = new Uint8Array([
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]);
var dbase = new Uint16Array([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
var dext = new Uint8Array([
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let base_index = 0;
  let end;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let extra_index = 0;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES$1) {
    base = extra = work;
    end = 19;
  } else if (type === LENS$1) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;
  } else {
    base = dbase;
    extra = dext;
    end = -1;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;
var CODES = 0;
var LENS = 1;
var DISTS = 2;
var {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
var HEAD = 1;
var FLAGS = 2;
var TIME = 3;
var OS = 4;
var EXLEN = 5;
var EXTRA = 6;
var NAME = 7;
var COMMENT = 8;
var HCRC = 9;
var DICTID = 10;
var DICT = 11;
var TYPE = 12;
var TYPEDO = 13;
var STORED = 14;
var COPY_ = 15;
var COPY = 16;
var TABLE = 17;
var LENLENS = 18;
var CODELENS = 19;
var LEN_ = 20;
var LEN = 21;
var LENEXT = 22;
var DIST = 23;
var DISTEXT = 24;
var MATCH = 25;
var LIT = 26;
var CHECK = 27;
var LENGTH = 28;
var DONE = 29;
var BAD = 30;
var MEM = 31;
var SYNC = 32;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
var MAX_WBITS = 15;
var DEF_WBITS = MAX_WBITS;
var zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
function InflateState() {
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
var inflateResetKeep = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
var inflateReset = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
var inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
var inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  }
  const state = new InflateState();
  strm.state = state;
  state.window = null;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
var inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
var virgin = true;
var lenfix;
var distfix;
var fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
var updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
var inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
    for (; ; ) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.wrap & 2 && hold === 35615) {
            state.check = 0;
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
            hold = 0;
            bits = 0;
            state.mode = FLAGS;
            break;
          }
          state.flags = 0;
          if (state.head) {
            state.head.done = false;
          }
          if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
            strm.msg = "incorrect header check";
            state.mode = BAD;
            break;
          }
          if ((hold & 15) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          hold >>>= 4;
          bits -= 4;
          len = (hold & 15) + 8;
          if (state.wbits === 0) {
            state.wbits = len;
          } else if (len > state.wbits) {
            strm.msg = "invalid window size";
            state.mode = BAD;
            break;
          }
          state.dmax = 1 << state.wbits;
          strm.adler = state.check = 1;
          state.mode = hold & 512 ? DICTID : TYPE;
          hold = 0;
          bits = 0;
          break;
        case FLAGS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.flags = hold;
          if ((state.flags & 255) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          if (state.flags & 57344) {
            strm.msg = "unknown header flags set";
            state.mode = BAD;
            break;
          }
          if (state.head) {
            state.head.text = hold >> 8 & 1;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = TIME;
        case TIME:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.time = hold;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            hbuf[2] = hold >>> 16 & 255;
            hbuf[3] = hold >>> 24 & 255;
            state.check = crc32_1(state.check, hbuf, 4, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = OS;
        case OS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.xflags = hold & 255;
            state.head.os = hold >> 8;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = EXLEN;
        case EXLEN:
          if (state.flags & 1024) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length = hold;
            if (state.head) {
              state.head.extra_len = hold;
            }
            if (state.flags & 512) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
          } else if (state.head) {
            state.head.extra = null;
          }
          state.mode = EXTRA;
        case EXTRA:
          if (state.flags & 1024) {
            copy = state.length;
            if (copy > have) {
              copy = have;
            }
            if (copy) {
              if (state.head) {
                len = state.head.extra_len - state.length;
                if (!state.head.extra) {
                  state.head.extra = new Uint8Array(state.head.extra_len);
                }
                state.head.extra.set(input.subarray(next, next + copy), len);
              }
              if (state.flags & 512) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              state.length -= copy;
            }
            if (state.length) {
              break inf_leave;
            }
          }
          state.length = 0;
          state.mode = NAME;
        case NAME:
          if (state.flags & 2048) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.name += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.name = null;
          }
          state.length = 0;
          state.mode = COMMENT;
        case COMMENT:
          if (state.flags & 4096) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.comment += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.comment = null;
          }
          state.mode = HCRC;
        case HCRC:
          if (state.flags & 512) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (hold !== (state.check & 65535)) {
              strm.msg = "header crc mismatch";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          if (state.head) {
            state.head.hcrc = state.flags >> 9 & 1;
            state.head.done = true;
          }
          strm.adler = state.check = 0;
          state.mode = TYPE;
          break;
        case DICTID:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          strm.adler = state.check = zswap32(hold);
          hold = 0;
          bits = 0;
          state.mode = DICT;
        case DICT:
          if (state.havedict === 0) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            return Z_NEED_DICT$1;
          }
          strm.adler = state.check = 1;
          state.mode = TYPE;
        case TYPE:
          if (flush === Z_BLOCK || flush === Z_TREES) {
            break inf_leave;
          }
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;
            state.mode = CHECK;
            break;
          }
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.last = hold & 1;
          hold >>>= 1;
          bits -= 1;
          switch (hold & 3) {
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);
              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;
                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD;
          }
          hold >>>= 2;
          bits -= 2;
          break;
        case STORED:
          hold >>>= bits & 7;
          bits -= bits & 7;
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
            strm.msg = "invalid stored block lengths";
            state.mode = BAD;
            break;
          }
          state.length = hold & 65535;
          hold = 0;
          bits = 0;
          state.mode = COPY_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case COPY_:
          state.mode = COPY;
        case COPY:
          copy = state.length;
          if (copy) {
            if (copy > have) {
              copy = have;
            }
            if (copy > left) {
              copy = left;
            }
            if (copy === 0) {
              break inf_leave;
            }
            output.set(input.subarray(next, next + copy), put);
            have -= copy;
            next += copy;
            left -= copy;
            put += copy;
            state.length -= copy;
            break;
          }
          state.mode = TYPE;
          break;
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.nlen = (hold & 31) + 257;
          hold >>>= 5;
          bits -= 5;
          state.ndist = (hold & 31) + 1;
          hold >>>= 5;
          bits -= 5;
          state.ncode = (hold & 15) + 4;
          hold >>>= 4;
          bits -= 4;
          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = LENLENS;
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.lens[order[state.have++]] = hold & 7;
            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }
          state.lencode = state.lendyn;
          state.lenbits = 7;
          opts = { bits: state.lenbits };
          ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = CODELENS;
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;
              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                len = state.lens[state.have - 1];
                copy = 3 + (hold & 3);
                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 3 + (hold & 7);
                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 11 + (hold & 127);
                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD;
                break;
              }
              while (copy--) {
                state.lens[state.have++] = len;
              }
            }
          }
          if (state.mode === BAD) {
            break;
          }
          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD;
            break;
          }
          state.lenbits = 9;
          opts = { bits: state.lenbits };
          ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD;
            break;
          }
          state.distbits = 6;
          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
          state.distbits = opts.bits;
          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD;
            break;
          }
          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case LEN_:
          state.mode = LEN;
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            inffast(strm, _out);
            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;
            if (state.mode === TYPE) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (; ; ) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          state.was = state.length;
          state.mode = DIST;
        case DIST:
          for (; ; ) {
            here = state.distcode[hold & (1 << state.distbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.offset += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
          state.mode = MATCH;
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy = _out - left;
          if (state.offset > copy) {
            copy = state.offset - copy;
            if (copy > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
            }
            if (copy > state.wnext) {
              copy -= state.wnext;
              from = state.wsize - copy;
            } else {
              from = state.wnext - copy;
            }
            if (copy > state.length) {
              copy = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy = state.length;
          }
          if (copy > left) {
            copy = left;
          }
          left -= copy;
          state.length -= copy;
          do {
            output[put++] = from_source[from++];
          } while (--copy);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold |= input[next++] << bits;
              bits += 8;
            }
            _out -= left;
            strm.total_out += _out;
            state.total += _out;
            if (_out) {
              strm.adler = state.check = state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
            }
            _out = left;
            if ((state.flags ? hold : zswap32(hold)) !== state.check) {
              strm.msg = "incorrect data check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = LENGTH;
        case LENGTH:
          if (state.wrap && state.flags) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (hold !== (state.total & 4294967295)) {
              strm.msg = "incorrect length check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = DONE;
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR$1;
        case SYNC:
        default:
          return Z_STREAM_ERROR$1;
      }
    }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out))
      ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
var inflateEnd = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
var inflateGetHeader = (strm, head) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
var inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = "pako inflate (from Nodeca project)";
var inflate_1$2 = {
  inflateReset: inflateReset_1,
  inflateReset2: inflateReset2_1,
  inflateResetKeep: inflateResetKeep_1,
  inflateInit: inflateInit_1,
  inflateInit2: inflateInit2_1,
  inflate: inflate_2$1,
  inflateEnd: inflateEnd_1,
  inflateGetHeader: inflateGetHeader_1,
  inflateSetDictionary: inflateSetDictionary_1,
  inflateInfo
};
function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader;
var toString = Object.prototype.toString;
var {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$2;
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1$2.inflateInit2(this.strm, opt.windowBits);
  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === "string") {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended)
    return false;
  if (flush_mode === ~~flush_mode)
    _flush_mode = flush_mode;
  else
    _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1$2.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === "string") {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail)
            strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0)
      continue;
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0)
      break;
  }
  return true;
};
Inflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") {
      this.result = this.chunks.join("");
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err)
    throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var constants = constants$2;
var inflate_1$1 = {
  Inflate: Inflate_1$1,
  inflate: inflate_2,
  inflateRaw: inflateRaw_1$1,
  ungzip: ungzip$1,
  constants
};
var { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
var inflate_1 = inflate;
var ungzip_1 = ungzip;

// esm/filters.js
var zlib_decompress = function(buf, itemsize) {
  let input_array = new Uint8Array(buf);
  return inflate_1(input_array).buffer;
};
var unshuffle = function(buf, itemsize) {
  let buffer_size = buf.byteLength;
  let unshuffled_view = new Uint8Array(buffer_size);
  let step = Math.floor(buffer_size / itemsize);
  let shuffled_view = new DataView(buf);
  for (var j = 0; j < itemsize; j++) {
    for (var i = 0; i < step; i++) {
      unshuffled_view[j + i * itemsize] = shuffled_view.getUint8(j * step + i);
    }
  }
  return unshuffled_view.buffer;
};
var fletch32 = function(buf, itemsize) {
  _verify_fletcher32(buf);
  return buf.slice(0, -4);
};
function _verify_fletcher32(chunk_buffer) {
  var odd_chunk_buffer = chunk_buffer.byteLength % 2 != 0;
  var data_length = chunk_buffer.byteLength - 4;
  var view = new DataView(chunk_buffer);
  var sum1 = 0;
  var sum2 = 0;
  for (var offset = 0; offset < data_length - 1; offset += 2) {
    let datum = view.getUint16(offset, true);
    sum1 = (sum1 + datum) % 65535;
    sum2 = (sum2 + sum1) % 65535;
  }
  if (odd_chunk_buffer) {
    let datum = view.getUint8(data_length - 1);
    sum1 = (sum1 + datum) % 65535;
    sum2 = (sum2 + sum1) % 65535;
  }
  var [ref_sum1, ref_sum2] = struct.unpack_from(">HH", chunk_buffer, data_length);
  ref_sum1 = ref_sum1 % 65535;
  ref_sum2 = ref_sum2 % 65535;
  if (sum1 != ref_sum1 || sum2 != ref_sum2) {
    throw 'ValueError("fletcher32 checksum invalid")';
  }
  return true;
}
var GZIP_DEFLATE_FILTER = 1;
var SHUFFLE_FILTER = 2;
var FLETCH32_FILTER = 3;
var Filters = /* @__PURE__ */ new Map([
  [GZIP_DEFLATE_FILTER, zlib_decompress],
  [SHUFFLE_FILTER, unshuffle],
  [FLETCH32_FILTER, fletch32]
]);

// esm/btree.js
var AbstractBTree = class {
  constructor(fh, offset) {
    this.fh = fh;
    this.offset = offset;
    this.depth = null;
  }
  async init() {
    this.all_nodes = /* @__PURE__ */ new Map();
    await this._read_root_node();
    await this._read_children();
  }
  async _read_children() {
    let node_level = this.depth;
    while (node_level > 0) {
      for (var parent_node of this.all_nodes.get(node_level)) {
        for (var child_addr of parent_node.get("addresses")) {
          this._add_node(await this._read_node(child_addr, node_level - 1));
        }
      }
      node_level--;
    }
  }
  async _read_root_node() {
    let root_node = await this._read_node(this.offset, null);
    this._add_node(root_node);
    this.depth = root_node.get("node_level");
  }
  _add_node(node) {
    let node_level = node.get("node_level");
    if (this.all_nodes.has(node_level)) {
      this.all_nodes.get(node_level).push(node);
    } else {
      this.all_nodes.set(node_level, [node]);
    }
  }
  async _read_node(offset, node_level) {
    let node = await this._read_node_header(offset, node_level);
    node.set("keys", []);
    node.set("addresses", []);
    return node;
  }
  async _read_node_header(offset) {
    throw "NotImplementedError: must define _read_node_header in implementation class";
  }
};
var BTreeV1 = class extends AbstractBTree {
  B_LINK_NODE = /* @__PURE__ */ new Map([
    ["signature", "4s"],
    ["node_type", "B"],
    ["node_level", "B"],
    ["entries_used", "H"],
    ["left_sibling", "Q"],
    ["right_sibling", "Q"]
  ]);
  async _read_node_header(offset, node_level) {
    let node = await _unpack_struct_from_async(this.B_LINK_NODE, this.fh, offset);
    if (node_level != null) {
      if (node.get("node_level") != node_level) {
        throw "node level does not match";
      }
    }
    return node;
  }
};
var BTreeV1Groups = class extends BTreeV1 {
  NODE_TYPE = 0;
  constructor(fh, offset) {
    super(fh, offset);
    this.ready = this.init();
  }
  async _read_node(offset, node_level) {
    let node = await this._read_node_header(offset, node_level);
    offset += _structure_size(this.B_LINK_NODE);
    let keys = [];
    let addresses = [];
    let entries_used = node.get("entries_used");
    for (var i = 0; i < entries_used; i++) {
      let key = (await struct.unpack_from_async("<Q", this.fh, offset))[0];
      offset += 8;
      let address = (await struct.unpack_from_async("<Q", this.fh, offset))[0];
      offset += 8;
      keys.push(key);
      addresses.push(address);
    }
    keys.push((await struct.unpack_from_async("<Q", this.fh, offset))[0]);
    node.set("keys", keys);
    node.set("addresses", addresses);
    return node;
  }
  symbol_table_addresses() {
    var all_address = [];
    var root_nodes = this.all_nodes.get(0);
    for (var node of root_nodes) {
      all_address = all_address.concat(node.get("addresses"));
    }
    return all_address;
  }
};
var BTreeV1RawDataChunks = class extends BTreeV1 {
  NODE_TYPE = 1;
  constructor(fh, offset, dims) {
    super(fh, offset);
    this.dims = dims;
    this.ready = this.init();
  }
  async _read_node(offset, node_level) {
    let node = await this._read_node_header(offset, node_level);
    offset += _structure_size(this.B_LINK_NODE);
    var keys = [];
    var addresses = [];
    let entries_used = node.get("entries_used");
    for (var i = 0; i < entries_used; i++) {
      let [chunk_size, filter_mask] = await struct.unpack_from_async("<II", this.fh, offset);
      offset += 8;
      let fmt = "<" + this.dims.toFixed() + "Q";
      let fmt_size = struct.calcsize(fmt);
      let chunk_offset = await struct.unpack_from_async(fmt, this.fh, offset);
      offset += fmt_size;
      let chunk_address = (await struct.unpack_from_async("<Q", this.fh, offset))[0];
      offset += 8;
      keys.push(/* @__PURE__ */ new Map([
        ["chunk_size", chunk_size],
        ["filter_mask", filter_mask],
        ["chunk_offset", chunk_offset]
      ]));
      addresses.push(chunk_address);
    }
    node.set("keys", keys);
    node.set("addresses", addresses);
    return node;
  }
  async construct_data_from_chunks(chunk_shape, data_shape, dtype, filter_pipeline) {
    var item_getter, item_big_endian, item_size;
    if (dtype instanceof Array) {
      let dtype_class = dtype[0];
      if (dtype_class == "REFERENCE") {
        let size = dtype[1];
        if (size != 8) {
          throw "NotImplementedError('Unsupported Reference type')";
        }
        var dtype = "<u8";
        item_getter = "getUint64";
        item_big_endian = false;
        item_size = 8;
      } else if (dtype_class == "VLEN_STRING" || dtype_class == "VLEN_SEQUENCE") {
        item_getter = "getVLENStruct";
        item_big_endian = false;
        item_size = 16;
      } else {
        throw "NotImplementedError('datatype not implemented')";
      }
    } else {
      [item_getter, item_big_endian, item_size] = dtype_getter(dtype);
    }
    var data_size = data_shape.reduce(function(a, b) {
      return a * b;
    }, 1);
    var chunk_size = chunk_shape.reduce(function(a, b) {
      return a * b;
    }, 1);
    let dims = data_shape.length;
    var current_stride = 1;
    chunk_shape.slice().map(function(d2) {
      let s = current_stride;
      current_stride *= d2;
      return s;
    });
    var current_stride = 1;
    var data_strides = data_shape.slice().reverse().map(function(d2) {
      let s = current_stride;
      current_stride *= d2;
      return s;
    }).reverse();
    var data = new Array(data_size);
    let chunk_buffer_size = chunk_size * item_size;
    for (var node of this.all_nodes.get(0)) {
      let node_keys = node.get("keys");
      let node_addresses = node.get("addresses");
      let nkeys = node_keys.length;
      for (var ik = 0; ik < nkeys; ik++) {
        let node_key = node_keys[ik];
        let addr = node_addresses[ik];
        var chunk_buffer;
        if (filter_pipeline == null) {
          chunk_buffer = await this.fh.slice(addr, addr + chunk_buffer_size);
        } else {
          chunk_buffer = await this.fh.slice(addr, addr + node_key.get("chunk_size"));
          let filter_mask = node_key.get("filter_mask");
          chunk_buffer = this._filter_chunk(chunk_buffer, filter_mask, filter_pipeline, item_size);
        }
        var chunk_offset = node_key.get("chunk_offset").slice();
        var apos = chunk_offset.slice();
        var cpos = apos.map(function() {
          return 0;
        });
        var cview = new DataView64(chunk_buffer);
        for (var ci = 0; ci < chunk_size; ci++) {
          for (var d = dims - 1; d >= 0; d--) {
            if (cpos[d] >= chunk_shape[d]) {
              cpos[d] = 0;
              apos[d] = chunk_offset[d];
              if (d > 0) {
                cpos[d - 1] += 1;
                apos[d - 1] += 1;
              }
            } else {
              break;
            }
          }
          let inbounds = apos.slice(0, -1).every(function(p, d2) {
            return p < data_shape[d2];
          });
          if (inbounds) {
            let cb_offset = ci * item_size;
            let datum = cview[item_getter](cb_offset, !item_big_endian, item_size);
            let ai = apos.slice(0, -1).reduce(function(prev, curr, index) {
              return curr * data_strides[index] + prev;
            }, 0);
            data[ai] = datum;
          }
          cpos[dims - 1] += 1;
          apos[dims - 1] += 1;
        }
      }
    }
    return data;
  }
  _filter_chunk(chunk_buffer, filter_mask, filter_pipeline, itemsize) {
    let num_filters = filter_pipeline.length;
    let buf = chunk_buffer.slice();
    for (var filter_index = num_filters - 1; filter_index >= 0; filter_index--) {
      if (filter_mask & 1 << filter_index) {
        continue;
      }
      let pipeline_entry = filter_pipeline[filter_index];
      let filter_id = pipeline_entry.get("filter_id");
      let client_data = pipeline_entry.get("client_data");
      if (Filters.has(filter_id)) {
        buf = Filters.get(filter_id)(buf, itemsize, client_data);
      } else {
        throw 'NotImplementedError("Filter with id:' + filter_id.toFixed() + ' not supported")';
      }
    }
    return buf;
  }
};
var BTreeV2 = class extends AbstractBTree {
  B_TREE_HEADER = /* @__PURE__ */ new Map([
    ["signature", "4s"],
    ["version", "B"],
    ["node_type", "B"],
    ["node_size", "I"],
    ["record_size", "H"],
    ["depth", "H"],
    ["split_percent", "B"],
    ["merge_percent", "B"],
    ["root_address", "Q"],
    ["root_nrecords", "H"],
    ["total_nrecords", "Q"]
  ]);
  B_LINK_NODE = /* @__PURE__ */ new Map([
    ["signature", "4s"],
    ["version", "B"],
    ["node_type", "B"]
  ]);
  constructor(fh, offset) {
    super(fh, offset);
    this.ready = this.init();
  }
  async _read_root_node() {
    let h = await this._read_tree_header(this.offset);
    this.address_formats = this._calculate_address_formats(h);
    this.header = h;
    this.depth = h.get("depth");
    let address = [h.get("root_address"), h.get("root_nrecords"), h.get("total_nrecords")];
    let root_node = await this._read_node(address, this.depth);
    this._add_node(root_node);
  }
  async _read_tree_header(offset) {
    let header = await _unpack_struct_from_async(this.B_TREE_HEADER, this.fh, this.offset);
    return header;
  }
  _calculate_address_formats(header) {
    let node_size = header.get("node_size");
    let record_size = header.get("record_size");
    let nrecords_max = 0;
    let ntotalrecords_max = 0;
    let address_formats = /* @__PURE__ */ new Map();
    let max_depth = header.get("depth");
    for (var node_level = 0; node_level <= max_depth; node_level++) {
      let offset_fmt = "";
      let num1_fmt = "";
      let num2_fmt = "";
      let offset_size, num1_size, num2_size;
      if (node_level == 0) {
        offset_size = 0;
        num1_size = 0;
        num2_size = 0;
      } else if (node_level == 1) {
        offset_size = 8;
        offset_fmt = "<Q";
        num1_size = this._required_bytes(nrecords_max);
        num1_fmt = this._int_format(num1_size);
        num2_size = 0;
      } else {
        offset_size = 8;
        offset_fmt = "<Q";
        num1_size = this._required_bytes(nrecords_max);
        num1_fmt = this._int_format(num1_size);
        num2_size = this._required_bytes(ntotalrecords_max);
        num2_fmt = this._int_format(num2_size);
      }
      address_formats.set(node_level, [
        offset_size,
        num1_size,
        num2_size,
        offset_fmt,
        num1_fmt,
        num2_fmt
      ]);
      if (node_level < max_depth) {
        let addr_size = offset_size + num1_size + num2_size;
        nrecords_max = this._nrecords_max(node_size, record_size, addr_size);
        if (ntotalrecords_max > 0) {
          ntotalrecords_max *= nrecords_max;
        } else {
          ntotalrecords_max = nrecords_max;
        }
      }
    }
    return address_formats;
  }
  _nrecords_max(node_size, record_size, addr_size) {
    return Math.floor((node_size - 10 - addr_size) / (record_size + addr_size));
  }
  _required_bytes(integer) {
    return Math.ceil(bitSize(integer) / 8);
  }
  _int_format(bytelength) {
    return ["<B", "<H", "<I", "<Q"][bytelength - 1];
  }
  async _read_node(address, node_level) {
    let [offset, nrecords, ntotalrecords] = address;
    let node = this._read_node_header(offset, node_level);
    offset += _structure_size(this.B_LINK_NODE);
    let record_size = this.header.get("record_size");
    let keys = [];
    for (let i = 0; i < nrecords; i++) {
      let record = await this._parse_record(this.fh, offset, record_size);
      offset += record_size;
      keys.push(record);
    }
    let addresses = [];
    let fmts = this.address_formats.get(node_level);
    if (node_level != 0) {
      let [offset_size, num1_size, num2_size, offset_fmt, num1_fmt, num2_fmt] = fmts;
      for (let j = 0; j <= nrecords; j++) {
        let address_offset = (await struct.unpack_from_async(offset_fmt, this.fh, offset))[0];
        offset += offset_size;
        let num1 = (await struct.unpack_from_async(num1_fmt, this.fh, offset))[0];
        offset += num1_size;
        let num2 = num1;
        if (num2_size > 0) {
          num2 = (await struct.unpack_from_async(num2_fmt, this.fh, offset))[0];
          offset += num2_size;
        }
        addresses.push([address_offset, num1, num2]);
      }
    }
    node.set("keys", keys);
    node.set("addresses", addresses);
    return node;
  }
  async _read_node_header(offset, node_level) {
    let node = await _unpack_struct_from_async(this.B_LINK_NODE, this.fh, offset);
    node.set("node_level", node_level);
    return node;
  }
  *iter_records() {
    for (let nodelist of this.all_nodes.values()) {
      for (let node of nodelist) {
        for (let key of node.get("keys")) {
          yield key;
        }
      }
    }
  }
  _parse_record(record) {
    throw "NotImplementedError";
  }
};
var BTreeV2GroupNames = class extends BTreeV2 {
  NODE_TYPE = 5;
  async _parse_record(buf, offset, size) {
    let namehash = (await struct.unpack_from_async("<I", buf, offset))[0];
    offset += 4;
    const heapid = await buf.slice(offset, offset + 7);
    return /* @__PURE__ */ new Map([["namehash", namehash], ["heapid", heapid]]);
  }
};
var BTreeV2GroupOrders = class extends BTreeV2 {
  NODE_TYPE = 6;
  async _parse_record(buf, offset, size) {
    let creationorder = (await struct.unpack_from_async("<Q", buf, offset))[0];
    offset += 8;
    const heapid = await buf.slice(offset, offset + 7);
    return /* @__PURE__ */ new Map([["creationorder", creationorder], ["heapid", heapid]]);
  }
};

// esm/misc-low-level.js
var SuperBlock = class {
  constructor(fh, offset) {
    this.ready = this.init(fh, offset);
  }
  async init(fh, offset) {
    let version_hint = await struct.unpack_from_async("<B", fh, offset + 8);
    var contents;
    if (version_hint == 0) {
      contents = await _unpack_struct_from_async(SUPERBLOCK_V0, fh, offset);
      this._end_of_sblock = offset + SUPERBLOCK_V0_SIZE;
    } else if (version_hint == 2 || version_hint == 3) {
      contents = await _unpack_struct_from_async(SUPERBLOCK_V2_V3, fh, offset);
      this._end_of_sblock = offset + SUPERBLOCK_V2_V3_SIZE;
    } else {
      throw "unsupported superblock version: " + version_hint.toFixed();
    }
    if (contents.get("format_signature") != FORMAT_SIGNATURE) {
      throw "Incorrect file signature: " + contents.get("format_signature");
    }
    if (contents.get("offset_size") != 8 || contents.get("length_size") != 8) {
      throw "File uses non-64-bit addressing";
    }
    this.version = contents.get("superblock_version");
    this._contents = contents;
    this._root_symbol_table = null;
    this._fh = fh;
  }
  async get_offset_to_dataobjects() {
    if (this.version == 0) {
      var sym_table = new SymbolTable(this._fh, this._end_of_sblock, true);
      await sym_table.ready;
      this._root_symbol_table = sym_table;
      return sym_table.group_offset;
    } else if (this.version == 2 || this.version == 3) {
      return this._contents.get("root_group_address");
    } else {
      throw "Not implemented version = " + this.version.toFixed();
    }
  }
};
var Heap = class {
  constructor(fh, offset) {
    this.ready = this.init(fh, offset);
  }
  async init(fh, offset) {
    let local_heap = await _unpack_struct_from_async(LOCAL_HEAP, fh, offset);
    assert(local_heap.get("signature") == "HEAP");
    assert(local_heap.get("version") == 0);
    let data_offset = local_heap.get("address_of_data_segment");
    let heap_data = await fh.slice(data_offset, data_offset + local_heap.get("data_segment_size"));
    local_heap.set("heap_data", heap_data);
    this._contents = local_heap;
    this.data = heap_data;
  }
  get_object_name(offset) {
    let end = new Uint8Array(this.data).indexOf(0, offset);
    let name_size = end - offset;
    let name = struct.unpack_from("<" + name_size.toFixed() + "s", this.data, offset)[0];
    return name;
  }
};
var SymbolTable = class {
  constructor(fh, offset, root = false) {
    this.ready = this.init(fh, offset, root);
  }
  async init(fh, offset, root) {
    var node;
    if (root) {
      node = /* @__PURE__ */ new Map([["symbols", 1]]);
    } else {
      node = await _unpack_struct_from_async(SYMBOL_TABLE_NODE, fh, offset);
      if (node.get("signature") != "SNOD") {
        throw "incorrect node type";
      }
      offset += SYMBOL_TABLE_NODE_SIZE;
    }
    var entries = [];
    var n_symbols = node.get("symbols");
    for (var i = 0; i < n_symbols; i++) {
      entries.push(await _unpack_struct_from_async(SYMBOL_TABLE_ENTRY, fh, offset));
      offset += SYMBOL_TABLE_ENTRY_SIZE;
    }
    if (root) {
      this.group_offset = entries[0].get("object_header_address");
    }
    this.entries = entries;
    this._contents = node;
    return this;
  }
  assign_name(heap) {
    this.entries.forEach(function(entry) {
      let offset = entry.get("link_name_offset");
      let link_name = heap.get_object_name(offset);
      entry.set("link_name", link_name);
    });
  }
  get_links(heap) {
    var links = {};
    this.entries.forEach(function(e) {
      let cache_type = e.get("cache_type");
      let link_name = e.get("link_name");
      if (cache_type == 0 || cache_type == 1) {
        links[link_name] = e.get("object_header_address");
      } else if (cache_type == 2) {
        let scratch = e.get("scratch");
        let buf = new ArrayBuffer(4);
        let bufView = new Uint8Array(buf);
        for (var i = 0; i < 4; i++) {
          bufView[i] = scratch.charCodeAt(i);
        }
        let offset = struct.unpack_from("<I", buf, 0)[0];
        links[link_name] = heap.get_object_name(offset);
      }
    });
    return links;
  }
};
var GlobalHeap = class {
  constructor(fh, offset) {
    this.ready = this.init(fh, offset);
  }
  async init(fh, offset) {
    let header = await _unpack_struct_from_async(GLOBAL_HEAP_HEADER, fh, offset);
    offset += GLOBAL_HEAP_HEADER_SIZE;
    let heap_data_size = header.get("collection_size") - GLOBAL_HEAP_HEADER_SIZE;
    let heap_data = await fh.slice(offset, offset + heap_data_size);
    this.heap_data = heap_data;
    this._header = header;
    this._objects = null;
  }
  get objects() {
    if (this._objects == null) {
      this._objects = /* @__PURE__ */ new Map();
      var offset = 0;
      while (offset <= this.heap_data.byteLength - GLOBAL_HEAP_OBJECT_SIZE) {
        let info = _unpack_struct_from(GLOBAL_HEAP_OBJECT, this.heap_data, offset);
        if (info.get("object_index") == 0) {
          break;
        }
        offset += GLOBAL_HEAP_OBJECT_SIZE;
        let obj_data = this.heap_data.slice(offset, offset + info.get("object_size"));
        this._objects.set(info.get("object_index"), obj_data);
        offset += _padded_size(info.get("object_size"));
      }
    }
    return this._objects;
  }
};
var FractalHeap = class {
  constructor(fh, offset) {
    this.fh = fh;
    this.ready = this.init(offset);
  }
  async init(offset) {
    let header = await _unpack_struct_from_async(FRACTAL_HEAP_HEADER, this.fh, offset);
    offset += _structure_size(FRACTAL_HEAP_HEADER);
    assert(header.get("signature") == "FRHP");
    assert(header.get("version") == 0);
    if (header.get("filter_info_size") > 0) {
      throw "Filter info size not supported on FractalHeap";
    }
    if (header.get("btree_address_huge_objects") == UNDEFINED_ADDRESS) {
      header.set("btree_address_huge_objects", null);
    } else {
      throw "Huge objects not implemented in FractalHeap";
    }
    if (header.get("root_block_address") == UNDEFINED_ADDRESS) {
      header.set("root_block_address", null);
    }
    let nbits = header.get("log2_maximum_heap_size");
    let block_offset_size = this._min_size_nbits(nbits);
    let h = /* @__PURE__ */ new Map([
      ["signature", "4s"],
      ["version", "B"],
      ["heap_header_adddress", "Q"],
      ["block_offset", `${block_offset_size}B`]
    ]);
    this.indirect_block_header = new Map(h);
    this.indirect_block_header_size = _structure_size(h);
    if ((header.get("flags") & 2) == 2) {
      h.set("checksum", "I");
    }
    this.direct_block_header = h;
    this.direct_block_header_size = _structure_size(h);
    let maximum_dblock_size = header.get("maximum_direct_block_size");
    this._managed_object_offset_size = this._min_size_nbits(nbits);
    let value = Math.min(maximum_dblock_size, header.get("max_managed_object_size"));
    this._managed_object_length_size = this._min_size_integer(value);
    let start_block_size = header.get("starting_block_size");
    let table_width = header.get("table_width");
    if (!(start_block_size > 0)) {
      throw "Starting block size == 0 not implemented";
    }
    let log2_maximum_dblock_size = Number(Math.floor(Math.log2(maximum_dblock_size)));
    assert(1n << BigInt(log2_maximum_dblock_size) == maximum_dblock_size);
    let log2_start_block_size = Number(Math.floor(Math.log2(start_block_size)));
    assert(1n << BigInt(log2_start_block_size) == start_block_size);
    this._max_direct_nrows = log2_maximum_dblock_size - log2_start_block_size + 2;
    let log2_table_width = Math.floor(Math.log2(table_width));
    assert(1 << log2_table_width == table_width);
    this._indirect_nrows_sub = log2_table_width + log2_start_block_size - 1;
    this.header = header;
    this.nobjects = header.get("managed_object_count") + header.get("huge_object_count") + header.get("tiny_object_count");
    let managed = [];
    let root_address = header.get("root_block_address");
    let nrows = 0;
    if (root_address != null) {
      nrows = header.get("indirect_current_rows_count");
    }
    if (nrows > 0) {
      for await (let data of this._iter_indirect_block(this.fh, root_address, nrows)) {
        managed.push(data);
      }
    } else {
      let data = await this._read_direct_block(this.fh, root_address, start_block_size);
      managed.push(data);
    }
    let data_size = managed.reduce((p, c) => p + c.byteLength, 0);
    let combined = new Uint8Array(data_size);
    let moffset = 0;
    managed.forEach((m) => {
      combined.set(new Uint8Array(m), moffset);
      moffset += m.byteLength;
    });
    this.managed = combined.buffer;
  }
  async _read_direct_block(fh, offset, block_size) {
    let data = await fh.slice(offset, offset + block_size);
    let header = _unpack_struct_from(this.direct_block_header, data);
    assert(header.get("signature") == "FHDB");
    return data;
  }
  get_data(heapid) {
    let firstbyte = struct.unpack_from("<B", heapid, 0)[0];
    let idtype = firstbyte >> 4 & 3;
    let version = firstbyte >> 6;
    let data_offset = 1;
    if (idtype == 0) {
      assert(version == 0);
      let nbytes = this._managed_object_offset_size;
      let offset = _unpack_integer(nbytes, heapid, data_offset);
      data_offset += nbytes;
      nbytes = this._managed_object_length_size;
      let size = _unpack_integer(nbytes, heapid, data_offset);
      return this.managed.slice(offset, offset + size);
    } else if (idtype == 1) {
      throw "tiny objectID not supported in FractalHeap";
    } else if (idtype == 2) {
      throw "huge objectID not supported in FractalHeap";
    } else {
      throw "unknown objectID type in FractalHeap";
    }
  }
  _min_size_integer(integer) {
    return this._min_size_nbits(bitSize(integer));
  }
  _min_size_nbits(nbits) {
    return Math.ceil(nbits / 8);
  }
  async *_iter_indirect_block(fh, offset, nrows) {
    let header = await _unpack_struct_from_async(this.indirect_block_header, fh, offset);
    offset += this.indirect_block_header_size;
    assert(header.get("signature") == "FHIB");
    let block_offset_bytes = header.get("block_offset");
    let block_offset = block_offset_bytes.reduce((p, c, i) => p + (c << i * 8), 0);
    header.set("block_offset", block_offset);
    let [ndirect, nindirect] = this._indirect_info(nrows);
    let direct_blocks = [];
    for (let i = 0; i < ndirect; i++) {
      let address = (await struct.unpack_from_async("<Q", fh, offset))[0];
      offset += 8;
      if (address == UNDEFINED_ADDRESS) {
        break;
      }
      let block_size = this._calc_block_size(i);
      direct_blocks.push([address, block_size]);
    }
    let indirect_blocks = [];
    for (let i = ndirect; i < ndirect + nindirect; i++) {
      let address = (await struct.unpack_from_async("<Q", fh, offset))[0];
      offset += 8;
      if (address == UNDEFINED_ADDRESS) {
        break;
      }
      let block_size = this._calc_block_size(i);
      let nrows2 = this._iblock_nrows_from_block_size(block_size);
      indirect_blocks.push([address, nrows2]);
    }
    for (let [address, block_size] of direct_blocks) {
      let obj = await this._read_direct_block(fh, address, block_size);
      yield obj;
    }
    for (let [address, nrows2] of indirect_blocks) {
      for await (let obj of this._iter_indirect_block(fh, address, nrows2)) {
        yield obj;
      }
    }
  }
  _calc_block_size(iblock) {
    let row = Math.floor(iblock / this.header.get("table_width"));
    return 2 ** Math.max(row - 1, 0) * this.header.get("starting_block_size");
  }
  _iblock_nrows_from_block_size(block_size) {
    let log2_block_size = Math.floor(Math.log2(block_size));
    assert(2 ** log2_block_size == block_size);
    return log2_block_size - this._indirect_nrows_sub;
  }
  _indirect_info(nrows) {
    let table_width = this.header.get("table_width");
    let nobjects = nrows * table_width;
    let ndirect_max = this._max_direct_nrows * table_width;
    let ndirect, nindirect;
    if (nrows <= ndirect_max) {
      ndirect = nobjects;
      nindirect = 0;
    } else {
      ndirect = ndirect_max;
      nindirect = nobjects - ndirect_max;
    }
    return [ndirect, nindirect];
  }
  _int_format(bytelength) {
    return ["B", "H", "I", "Q"][bytelength - 1];
  }
};
var FORMAT_SIGNATURE = struct.unpack_from("8s", new Uint8Array([137, 72, 68, 70, 13, 10, 26, 10]).buffer)[0];
var UNDEFINED_ADDRESS = struct.unpack_from("<Q", new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]).buffer)[0];
var SUPERBLOCK_V0 = /* @__PURE__ */ new Map([
  ["format_signature", "8s"],
  ["superblock_version", "B"],
  ["free_storage_version", "B"],
  ["root_group_version", "B"],
  ["reserved_0", "B"],
  ["shared_header_version", "B"],
  ["offset_size", "B"],
  ["length_size", "B"],
  ["reserved_1", "B"],
  ["group_leaf_node_k", "H"],
  ["group_internal_node_k", "H"],
  ["file_consistency_flags", "L"],
  ["base_address_lower", "Q"],
  ["free_space_address", "Q"],
  ["end_of_file_address", "Q"],
  ["driver_information_address", "Q"]
]);
var SUPERBLOCK_V0_SIZE = _structure_size(SUPERBLOCK_V0);
var SUPERBLOCK_V2_V3 = /* @__PURE__ */ new Map([
  ["format_signature", "8s"],
  ["superblock_version", "B"],
  ["offset_size", "B"],
  ["length_size", "B"],
  ["file_consistency_flags", "B"],
  ["base_address", "Q"],
  ["superblock_extension_address", "Q"],
  ["end_of_file_address", "Q"],
  ["root_group_address", "Q"],
  ["superblock_checksum", "I"]
]);
var SUPERBLOCK_V2_V3_SIZE = _structure_size(SUPERBLOCK_V2_V3);
var SYMBOL_TABLE_ENTRY = /* @__PURE__ */ new Map([
  ["link_name_offset", "Q"],
  ["object_header_address", "Q"],
  ["cache_type", "I"],
  ["reserved", "I"],
  ["scratch", "16s"]
]);
var SYMBOL_TABLE_ENTRY_SIZE = _structure_size(SYMBOL_TABLE_ENTRY);
var SYMBOL_TABLE_NODE = /* @__PURE__ */ new Map([
  ["signature", "4s"],
  ["version", "B"],
  ["reserved_0", "B"],
  ["symbols", "H"]
]);
var SYMBOL_TABLE_NODE_SIZE = _structure_size(SYMBOL_TABLE_NODE);
var LOCAL_HEAP = /* @__PURE__ */ new Map([
  ["signature", "4s"],
  ["version", "B"],
  ["reserved", "3s"],
  ["data_segment_size", "Q"],
  ["offset_to_free_list", "Q"],
  ["address_of_data_segment", "Q"]
]);
var GLOBAL_HEAP_HEADER = /* @__PURE__ */ new Map([
  ["signature", "4s"],
  ["version", "B"],
  ["reserved", "3s"],
  ["collection_size", "Q"]
]);
var GLOBAL_HEAP_HEADER_SIZE = _structure_size(GLOBAL_HEAP_HEADER);
var GLOBAL_HEAP_OBJECT = /* @__PURE__ */ new Map([
  ["object_index", "H"],
  ["reference_count", "H"],
  ["reserved", "I"],
  ["object_size", "Q"]
]);
var GLOBAL_HEAP_OBJECT_SIZE = _structure_size(GLOBAL_HEAP_OBJECT);
var FRACTAL_HEAP_HEADER = /* @__PURE__ */ new Map([
  ["signature", "4s"],
  ["version", "B"],
  ["object_index_size", "H"],
  ["filter_info_size", "H"],
  ["flags", "B"],
  ["max_managed_object_size", "I"],
  ["next_huge_object_index", "Q"],
  ["btree_address_huge_objects", "Q"],
  ["managed_freespace_size", "Q"],
  ["freespace_manager_address", "Q"],
  ["managed_space_size", "Q"],
  ["managed_alloc_size", "Q"],
  ["next_directblock_iterator_address", "Q"],
  ["managed_object_count", "Q"],
  ["huge_objects_total_size", "Q"],
  ["huge_object_count", "Q"],
  ["tiny_objects_total_size", "Q"],
  ["tiny_object_count", "Q"],
  ["table_width", "H"],
  ["starting_block_size", "Q"],
  ["maximum_direct_block_size", "Q"],
  ["log2_maximum_heap_size", "H"],
  ["indirect_starting_rows_count", "H"],
  ["root_block_address", "Q"],
  ["indirect_current_rows_count", "H"]
]);

// esm/dataobjects.js
var DataObjects = class {
  constructor(fh, offset) {
    this.ready = this.init(fh, offset);
  }
  async init(fh, offset) {
    let version_hint = (await struct.unpack_from_async("<B", fh, offset))[0];
    if (version_hint == 1) {
      var [msgs, msg_data, header] = await this._parse_v1_objects(fh, offset);
    } else if (version_hint == "O".charCodeAt(0)) {
      var [msgs, msg_data, header] = await this._parse_v2_objects(fh, offset);
    } else {
      throw "InvalidHDF5File('unknown Data Object Header')";
    }
    this.fh = fh;
    this.msgs = msgs;
    this.msg_data = msg_data;
    this.offset = offset;
    this._global_heaps = {};
    this._header = header;
    this._filter_pipeline = null;
    this._chunk_params_set = false;
    this._chunks = null;
    this._chunk_dims = null;
    this._chunk_address = null;
  }
  get dtype() {
    let msg = this.find_msg_type(DATATYPE_MSG_TYPE)[0];
    let msg_offset = msg.get("offset_to_message");
    return new DatatypeMessage(this.fh, msg_offset).dtype;
  }
  get chunks() {
    return this._get_chunk_params().then(() => {
      return this._chunks;
    });
  }
  get shape() {
    let msg = this.find_msg_type(DATASPACE_MSG_TYPE)[0];
    let msg_offset = msg.get("offset_to_message");
    return determine_data_shape(this.fh, msg_offset);
  }
  async get_filter_pipeline() {
    if (this._filter_pipeline != null) {
      return this._filter_pipeline;
    }
    let filter_msgs = this.find_msg_type(DATA_STORAGE_FILTER_PIPELINE_MSG_TYPE);
    if (!filter_msgs.length) {
      this._filter_pipeline = null;
      return this._filter_pipeline;
    }
    var offset = filter_msgs[0].get("offset_to_message");
    let [version, nfilters] = await struct.unpack_from_async("<BB", this.fh, offset);
    offset += struct.calcsize("<BB");
    var filters = [];
    if (version == 1) {
      await struct.unpack_from_async("<HI", this.fh, offset);
      offset += struct.calcsize("<HI");
      for (var _ = 0; _ < nfilters; _++) {
        let filter_info = await _unpack_struct_from_async(FILTER_PIPELINE_DESCR_V1, this.fh, offset);
        offset += FILTER_PIPELINE_DESCR_V1_SIZE;
        let padded_name_length = _padded_size(filter_info.get("name_length"), 8);
        let fmt = "<" + padded_name_length.toFixed() + "s";
        let filter_name = (await struct.unpack_from_async(fmt, this.fh, offset))[0];
        filter_info.set("filter_name", filter_name);
        offset += padded_name_length;
        fmt = "<" + filter_info.get("client_data_values").toFixed() + "I";
        let client_data = await struct.unpack_from_async(fmt, this.fh, offset);
        filter_info.set("client_data", client_data);
        offset += 4 * filter_info.get("client_data_values");
        if (filter_info.get("client_data_values") % 2) {
          offset += 4;
        }
        filters.push(filter_info);
      }
    } else if (version == 2) {
      for (let nf = 0; nf < nfilters; nf++) {
        let filter_info = /* @__PURE__ */ new Map();
        let buf = this.fh;
        let filter_id = (await struct.unpack_from_async("<H", buf, offset))[0];
        offset += 2;
        filter_info.set("filter_id", filter_id);
        let name_length = 0;
        if (filter_id > 255) {
          name_length = (await struct.unpack_from_async("<H", buf, offset))[0];
          offset += 2;
        }
        let flags = (await struct.unpack_from_async("<H", buf, offset))[0];
        offset += 2;
        let optional = (flags & 1) > 0;
        filter_info.set("optional", optional);
        let num_client_values = (await struct.unpack_from_async("<H", buf, offset))[0];
        offset += 2;
        let name;
        if (name_length > 0) {
          name = (await struct.unpack_from_async(`${name_length}s`, buf, offset))[0];
          offset += name_length;
        }
        filter_info.set("name", name);
        let client_values = await struct.unpack_from_async(`<${num_client_values}i`, buf, offset);
        offset += 4 * num_client_values;
        filter_info.set("client_data_values", client_values);
        filters.push(filter_info);
      }
    } else {
      throw `version ${version} is not supported`;
    }
    this._filter_pipeline = filters;
    return this._filter_pipeline;
  }
  find_msg_type(msg_type) {
    return this.msgs.filter(function(m) {
      return m.get("type") == msg_type;
    });
  }
  async get_attributes() {
    let attrs = {};
    let attr_msgs = this.find_msg_type(ATTRIBUTE_MSG_TYPE);
    for (let msg of attr_msgs) {
      let offset = msg.get("offset_to_message");
      let [name, value] = await this.unpack_attribute(offset);
      attrs[name] = value;
    }
    return attrs;
  }
  async get_fillvalue() {
    let msg = this.find_msg_type(FILLVALUE_MSG_TYPE)[0];
    var offset = msg.get("offset_to_message");
    var is_defined;
    let version = (await struct.unpack_from_async("<B", this.fh, offset))[0];
    var info, size, fillvalue;
    if (version == 1 || version == 2) {
      info = await _unpack_struct_from_async(FILLVAL_MSG_V1V2, this.fh, offset);
      offset += FILLVAL_MSG_V1V2_SIZE;
      is_defined = info.get("fillvalue_defined");
    } else if (version == 3) {
      info = await _unpack_struct_from_async(FILLVAL_MSG_V3, this.fh, offset);
      offset += FILLVAL_MSG_V3_SIZE;
      is_defined = info.get("flags") & 32;
    } else {
      throw 'InvalidHDF5File("Unknown fillvalue msg version: "' + String(version);
    }
    if (is_defined) {
      size = (await struct.unpack_from_async("<I", this.fh, offset))[0];
      offset += 4;
    } else {
      size = 0;
    }
    if (size) {
      let [getter, big_endian, size2] = dtype_getter(await this.dtype);
      let payload_view = new DataView64(await this.fh.slice(offset, offset + size2));
      fillvalue = payload_view[getter](offset, !big_endian, size2);
    } else {
      fillvalue = 0;
    }
    return fillvalue;
  }
  async unpack_attribute(offset) {
    let version = (await struct.unpack_from_async("<B", this.fh, offset))[0];
    var attr_map, padding_multiple;
    if (version == 1) {
      attr_map = await _unpack_struct_from_async(ATTR_MSG_HEADER_V1, this.fh, offset);
      assert(attr_map.get("version") == 1);
      offset += ATTR_MSG_HEADER_V1_SIZE;
      padding_multiple = 8;
    } else if (version == 3) {
      attr_map = await _unpack_struct_from_async(ATTR_MSG_HEADER_V3, this.fh, offset);
      assert(attr_map.get("version") == 3);
      offset += ATTR_MSG_HEADER_V3_SIZE;
      padding_multiple = 1;
    } else {
      throw "unsupported attribute message version: " + version;
    }
    let name_size = attr_map.get("name_size");
    let name = (await struct.unpack_from_async("<" + name_size.toFixed() + "s", this.fh, offset))[0];
    name = name.replace(/\x00$/, "");
    offset += _padded_size(name_size, padding_multiple);
    var dtype;
    try {
      dtype = await new DatatypeMessage(this.fh, offset).dtype;
    } catch (e) {
      console.warn("Attribute " + name + " type not implemented, set to null.");
      return [name, null];
    }
    offset += _padded_size(attr_map.get("datatype_size"), padding_multiple);
    let shape = await this.determine_data_shape(this.fh, offset);
    let items = shape.reduce(function(a, b) {
      return a * b;
    }, 1);
    offset += _padded_size(attr_map.get("dataspace_size"), padding_multiple);
    if (dtype.datatype_class === 5) {
      value = await this.fh.slice(offset, offset + dtype.size);
    } else {
      var value = await this._attr_value(dtype, this.fh, items, offset);
      if (shape.length == 0) {
        value = value[0];
      }
    }
    return [name, value];
  }
  async determine_data_shape(buf, offset) {
    let version = (await struct.unpack_from_async("<B", buf, offset))[0];
    var header;
    if (version == 1) {
      header = await _unpack_struct_from_async(DATASPACE_MSG_HEADER_V1, buf, offset);
      assert(header.get("version") == 1);
      offset += DATASPACE_MSG_HEADER_V1_SIZE;
    } else if (version == 2) {
      header = await _unpack_struct_from_async(DATASPACE_MSG_HEADER_V2, buf, offset);
      assert(header.get("version") == 2);
      offset += DATASPACE_MSG_HEADER_V2_SIZE;
    } else {
      throw "unknown dataspace message version";
    }
    let ndims = header.get("dimensionality");
    let dim_sizes = await struct.unpack_from_async("<" + ndims.toFixed() + "Q", buf, offset);
    return dim_sizes;
  }
  async _attr_value(dtype, buf, count, offset) {
    var value = new Array(count);
    if (dtype instanceof Array) {
      let dtype_class = dtype[0];
      for (var i = 0; i < count; i++) {
        if (dtype_class == "VLEN_STRING") {
          let character_set = dtype[2];
          var [vlen, vlen_data] = await this._vlen_size_and_data(buf, offset);
          const encoding = character_set == 0 ? "ascii" : "utf-8";
          const decoder = new TextDecoder(encoding);
          value[i] = decoder.decode(vlen_data);
          offset += 16;
        } else if (dtype_class == "REFERENCE") {
          var address = await struct.unpack_from_async("<Q", buf, offset);
          value[i] = address;
          offset += 8;
        } else if (dtype_class == "VLEN_SEQUENCE") {
          let base_dtype = dtype[1];
          var [vlen, vlen_data] = this._vlen_size_and_data(buf, offset);
          value[i] = this._attr_value(base_dtype, vlen_data, vlen, 0);
          offset += 16;
        } else {
          throw "NotImplementedError";
        }
      }
    } else {
      let [getter, big_endian, size] = dtype_getter(dtype);
      const arrayBuffer = await buf.slice(offset, offset + count * size);
      let view = new DataView64(arrayBuffer, 0);
      let bufferOffset = 0;
      for (var i = 0; i < count; i++) {
        value[i] = view[getter](bufferOffset, !big_endian, size);
        bufferOffset += size;
      }
    }
    return value;
  }
  async _vlen_size_and_data(buf, offset) {
    let vlen_size = (await struct.unpack_from_async("<I", buf, offset))[0];
    let gheap_id = await _unpack_struct_from_async(GLOBAL_HEAP_ID, buf, offset + 4);
    let gheap_address = gheap_id.get("collection_address");
    assert(gheap_id.get("collection_address") < Number.MAX_SAFE_INTEGER);
    var gheap;
    if (!(gheap_address in this._global_heaps)) {
      gheap = new GlobalHeap(this.fh, gheap_address);
      await gheap.ready;
      this._global_heaps[gheap_address] = gheap;
    }
    gheap = this._global_heaps[gheap_address];
    let vlen_data = gheap.objects.get(gheap_id.get("object_index"));
    return [vlen_size, vlen_data];
  }
  async _parse_v1_objects(fh, offset) {
    let header = await _unpack_struct_from_async(OBJECT_HEADER_V1, fh, offset);
    assert(header.get("version") == 1);
    let total_header_messages = header.get("total_header_messages");
    var block_size = header.get("object_header_size");
    var block_offset = offset + _structure_size(OBJECT_HEADER_V1);
    var msg_data = await fh.slice(block_offset, block_offset + block_size);
    var object_header_blocks = [[block_offset, block_size]];
    var current_block = 0;
    var local_offset = 0;
    var msgs = new Array(total_header_messages);
    for (var i = 0; i < total_header_messages; i++) {
      if (local_offset >= block_size) {
        [block_offset, block_size] = object_header_blocks[++current_block];
        local_offset = 0;
      }
      let msg = await _unpack_struct_from_async(HEADER_MSG_INFO_V1, fh, block_offset + local_offset);
      let offset_to_message = block_offset + local_offset + HEADER_MSG_INFO_V1_SIZE;
      msg.set("offset_to_message", offset_to_message);
      if (msg.get("type") == OBJECT_CONTINUATION_MSG_TYPE) {
        var [fh_off, size] = await struct.unpack_from_async("<QQ", fh, offset_to_message);
        object_header_blocks.push([fh_off, size]);
      }
      local_offset += HEADER_MSG_INFO_V1_SIZE + msg.get("size");
      msgs[i] = msg;
    }
    return [msgs, msg_data, header];
  }
  async _parse_v2_objects(buf, offset) {
    var [header, creation_order_size, block_offset] = await this._parse_v2_header(buf, offset);
    offset = block_offset;
    var msgs = [];
    var block_size = header.get("size_of_chunk_0");
    var msg_data = buf.slice(offset, offset += block_size);
    var object_header_blocks = [[block_offset, block_size]];
    var current_block = 0;
    var local_offset = 0;
    while (true) {
      if (local_offset >= block_size - HEADER_MSG_INFO_V2_SIZE) {
        let next_block = object_header_blocks[++current_block];
        if (next_block == null) {
          break;
        }
        [block_offset, block_size] = next_block;
        local_offset = 0;
      }
      let msg = await _unpack_struct_from_async(HEADER_MSG_INFO_V2, buf, block_offset + local_offset);
      let offset_to_message = block_offset + local_offset + HEADER_MSG_INFO_V2_SIZE + creation_order_size;
      msg.set("offset_to_message", offset_to_message);
      if (msg.get("type") == OBJECT_CONTINUATION_MSG_TYPE) {
        var [fh_off, size] = await struct.unpack_from_async("<QQ", buf, offset_to_message);
        object_header_blocks.push([fh_off + 4, size - 4]);
      }
      local_offset += HEADER_MSG_INFO_V2_SIZE + msg.get("size") + creation_order_size;
      msgs.push(msg);
    }
    return [msgs, msg_data, header];
  }
  async _parse_v2_header(buf, offset) {
    let header = await _unpack_struct_from_async(OBJECT_HEADER_V2, buf, offset);
    var creation_order_size;
    offset += _structure_size(OBJECT_HEADER_V2);
    assert(header.get("version") == 2);
    if (header.get("flags") & 4) {
      creation_order_size = 2;
    } else {
      creation_order_size = 0;
    }
    assert((header.get("flags") & 16) == 0);
    if (header.get("flags") & 32) {
      let times = await struct.unpack_from_async("<4I", buf, offset);
      offset += 16;
      header.set("access_time", times[0]);
      header.set("modification_time", times[1]);
      header.set("change_time", times[2]);
      header.set("birth_time", times[3]);
    }
    let chunk_fmt = ["<B", "<H", "<I", "<Q"][header.get("flags") & 3];
    header.set("size_of_chunk_0", (await struct.unpack_from_async(chunk_fmt, buf, offset))[0]);
    offset += struct.calcsize(chunk_fmt);
    return [header, creation_order_size, offset];
  }
  async find_link(name) {
    if (this._links) {
      for (link of this._links) {
        if (name === link[0]) {
          return link;
        }
      }
    } else {
      const links = [];
      for await (const link2 of this.iter_links()) {
        if (name === link2[0]) {
          return link2;
        }
        links.push(link2);
      }
      this._links = links;
    }
    return void 0;
  }
  async get_links() {
    const links = [];
    for await (const link2 of this.iter_links()) {
      links.push(link2);
    }
    return Object.fromEntries(links);
  }
  async *iter_links() {
    for (let msg of this.msgs) {
      if (msg.get("type") == SYMBOL_TABLE_MSG_TYPE) {
        yield* this._iter_links_from_symbol_tables(msg);
      } else if (msg.get("type") == LINK_MSG_TYPE) {
        yield this._get_link_from_link_msg(msg);
      } else if (msg.get("type") == LINK_INFO_MSG_TYPE) {
        yield* this._iter_link_from_link_info_msg(msg);
      }
    }
  }
  async *_iter_links_from_symbol_tables(sym_tbl_msg) {
    assert(sym_tbl_msg.get("size") == 16);
    let data = await _unpack_struct_from_async(SYMBOL_TABLE_MSG, this.fh, sym_tbl_msg.get("offset_to_message"));
    yield* this._iter_links_btree_v1(data.get("btree_address"), data.get("heap_address"));
  }
  async *_iter_links_btree_v1(btree_address, heap_address) {
    let btree = new BTreeV1Groups(this.fh, btree_address);
    await btree.ready;
    let heap = new Heap(this.fh, heap_address);
    await heap.ready;
    for (let symbol_table_address of btree.symbol_table_addresses()) {
      let table = new SymbolTable(this.fh, symbol_table_address);
      await table.ready;
      table.assign_name(heap);
      yield* Object.entries(table.get_links(heap));
    }
  }
  async _get_link_from_link_msg(link_msg) {
    let offset = link_msg.get("offset_to_message");
    return await this._decode_link_msg(this.fh, offset)[1];
  }
  async _decode_link_msg(data, offset) {
    let [version, flags] = await struct.unpack_from_async("<BB", data, offset);
    offset += 2;
    assert(version == 1);
    let size_of_length_of_link_name = 2 ** (flags & 3);
    let link_type_field_present = (flags & 2 ** 3) > 0;
    let link_name_character_set_field_present = (flags & 2 ** 4) > 0;
    let ordered = (flags & 2 ** 2) > 0;
    let link_type;
    if (link_type_field_present) {
      link_type = (await struct.unpack_from_async("<B", data, offset))[0];
      offset += 1;
    } else {
      link_type = 0;
    }
    assert([0, 1].includes(link_type));
    let creationorder;
    if (ordered) {
      creationorder = (await struct.unpack_from_async("<Q", data, offset))[0];
      offset += 8;
    }
    let link_name_character_set = 0;
    if (link_name_character_set_field_present) {
      link_name_character_set = (await struct.unpack_from_async("<B", data, offset))[0];
      offset += 1;
    }
    let encoding = link_name_character_set == 0 ? "ascii" : "utf-8";
    let name_size_fmt = ["<B", "<H", "<I", "<Q"][flags & 3];
    let name_size = (await struct.unpack_from_async(name_size_fmt, data, offset))[0];
    offset += size_of_length_of_link_name;
    let name = new TextDecoder(encoding).decode(await data.slice(offset, offset + name_size));
    offset += name_size;
    let address;
    if (link_type == 0) {
      address = (await struct.unpack_from_async("<Q", data, offset))[0];
    } else if (link_type == 1) {
      let length_of_soft_link_value = (await struct.unpack_from_async("<H", data, offset))[0];
      offset += 2;
      address = new TextDecoder(encoding).decode(await data.slice(offset, offset + length_of_soft_link_value));
    }
    return [creationorder, [name, address]];
  }
  async *_iter_link_from_link_info_msg(info_msg) {
    let offset = info_msg.get("offset_to_message");
    let data = await this._decode_link_info_msg(this.fh, offset);
    let heap_address = data.get("heap_address");
    let name_btree_address = data.get("name_btree_address");
    let order_btree_address = data.get("order_btree_address");
    if (name_btree_address != null) {
      yield* this._iter_links_btree_v2(name_btree_address, order_btree_address, heap_address);
    }
  }
  async *_iter_links_btree_v2(name_btree_address, order_btree_address, heap_address) {
    let heap = new FractalHeap(this.fh, heap_address);
    await heap.ready;
    let btree;
    const ordered = order_btree_address != null;
    if (ordered) {
      btree = new BTreeV2GroupOrders(this.fh, order_btree_address);
      await btree.ready;
    } else {
      btree = new BTreeV2GroupNames(this.fh, name_btree_address);
      await btree.ready;
    }
    let items = /* @__PURE__ */ new Map();
    for (let record of btree.iter_records()) {
      let data = heap.get_data(record.get("heapid"));
      let [creationorder, item] = await this._decode_link_msg(data, 0);
      const key = ordered ? creationorder : item[0];
      items.set(key, item);
    }
    let sorted_keys = Array.from(items.keys()).sort();
    for (let key of sorted_keys) {
      yield items.get(key);
    }
  }
  async _decode_link_info_msg(data, offset) {
    let [version, flags] = await struct.unpack_from_async("<BB", data, offset);
    assert(version == 0);
    offset += 2;
    if ((flags & 1) > 0) {
      offset += 8;
    }
    let fmt = (flags & 2) > 0 ? LINK_INFO_MSG2 : LINK_INFO_MSG1;
    let link_info = await _unpack_struct_from_async(fmt, data, offset);
    let output = /* @__PURE__ */ new Map();
    for (let [k, v] of link_info.entries()) {
      output.set(k, v == UNDEFINED_ADDRESS2 ? null : v);
    }
    return output;
  }
  get is_dataset() {
    return this.find_msg_type(DATASPACE_MSG_TYPE).length > 0;
  }
  async get_data() {
    let msg = this.find_msg_type(DATA_STORAGE_MSG_TYPE)[0];
    let msg_offset = msg.get("offset_to_message");
    var [version, dims, layout_class, property_offset] = await this._get_data_message_properties(msg_offset);
    if (layout_class == 0) {
      throw "Compact storage of DataObject not implemented";
    } else if (layout_class == 1) {
      return this._get_contiguous_data(property_offset);
    } else if (layout_class == 2) {
      return this._get_chunked_data(msg_offset);
    }
  }
  async _get_data_message_properties(msg_offset) {
    let dims, layout_class, property_offset;
    let [version, arg1, arg2] = await struct.unpack_from_async("<BBB", this.fh, msg_offset);
    if (version == 1 || version == 2) {
      dims = arg1;
      layout_class = arg2;
      property_offset = msg_offset;
      property_offset += struct.calcsize("<BBB");
      property_offset += struct.calcsize("<BI");
      assert(layout_class == 1 || layout_class == 2);
    } else if (version == 3 || version == 4) {
      layout_class = arg1;
      property_offset = msg_offset;
      property_offset += struct.calcsize("<BB");
    }
    assert(version >= 1 && version <= 4);
    return [version, dims, layout_class, property_offset];
  }
  async _get_contiguous_data(property_offset) {
    let [data_offset] = await struct.unpack_from_async("<Q", this.fh, property_offset);
    const shape = await this.shape;
    const dtype = await this.dtype;
    if (data_offset == UNDEFINED_ADDRESS2) {
      let size = shape.reduce(function(a, b) {
        return a * b;
      }, 1);
      return new Array(size);
    }
    var fullsize = shape.reduce(function(a, b) {
      return a * b;
    }, 1);
    if (!(dtype instanceof Array)) {
      if (/[<>=!@\|]?(i|u|f|S)(\d*)/.test(dtype)) {
        let [item_getter, item_is_big_endian, item_size] = dtype_getter(dtype);
        let output = new Array(fullsize);
        const local_buffer = await this.fh.slice(data_offset, data_offset + item_size * fullsize);
        let view = new DataView64(local_buffer);
        for (var i = 0; i < fullsize; i++) {
          output[i] = view[item_getter](i * item_size, !item_is_big_endian, item_size);
        }
        return output;
      } else if (dtype.datatype_class === 5) {
        return this.fh.slice(data_offset, data_offset + dtype.size);
      } else {
        throw "not Implemented - no proper dtype defined";
      }
    } else {
      let dtype_class = dtype[0];
      if (dtype_class == "REFERENCE") {
        let size = dtype[1];
        if (size != 8) {
          throw "NotImplementedError('Unsupported Reference type')";
        }
        let ref_addresses = await this.fh.slice(data_offset, data_offset + fullsize);
        return ref_addresses;
      } else if (dtype_class == "VLEN_STRING") {
        let character_set = dtype[2];
        const encoding = character_set == 0 ? "ascii" : "utf-8";
        const decoder = new TextDecoder(encoding);
        var value = [];
        for (var i = 0; i < fullsize; i++) {
          const [vlen, vlen_data] = await this._vlen_size_and_data(this.fh, data_offset);
          value[i] = decoder.decode(vlen_data);
          data_offset += 16;
        }
        return value;
      } else {
        throw "NotImplementedError('datatype not implemented')";
      }
    }
  }
  async _get_chunked_data(offset) {
    await this._get_chunk_params();
    var chunk_btree = new BTreeV1RawDataChunks(this.fh, this._chunk_address, this._chunk_dims);
    await chunk_btree.ready;
    const dtype = await this.dtype;
    const shape = await this.shape;
    const chunks = await this.chunks;
    const filter_pipeline = await this.get_filter_pipeline();
    let data = await chunk_btree.construct_data_from_chunks(chunks, shape, dtype, filter_pipeline);
    if (dtype instanceof Array && /^VLEN/.test(dtype[0])) {
      let dtype_class = dtype[0];
      for (var i = 0; i < data.length; i++) {
        let [item_size, gheap_address, object_index] = data[i];
        var gheap;
        if (!(gheap_address in this._global_heaps)) {
          gheap = new GlobalHeap(this.fh, gheap_address);
          await gheap.ready;
          this._global_heaps[gheap_address] = gheap;
        } else {
          gheap = this._global_heaps[gheap_address];
        }
        let vlen_data = gheap.objects.get(object_index);
        if (dtype_class == "VLEN_STRING") {
          let character_set = dtype[2];
          const encoding = character_set == 0 ? "ascii" : "utf-8";
          const decoder = new TextDecoder(encoding);
          data[i] = decoder.decode(vlen_data);
        }
      }
    }
    return data;
  }
  async _get_chunk_params() {
    if (this._chunk_params_set) {
      return;
    }
    this._chunk_params_set = true;
    var msg = this.find_msg_type(DATA_STORAGE_MSG_TYPE)[0];
    var offset = msg.get("offset_to_message");
    var [version, dims, layout_class, property_offset] = await this._get_data_message_properties(offset);
    if (layout_class != 2) {
      return;
    }
    var data_offset;
    if (version == 1 || version == 2) {
      var address = (await struct.unpack_from_async("<Q", this.fh, property_offset))[0];
      data_offset = property_offset + struct.calcsize("<Q");
    } else if (version == 3) {
      var [dims, address] = await struct.unpack_from_async("<BQ", this.fh, property_offset);
      data_offset = property_offset + struct.calcsize("<BQ");
    }
    assert(version >= 1 && version <= 3);
    var fmt = "<" + (dims - 1).toFixed() + "I";
    var chunk_shape = await struct.unpack_from_async(fmt, this.fh, data_offset);
    this._chunks = chunk_shape;
    this._chunk_dims = dims;
    this._chunk_address = address;
    return;
  }
};
async function determine_data_shape(buf, offset) {
  let version = (await struct.unpack_from_async("<B", buf, offset))[0];
  var header;
  if (version == 1) {
    header = await _unpack_struct_from_async(DATASPACE_MSG_HEADER_V1, buf, offset);
    assert(header.get("version") == 1);
    offset += DATASPACE_MSG_HEADER_V1_SIZE;
  } else if (version == 2) {
    header = await _unpack_struct_from_async(DATASPACE_MSG_HEADER_V2, buf, offset);
    assert(header.get("version") == 2);
    offset += DATASPACE_MSG_HEADER_V2_SIZE;
  } else {
    throw "InvalidHDF5File('unknown dataspace message version')";
  }
  let ndims = header.get("dimensionality");
  let dim_sizes = await struct.unpack_from_async("<" + (ndims * 2).toFixed() + "I", buf, offset);
  return dim_sizes.filter(function(s, i) {
    return i % 2 == 0;
  });
}
var UNDEFINED_ADDRESS2 = struct.unpack_from("<Q", new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]).buffer);
var GLOBAL_HEAP_ID = /* @__PURE__ */ new Map([
  ["collection_address", "Q"],
  ["object_index", "I"]
]);
_structure_size(GLOBAL_HEAP_ID);
var ATTR_MSG_HEADER_V1 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["reserved", "B"],
  ["name_size", "H"],
  ["datatype_size", "H"],
  ["dataspace_size", "H"]
]);
var ATTR_MSG_HEADER_V1_SIZE = _structure_size(ATTR_MSG_HEADER_V1);
var ATTR_MSG_HEADER_V3 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["flags", "B"],
  ["name_size", "H"],
  ["datatype_size", "H"],
  ["dataspace_size", "H"],
  ["character_set_encoding", "B"]
]);
var ATTR_MSG_HEADER_V3_SIZE = _structure_size(ATTR_MSG_HEADER_V3);
var OBJECT_HEADER_V1 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["reserved", "B"],
  ["total_header_messages", "H"],
  ["object_reference_count", "I"],
  ["object_header_size", "I"],
  ["padding", "I"]
]);
var OBJECT_HEADER_V2 = /* @__PURE__ */ new Map([
  ["signature", "4s"],
  ["version", "B"],
  ["flags", "B"]
]);
var DATASPACE_MSG_HEADER_V1 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["dimensionality", "B"],
  ["flags", "B"],
  ["reserved_0", "B"],
  ["reserved_1", "I"]
]);
var DATASPACE_MSG_HEADER_V1_SIZE = _structure_size(DATASPACE_MSG_HEADER_V1);
var DATASPACE_MSG_HEADER_V2 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["dimensionality", "B"],
  ["flags", "B"],
  ["type", "B"]
]);
var DATASPACE_MSG_HEADER_V2_SIZE = _structure_size(DATASPACE_MSG_HEADER_V2);
var HEADER_MSG_INFO_V1 = /* @__PURE__ */ new Map([
  ["type", "H"],
  ["size", "H"],
  ["flags", "B"],
  ["reserved", "3s"]
]);
var HEADER_MSG_INFO_V1_SIZE = _structure_size(HEADER_MSG_INFO_V1);
var HEADER_MSG_INFO_V2 = /* @__PURE__ */ new Map([
  ["type", "B"],
  ["size", "H"],
  ["flags", "B"]
]);
var HEADER_MSG_INFO_V2_SIZE = _structure_size(HEADER_MSG_INFO_V2);
var SYMBOL_TABLE_MSG = /* @__PURE__ */ new Map([
  ["btree_address", "Q"],
  ["heap_address", "Q"]
]);
var LINK_INFO_MSG1 = /* @__PURE__ */ new Map([
  ["heap_address", "Q"],
  ["name_btree_address", "Q"]
]);
var LINK_INFO_MSG2 = /* @__PURE__ */ new Map([
  ["heap_address", "Q"],
  ["name_btree_address", "Q"],
  ["order_btree_address", "Q"]
]);
var FILLVAL_MSG_V1V2 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["space_allocation_time", "B"],
  ["fillvalue_write_time", "B"],
  ["fillvalue_defined", "B"]
]);
var FILLVAL_MSG_V1V2_SIZE = _structure_size(FILLVAL_MSG_V1V2);
var FILLVAL_MSG_V3 = /* @__PURE__ */ new Map([
  ["version", "B"],
  ["flags", "B"]
]);
var FILLVAL_MSG_V3_SIZE = _structure_size(FILLVAL_MSG_V3);
var FILTER_PIPELINE_DESCR_V1 = /* @__PURE__ */ new Map([
  ["filter_id", "H"],
  ["name_length", "H"],
  ["flags", "H"],
  ["client_data_values", "H"]
]);
var FILTER_PIPELINE_DESCR_V1_SIZE = _structure_size(FILTER_PIPELINE_DESCR_V1);
var DATASPACE_MSG_TYPE = 1;
var LINK_INFO_MSG_TYPE = 2;
var DATATYPE_MSG_TYPE = 3;
var FILLVALUE_MSG_TYPE = 5;
var LINK_MSG_TYPE = 6;
var DATA_STORAGE_MSG_TYPE = 8;
var DATA_STORAGE_FILTER_PIPELINE_MSG_TYPE = 11;
var ATTRIBUTE_MSG_TYPE = 12;
var OBJECT_CONTINUATION_MSG_TYPE = 16;
var SYMBOL_TABLE_MSG_TYPE = 17;

// esm/high-level.js
var Group = class {
  constructor(name, parent) {
    if (parent == null) {
      this.parent = this;
      this.file = this;
    } else {
      this.parent = parent;
      this.file = parent.file;
    }
    this.name = name;
  }
  async init(dataobjects) {
    const index = this.file.index;
    if (index && this.name in index) {
      this._links = index[this.name];
    } else {
      this._links = await dataobjects.get_links();
    }
    this._dataobjects = dataobjects;
    this._attrs = null;
    this._keys = null;
  }
  get keys() {
    if (this._keys == null) {
      this._keys = Object.keys(this._links);
    }
    return this._keys.slice();
  }
  get values() {
    return this.keys.map((k) => this.get(k));
  }
  length() {
    return this.keys.length;
  }
  _dereference(ref) {
    if (!ref) {
      throw "cannot deference null reference";
    }
    let obj = this.file._get_object_by_address(ref);
    if (obj == null) {
      throw "reference not found in file";
    }
    return obj;
  }
  async get(y) {
    if (typeof y == "number") {
      return this._dereference(y);
    }
    var path = normpath(y);
    if (path == "/") {
      return this.file;
    }
    if (path == ".") {
      return this;
    }
    if (/^\//.test(path)) {
      return this.file.get(path.slice(1));
    }
    if (posix_dirname(path) != "") {
      var [next_obj, additional_obj] = path.split(/\/(.*)/);
    } else {
      var next_obj = path;
      var additional_obj = ".";
    }
    if (!(next_obj in this._links)) {
      throw next_obj + " not found in group";
    }
    var obj_name = normpath(this.name + "/" + next_obj);
    let link_target = this._links[next_obj];
    if (typeof link_target == "string") {
      try {
        return this.get(link_target);
      } catch (error) {
        return null;
      }
    }
    var dataobjs = new DataObjects(this.file._fh, link_target);
    await dataobjs.ready;
    if (dataobjs.is_dataset) {
      if (additional_obj != ".") {
        throw obj_name + " is a dataset, not a group";
      }
      return new Dataset(obj_name, dataobjs, this);
    } else {
      var new_group = new Group(obj_name, this);
      await new_group.init(dataobjs);
      return new_group.get(additional_obj);
    }
  }
  visit(func) {
    return this.visititems((name, obj) => func(name));
  }
  visititems(func) {
    var root_name_length = this.name.length;
    if (!/\/$/.test(this.name)) {
      root_name_length += 1;
    }
    var queue = this.values.slice();
    while (queue) {
      let obj = queue.shift();
      if (queue.length == 1)
        console.log(obj);
      let name = obj.name.slice(root_name_length);
      let ret = func(name, obj);
      if (ret != null) {
        return ret;
      }
      if (obj instanceof Group) {
        queue = queue.concat(obj.values);
      }
    }
    return null;
  }
  get attrs() {
    if (this._attrs == null) {
      this._attrs = this._dataobjects.get_attributes();
    }
    return this._attrs;
  }
};
var File = class extends Group {
  constructor(fh, filename, options) {
    super("/", null);
    this.ready = this.init(fh, filename, options);
  }
  async init(fh, filename, options) {
    var superblock = new SuperBlock(fh, 0);
    await superblock.ready;
    var offset = await superblock.get_offset_to_dataobjects();
    var dataobjects = new DataObjects(fh, offset);
    await dataobjects.ready;
    this.parent = this;
    this.file = this;
    this.name = "/";
    this._dataobjects = dataobjects;
    this._attrs = null;
    this._keys = null;
    this._fh = fh;
    this.filename = filename || "";
    this.mode = "r";
    this.userblock_size = 0;
    if (options && options.index) {
      this.index = options.index;
    } else {
      let index_offset;
      if (options && options.indexOffset) {
        index_offset = options.indexOffset;
      } else {
        const attrs = await this.attrs;
        if (attrs.hasOwnProperty("_index_offset")) {
          index_offset = attrs["_index_offset"];
        } else {
          const indexName = this.indexName || "_index";
          const index_link = await dataobjects.find_link(indexName);
          if (index_link) {
            index_offset = index_link[1];
          }
        }
      }
      if (index_offset) {
        try {
          const dataobject = new DataObjects(fh, index_offset);
          await dataobject.ready;
          const comp_index_data = await dataobject.get_data();
          const inflated = ungzip_1(comp_index_data);
          const json = new TextDecoder().decode(inflated);
          this.index = JSON.parse(json);
        } catch (e) {
          console.error(`Error loading index by offset ${e}`);
        }
      }
    }
    if (this.index && this.name in this.index) {
      this._links = this.index[this.name];
    } else {
      this._links = await dataobjects.get_links();
    }
  }
  _get_object_by_address(obj_addr) {
    if (this._dataobjects.offset == obj_addr) {
      return this;
    }
    return this.visititems((y) => {
      y._dataobjects.offset == obj_addr ? y : null;
    });
  }
};
var Dataset = class extends Array {
  constructor(name, dataobjects, parent) {
    super();
    this.parent = parent;
    this.file = parent.file;
    this.name = name;
    this._dataobjects = dataobjects;
    this._attrs = null;
    this._astype = null;
  }
  get value() {
    var data = this._dataobjects.get_data();
    if (this._astype == null) {
      return this.getValue(data);
    }
    return data.astype(this._astype);
  }
  get shape() {
    return this._dataobjects.shape;
  }
  get attrs() {
    return this._dataobjects.get_attributes();
  }
  get dtype() {
    return this._dataobjects.dtype;
  }
  get fillvalue() {
    return this._dataobjects.get_fillvalue();
  }
  async to_array() {
    const value = await this.value;
    const shape = await this.shape;
    return create_nested_array(value, shape);
  }
  async getValue(data) {
    const dtype = await this.dtype;
    if (dtype.startsWith("S")) {
      return (await data).map((s) => s.substr(0, s.indexOf("\0")));
    } else {
      return data;
    }
  }
};
function posix_dirname(p) {
  let sep = "/";
  let i = p.lastIndexOf(sep) + 1;
  let head = p.slice(0, i);
  let all_sep = new RegExp("^" + sep + "+$");
  let end_sep = new RegExp(sep + "$");
  if (head && !all_sep.test(head)) {
    head = head.replace(end_sep, "");
  }
  return head;
}
function normpath(path) {
  return path.replace(/\/(\/)+/g, "/");
}
function create_nested_array(value, shape) {
  const total_length = value.length;
  const dims_product = shape.reduce((previous, current) => previous * current, 1);
  if (total_length !== dims_product) {
    console.warn(`shape product: ${dims_product} does not match length of flattened array: ${total_length}`);
  }
  let output = value;
  const subdims = shape.slice(1).reverse();
  for (let dim of subdims) {
    const new_output = [];
    const { length } = output;
    let cursor = 0;
    while (cursor < length) {
      new_output.push(output.slice(cursor, cursor += dim));
    }
    output = new_output;
  }
  return output;
}
/*! pako 2.0.4 https://github.com/nodeca/pako @license (MIT AND Zlib) */

async function openH5File(options) {


    const isRemote = options.url !== undefined;
    let fileReader = getReaderFor(options);
    const bufferSize = options.bufferSize || 4000;
    if (isRemote) {
        fileReader = new BufferedFile3({file: fileReader, size: bufferSize});
    }
    const asyncBuffer = new AsyncBuffer(fileReader);

    // Optional external index -- this is not common
    const index = await readExternalIndex(options);
    const indexOffset = options.indexOffset;

    // Create HDF5 file
    const filename = getFilenameFor(options);
    const hdfFile = new File(asyncBuffer, filename, {index, indexOffset});
    await hdfFile.ready;
    return hdfFile
}

async function readExternalIndex(options) {

    let indexReader;
    if(options.index) {
        return options.index
    } else if (options.indexURL) {
        indexReader = new RemoteFile({url: options.indexURL});
    } else if (options.indexPath) {
        indexReader = new NodeLocalFile({path: options.indexPath});
    } else if (options.indexFile) {
        indexReader = new BrowserLocalFile({file: options.indexFile});
    }
    if (indexReader) {
        const indexFileContents = await indexReader.read();
        const indexFileJson = new TextDecoder().decode(indexFileContents);
        return JSON.parse(indexFileJson)
    } else {
        return undefined
    }
}


function getReaderFor(options) {
    if (options.url) { // An absolute or relative URL
        return new RemoteFile(options)
    } else if (options.path) { // A file path
        return new NodeLocalFile(options)
    } else if (options.file) { // A Browser file blob
        return new BrowserLocalFile(options.file)
    } else {
        throw Error("One of 'url', 'path (node only)', or 'file (browser only)' must be specified")
    }
}

function getFilenameFor(options) {
    if (options.url) {
        return getFilename(options.url)
    } else if (options.path) {
        return getFilename(options.path)
    } else if (options.file) {
        return options.file.name
    }
}

/**
 * Wraps an io.Reader in an interface jsfive-async expects*
 */
class AsyncBuffer {
    constructor(fileReader) {
        this.fileReader = fileReader;
    }

    async slice(start, end) {
        return this.fileReader.read(start, end - start)
    }
}

function getFilename(pathOrURL) {
    const idx = pathOrURL.lastIndexOf("/");
    return idx > 0 ? pathOrURL.substring(idx + 1) : pathOrURL
}

function unflattenIndex(index) {

    const makeObject = (name) => {
        return {name: name, children: []}
    };

    const objectMap = {};

    for (let key of Object.keys(index)) {

        let obj;
        if (objectMap.hasOwnProperty(key)) {
            obj = objectMap[key];
        } else {
            obj = makeObject(key);
            objectMap[key] = obj;
        }

        const tmp = index[key];
        for (let childName of Object.keys(tmp)) {
            let child;
            const childKey = key + (key.endsWith('/') ? '' : '/') + childName;
            if (objectMap.hasOwnProperty(childKey)) {
                child = objectMap[childKey];
            } else {
                child = makeObject(childKey);
                objectMap[childKey] = child;
            }
            obj.children.push(child);
        }

    }

    const rootObject = objectMap['/'];

    return rootObject

}

export { openH5File, unflattenIndex };
