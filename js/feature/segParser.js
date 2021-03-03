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

import getDataWrapper from "./dataWrapper.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js";


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
        this.type = type || 'seg';   // One of seg, mut, or maf

        switch (this.type) {
            case 'mut':
                this.sampleKeyColumn = 3;
                this.sampleColumn = 3;
                this.chrColumn = 0;
                this.startColumn = 1;
                this.endColumn = 2;
                this.dataColumn = 4;
                break;

            default:
                this.sampleKeyColumn = 0;
                this.sampleColumn = 0;
                this.chrColumn = 1;
                this.startColumn = 2;
                this.endColumn = 3;

        }
    }

    async parseHeader(dataWrapper) {
        let line;
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            if (line.startsWith("#")) {
                // skip
            } else {
                const tokens = line.split("\t");
                this.header = {headings: tokens};
                break;
            }
        }
        return this.header;
    }

    async parseFeatures(dataWrapper) {

        const allFeatures = [];
        if (!this.header) {
            this.header = await this.parseHeader(await dataWrapper.nextLine());  // This will only work for non-indexed files
        }
        if('seg' === this.type) {
            this.dataColumn = this.header.headings.length - 1;
        }
        let line;
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            const tokens = line.split("\t");

            const value = ('seg' === this.type) ? parseFloat(tokens[this.dataColumn]) : tokens[this.dataColumn];

            if (tokens.length > this.dataColumn) {
                allFeatures.push({
                    sampleKey: tokens[this.sampleKeyColumn],
                    sample: tokens[this.sampleColumn],
                    chr: tokens[this.chrColumn],
                    start: parseInt(tokens[this.startColumn]),
                    end: parseInt(tokens[this.endColumn]),
                    value: value
                });
            }
        }
        return allFeatures;
    }
}

export default SegParser;