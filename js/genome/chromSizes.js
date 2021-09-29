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
import {igvxhr, StringUtils, BGZip, URIUtils} from "../../node_modules/igv-utils/src/index.js";
import Chromosome from "./chromosome.js";
import {buildOptions, isDataURL} from "../util/igvUtils.js";

const splitLines = StringUtils.splitLines;

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed']);

class ChromSizes {


    constructor(url) {
        this.url = url;
        this.chromosomeNames = [];
        this.chromosomes = {};
    }


    async init() {
        return this.loadAll();
    }

    async getSequence(chr, start, end) {

        return undefined; // TODO -- return array of "N"s?
    }

    async loadAll() {

        let data;
        if (isDataURL(this.url)) {
            let bytes = BGZip.decodeDataURI(this.fastaURL);
            data = "";
            for (let b of bytes) {
                data += String.fromCharCode(b);
            }
        } else {
            data = await igvxhr.load(this.url, {});
        }


        this.chromosomeNames = [];
        this.chromosomes = {};

        const lines = splitLines(data);
        let order = 0;
        for(let nextLine of lines) {
            const tokens = nextLine.split('\t');
            this.chromosomeNames.push(tokens[0]);
            const chrLength = Number.parseInt(tokens[1]);
            const chromosome = new Chromosome(tokens[0], order++, 0, chrLength);
            this.chromosomes[tokens[0]] = chromosome;

        }
    }

}


export default ChromSizes
