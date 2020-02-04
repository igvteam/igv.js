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

import FeatureParser from "./featureParsers.js";
import SegParser from "./segParser.js";
import VcfParser from "../variant/vcfParser.js";
import GCNVParser from "../gcnv/gcnvParser.js";
import loadBamIndex from "../bam/bamIndex.js";
import loadTribbleIndex from "./tribble.js"
import igvxhr from "../igvxhr.js";
import {bgzBlockSize, unbgzf} from '../bam/bgzf.js';
import {isFilePath} from '../util/fileUtils.js'
import {isString} from "../util/stringUtils.js";
import {decodeDataURI, parseUri} from "../util/uriUtils.js";
import {buildOptions} from "../util/igvUtils.js";

const MAX_GZIP_BLOCK_SIZE = (1 << 16);

/**
 * Reader for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
const FeatureFileReader = function (config, genome) {

    var uriParts;

    this.config = config || {};
    this.genome = genome;
    this.indexURL = config.indexURL;
    this.indexed = config.indexed;

    if (isFilePath(this.config.url)) {
        this.filename = this.config.url.name;
    } else if (isString(this.config.url) && this.config.url.startsWith('data:')) {
        this.indexed = false;  // by definition
        this.dataURI = config.url;
    } else {
        uriParts = parseUri(this.config.url);
        this.filename = config.filename || uriParts.file;
    }

    this.format = this.config.format;

    this.parser = this.getParser(this.format, this.config.decode, this.config);
};

/**
 * Return a promise to load features for the genomic interval
 * @param chr
 * @param start
 * @param end
 */
FeatureFileReader.prototype.readFeatures = async function (chr, start, end) {

    const index = await this.getIndex()
    if (index) {
        return this.loadFeaturesWithIndex(chr, start, end);
    } else if (this.dataURI) {
        return this.loadFeaturesFromDataURI();
    } else {
        return this.loadFeaturesNoIndex()
    }

};

FeatureFileReader.prototype.readHeader = async function () {

    if (!this.header) {


        let header

        if (this.dataURI) {

            const features = await this.loadFeaturesFromDataURI(this.dataURI)
            header = this.header || {};
            header.features = features;

        } else {
            let index;
            if (this.config.indexURL || this.config.indexed) {
                index = await this.getIndex();

                if (!index) {
                    // Note - it should be impossible to get here
                    const iurl = this.config.indexURL || this.config.url;
                    throw new Error("Unable to load index: " + iurl);
                }

                // Load the file header (not HTTP header) for an indexed file.
                let maxSize = "vcf" === this.config.format ? 65000 : 1000
                if (index.tabix) {
                    const bsizeOptions = buildOptions(this.config, {
                        range: {
                            start: index.firstAlignmentBlock,
                            size: 26
                        }
                    });
                    const abuffer = await igvxhr.loadArrayBuffer(this.config.url, bsizeOptions)
                    const bsize = bgzBlockSize(abuffer)
                    maxSize = index.firstAlignmentBlock + bsize;
                }
                const options = buildOptions(this.config, {bgz: index.tabix, range: {start: 0, size: maxSize}});
                const data = await igvxhr.loadString(this.config.url, options)
                header = this.parser.parseHeader(data);

            } else {
                // If this is a non-indexed file we will load all features in advance
                const features = await this.loadFeaturesNoIndex()
                header = this.header || {};
                header.features = features;
            }

            if (header && this.parser) {
                this.parser.header = header;
            }

            this.header = header;
            return header;
        }
    }
    return this.header;

};

FeatureFileReader.prototype.getParser = function (format, decode, config) {

    switch (format) {
        case "vcf":
            return new VcfParser(config);
        case "seg" :
            return new SegParser();
        case "gcnv" :
            return new GCNVParser();
        default:
            return new FeatureParser(format, decode, this.config);
    }

};


FeatureFileReader.prototype.loadFeaturesNoIndex = async function () {

    const options = buildOptions(this.config);    // Add oauth token, if any
    const data = await igvxhr.loadString(this.config.url, options)

    this.header = this.parser.parseHeader(data);
    if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
        this.format = 'gff3';
    }
    return this.parser.parseFeatures(data);   // <= PARSING DONE HERE


};

FeatureFileReader.prototype.loadFeaturesWithIndex = async function (chr, start, end) {

    //console.log("Using index");
    const config = this.config
    const parser = this.parser
    const tabix = this.index.tabix
    const refId = tabix ? this.index.sequenceIndexMap[chr] : chr
    const allFeatures = [];
    const genome = this.genome;

    const blocks = this.index.blocksForRange(refId, start, end);

    if (!blocks || blocks.length === 0) {
        return [];
    } else {

        for (let block of blocks) {

            const startPos = block.minv.block
            const startOffset = block.minv.offset
            const endOffset = block.maxv.offset
            let endPos

            if (tabix) {
                let lastBlockSize = 0
                if (endOffset > 0) {
                    const bsizeOptions = buildOptions(config, {
                        range: {
                            start: block.maxv.block,
                            size: 26
                        }
                    });
                    const abuffer = await igvxhr.loadArrayBuffer(config.url, bsizeOptions)
                    lastBlockSize = bgzBlockSize(abuffer)
                }
                endPos = block.maxv.block + lastBlockSize;
            } else {
                endPos = block.maxv.block;
            }

            const options = buildOptions(config, {
                range: {
                    start: startPos,
                    size: endPos - startPos + 1
                }
            });

            if (tabix) {
                const data = await igvxhr.loadArrayBuffer(config.url, options);
                const inflated = unbgzf(data);
                parse(inflated);

            } else {
                const inflated = await igvxhr.loadString(config.url, options);
                parse(inflated);
            }

            function parse(inflated) {
                const slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                const slicedFeatures = parser.parseFeatures(slicedData);

                // Filter features not in requested range.
                let inInterval = false;
                for (let i=0; i< slicedFeatures.length; i++) {
                    const f = slicedFeatures[i];
                    if (genome.getChromosomeName(f.chr) !== chr) {
                        if (allFeatures.length === 0) {
                            continue;  //adjacent chr to the left
                        } else {
                            break; //adjacent chr to the right
                        }
                    }
                    if (f.start > end) {
                        allFeatures.push(f);  // First feature beyond interval
                        break;
                    }
                    if (f.end >= start && f.start <= end) {
                        if(!inInterval) {
                            inInterval = true;
                            if(i > 0) {
                                allFeatures.push(slicedFeatures[i - 1]);
                            } else {
                                // TODO -- get block before this one for first feature;
                            }
                        }
                        allFeatures.push(f);
                    }
                }
            }
        }
    }

    allFeatures.sort(function (a, b) {
        return a.start - b.start;
    });

    return allFeatures;
}


FeatureFileReader.prototype.getIndex = async function () {

    if (this.index !== undefined || this.indexed === false) {
        return this.index;
    }
    const indexOrUndefined = await this.loadIndex()
    if (indexOrUndefined) {
        this.index = indexOrUndefined;
        this.indexed = true;
    } else {
        this.indexed = false;
    }
    return this.index;
};

/**
 * Return a Promise for the async loaded index
 */
FeatureFileReader.prototype.loadIndex = async function () {

    let idxFile = this.config.indexURL;
    try {
        let index;
        if (this.filename.endsWith('.gz') || this.filename.endsWith('.bgz')) {
            if (!idxFile) {
                idxFile = this.config.url + '.tbi';
            }
            index = await loadBamIndex(idxFile, this.config, true, this.genome);

        } else {
            if (!idxFile) {
                idxFile = this.config.url + '.idx';
            }
            index = await loadTribbleIndex(idxFile, this.config, this.genome);
        }
        return index;
    } catch (e) {
        if (this.config.indexURL || this.config.indexed) {
            throw e;
        } else {
            this.indexed = false;
            console.error(e);
        }
    }
};


FeatureFileReader.prototype.loadFeaturesFromDataURI = async function () {

    const plain = decodeDataURI(this.dataURI)
    this.header = this.parser.parseHeader(plain);
    if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
        this.format = 'gff3';
    }
    const features = this.parser.parseFeatures(plain);
    return features;
};


export default FeatureFileReader;

