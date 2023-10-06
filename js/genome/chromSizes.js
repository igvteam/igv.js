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

// Indexed fasta files
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import Chromosome from "./chromosome.js"
import {isDataURL} from "../util/igvUtils.js"

const splitLines = StringUtils.splitLines

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed'])

/**
 * Represents a reference object created from a ChromSizes file.  This is unusual, primarily for testing.
 */
class ChromSizes {

    #chromosomeNames
    chromosomes = new Map()

    constructor(url) {
        this.url = url
    }

    async init() {
        return this.loadAll()
    }

    get chromosomeNames() {
        if(!this.#chromosomeNames) {
            this.#chromosomeNames = Array.from(this.chromosomes.keys())
        }
    }

    async getSequence(chr, start, end) {
        return null // TODO -- return array of "N"s?
    }

    async loadAll() {

        let data
        if (isDataURL(this.url)) {
            let bytes = BGZip.decodeDataURI(this.fastaURL)
            data = ""
            for (let b of bytes) {
                data += String.fromCharCode(b)
            }
        } else {
            data = await igvxhr.load(this.url, {})
        }

        const lines = splitLines(data)
        let order = 0
        for (let nextLine of lines) {
            const tokens = nextLine.split('\t')
            if(tokens.length > 1) {
                const chrLength = Number.parseInt(tokens[1])
                const chromosome = new Chromosome(tokens[0], order++, chrLength)
                this.chromosomes.set(tokens[0], chromosome)
            }
        }
    }

}

async function loadChromSizes(url) {

    const chromosomeSizes = new Map();

    let data
    if (isDataURL(url)) {
        let bytes = BGZip.decodeDataURI(url)
        data = ""
        for (let b of bytes) {
            data += String.fromCharCode(b)
        }
    } else {
        data = await igvxhr.load(url, {})
    }

    const lines = splitLines(data)
    let order = 0
    for (let nextLine of lines) {
        const tokens = nextLine.split('\t')
        if(tokens.length > 1) {
            const chrLength = Number.parseInt(tokens[1])
            chromosomeSizes.set(tokens[0], new Chromosome(tokens[0], order++, chrLength))
        }
    }
    return chromosomeSizes
}


export default ChromSizes
export {loadChromSizes}
