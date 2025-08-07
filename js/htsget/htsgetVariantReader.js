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
import {isgzipped, ungzip} from "../../node_modules/igv-utils/src/bgzf.js"
import ChromAliasManager from "../feature/chromAliasManager.js"

class HtsgetVariantReader extends HtsgetReader {


    chrNames = new Set()
    constructor(config, genome) {
        super(config, genome)
        this.parser = new VcfParser()
    }

    async readHeader() {
        if (!this.header) {
            let data = await this.readHeaderData()
            if (isgzipped(data)) {
                data = ungzip(data)
            }

            const dataWrapper = getDataWrapper(data)
            this.header = await this.parser.parseHeader(dataWrapper, this.genome)
            if(this.header.sequenceNames && this.header.sequenceNames.length > 0) {
                this.chromAliasManager = new ChromAliasManager(this.header.sequenceNames, this.genome)
            }
        }
        return this.header
    }

    async readFeatures(chr, start, end) {

        if (this.config.format && this.config.format.toUpperCase() !== "VCF") {
            throw Error(`htsget format ${this.config.format} is not supported`)
        }

        if (!this.header) {
            await this.readHeader()
        }


        let queryChr = await this.chromAliasManager.getAliasName(chr)

        let data = await this.readData(queryChr, start, end)
        if (isgzipped(data)) {
            data = ungzip(data)
        }

        const dataWrapper = getDataWrapper(data)

        return this.parser.parseFeatures(dataWrapper)

        //  return dataWrapper;

    }
}


export default HtsgetVariantReader