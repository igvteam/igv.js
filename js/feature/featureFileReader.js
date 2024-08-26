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

import FeatureParser from "./featureParser.js"
import SegParser from "./segParser.js"
import VcfParser from "../variant/vcfParser.js"
import {BGZip, FileUtils, igvxhr, URIUtils} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import GWASParser from "../gwas/gwasParser.js"
import AEDParser from "../aed/AEDParser.js"
import {loadIndex} from "../bam/indexFactory.js"
import getDataWrapper from "./dataWrapper.js"
import BGZLineReader from "../util/bgzLineReader.js"
import BGZBlockLoader from "../bam/bgzBlockLoader.js"
import QTLParser from "../qtl/qtlParser.js"

// Conservative estimate of the maximum allowed string length
const MAX_STRING_LENGTH = 500000000

/**
 * Reader for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
class FeatureFileReader {

    sequenceNames

    constructor(config, genome) {

        this.config = config || {}
        this.genome = genome
        this.indexURL = config.indexURL
        this.indexed = config.indexed || this.indexURL !== undefined
        this.queryable = this.indexed

        if (FileUtils.isFile(this.config.url)) {
            this.filename = this.config.url.name
        } else if (isDataURL(this.config.url)) {
            this.indexed = false  // by definition
            this.dataURI = config.url
        } else {
            const uriParts = URIUtils.parseUri(this.config.url)
            this.filename = config.filename || uriParts.file
        }

        this.parser = this.getParser(this.config)

        if (this.config.format === "vcf" && !this.config.indexURL) {
            console.warn("Warning: index file not specified.  The entire vcf file will be loaded.")
        }

    }

    async defaultVisibilityWindow() {
        if (this.config.indexURL) {
            const index = await this.getIndex()
            if (index && index.lastBlockPosition) {
                let gl = 0
                const s = 10000
                for (let c of index.sequenceNames) {
                    const chromosome = this.genome.getChromosome(c)
                    if (chromosome) {
                        gl += chromosome.bpLength
                    }
                }
                return Math.round((gl / index.lastBlockPosition) * s)
            }
        }
    }

    /**
     * Return a promise to load features for the genomic interval
     * @param chr
     * @param start
     * @param end
     */
    async readFeatures(chr, start, end) {

        // insure that header has been loaded
        if (!this.dataURI && !this.header) {
            await this.readHeader()
        }

        let allFeatures
        const index = await this.getIndex()
        if (index) {
            this.indexed = true
            allFeatures = await this.loadFeaturesWithIndex(chr, start, end)
        } else if (this.dataURI) {
            this.indexed = false
            allFeatures = await this.loadFeaturesFromDataURI()
        } else if ("service" === this.config.sourceType) {
            allFeatures = await this.loadFeaturesFromService(chr, start, end)
        } else {
            this.indexed = false
            allFeatures = await this.loadFeaturesNoIndex()
        }

        allFeatures.sort(function (a, b) {
            if (a.chr === b.chr) {
                return a.start - b.start
            } else {
                return a.chr.localeCompare(b.chr)
            }
        })

        return allFeatures
    }

    async readHeader() {

        if (this.dataURI) {
            await this.loadFeaturesFromDataURI(this.dataURI)
            return this.header
        } else if (this.config.indexURL) {
            const index = await this.getIndex()
            if (!index) {
                // Note - it should be impossible to get here
                throw new Error("Unable to load index: " + this.config.indexURL)
            }
            this.sequenceNames = new Set(index.sequenceNames)

            let dataWrapper
            if (index.tabix) {
                this._blockLoader = new BGZBlockLoader(this.config)
                dataWrapper = new BGZLineReader(this.config)
            } else {
                // Tribble
                const maxSize = Object.values(index.chrIndex)
                    .flatMap(chr => chr.blocks)
                    .map(block => block.max)
                    .reduce((previous, current) =>
                        Math.min(previous, current), Number.MAX_SAFE_INTEGER)

                const options = buildOptions(this.config, {bgz: index.tabix, range: {start: 0, size: maxSize}})
                const data = await igvxhr.loadString(this.config.url, options)
                dataWrapper = getDataWrapper(data)
            }

            this.header = await this.parser.parseHeader(dataWrapper)
            return this.header

        } else if ("service" === this.config.sourceType) {
            if (this.config.seqnamesURL) {
                // Side effect, a bit ugly
                const options = buildOptions(this.config, {})
                const seqnameString = await igvxhr.loadString(this.config.seqnamesURL, options)
                if (seqnameString) {
                    this.sequenceNames = new Set(seqnameString.split(",").map(sn => sn.trim()).filter(sn => sn))
                }
            }
            if (this.config.headerURL) {
                const options = buildOptions(this.config, {})
                const data = await igvxhr.loadString(this.config.headerURL, options)
                const dataWrapper = getDataWrapper(data)
                this.header = await this.parser.parseHeader(dataWrapper)  // Cache header, might be needed to parse features
                return this.header
            }

        } else {

            let data

            if (this.config._filecontents) {
                // In rare instances the entire file must be read and decoded to determine the file format.
                // When this occurs the file contents are temporarily stashed to prevent needing to read the file twice
                data = this.config._filecontents
                delete this.config._filecontents
            } else {
                // If this is a non-indexed file we will load all features in advance
                const options = buildOptions(this.config)
                data = await igvxhr.loadByteArray(this.config.url, options)
            }

            // If the data size is < max string length decode entire string with TextDecoder.  This is much faster
            // than decoding by line
            if (data.length < MAX_STRING_LENGTH) {
                data = new TextDecoder().decode(data)
            }


            let dataWrapper = getDataWrapper(data)
            this.header = await this.parser.parseHeader(dataWrapper)

            // Reset data wrapper and parse features
            dataWrapper = getDataWrapper(data)
            this.features = await this.parser.parseFeatures(dataWrapper)   // cache features

            // Extract chromosome names
            this.sequenceNames = new Set()
            for (let f of this.features) this.sequenceNames.add(f.chr)

            return this.header
        }

    }


    getParser(config) {

        switch (config.format) {
            case "vcf":
                return new VcfParser(config)
            case "seg" :
                return new SegParser("seg")
            case "mut":
                return new SegParser("mut")
            case "maf":
                return new SegParser("maf")
            case "gwas" :
                return new GWASParser(config)
            case "qtl":
                return new QTLParser(config)
            case "aed" :
                return new AEDParser(config)
            default:
                return new FeatureParser(config)
        }
    }

    async loadFeaturesNoIndex() {

        if (this.features) {
            // An optimization hack for non-indexed files, features are temporarily cached when header is read.
            const tmp = this.features
            delete this.features
            return tmp
        } else {
            const options = buildOptions(this.config)    // Add oauth token, if any
            const data = await igvxhr.loadByteArray(this.config.url, options)
            if (!this.header) {
                const dataWrapper = getDataWrapper(data)
                this.header = await this.parser.parseHeader(dataWrapper)
            }
            const dataWrapper = getDataWrapper(data)
            const features = []
            await this._parse(features, dataWrapper)   // <= PARSING DONE HERE
            return features
        }
    }

    async loadFeaturesWithIndex(chr, start, end) {

        //console.log("Using index"
        const config = this.config
        const parser = this.parser
        const tabix = this.index.tabix

        const refId = tabix ? this.index.sequenceIndexMap[chr] : chr
        if (refId === undefined) {
            return []
        }

        const chunks = this.index.chunksForRange(refId, start, end)
        if (!chunks || chunks.length === 0) {
            return []
        } else {
            const allFeatures = []
            for (let chunk of chunks) {

                let inflated
                if (tabix) {
                    inflated = await this._blockLoader.getData(chunk.minv, chunk.maxv)
                } else {
                    const options = buildOptions(config, {
                        range: {
                            start: chunk.minv.block,
                            size: chunk.maxv.block - chunk.minv.block + 1
                        }
                    })
                    inflated = await igvxhr.loadString(config.url, options)
                }

                const slicedData = chunk.minv.offset ? inflated.slice(chunk.minv.offset) : inflated
                const dataWrapper = getDataWrapper(slicedData)
                await this._parse(allFeatures, dataWrapper, chr, end, start)

            }

            return allFeatures
        }
    }

    async loadFeaturesFromService(chr, start, end) {

        let url
        if (typeof this.config.url === 'function') {
            url = this.config.url({chr, start, end})
        } else {
            url = this.config.url
                .replace("$CHR", chr)
                .replace("$START", start)
                .replace("$END", end)
        }
        const options = buildOptions(this.config)    // Adds oauth token, if any
        const data = await igvxhr.loadString(url, options)
        const dataWrapper = getDataWrapper(data)
        const features = []
        await this._parse(features, dataWrapper)   // <= PARSING DONE HERE
        return features

    }

    async _parse(allFeatures, dataWrapper, chr, end, start) {

        let features = await this.parser.parseFeatures(dataWrapper)

        features.sort(function (a, b) {
            if (a.chr === b.chr) {
                return a.start - b.start
            } else {
                return a.chr.localeCompare(b.chr)
            }
        })

        // Filter features not in requested range.
        if (undefined === chr) {
            for (let f of features) allFeatures.push(f)   // Don't use spread operator !!!  slicedFeatures might be very large
        } else {
            let inInterval = false
            for (let i = 0; i < features.length; i++) {
                const f = features[i]
                if (f.chr === chr) {
                    if (f.start > end) {
                        allFeatures.push(f)  // First feature beyond interval
                        break
                    }
                    if (f.end >= start && f.start <= end) {
                        // All this to grab first feature before start of interval.  Needed for some track renderers, like line plot
                        if (!inInterval) {
                            inInterval = true
                            if (i > 0) {
                                allFeatures.push(features[i - 1])
                            }
                        }
                        allFeatures.push(f)
                    }
                }
            }
        }
    }

    async getIndex() {
        if (this.index) {
            return this.index
        } else if (this.config.indexURL) {
            this.index = await this.loadIndex()
            return this.index
        }
    }

    /**
     * Return a Promise for the async loaded index
     */
    async loadIndex() {
        const indexURL = this.config.indexURL
        return loadIndex(indexURL, this.config)
    }

    async loadFeaturesFromDataURI() {

        if (this.features) {
            // An optimization hack for non-indexed files, features are temporarily cached when header is read.
            const tmp = this.features
            delete this.features
            return tmp
        } else {
            const plain = BGZip.decodeDataURI(this.dataURI)
            let dataWrapper = getDataWrapper(plain)
            this.header = await this.parser.parseHeader(dataWrapper)
            if (this.header instanceof String && this.header.startsWith("##gff-version 3")) {
                this.format = 'gff3'
            }

            dataWrapper = getDataWrapper(plain)
            const features = []
            await this._parse(features, dataWrapper)
            return features
        }
    }

}

export default FeatureFileReader

