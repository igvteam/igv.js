import BinaryParser from "../binary.js";
import igvxhr from "../igvxhr.js";
import {Zlib} from "../../node_modules/igv-utils/src/index.js";
import {buildOptions} from "../util/igvUtils.js";
import {parseCsiIndex} from "./csiIndex.js";
import {parseBamIndex, parseTabixIndex} from "./bamIndex.js";
import {parseTribbleIndex} from "../feature/tribble.js";

const CSI1_MAGIC = 21582659 // CSI\1
const CSI2_MAGIC = 38359875 // CSI\2
const BAI_MAGIC = 21578050;
const TABIX_MAGIC = 21578324;
const TRIBBLE_MAGIC = 1480870228;   //  byte[]{'T', 'I', 'D', 'X'};

/**
 * @param indexURL
 * @param config
 * @param tabix
 *
 */
async function loadIndex(indexURL, config, genome) {

    let arrayBuffer = await igvxhr.loadArrayBuffer(indexURL, buildOptions(config));
    let dv = new DataView(arrayBuffer);

    // Some indexs are gzipped, specifically tabix, and csi.  Bam (bai) are not.  Tribble is usually not.
    // Check first 2 bytes of file for gzip magic number, and inflate if neccessary
    if (dv.getUint8(0) === 0x1f && dv.getUint8(1) === 0x8b) {    // gzipped
        const inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer))
        arrayBuffer = inflate.decompress().buffer;
        dv = new DataView(arrayBuffer);
    }

    const magic = dv.getInt32(0, true);
    switch (magic) {
        case BAI_MAGIC:
            return parseBamIndex(arrayBuffer, genome);
        case TABIX_MAGIC:
            return parseTabixIndex(arrayBuffer, genome);
        case CSI1_MAGIC:
            return parseCsiIndex(arrayBuffer, genome);
        case TRIBBLE_MAGIC:
            return parseTribbleIndex(arrayBuffer, genome);
        case CSI2_MAGIC:
            throw Error("CSI version 2 is not supported.");
        default:
            throw Error(`Unrecognized index type: ${indexURL}`);
    }
}

export {loadIndex}