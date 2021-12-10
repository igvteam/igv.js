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

import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import TrackBase from "../trackBase.js"


/**
 *  Define parser for seg files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header.  Details are format specific
 *
 *     parseFeatures(data) - return a list of features
 *
 */


class SegParser {

    constructor(type) {
        this.type = type || 'seg'   // One of seg, mut, or maf

        switch (this.type) {
            case 'mut':
                this.sampleColumn = 3
                this.chrColumn = 0
                this.startColumn = 1
                this.endColumn = 2
                this.dataColumn = 4
                break
            case 'maf':
                this.sampleColumn = 15
                this.chrColumn = 4
                this.startColumn = 5
                this.endColumn = 6
                this.dataColumn = 8
                break
            default:
                this.sampleColumn = 0
                this.chrColumn = 1
                this.startColumn = 2
                this.endColumn = 3
            // Data column determined after reading header
        }
    }

    async parseHeader(dataWrapper) {
        let line
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            if (line.startsWith("#")) {
                // skip
            } else {
                const tokens = line.split("\t")
                this.header = {headings: tokens}
                break
            }
        }
        return this.header
    }

    async parseFeatures(dataWrapper) {

        const allFeatures = []
        let extraHeaders
        if (!this.header) {
            this.header = await this.parseHeader(dataWrapper)  // This will only work for non-indexed files
        }
        if ('seg' === this.type) {
            this.dataColumn = this.header.headings.length - 1
        }
        if (this.header.headings.length > 5) {
            extraHeaders = this.extractExtraColumns(this.header.headings)
        }
        const valueColumnName = this.header.headings[this.dataColumn]

        let line
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            const tokens = line.split("\t")
            const value = ('seg' === this.type) ? Number(tokens[this.dataColumn]) : tokens[this.dataColumn]
            if (tokens.length > this.dataColumn) {
                const feature = new SegFeature({
                    sample: tokens[this.sampleColumn],
                    chr: tokens[this.chrColumn],
                    start: parseInt(tokens[this.startColumn]) - 1,
                    end: parseInt(tokens[this.endColumn]),
                    value,
                    valueColumnName
                })
                if (extraHeaders) {
                    const extraValues = this.extractExtraColumns(tokens)
                    feature.setAttributes({names: extraHeaders, values: extraValues})
                }
                allFeatures.push(feature)
            }
        }
        return allFeatures
    }

    extractExtraColumns(tokens) {
        const extras = []
        for (let i = 0; i < tokens.length; i++) {
            if (i !== this.chrColumn && i !== this.startColumn && i !== this.endColumn && i !== this.sampleColumn) {
                extras.push(tokens[i])
            }
        }
        return extras
    }

}

class SegFeature {

    constructor({sample, chr, start, end, value, valueColumnName}) {
        this.sample = sample
        this.chr = chr
        this.start = start
        this.end = end
        this.value = value
        this.valueColumnName = valueColumnName
    }

    setAttributes({names, values}) {
        this.attributeNames = names
        this.attributeValues = values
    }

    getAttribute(name) {
        if (this.attributeNames) {
            const idx = this.attributeNames.indexOf(name)
            if (idx >= 0) {
                return this.attributeValues[idx]
            }
        }
        return undefined
    }


    popupData(type, genomeID) {
        const filteredProperties = new Set(['chr', 'start', 'end', 'sample', 'value', 'row', 'color', 'sampleKey',
            'uniqueSampleKey', 'sampleId', 'chromosome', 'uniquePatientKey'])
        const locationString = (this.chr + ":" +
            StringUtils.numberFormatter(this.start + 1) + "-" +
            StringUtils.numberFormatter(this.end))
        const pd = [
            {name: "Sample", value: this.sample},
            {name: "Location", value: locationString},
            {name: this.valueColumnName ? StringUtils.capitalize(this.valueColumnName) : "Value", value: this.value}
        ]

        // TODO -- the Cravat stuff should probably be in the track (SegTrack)
        if ("mut" === type && "hg38" === genomeID) {
            const l = this.extractCravatLink(genomeID)
            if (l) {
                pd.push('<hr/>')
                pd.push({html: l})
                pd.push('<hr/>')
            }
        }

        if (this.attributeNames && this.attributeNames.length > 0) {
            for (let i = 0; i < this.attributeNames.length; i++) {
                if (!filteredProperties.has(this.attributeNames[i]) & this.valueColumnName !== this.attributeNames[i]) {
                    pd.push({name: StringUtils.capitalize(this.attributeNames[i]), value: this.attributeValues[i]})
                }
            }
        }
        return pd
    }

    extractCravatLink(genomeId) {

        let ref, alt
        if (this.attributeNames && this.attributeNames.length > 0) {
            for (let i = 0; i < this.attributeNames.length; i++) {
                if (!ref && "Reference_Allele" === this.attributeNames[i]) {
                    ref = this.attributeValues[i]
                }
                if (!alt && this.attributeNames[i].startsWith("Tumor_Seq_Allele") && this.attributeValues[i] !== ref) {
                    alt = this.attributeValues[i]
                }
                if (ref && alt) {
                    return TrackBase.getCravatLink(this.chr, this.start + 1, ref, alt, genomeId)
                }
            }
        }

    }
}


export default SegParser