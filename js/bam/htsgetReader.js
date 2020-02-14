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
import igvxhr from "../igvxhr.js";
import {unbgzf} from './bgzf.js';

const HtsgetReader = function (config, genome) {
    this.config = config;
    this.genome = genome;
    BamUtils.setReaderDefaults(this, config);
};

HtsgetReader.prototype.readAlignments = async function (chr, start, end, retryCount) {

    if (this.config.format && this.config.format.toUpperCase() !== "BAM") {
        throw  Error(`htsget format ${this.config.format} is not supported`);
    }

    const genome = this.genome;
    let queryChr;
    if (this.header) {
        queryChr = this.header.chrAliasTable.hasOwnProperty(chr) ? this.header.chrAliasTable[chr] : chr;
    } else {
        queryChr = chr;
    }

    let endpointURL;
    if(!this.config.url) {
        endpointURL = this.config.endpoint + '/reads/';   // Backward compatibility
    } else {
        endpointURL = this.config.url + this.config.endpoint;
    }

    const url = endpointURL + this.config.id + '?format=BAM' +
        '&referenceName=' + queryChr +
        '&start=' + start +
        '&end=' + end;

    const data = await igvxhr.loadJson(url, this.config);
    const dataArr = await loadUrls(data.htsget.urls);
    const compressedData = concatArrays(dataArr);  // In essence a complete bam file
    const unc = unbgzf(compressedData.buffer);
    const ba = unc;

    if (!this.header) {
        this.header = BamUtils.decodeBamHeader(ba, genome);
    }

    const chrIdx = this.header.chrToIndex[chr];
    const alignmentContainer = new AlignmentContainer(chr, start, end, this.samplingWindowSize, this.samplingDepth, this.pairsSupported, this.alleleFreqThreshold);
    BamUtils.decodeBamRecords(ba, this.header.size, alignmentContainer, this.header.chrNames, chrIdx, start, end);
    alignmentContainer.finish();

    if (alignmentContainer.alignments.length === 0) {
        if (chrIdx === undefined && this.header.chrAliasTable.hasOwnProperty(chr) && !retryCount) {
            queryChr = this.header.chrAliasTable[chr]
            return this.readAlignments(queryChr, start, end, 1);
        } else {
            return alignmentContainer;
        }
    } else {
        return alignmentContainer;
    }

}


function loadUrls(urls) {

    const promiseArray = [];

    urls.forEach(function (urlData) {

        if (urlData.url.startsWith('data:')) {
            // this is a data-uri
            promiseArray.push(Promise.resolve(dataUriToBytes(urlData.url)));

        } else {
            const options = {};

            if (urlData.headers) {
                options.headers = urlData.headers;
                if (options.headers.hasOwnProperty("referer")) {
                    delete options.headers["referer"];
                }
            }

            promiseArray.push(new Promise(function (fulfill, reject) {
                igvxhr.loadArrayBuffer(urlData.url, options)
                    .then(function (buffer) {
                        fulfill(new Uint8Array(buffer));
                    });
            }));
        }
    });

    return Promise.all(promiseArray);
}

/**
 * Concatenate a list of Uint8Arrays
 * @param arrays
 */
function concatArrays(arrays) {

    let len = 0;
    arrays.forEach(function (a) {
        len += a.length;
    });

    let offset = 0;
    const newArray = new Uint8Array(len);
    arrays.forEach(function (a) {
        newArray.set(a, offset);
        offset += a.length;
    });

    return newArray;

}

function dataUriToBytes(dataUri) {

    const split = dataUri.split(',');
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

export default HtsgetReader;