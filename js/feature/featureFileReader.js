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
import igvxhr from "../igvxhr.js";
import {bgzBlockSize, unbgzf} from '../bam/bgzf.js';
import {buildOptions} from "../util/igvUtils.js";
import GWASParser from "../gwas/gwasParser.js";
import AEDParser from "../aed/AEDParser.js";
import {FileUtils, StringUtils, URIUtils} from "../../node_modules/igv-utils/src/index.js";
import {loadIndex} from "../bam/indexFactory.js";
import getDataWrapper from "./dataWrapper.js";
import TabixBufferedLineReader from "../util/tabixBufferedLineReader.js";


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

        this.parser = this.getParser(this.config);

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

        const index = await this.getIndex();
        if (index) {
            this.indexed = true;
            return this.loadFeaturesWithIndex(chr, start, end);
        } else if (this.dataURI) {
            this.indexed = false;
            return this.loadFeaturesFromDataURI();
        } else {
            this.indexed = false;
            return this.loadFeaturesNoIndex()
        }

    }

    async readHeader() {

        if (this.dataURI) {
            this.loadFeaturesFromDataURI(this.dataURI);
            return this.header;
        } else {

            if (this.config.indexURL) {
                const index = await this.getIndex();
                if (!index) {
                    // Note - it should be impossible to get here
                    throw new Error("Unable to load index: " + this.config.indexURL);
                }

                let dataWrapper;
                if (index.tabix) {
                    dataWrapper = new TabixBufferedLineReader(this.config);
                } else {
                   // Tribble
                   const maxSize = Object.values(index.chrIndex)
                        .flatMap(chr => chr.blocks)
                        .map(block => block.min)
                        .reduce((previous, current) =>
                            Math.min(previous, current), Number.MAX_SAFE_INTEGER);
                
                    const options = buildOptions(this.config, {bgz: index.tabix, range: {start: 0, size: maxSize}});
                    const data = await igvxhr.loadString(this.config.url, options)
                    dataWrapper = getDataWrapper(data);
                }


                this.header = await this.parser.parseHeader(dataWrapper);  // Cache header, might be needed to parse features
                return this.header;

            } else {
                // If this is a non-indexed file we will load all features in advance
                const options = buildOptions(this.config);
                const data = await igvxhr.loadString(this.config.url, options);
                let dataWrapper = getDataWrapper(data);
                this.header = await this.parser.parseHeader(dataWrapper);

                // Reset data wrapper and parse features
                dataWrapper = getDataWrapper(data);
                this.features = await this.parser.parseFeatures(dataWrapper);   // cache features
                return this.header;
            }
        }
    }


    getParser(config) {

        switch (config.format) {
            case "vcf":
                return new VcfParser(config);
            case "seg" :
                return new SegParser();
            case "gwas" :
                return new GWASParser(config);
            case "aed" :
                return new AEDParser(config);
            default:
                return new FeatureParser(config);
        }
    }

    async loadFeaturesNoIndex() {

        if (this.features) {
            // An optimization hack for non-indexed files, features are temporarily cached when header is read.
            const tmp = this.features;
            delete this.features;
            return tmp;
        } else {
            const options = buildOptions(this.config);    // Add oauth token, if any
            const data = await igvxhr.loadString(this.config.url, options)
            if (!this.header) {
                const dataWrapper = getDataWrapper(data);
                this.header = await this.parser.parseHeader(dataWrapper);
            }
            const dataWrapper = getDataWrapper(data);
            const features = await this.parser.parseFeatures(dataWrapper);   // <= PARSING DONE HERE
            return features;
        }
    }

    async loadFeaturesWithIndex(chr, start, end) {

        //console.log("Using index"
        const config = this.config
        const parser = this.parser
        const tabix = this.index.tabix
        const refId = tabix ? this.index.sequenceIndexMap[chr] : chr
        if (refId === undefined) {
            return [];
        }

        const genome = this.genome;
        const blocks = this.index.blocksForRange(refId, start, end);
        if (!blocks || blocks.length === 0) {
            return [];
        } else {
            const allFeatures = [];
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

                let inflated;
                if (tabix) {
                    const data = await igvxhr.loadArrayBuffer(config.url, options);
                    inflated = unbgzf(data);
                } else {
                    inflated = await igvxhr.loadString(config.url, options);
                }

                const slicedData = startOffset ? inflated.slice(startOffset) : inflated;
                const dataWrapper = getDataWrapper(slicedData);
                const slicedFeatures = await parser.parseFeatures(dataWrapper);

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
            allFeatures.sort(function (a, b) {
                return a.start - b.start;
            });

            return allFeatures;
        }
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
        return loadIndex(indexURL, this.config, this.genome);
    }

    async loadFeaturesFromDataURI() {

        if (this.features) {
            // An optimization hack for non-indexed files, features are temporarily cached when header is read.
            const tmp = this.features;
            delete this.features;
            return tmp;
        } else {
            const plain = URIUtils.decodeDataURI(this.dataURI)
            let dataWrapper = getDataWrapper(plain);
            this.header = await this.parser.parseHeader(dataWrapper);
            if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
                this.format = 'gff3';
            }

            dataWrapper = getDataWrapper(plain);
            this.features = await this.parser.parseFeatures(dataWrapper);
            return this.features;
        }
    }

}

export default FeatureFileReader;

