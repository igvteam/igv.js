/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2020 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */


/**
 * @author Jim Robinson
 */

import {FileUtils} from "../../node_modules/igv-utils/src/index.js"
import Straw from '../../node_modules/hic-straw/src/straw.js'


class HICDataset {

    constructor(config, genome) {
        this.straw = new Straw(config)
        this.genome = genome
    }

    async init() {

        this.metaData = await this.straw.getMetaData()

        this.aliasTable = new Map()
        for (let c of this.metaData.chromosomes) {
            const chr = this.genome ? this.genome.getChromosomeName(c.name) : c.name
            this.aliasTable.set(chr, c.name)
        }

        // this.genomeId = this.hicFile.genomeId
        // this.chromosomes = this.hicFile.chromosomes
        // this.bpResolutions = this.hicFile.bpResolutions
        // this.wholeGenomeChromosome = this.hicFile.wholeGenomeChromosome
        // this.wholeGenomeResolution = this.hicFile.wholeGenomeResolution

    }

    async getResolutions() {
        if (!this.metaData) {
            await this.init()
        }
        return this.metaData.resolutions
    }

    async getContactRecords(normalization, region1, region2, units, binsize) {
        if (!this.metaData) {
            await this.init()
        }

        return this.straw.getContactRecords(normalization, region1, region2, units, binsize)
    }

    async hasNormalizationVector(type, chr, unit, binSize) {
        return this.straw.hicFile.hasNormalizationVector(type, chr, unit, binSize)
    }

    clearCaches() {
        this.colorScaleCache = {}
    }

    async getMatrix(chr1, chr2) {
        return this.hicFile.getMatrix(chr1, chr2)
    }

    getZoomIndexForBinSize(binSize, unit) {
        var i,
            resolutionArray

        unit = unit || "BP"

        if (unit === "BP") {
            resolutionArray = this.bpResolutions
        } else if (unit === "FRAG") {
            resolutionArray = this.fragResolutions
        } else {
            throw new Error("Invalid unit: " + unit)
        }

        for (i = 0; i < resolutionArray.length; i++) {
            if (resolutionArray[i] === binSize) return i
        }

        return -1
    }

    getBinSizeForZoomIndex(zoomIndex, unit) {
        var i,
            resolutionArray

        unit = unit || "BP"

        if (unit === "BP") {
            resolutionArray = this.bpResolutions
        } else if (unit === "FRAG") {
            resolutionArray = this.fragResolutions
        } else {
            throw new Error("Invalid unit: " + unit)
        }

        return resolutionArray[zoomIndex]
    }

    getChrIndexFromName(chrName) {
        var i
        for (i = 0; i < this.chromosomes.length; i++) {
            if (chrName === this.chromosomes[i].name) return i
        }
        return undefined
    }

    compareChromosomes(otherDataset) {
        const chrs = this.chromosomes
        const otherChrs = otherDataset.chromosomes
        if (chrs.length !== otherChrs.length) {
            return false
        }
        for (let i = 0; i < chrs.length; i++) {
            if (chrs[i].size !== otherChrs[i].size) {
                return false
            }
        }
        return true
    }

    isWholeGenome(chrIndex) {
        return (this.wholeGenomeChromosome != null && this.wholeGenomeChromosome.index === chrIndex)
    }

    async getNormVectorIndex() {
        return this.hicFile.getNormVectorIndex()
    }

    async getNormalizationOptions() {
        return this.hicFile.getNormalizationOptions()
    }

    /**
     * Compare 2 datasets for compatibility.  Compatibility is defined as from the same assembly, even if
     * different IDs are used (e.g. GRCh38 vs hg38).
     *
     * Trust the ID for well-known assemblies (hg19, etc).  However, for others compare chromosome lengths
     * as its been observed that uniqueness of ID is not guaranteed.
     *
     * @param d1
     * @param d2
     */
    isCompatible(d2) {
        const id1 = this.genomeId
        const id2 = d2.genomeId
        return ((id1 === "hg38" || id1 === "GRCh38") && (id2 === "hg38" || id2 === "GRCh38")) ||
            ((id1 === "hg19" || id1 === "GRCh37") && (id2 === "hg19" || id2 === "GRCh37")) ||
            ((id1 === "mm10" || id1 === "GRCm38") && (id2 === "mm10" || id2 === "GRCm38")) ||
            this.compareChromosomes(d2)
    }

    static async loadDataset(config) {

        // If this is a local file, use the "blob" field for straw
        if (FileUtils.isFile(config.url)) {
            config.blob = config.url
            delete config.url
        }

        const dataset = new Dataset(config)
        await dataset.init()
        dataset.url = config.url
        return dataset
    }
}


export default HICDataset
