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

import {BGZip, FileUtils, igvxhr, URIUtils} from 'igv-utils'
import FeatureParser from "./featureParser.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import getDataWrapper from "./dataWrapper.js"

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

        this.parser = new FeatureParser(config)

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

        if (!this.dataURI && !this.header) {
            await this.readHeader()
        }

        let allFeatures
        this.indexed = false
        allFeatures = await this.loadFeaturesNoIndex()

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

        let data

        const options = buildOptions(this.config)
        data = await igvxhr.loadByteArray(this.config.url, options)

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

