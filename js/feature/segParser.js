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


const sampleKeyColumn = 0,
    sampleColumn = 0,
    chrColumn = 1,
    startColumn = 2,
    endColumn = 3;

class SegParser {
    parseHeader(data) {
        const lines = StringUtils.splitLines(data);
        for (let line of lines) {
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

    parseFeatures(data) {
        const dataWrapper = getDataWrapper(data);
        const nextLine = dataWrapper.nextLine.bind(dataWrapper);
        const allFeatures = [];
        if (!this.header) {
            this.header = this.parseHeader(nextLine());  // This will only work for non-indexed files
        }
        const dataColumn = this.header.headings.length - 1;
        let line;
        while ((line = nextLine()) !== undefined) {
            const tokens = line.split("\t");
            if (tokens.length > dataColumn) {
                allFeatures.push({
                    sampleKey: tokens[sampleKeyColumn],
                    sample: tokens[sampleColumn],
                    chr: tokens[chrColumn],
                    start: parseInt(tokens[startColumn]),
                    end: parseInt(tokens[endColumn]),
                    value: parseFloat(tokens[dataColumn])
                });
            }
        }
        return allFeatures;
    }
}

export default SegParser;