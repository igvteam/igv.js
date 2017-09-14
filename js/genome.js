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

    igv.Genome = function (sequence, ideograms, aliases) {

        this.sequence = sequence;
        this.chromosomeNames = sequence.chromosomeNames;
        this.chromosomes = sequence.chromosomes;  // An object (functions as a dictionary)
        this.ideograms = ideograms;

        constructWG(this);

        /**
         * Return the official chromosome name for the (possibly) alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        var chrAliasTable = {},
            self = this;

        // The standard mappings
        this.chromosomeNames.forEach(function (name) {
            var alias = name.startsWith("chr") ? name.substring(3) : "chr" + name;
            chrAliasTable[alias] = name;
            if (name === "chrM") chrAliasTable["MT"] = "chrM";
            if (name === "MT") chrAliasTable["chrmM"] = "MT";
        });

        // Custom mappings
        if (aliases) {
            aliases.forEach(function (array) {
                // Find the official chr name
                var defName, i;
                
                for (i = 0; i < array.length; i++) {
                    if (self.chromosomes[array[i]]) {
                        defName = array[i];
                        break;
                    }
                }

                if (defName) {
                    array.forEach(function (alias) {
                        if (alias !== defName) {
                            chrAliasTable[alias] = defName;
                        }
                    });
                }

            });
        }

        this.chrAliasTable = chrAliasTable;

    }

    igv.Genome.prototype.getChromosomeName = function (str) {
        var chr = this.chrAliasTable[str];
        return chr ? chr : str;
    }

    igv.Genome.prototype.getChromosome = function (chr) {
        chr = this.getChromosomeName(chr);
        return this.chromosomes[chr];
    }

    igv.Genome.prototype.getCytobands = function (chr) {
        return this.ideograms ? this.ideograms[chr] : null;
    }

    igv.Genome.prototype.getLongestChromosome = function () {

        var longestChr,
            key,
            chromosomes = this.chromosomes;
        for (key in chromosomes) {
            if (chromosomes.hasOwnProperty(key)) {
                var chr = chromosomes[key];
                if (longestChr === undefined || chr.bpLength > longestChr.bpLength) {
                    longestChr = chr;
                }
            }
            return longestChr;
        }
    }

    igv.Genome.prototype.getChromosomes = function () {
        return this.chromosomes;
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     */
    igv.Genome.prototype.getGenomeCoordinate = function (chr, bp) {
        return this.getCumulativeOffset(chr) + Math.floor(bp / 1000);
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    igv.Genome.prototype.getChromosomeCoordinate = function (genomeCoordinate) {

        var self = this,
            lastChr,
            lastCoord,
            i,
            name;

        if (this.cumulativeOffsets === undefined) computeCumulativeOffsets.call(this);

        // Use a for loop, not a forEach, so we can break (return)
        for (i = 0; i < this.chromosomeNames.length; i++) {
            name = this.chromosomeNames[i];
            var cumulativeOffset = self.cumulativeOffsets[name];
            if (cumulativeOffset > genomeCoordinate) {
                var position = Math.floor((genomeCoordinate - lastCoord) / 1000);
                return {chr: lastChr, position: position};
            }
            lastChr = name;
            lastCoord = cumulativeOffset;
        }

        // If we get here off the end
        return {chr: _.last(this.chromosomeNames), position: 0};

    }


    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     */
    igv.Genome.prototype.getCumulativeOffset = function (chr) {

        var self = this,
            queryChr = this.getChromosomeName(chr);
        if (this.cumulativeOffsets === undefined) {
            computeCumulativeOffsets.call(this);
        }
        return this.cumulativeOffsets[queryChr];
    }

    function computeCumulativeOffsets() {
        var self = this,
            cumulativeOffsets = {},
            offset = 0;

        self.chromosomeNames.forEach(function (name) {
            cumulativeOffsets[name] = Math.floor(offset);
            var chromosome = self.getChromosome(name);
            offset += (chromosome.bpLength / 1000);   // Genome coordinates are in KB.  Beware 32-bit max value limit
        });
        self.cumulativeOffsets = cumulativeOffsets;

    }

    igv.Chromosome = function (name, order, bpLength) {
        this.name = name;
        this.order = order;
        this.bpLength = bpLength;
    }

    igv.Cytoband = function (start, end, name, typestain) {
        this.start = start;
        this.end = end;
        this.name = name;
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

    igv.GenomicInterval.prototype.containsRange = function (range) {
        return this.chr === range.chr &&
            this.start <= range.start &&
            this.end >= range.end;
    }

    igv.loadGenome = function (reference) {

        return new Promise(function (fulfill, reject) {

            var cytobandUrl = reference.cytobandURL,
                cytobands,
                aliasURL = reference.aliasURL,
                aliases,
                chrNames,
                chromosome,
                chromosomes = {},
                sequence,
                l,
                avgL;

            sequence = new igv.FastaSequence(reference);

            sequence.init().then(function () {

                var order = 0;

                chrNames = sequence.chromosomeNames;
                chromosomes = sequence.chromosomes;

                if (cytobandUrl) {
                    loadCytobands(cytobandUrl, sequence.config, function (result) {
                        cytobands = result;
                        checkReady();
                    });
                }

                if (aliasURL) {
                    loadAliases(aliasURL, sequence.config, function (result) {
                        aliases = result;
                        checkReady();
                    });
                }


                checkReady();

            }).catch(function (err) {
                reject(err);
            });

            function checkReady() {

                var isReady = (cytobandUrl === undefined || cytobands !== undefined) &&
                    (aliasURL === undefined || aliases !== undefined);
                if (isReady) {
                    fulfill(new igv.Genome(sequence, cytobands, aliases));
                }
            }

        });
    }

    function loadCytobands(cytobandUrl, config, continuation) {

        igvxhr.loadString(cytobandUrl, igv.buildOptions(config))
            .then(function (data) {

            var bands = [],
                lastChr,
                n = 0,
                c = 1,
                lines = data.splitLines(),
                len = lines.length,
                cytobands = {};

            for (var i = 0; i < len; i++) {
                var tokens = lines[i].split("\t");
                var chr = tokens[0];
                if (!lastChr) lastChr = chr;

                if (chr != lastChr) {

                    cytobands[lastChr] = bands;
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

            continuation(cytobands);
        });
    }

    function loadAliases(aliasURL, config, continuation) {

        igvxhr.loadString(aliasURL, igv.buildOptions(config))

            .then(function (data) {

            var lines = data.splitLines(),
                aliases = [];

            lines.forEach(function (line) {
                if (!line.startsWith("#") & line.length > 0) aliases.push(line.split("\t"));
            });

            continuation(aliases);
        });

    }

    // this.sequence = sequence;
    // this.chromosomeNames = sequence.chromosomeNames;
    // this.chromosomes = sequence.chromosomes;  // An object (functions as a dictionary)
    // this.ideograms = ideograms;
    // this.wgChromosomeNames = wgChromosomeNames;

    function constructWG(genome) {

        var l, avgL;

        // Construct the whole-genome "chromosome"
        l = 0;
        _.each(genome.chromosomes, function (chromosome) {
            l += Math.floor((chromosome.bpLength / 1000));  // wg length is in kb.  bp would overflow maximum number limit
        });

        // Now trim chromosomes.  If ideograms are defined use those, otherwise trim chromosomes < 1/10 average length
        genome.wgChromosomeNames = [];

        if (genome.ideograms) {
            _.each(genome.chromosomeNames, function (chrName) {
                var ideo = genome.ideograms[chrName];
                if(ideo && ideo.length > 0) {
                    genome.wgChromosomeNames.push(chrName);
                }
            });
        }
        else {
            avgL = (l / genome.chromosomeNames.length) * 200;   // i.e.  (divided by 5) times 1000 bp/kbp  TODO USE MEDIAN
            l = 0;
            _.each(genome.chromosomeNames, function (chrName) {
                var chromosome = genome.chromosomes[chrName];
                if (chromosome.bpLength > avgL) {
                    genome.wgChromosomeNames.push(chrName);
                }
            });
        }

        genome.chromosomes["all"] = {
            name: "all",
            bpLength: l
        };
    }

    return igv;

})
(igv || {});

