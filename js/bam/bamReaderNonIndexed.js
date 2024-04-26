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

import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"
import {BGZip, FeatureCache, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"

/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
class BamReaderNonIndexed {

    chrAliasTable = new Map()

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.bamPath = config.url
        this.isDataUri = isDataURL(config.url)
        BamUtils.setReaderDefaults(this, config)
    }

    /**
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @returns {Promise<AlignmentContainer>}
     */
    async readAlignments(chr, bpStart, bpEnd) {

        if (!this.alignmentCache) {
            // For a non-indexed BAM file all alignments are read at once and cached.
            let unc
            if (this.isDataUri) {
                const data = decodeDataURI(this.bamPath)
                unc = BGZip.unbgzf(data.buffer)
            } else {
                const arrayBuffer = await igvxhr.loadArrayBuffer(this.bamPath, buildOptions(this.config))
                unc = BGZip.unbgzf(arrayBuffer)
            }
            this.alignmentCache = this.#parseAlignments(unc)
        }

        const queryChr = await this.#getQueryChr(chr)
        const qAlignments = this.alignmentCache.queryFeatures(queryChr, bpStart, bpEnd)
        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.config)
        for (let a of qAlignments) {
            alignmentContainer.push(a)
        }
        alignmentContainer.finish()
        return alignmentContainer
    }

    #parseAlignments(data) {
        const alignments = []
        this.header = BamUtils.decodeBamHeader(data)
        BamUtils.decodeBamRecords(data, this.header.size, alignments, this.header.chrNames)
        return new FeatureCache(alignments, this.genome)
    }

    async #getQueryChr(chr) {

        const ownNames = new Set(this.header.chrNames)
        if (ownNames.has(chr)) {
            return chr
        }

        if (this.chrAliasTable.has(chr)) {
            return this.chrAliasTable.get(chr)
        }

        // Try alias

        if (this.genome) {
            const aliasRecord = await this.genome.getAliasRecord(chr)
            let alias
            if (aliasRecord) {
                const aliases = Object.keys(aliasRecord)
                    .filter(k => k !== "start" && k !== "end")
                    .map(k => aliasRecord[k])
                    .filter(a => ownNames.has(a))
                if (aliases.length > 0) {
                    alias = aliases[0]
                }
            }
            this.chrAliasTable.set(chr, alias)  // alias may be undefined => no alias exists. Setting prevents repeated attempts
            return alias
        }

        return chr
    }

}

function decodeDataURI(dataURI) {

    const split = dataURI.split(',')
    const info = split[0].split(':')[1]
    let dataString = split[1]

    if (info.indexOf('base64') >= 0) {
        dataString = atob(dataString)
    } else {
        dataString = decodeURI(dataString)
    }

    const bytes = new Uint8Array(dataString.length)
    for (var i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i)
    }
    return bytes
}


export default BamReaderNonIndexed
