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

import FeatureParser from "./featureParser.js";
import SegParser from "./segParser.js";
import VcfParser from "../variant/vcfParser.js";
import GCNVParser from "../gcnv/gcnvParser.js";
import loadBamIndex from "../bam/bamIndex.js";
import loadTribbleIndex from "./tribble.js"
import igvxhr from "../igvxhr.js";
import {bgzBlockSize, unbgzf} from '../bam/bgzf.js';
import {buildOptions} from "../util/igvUtils.js";
import GWASParser from "../gwas/gwasParser.js"
import AEDParser from "../aed/AEDParser.js"
import loadCsiIndex from "../bam/csiIndex.js"
import {FileUtils, StringUtils, URIUtils} from "../../node_modules/igv-utils/src/index.js";

const isString = StringUtils.isString;

/**
 * Reader for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
class FeatureFileReader {

    constructor(config, genome) {

        var uriParts;

        this.config = config || {};
        this.genome = genome;
        this.indexURL = config.indexURL;
        this.indexed = config.indexed;

        if (FileUtils.isFilePath(this.config.url)) {
            this.filename = this.config.url.name;
        } else if (isString(this.config.url) && this.config.url.startsWith('data:')) {
            this.indexed = false;  // by definition
            this.dataURI = config.url;
        } else {
            uriParts = URIUtils.parseUri(this.config.url);
            this.filename = config.filename || uriParts.file;
        }
        this.format = this.config.format;
        this.parser = this.getParser(this.format, this.config.decode, this.config);

        if (this.config.format === "vcf" && !this.config.indexURL) {
            console.warn("Warning: index file not specified.  The entire vcf file will be loaded.");
        }
    }

    /**
     * Return a promise to load features for the genomic interval
     * @param chr
     * @param start
     * @param end
     */
    async readFeatures(chr, start, end) {

        const index = await this.getIndex()
        if (index) {
            return this.loadFeaturesWithIndex(chr, start, end);
        } else if (this.dataURI) {
            this.loadFeaturesFromDataURI();
        } else {
            return this.loadFeaturesNoIndex()
        }

    }

    async readHeader() {

        if (this.dataURI) {
            return this.loadFeaturesFromDataURI(this.dataURI)
        } else {

            let index;

            if (this.config.indexURL) {
                index = await this.getIndex();
                if (!index) {
                    // Note - it should be impossible to get here
                    throw new Error("Unable to load index: " + this.config.indexURL);
                }

                // Load the file header (not HTTP header) for an indexed file.
                let maxSize = "vcf" === this.config.format ? 65000 : 1000
                const dataStart = index.firstAlignmentBlock ? index.firstAlignmentBlock : 0;

                if (index.tabix) {
                    const bsizeOptions = buildOptions(this.config, {
                        range: {
                            start: dataStart,
                            size: 26
                        }
                    });
                    const abuffer = await igvxhr.loadArrayBuffer(this.config.url, bsizeOptions)
                    const bsize = bgzBlockSize(abuffer)
                    maxSize = dataStart + bsize;
                }
                const options = buildOptions(this.config, {bgz: index.tabix, range: {start: 0, size: maxSize}});
                const data = await igvxhr.loadString(this.config.url, options)
                const header = this.parser.parseHeader(data);
                return {header};

            } else {
                // If this is a non-indexed file we will load all features in advance
                return this.loadFeaturesNoIndex()
            }
        }
    }


    getParser(format, decode, config) {
        switch (format) {
            case "vcf":
                return new VcfParser(config);
            case "seg" :
                return new SegParser();
            case "gcnv" :
                return new GCNVParser();
            case "gwas" :
                return new GWASParser(config);
            case "aed" :
                return new AEDParser(format, decode, config);
            default:
                return new FeatureParser(format, decode, config);
        }
    }

    async loadFeaturesNoIndex() {

        const options = buildOptions(this.config);    // Add oauth token, if any
        const data = await igvxhr.loadString(this.config.url, options)
        const header = this.parser.parseHeader(data);
        const features = this.parser.parseFeatures(data);   // <= PARSING DONE HERE
        return {features, header};
    }

    async loadFeaturesWithIndex(chr, start, end) {

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
                    for (let i = 0; i < slicedFeatures.length; i++) {
                        const f = slicedFeatures[i];
                        const canonicalChromosome = genome ? genome.getChromosomeName(f.chr) : f.chr;
                        if (canonicalChromosome !== chr) {
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
                            if (!inInterval) {
                                inInterval = true;
                                if (i > 0) {
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

        return {features: allFeatures};
    }

    async getIndex() {
        if (this.index || !this.config.indexURL) {
            return this.index;
        } else {
            this.index = await this.loadIndex()
            return this.index;
        }
    }

    /**
     * Return a Promise for the async loaded index
     */
    async loadIndex() {
        const indexURL = this.config.indexURL;
        let indexFilename;
        if (FileUtils.isFilePath(indexURL)) {
            indexFilename = indexURL.name;
        } else {
            const uriParts = URIUtils.parseUri(indexURL);
            indexFilename = uriParts.file;
        }
        const isTabix = indexFilename.endsWith(".tbi") || indexFilename.endsWith(".csi")
        let index;
        if (isTabix) {
            if (indexFilename.endsWith(".tbi")) {
                index = await loadBamIndex(indexURL, this.config, true, this.genome);
            } else {
                index = await loadCsiIndex(indexURL, this.config, true, this.genome);
            }
        } else {
            index = await loadTribbleIndex(indexURL, this.config, this.genome);
        }
        return index;
    }

    async loadFeaturesFromDataURI() {

        const plain = URIUtils.decodeDataURI(this.dataURI)
        const header = this.parser.parseHeader(plain);
        if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
            this.format = 'gff3';
        }
        const features = this.parser.parseFeatures(plain);
        return {features, header};
    }

}

export default FeatureFileReader;

