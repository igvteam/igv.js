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

var igv = (function (igv) {

    igv.Genome = function (chromosomeNames, chromosomes) {

        this.chromosomeNames = chromosomeNames;
        this.chromosomes = chromosomes;  // An object (functions as a dictionary)

        /**
         * Return the official chromosome name for the (possibly) alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        var chrAliasTable = {};

        chromosomeNames.forEach(function (name) {

            var alias = name.startsWith("chr") ? name.substring(3) : "chr" + name;
            chrAliasTable[alias] = name;
        });
        chrAliasTable["chrM"] = "MT";
        chrAliasTable["MT"] = "chrM";
        this.chrAliasTable = chrAliasTable;

    }

    igv.Genome.prototype.getChromosomeName = function (str) {
        var chr = this.chrAliasTable[str];
        return chr ? chr : str;
    }

    igv.Genome.prototype.getChromosome = function (chr) {
        return this.chromosomes[chr];
    }

    igv.Genome.prototype.getChromosomes = function () {
        return this.chromosomes;
    }

    igv.Chromosome = function (name, order, cytobands) {
        this.name = name;
        this.order = order;
        this.cytobands = cytobands;
        if (cytobands) {
            var len = cytobands.length;
            if (len > 0) {
                this.bpLength = cytobands[len - 1].end;
            }
        }
    }

    igv.Cytoband = function (start, end, name, typestain) {
        this.start = start;
        this.end = end;
        this.label = name;
        this.stain = 0;

        // Set the type, either p, n, or c
        if (typestain == 'acen') {
            this.type = 'c';
        } else {
            this.type = typestain.charAt(1);
            if (this.type == 'p') {
                this.stain = parseInt(typestain.substring(4));
            }
        }
    }

    igv.GenomicInterval = function (chr, start, end, features) {
        this.chr = chr;
        this.start = start;
        this.end = end;
        this.features = features;
    }

    igv.GenomicInterval.prototype.contains = function (chr, start, end) {
        return this.chr == chr &&
            this.start <= start &&
            this.end >= end;
    }


    igv.loadGenome = function (url, continuation) {

        igvxhr.loadString(url, {

            success: function (data) {

                var chromosomes = {},
                    chromosomeNames = [],
                    tmpCytoboands = {},
                    bands = [],
                    lastChr,
                    n = 0,
                    c = 1,
                    lines = data.splitLines(),
                    len = lines.length;

                for (var i = 0; i < len; i++) {
                    var tokens = lines[i].split("\t");
                    var chr = tokens[0];
                    if (!lastChr) lastChr = chr;

                    if (chr != lastChr) {

                        chromosomeNames.push(lastChr);

                        chromosomes[lastChr] = new igv.Chromosome(lastChr, c, bands);

                        tmpCytoboands[lastChr] = bands;
                        bands = [];
                        lastChr = chr;
                        n = 0;
                        c++;
                    }

                    if (tokens.length == 5) {
                        //10	0	3000000	p15.3	gneg
                        var chr = tokens[0];
                        var start = parseInt(tokens[1]);
                        var end = parseInt(tokens[2]);
                        var name = tokens[3];
                        var stain = tokens[4];
                        bands[n++] = new igv.Cytoband(start, end, name, stain);
                    }
                }

                continuation(new igv.Genome(chromosomeNames, chromosomes));
            }});
    }

    return igv;

})(igv || {});

