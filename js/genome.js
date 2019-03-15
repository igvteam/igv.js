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

    var KNOWN_GENOMES;

    igv.GenomeUtils = {

        loadGenome: async function (config) {

            const cytobandUrl = config.cytobandURL;
            const aliasURL = config.aliasURL;
            const sequence = new igv.FastaSequence(config);

            await sequence.init()

            let cytobands
            if (cytobandUrl) {
                cytobands = await loadCytobands(cytobandUrl, sequence.config);
            }

            let aliases
            if (aliasURL) {
                aliases = await loadAliases(aliasURL, sequence.config);
            }

            return new Genome(config, sequence, cytobands, aliases);

        },

        getKnownGenomes: async function () {

            const genomeList = igv.GenomeUtils.genomeList;

            if (KNOWN_GENOMES) {
                return KNOWN_GENOMES;
            } else if (!genomeList) {
                return {};
            }
            else if (typeof genomeList === 'string') {
                const jsonArray = await igv.xhr.loadJson(genomeList, {})
                return processJson(jsonArray);

            }
            else {
                return processJson(genomeList);
            }

            function processJson(jsonArray) {

                var table = {};

                jsonArray.forEach(function (json) {
                    table[json.id] = json;
                });

                KNOWN_GENOMES = table;

                return table;
            }
        }
    };


    var Genome = function (config, sequence, ideograms, aliases) {

        this.config = config;
        this.id = config.id;
        this.sequence = sequence;
        this.chromosomeNames = sequence.chromosomeNames;
        this.chromosomes = sequence.chromosomes;  // An object (functions as a dictionary)
        this.ideograms = ideograms;

        if (Object.keys(sequence.chromosomes).length > 1) {
            constructWG(this, config);
        } else {
            this.wgChromosomeNames = [sequence.chromosomeNames[0]];
        }

        /**
         * Return the official chromosome name for the (possibly) alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        var chrAliasTable = {},
            self = this;


        // The standard mappings
        chrAliasTable["all"] = "all";
        this.chromosomeNames.forEach(function (name) {
            var alias = name.startsWith("chr") ? name.substring(3) : "chr" + name;
            chrAliasTable[alias.toLowerCase()] = name;
            if (name === "chrM") chrAliasTable["mt"] = "chrM";
            if (name === "MT") chrAliasTable["chrm"] = "MT";
            chrAliasTable[name.toLowerCase()] = name;
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
                            chrAliasTable[alias.toLowerCase()] = defName;
                            chrAliasTable[alias] = defName;      // Should not be needed
                        }
                    });
                }

            });
        }

        this.chrAliasTable = chrAliasTable;

    }

    Genome.prototype.toJSON = function () {

        return Object.assign({}, this.config, {tracks: undefined});
    }

    Genome.prototype.getInitialLocus = function () {


    }

    Genome.prototype.getHomeChromosomeName = function () {
        if (this.chromosomes.hasOwnProperty("all")) {
            return "all";
        }
        else {
            const chromosome = this.chromosomes[this.chromosomeNames[0]];
            if (chromosome.rangeLocus) {
                return chromosome.name + ":" + chromosome.rangeLocus;
            } else {
                return this.chromosomeNames[0];
            }
        }
    }

    Genome.prototype.getChromosomeName = function (str) {
        var chr = this.chrAliasTable[str.toLowerCase()];
        return chr ? chr : str;
    }

    Genome.prototype.getChromosome = function (chr) {
        chr = this.getChromosomeName(chr);
        return this.chromosomes[chr];
    }

    Genome.prototype.getCytobands = function (chr) {
        return this.ideograms ? this.ideograms[chr] : null;
    }

    Genome.prototype.getLongestChromosome = function () {

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

    Genome.prototype.getChromosomes = function () {
        return this.chromosomes;
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    Genome.prototype.getGenomeCoordinate = function (chr, bp) {

        var offset = this.getCumulativeOffset(chr);
        if (offset === undefined) return undefined;

        return offset + bp;
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    Genome.prototype.getChromosomeCoordinate = function (genomeCoordinate) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this);
        }

        let lastChr = undefined;
        let lastCoord = 0;
        for (let name of this.wgChromosomeNames) {

            const cumulativeOffset = this.cumulativeOffsets[name];
            if (cumulativeOffset > genomeCoordinate) {
                const position = genomeCoordinate - lastCoord;
                return {chr: lastChr, position: position};
            }
            lastChr = name;
            lastCoord = cumulativeOffset;
        }

        // If we get here off the end
        return {chr: this.chromosomeNames[this.chromosomeNames.length - 1], position: 0};

    };


    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    Genome.prototype.getCumulativeOffset = function (chr) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this);
        }

        const queryChr = this.getChromosomeName(chr);
        return this.cumulativeOffsets[queryChr];
    };

    function computeCumulativeOffsets() {

        let self = this;
        let acc = {};
        let offset = 0;
        for (let name of self.wgChromosomeNames) {

            acc[name] = Math.floor(offset);

            const chromosome = self.getChromosome(name);

            offset += chromosome.bpLength;
        }

        return acc;
    }

    /**
     * Return the nominal genome length, this is the length of the main chromosomes (no scaffolds, etc).
     */
    Genome.prototype.getGenomeLength = function () {

        let self = this;

        if (!this.bpLength) {
            let bpLength = 0;
            self.wgChromosomeNames.forEach(function (cname) {
                let c = self.chromosomes[cname];
                bpLength += c.bpLength;
            });
            this.bpLength = bpLength;
        }
        return this.bpLength;
    }

    igv.Chromosome = function (name, order, bpStart, bpLength, rangeLocus) {
        this.name = name;
        this.order = order;
        this.bpStart = bpStart;
        this.bpLength = bpLength;
        this.rangeLocus = rangeLocus;
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
                lines = igv.splitLines(data),
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

            let plain

            if (dataUri.startsWith("data:application/gzip;base64")) {
                plain = igv.decodeDataURI(dataUri)
            }
            else {

                let bytes,
                    split = dataUri.split(','),
                    info = split[0].split(':')[1],
                    dataString = split[1];

                if (info.indexOf('base64') >= 0) {
                    dataString = atob(dataString);
                } else {
                    dataString = decodeURI(dataString);
                }

                bytes = new Uint8Array(dataString.length);
                for (let i = 0; i < dataString.length; i++) {
                    bytes[i] = dataString.charCodeAt(i);
                }

                var inflate = new Zlib.Gunzip(bytes);
                plain = inflate.decompress();
            }

            let s = "";
            const len = plain.length;
            for (let i = 0; i < len; i++) {
                s += String.fromCharCode(plain[i]);
            }
            return s;
        }
    }

    function loadAliases(aliasURL, config) {

        return igv.xhr.loadString(aliasURL, igv.buildOptions(config))

            .then(function (data) {

                var lines = igv.splitLines(data),
                    aliases = [];

                lines.forEach(function (line) {
                    if (!line.startsWith("#") & line.length > 0) aliases.push(line.split("\t"));
                });

                return aliases;
            });

    }


    function constructWG(genome, config) {

        let wgChromosomes;
        if (config.chromosomeOrder) {
            genome.wgChromosomeNames = config.chromosomeOrder.split(',').map(nm => nm.trim())
            wgChromosomes = genome.wgChromosomeNames.map(nm => genome.chromosomes[nm]).filter(chr => chr !== undefined)

        } else {

            // Trim small chromosomes.
            const lengths = Object.keys(genome.chromosomes).map(key => genome.chromosomes[key].bpLength)
            const median = lengths.reduce((a, b) => Math.max(a, b))
            const threshold = median / 50;
            wgChromosomes = Object.values(genome.chromosomes).filter(chr => chr.bpLength > threshold)

            // Sort chromosomes.  First segregate numeric and alpha names, sort numeric, leave alpha as is
            const numericChromosomes = wgChromosomes.filter(chr => isDigit(chr.name.replace('chr', '')))
            const alphaChromosomes = wgChromosomes.filter(chr => !isDigit(chr.name.replace('chr', '')))
            numericChromosomes.sort((a, b) => Number.parseInt(a.name.replace('chr', '')) - Number.parseInt(b.name.replace('chr', '')))

            const wgChromosomeNames = numericChromosomes.map(chr => chr.name)
            for (let chr of alphaChromosomes) {
                wgChromosomeNames.push(chr.name)
            }
            genome.wgChromosomeNames = wgChromosomeNames
        }


        // Compute psuedo-chromosome "all"
        const l = wgChromosomes.reduce((accumulator, currentValue) => accumulator += currentValue.bpLength, 0)
        genome.chromosomes["all"] = {
            name: "all",
            bpLength: l
        };

        function isDigit(val) {
            return /^\d+$/.test(val)
        }

    }


    return igv;

})
(igv || {});

