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

import HtsgetReader from "./htsgetReader.js";
import AlignmentContainer from "../bam/alignmentContainer.js";
import BamUtils from "../bam/bamUtils.js";
import {BGZip} from "../../node_modules/igv-utils/src/index.js";

class HtsgetBamReader extends HtsgetReader {

    constructor(config, genome) {
        super(config, genome);
        BamUtils.setReaderDefaults(this, config);
    }


    async readAlignments(chr, start, end) {

        if (!this.header) {
            const compressedData = await this.readHeader();
            const ba = BGZip.unbgzf(compressedData.buffer);
            this.header = BamUtils.decodeBamHeader(ba, this.genome);
            this.chrAliasTable = new Map();
            for(let key of Object.keys(this.header.chrAliasTable)) {
                this.chrAliasTable.set(key, this.header.chrAliasTable[key]);
            }
        }

        let queryChr = this.chrAliasTable.has(chr) ? this.chrAliasTable.get(chr) : chr;

        const compressedData = await this.readData(queryChr, start, end);

        // BAM decoding
        const ba = BGZip.unbgzf(compressedData.buffer);

        const chrIdx = this.header.chrToIndex[chr];
        const alignmentContainer = new AlignmentContainer(chr, start, end, this.samplingWindowSize, this.samplingDepth, this.pairsSupported, this.alleleFreqThreshold);
        BamUtils.decodeBamRecords(ba, this.header.size, alignmentContainer, this.header.chrNames, chrIdx, start, end);
        alignmentContainer.finish();

        return alignmentContainer;

    }

}


export default HtsgetBamReader;