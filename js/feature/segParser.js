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

import {splitLines} from "../util/stringUtils.js";

/**
 *  Define parser for seg files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header.  Details are format specific
 *
 *     parseFeatures(data) - return a list of features
 *
 */


var sampleKeyColumn = 0,
    sampleColumn = 0,
    chrColumn = 1,
    startColumn = 2,
    endColumn = 3;


const SegParser = function () {
}

SegParser.prototype.parseHeader = function (data) {

    var lines = splitLines(data),
        len = lines.length,
        line,
        i,
        tokens;

    for (i = 0; i < len; i++) {
        line = lines[i];
        if (line.startsWith("#")) {
            continue;
        } else {
            tokens = line.split("\t");
            this.header = {headings: tokens, lineCount: i + 1};
            return this.header;
            break;
        }
    }

    return this.header;
}


SegParser.prototype.parseFeatures = function (data) {

    var lines = data ? splitLines(data) : [],
        len = lines.length,
        tokens, allFeatures = [], line, i, dataColumn;

    if (!this.header) {
        this.header = this.parseHeader(data);
    }
    dataColumn = this.header.headings.length - 1;


    for (i = this.header.lineCount; i < len; i++) {

        line = lines[i];

        tokens = lines[i].split("\t");

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

export default SegParser;