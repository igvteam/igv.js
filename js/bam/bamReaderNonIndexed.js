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

import AlignmentContainer from "./alignmentContainer.js";
import BamUtils from "./bamUtils.js";
import {igvxhr, StringUtils, BGZip, FeatureCache} from "../../node_modules/igv-utils/src/index.js";
import {buildOptions} from "../util/igvUtils.js";

const isString = StringUtils.isString;


/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
class BamReaderNonIndexed {

    constructor(config, genome) {
        this.config = config;
        this.genome = genome;
        this.bamPath = config.url;
        this.isDataUri = isString(config.url) && config.url.startsWith("data:");
        BamUtils.setReaderDefaults(this, config);
    }

    // Return an alignment container
    async readAlignments(chr, bpStart, bpEnd) {

        if (this.alignmentCache) {
            const header = this.header;
            const queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;
            const qAlignments = this.alignmentCache.queryFeatures(queryChr, bpStart, bpEnd);
            const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.samplingWindowSize, this.samplingDepth, this.pairsSupported, this.alleleFreqThreshold);
            for (let a of qAlignments) {
                alignmentContainer.push(a);
            }
            alignmentContainer.finish();
            return alignmentContainer;

        } else {
            if (this.isDataUri) {
                const data = decodeDataURI(this.bamPath);
                const unc = BGZip.unbgzf(data.buffer);
                this.parseAlignments(unc);
                return this.fetchAlignments(chr, bpStart, bpEnd);
            } else {
                const arrayBuffer = await igvxhr.loadArrayBuffer(this.bamPath, buildOptions(this.config));
                const unc = BGZip.unbgzf(arrayBuffer);
                this.parseAlignments(unc);
                return this.fetchAlignments(chr, bpStart, bpEnd);
            }
        }

    }

    parseAlignments(data) {
        const alignments = [];
        this.header = BamUtils.decodeBamHeader(data);
        BamUtils.decodeBamRecords(data, this.header.size, alignments, this.header.chrNames);
        this.alignmentCache = new FeatureCache(alignments, this.genome);
    }

    fetchAlignments(chr, bpStart, bpEnd) {
        const queryChr = this.header.chrAliasTable.hasOwnProperty(chr) ? this.header.chrAliasTable[chr] : chr;
        const features = this.alignmentCache.queryFeatures(queryChr, bpStart, bpEnd);
        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.samplingWindowSize, this.samplingDepth, this.pairsSupported);
        for (let feature of features) {
            alignmentContainer.push(feature);
        }
        alignmentContainer.finish();
        return alignmentContainer;
    }

}

function decodeDataURI(dataURI) {

    const split = dataURI.split(',');
    const info = split[0].split(':')[1];
    let dataString = split[1];

    if (info.indexOf('base64') >= 0) {
        dataString = atob(dataString);
    } else {
        dataString = decodeURI(dataString);
    }

    const bytes = new Uint8Array(dataString.length);
    for (var i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i);
    }
    return bytes;
}


export default BamReaderNonIndexed;
