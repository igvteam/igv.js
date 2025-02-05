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

import TrackBase from "../trackBase.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

/**
 * Create a variant from an array of tokens representing a line in a "VCF" file
 * @param tokens
 */

const STANDARD_FIELDS = new Map([["REF", "referenceBases"], ["ALT", "alternateBases"], ["QUAL", "quality"], ["FILTER", "filter"]])


class Variant {

    constructor(tokens) {
        this.chr = tokens[0] // TODO -- use genome aliases
        this.pos = parseInt(tokens[1])
        this.names = tokens[2]    // id in VCF
        this.referenceBases = tokens[3]
        this.alternateBases = tokens[4]
        this.quality = tokens[5]
        this.filter = tokens[6]
        this.info = {}
        const infoStr = tokens[7]
        if (infoStr && infoStr !== '.') {
            for (let elem of infoStr.split(';')) {
                var element = elem.split('=')
                this.info[element[0]] = element[1]
            }
        }
        this.init()
    }


    getAttributeValue(key) {
        if (STANDARD_FIELDS.has(key)) {
            key = STANDARD_FIELDS.get(key)
        }
        return this.hasOwnProperty(key) ? this[key] : this.info[key]
    }


    init() {

        const ref = this.referenceBases
        const altBases = this.alternateBases

        if (this.info) {
            if (this.info["VT"]) {
                this.type = this.info["VT"]
            } else if (this.info["SVTYPE"]) {
                this.type = "SV"
            } else if (this.info["PERIOD"]) {
                this.type = "STR"
            }
        }
        if (this.type === undefined) {
            this.type = determineType(ref, altBases)
        }

        // Determine start/end coordinates -- these are the coordinates representing the actual variant,
        // not the leading or trailing reference
        if (this.info["END"]) {
            this.start = this.pos - 1
            if (this.info["CHR2"] && this.info["CHR2"] !== this.chr) {
                this.end = this.start + 1
            } else {
                this.end = Number.parseInt(this.info["END"])
            }
        } else {
            if (this.type === "NONVARIANT") {
                this.start = this.pos - 1      // convert to 0-based coordinate convention
                this.end = this.start + ref.length
            } else {

                const altTokens = altBases.split(",").filter(token => token.length > 0)
                this.alleles = []
                this.start = undefined
                this.end = undefined

                for (let alt of altTokens) {

                    this.alleles.push(alt)

                    // We don't yet handle  SV and other special alt representations
                    if ("SV" !== this.type && isKnownAlt(alt)) {

                        let altLength = alt.length
                        let lengthOnRef = ref.length
                        const lmin = Math.min(altLength, lengthOnRef)

                        // Trim off matching bases.  Try first match, then right -> left,  then any remaining left -> right
                        let s = 0

                        while (s < lmin && (ref.charCodeAt(s) === alt.charCodeAt(s))) {
                            s++
                            altLength--
                            lengthOnRef--
                        }

                        // right -> left from end
                        while (altLength > 0 && lengthOnRef > 0) {
                            const altIdx = s + altLength - 1
                            const refIdx = s + lengthOnRef - 1
                            if (alt.charCodeAt(altIdx) === ref.charCodeAt(refIdx)) {
                                altLength--
                                lengthOnRef--
                            } else {
                                break
                            }
                        }

                        // if any remaining, left -> right
                        while (altLength > 0 && lengthOnRef > 0) {
                            const altIdx = s
                            const refIdx = s
                            if (alt.charCodeAt(altIdx) === ref.charCodeAt(refIdx)) {
                                s++
                                altLength--
                                lengthOnRef--
                            } else {
                                break
                            }
                        }

                        const alleleStart = this.pos + s - 1      // -1 for zero based coordinates
                        const alleleEnd = alleleStart + lengthOnRef
                        this.start = this.start === undefined ? alleleStart : Math.min(this.start, alleleStart)
                        this.end = this.end === undefined ? alleleEnd : Math.max(this.end, alleleEnd)
                    }
                }

                // Default to single base representation @ position for variant types not otherwise handled
                if (this.start === undefined) {
                    this.start = this.pos - 1
                    this.end = this.pos
                }

                // Infer an insertion from start === end
                if (this.start === this.end) {
                    this.start -= 0.5
                    this.end += 0.5
                }
            }
        }
    }

    popupData(genomicLocation, genomeId) {

        const posString = `${StringUtils.numberFormatter(this.pos)}`
        const locString = this.start === this.end ?
            `${StringUtils.numberFormatter(this.start)} | ${StringUtils.numberFormatter(this.start + 1)}` :
            `${StringUtils.numberFormatter(this.start + 1)}-${StringUtils.numberFormatter(this.end)}`
        const fields = [
            {name: "Chr", value: this.chr},
            {name: "Pos", value: posString},
            {name: "Loc", value: locString},
            {name: "ID", value: this.names ? this.names : ""},
            {name: "Ref", value: this.referenceBases},
            {name: "Alt", value: this.alternateBases.replace("<", "&lt;")},
            {name: "Qual", value: this.quality},
            {name: "Filter", value: this.filter}
        ]

        if (this.type) {
            fields.push({name: "Type", value: this.type})
        }

        if ("SNP" === this.type) {
            let ref = this.referenceBases
            if (ref.length === 1) {
                let altArray = this.alternateBases.split(",")
                for (let alt of altArray) {
                    if (alt.length === 1) {
                        let l = TrackBase.getCravatLink(this.chr, this.pos, ref, alt, genomeId)
                        if (l) {
                            fields.push('<hr/>')
                            fields.push({html: l})
                        }
                    }
                }
            }
        }

        const infoKeys = Object.keys(this.info)
        if (this.info && infoKeys.length > 0) {
            fields.push({html: '<hr style="border-top: dotted 1px;border-color: #c9c3ba" />'})
            for (let key of infoKeys) {
                fields.push({name: key, value: arrayToString(decodeURIComponent(this.info[key]))})
            }
        }

        return fields
    }

    getInfo(tag) {
        return this.info ? this.info[tag] : undefined
    }

    isRefBlock() {
        return "NONVARIANT" === this.type
    }

    isFiltered() {
        return !("." === this.filter || "PASS" === this.filter)
    }

    alleleFreq() {
        return this.info ? this.info["AF"] : undefined
    }
}

/**
 * Represents the "other end" of an SV which specifies the breakpoint as CHR2 and END info fields.
 */
class SVComplement {

    constructor(v) {
        this.mate = v
        this.chr = v.info.CHR2
        this.pos = Number.parseInt(v.info.END)
        this.start = this.pos - 1
        this.end = this.pos
    }

    get info() {
        return this.mate.info
    }

    get names() {
        return this.mate.names
    }

    get referenceBases() {
        return this.mate.referenceBases
    }

    get alternateBases() {
        return this.mate.alternateBases
    }

    get quality() {
        return this.mate.quality
    }

    get filter() {
        return this.mate.filter
    }

    get calls() {
        return this.mate.calls
    }

    getAttributeValue(key) {
        return this.mate.getAttributeValue(key)
    }

    getInfo(tag) {
        this.mate.getInfo(tag)
    }

    isFiltered() {
        return this.mate.isFiltered()
    }

    alleleFreq() {
        return this.mate.alleleFreq()
    }

    popupData(genomicLocation, genomeId) {
        const popupData = []

        popupData.push("SV Breakpoint")
        popupData.push({name: 'Chr', value: this.chr})
        popupData.push({name: 'Pos', value: `${StringUtils.numberFormatter(this.pos)}`})
        popupData.push({html: '<hr style="border-top: dotted 1px;border-color: #c9c3ba" />'})
        popupData.push("SV")
        popupData.push(...this.mate.popupData(genomicLocation, genomeId))

        return popupData
    }
}


class Call {

    constructor({formatFields, sample, token}) {

        this.info = {}
        this.sample = sample
        const ct = token.split(":")
        for (let idx = 0; idx < ct.length; idx++) {
            const callToken = ct[idx]
            if (idx == formatFields.genotypeIndex) {
                this.genotype = []
                for (let s of callToken.split(/[\|\/]/)) {
                    this.genotype.push('.' === s ? s : parseInt(s))
                }
            } else {
                this.info[formatFields.fields[idx]] = callToken
            }
        }

    }


    get zygosity() {
        if (!this._zygosity) {
            if (!this.genotype) {
                this._zygosity = 'unknown'
            } else {
                let allVar = true  // until proven otherwise
                let allRef = true
                let noCall = false

                for (let g of this.genotype) {
                    if ('.' === g) {
                        noCall = true
                        break
                    } else {
                        if (g !== 0) allRef = false
                        if (g === 0) allVar = false
                    }
                }
                if (noCall) {
                    this._zygosity = 'nocall'
                } else if (allRef) {
                    this._zygosity = 'homref'
                } else if (allVar) {
                    this._zygosity = 'homvar'
                } else {
                    this._zygosity = 'hetvar'
                }
            }
        }
        return this._zygosity
    }

    /**
     * Used in sorting
     */
    zygosityScore() {
        const zygosity = this.zygosity
        switch (zygosity) {
            case 'homvar':
                return 4
            case 'hetvar':
                return 3
            case 'homref':
                return 2
            case 'nocall':
                return 1
            default:
                return 0
        }
    }

    #zygosityLabel() {
        const zygosity = this.zygosity
        switch (zygosity) {
            case 'homref':
                return 'Homozygous reference'
            case 'homvar':
                return 'Homozygous variant'
            case 'hetvar':
                return 'Heterozygous'
            default:
                return ''
        }
    }


    popupData(genomicLocation, genomeID) {

        const popupData = []

        if (this.sample !== undefined) {
            popupData.push({name: 'Sample', value: this.sample})
        }

        // Genotype string is set in VariantTrack when call is clicked -- this is for memory efficienty, very few
        // calls will get clicked
        if (this.genotypeString) {
            popupData.push({name: 'Genotype', value: this.genotypeString})
        }

        const zygosity = this.#zygosityLabel()
        if (zygosity) {
            popupData.push({name: 'Zygosity', value: zygosity})
        }


        var infoKeys = Object.keys(this.info)
        if (infoKeys.length) {
            popupData.push('<hr/>')
        }
        for(let key of infoKeys) {
            popupData.push({name: key, value: decodeURIComponent(this.info[key])})
        }

        return popupData
    }
}

const knownAltBases = new Set(["A", "C", "T", "G"].map(c => c.charCodeAt(0)))

function isKnownAlt(alt) {
    for (let i = 0; i < alt.length; i++) {
        if (!knownAltBases.has(alt.charCodeAt(i))) {
            return false
        }
    }
    return true
}


function determineType(ref, altAlleles) {
    const refLength = ref.length
    if (altAlleles === undefined) {
        return "UNKNOWN"
    } else if (altAlleles.trim().length === 0 ||
        altAlleles === "<NON_REF>" ||
        altAlleles === "<*>" ||
        altAlleles === ".") {
        return "NONVARIANT"
    } else {
        const alleles = altAlleles.split(",")
        const types = alleles.map(function (a) {
            if (refLength === 1 && a.length === 1) {
                return "SNP"
            } else if ("<NON_REF>" === a) {
                return "NONVARIANT"
            } else if (a.length > refLength && isKnownAlt(a)) {
                return "INSERTION"
            } else if (a.length < refLength && isKnownAlt(a)) {
                return "DELETION"
            } else {
                return "OTHER"
            }
        })
        let type = types[0]
        for (let t of types) {
            if (t !== type) {
                return "MIXED"
            }
        }
        return type
    }
}

function arrayToString(value, delim) {

    if (delim === undefined) delim = ","

    if (!(Array.isArray(value))) {
        return value
    }
    return value.join(delim)
}


export {Variant, Call, SVComplement}
