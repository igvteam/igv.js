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

    igv.genomeIdLUT = function (string) {

        var lut =
            {
                dm3:'dm3',
                mm10:'mm10',
                hg19:'hg19',
                hg38:'GRCh38'
            };

        return lut[ string ];
    };

    igv.loadGenome = function (reference) {

        var cytobandUrl = reference.cytobandURL,
            cytobands,
            aliasURL = reference.aliasURL,
            chrNames,
            chromosomes = {},
            sequence;

        sequence = new igv.FastaSequence(reference);

        return sequence.init().then(function () {

            var order = 0;

            chrNames = sequence.chromosomeNames;
            chromosomes = sequence.chromosomes;

        }).then(function (ignore) {
            if (cytobandUrl) {
                return loadCytobands(cytobandUrl, sequence.config);
            } else {
                return undefined
            }
        }).then(function (c) {

            cytobands = c;

            if (aliasURL) {
                return loadAliases(aliasURL, sequence.config);
            }
            else {
                return undefined;
            }
        }).then(function (aliases) {
            return new igv.Genome(reference.id, sequence, cytobands, aliases);

        })
    }


    igv.Genome = function (id, sequence, ideograms, aliases) {

        this.id = id;
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
            if (name === "MT") chrAliasTable["chrM"] = "MT";
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
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    igv.Genome.prototype.getGenomeCoordinate = function (chr, bp) {

        var offset = this.getCumulativeOffset(chr);
        if (offset === undefined) return undefined;

        return offset + bp;
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    igv.Genome.prototype.getChromosomeCoordinate = function (genomeCoordinate) {

        var self = this,
            lastChr,
            lastCoord,
            i,
            name,
            cumulativeOffset;

        if (this.cumulativeOffsets === undefined) computeCumulativeOffsets.call(this);

        // Use a for loop, not a forEach, so we can break (return)
        for (i = 0; i < this.wgChromosomeNames.length; i++) {
            name = this.wgChromosomeNames[i];
            cumulativeOffset = self.cumulativeOffsets[name];

            if (cumulativeOffset > genomeCoordinate) {
                var position = genomeCoordinate - lastCoord;
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
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    igv.Genome.prototype.getCumulativeOffset = function (chr) {

        var self = this,
            queryChr = this.getChromosomeName(chr);

        if (this.cumulativeOffsets === undefined) {
            computeCumulativeOffsets.call(this);
        }
        return this.cumulativeOffsets[queryChr];

        function computeCumulativeOffsets() {
            var cumulativeOffsets = {},
                offset = 0;

            self.wgChromosomeNames.forEach(function (name) {
                cumulativeOffsets[name] = Math.floor(offset);
                var chromosome = self.getChromosome(name);
                offset += chromosome.bpLength;
            });
            self.cumulativeOffsets = cumulativeOffsets;
        }
    }

    /**
     * Return the genome length in kb
     */
    igv.Genome.prototype.getGenomeLength = function () {
        var lastChr, offset;
        lastChr = _.last(this.wgChromosomeNames);
        return this.getCumulativeOffset(lastChr) + this.getChromosome(lastChr).bpLength;
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

    function loadCytobands(cytobandUrl, config) {
        if (cytobandUrl.startsWith("data:")) {
            var data = decodeDataUri(cytobandUrl);
            return Promise.resolve(getCytobands(data));
        } else {
            return igv.xhr.loadString(cytobandUrl, igv.buildOptions(config))
                .then(function (data) {
                    return getCytobands(data);
                });
        }

        function getCytobands(data) {
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

            return cytobands;
        }

        function decodeDataUri(dataUri) {
            var bytes,
                split = dataUri.split(','),
                info = split[0].split(':')[1],
                dataString = split[1];

            if (info.indexOf('base64') >= 0) {
                dataString = atob(dataString);
            } else {
                dataString = decodeURI(dataString);
            }

            bytes = new Uint8Array(dataString.length);
            for (var i = 0; i < dataString.length; i++) {
                bytes[i] = dataString.charCodeAt(i);
            }

            var inflate = new Zlib.Gunzip(bytes);
            var plain = inflate.decompress();

            return String.fromCharCode.apply(null, plain);
        }
    }

    function loadAliases(aliasURL, config) {

        igv.xhr.loadString(aliasURL, igv.buildOptions(config))

            .then(function (data) {

                var lines = data.splitLines(),
                    aliases = [];

                lines.forEach(function (line) {
                    if (!line.startsWith("#") & line.length > 0) aliases.push(line.split("\t"));
                });

                return aliases;
            });

    }


    function constructWG(genome) {

        var l, lengths, mean, threshold;


        // Now trim chromosomes.  If ideograms are defined use those, otherwise trim chromosomes < 1/50 average length
        genome.wgChromosomeNames = [];

        if (genome.ideograms) {
            genome.chromosomeNames.forEach(function (chrName) {
                var ideo = genome.ideograms[chrName];
                if (ideo && ideo.length > 0) {
                    genome.wgChromosomeNames.push(chrName);
                }
            });
        }
        else {

            lengths = Object.keys(genome.chromosomes).map(function (key) {
                return genome.chromosomes[key].bpLength;
            });

            mean = igv.Math.mean(lengths);
            threshold = mean / 50;

            genome.wgChromosomeNames = genome.chromosomeNames.filter(function (key) {
                return genome.chromosomes[key].bpLength > threshold;
            });
        }

        l = 0;
        genome.wgChromosomeNames.forEach(function (key) {
            l += genome.chromosomes[key].bpLength;
        });

        genome.chromosomes["all"] = {
            name: "all",
            bpLength: l
        };

    }

    // Static definition of known genome identifiers
    igv.Genome.KnownGenomes = {
        "hg18": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/cytoBand.txt.gz"
        },
        "GRCh38": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/cytoBandIdeo.txt"
        },
        "hg38": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/cytoBandIdeo.txt"
        },
        "hg19": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
        },
        "GRCh37": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
        },

        "mm10": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa",
            indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa.fai",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/mm10/cytoBandIdeo.txt.gz"
        },
        "GRCm38": {
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa",
            indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa.fai",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/mm10/cytoBandIdeo.txt.gz"
        }
    }

    return igv;

})
(igv || {});

