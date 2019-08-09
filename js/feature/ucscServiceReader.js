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

const UCSCServiceReader = function (config, genome) {
        this.config = config;
        this.genome = genome;
        this.expandQueryInterval = false;
    };

    UCSCServiceReader.prototype.readFeatures = function (chr, start, end) {

        const s = Math.max(0, Math.floor(start));
        let e = Math.ceil(end);

        if(this.genome) {
            const c = genome.getChromosome(chr);
            if(c && e > c.bpLength) {
                e = c.bpLength;
            }
        }


        const url = this.config.url + '?db=' + this.config.db + '&table=' + this.config.tableName + '&chr=' + chr + '&start=' + s + '&end=' + e;

        return igv.xhr.loadJson(url, this.config)
            .then(function (data) {
                if (data) {
                    data.forEach(function (sample) {
                        if (sample.hasOwnProperty('exonStarts') &&
                            sample.hasOwnProperty('exonEnds') &&
                            sample.hasOwnProperty('exonCount') &&
                            sample.hasOwnProperty('cdsStart') &&
                            sample.hasOwnProperty('cdsEnd')) {
                            addExons(sample);
                        }
                    });
                    return data;
                } else {
                    return null;
                }
            })
    };

    function addExons(sample) {
        var exonCount, exonStarts, exonEnds, exons, eStart, eEnd;
        exonCount = sample['exonCount'];
        exonStarts = sample['exonStarts'].split(',');
        exonEnds = sample['exonEnds'].split(',');
        exons = [];

        for (var i = 0; i < exonCount; i++) {
            eStart = parseInt(exonStarts[i]);
            eEnd = parseInt(exonEnds[i]);
            var exon = {start: eStart, end: eEnd};

            if (sample.cdsStart > eEnd || sample.cdsEnd < sample.cdsStart) exon.utr = true;   // Entire exon is UTR
            if (sample.cdsStart >= eStart && sample.cdsStart <= eEnd) exon.cdStart = sample.cdsStart;
            if (sample.cdsEnd >= eStart && sample.cdsEnd <= eEnd) exon.cdEnd = sample.cdsEnd;

            exons.push(exon);
        }

        sample.exons = exons;
    }

export default UCSCServiceReader;