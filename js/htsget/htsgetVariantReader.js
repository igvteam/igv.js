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


import HtsgetReader from "./htsgetReader.js"
import getDataWrapper from "../feature/dataWrapper.js"
import VcfParser from "../variant/vcfParser.js"

class HtsgetVariantReader extends HtsgetReader {

    constructor(config, genome) {
        super(config, genome)
        this.parser = new VcfParser()
    }

    async readHeader() {
        if (!this.header) {
            const data = await this.readHeaderData()
            const dataWrapper = getDataWrapper(data)
            this.header = await this.parser.parseHeader(dataWrapper, this.genome)
            this.chrAliasTable = this.header.chrAliasTable
        }
        return this.header
    }

    async readFeatures(chr, start, end) {

        if (this.config.format && this.config.format.toUpperCase() !== "VCF") {
            throw  Error(`htsget format ${this.config.format} is not supported`)
        }

        if (!this.chrAliasTable) {
            await this.readHeader()
        }

        let queryChr = this.chrAliasTable.has(chr) ? this.chrAliasTable.get(chr) : chr

        const data = await this.readData(queryChr, start, end)

        const dataWrapper = getDataWrapper(data)

        return this.parser.parseFeatures(dataWrapper)

        //  return dataWrapper;

    }

}


/*
Example for https://htsget.ga4gh.org/variants/1000genomes.phase1.chr22?format=VCF&referenceName=22&start=0&end=100000

{
    "htsget": {
        "format": "VCF",
        "urls": [{
            "url": "https://htsget.ga4gh.org/variants/data/1000genomes.phase1.chr22",
            "headers": {"HtsgetBlockClass": "header", "HtsgetCurrentBlock": "0", "HtsgetTotalBlocks": "2"},
            "class": "header"
        }, {
            "url": "https://htsget.ga4gh.org/variants/data/1000genomes.phase1.chr22?end=100000&referenceName=22&start=0",
            "headers": {"HtsgetCurrentBlock": "1", "HtsgetTotalBlocks": "2"},
            "class": "body"
        }]
    }
*/


export default HtsgetVariantReader