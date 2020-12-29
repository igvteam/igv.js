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

import Cytoband from "./cytoband.js";
import FastaSequence from "./fasta.js";
import {igvxhr, StringUtils, URIUtils, Zlib} from "../../node_modules/igv-utils/src/index.js";
import {buildOptions} from "../util/igvUtils.js";
import version from "../version.js";

const DEFAULT_GENOMES_URL = "https://igv.org/genomes/genomes.json";
const splitLines = StringUtils.splitLines;

const GenomeUtils = {

    loadGenome: async function (options) {

        const cytobandUrl = options.cytobandURL;
        const aliasURL = options.aliasURL;
        const sequence = new FastaSequence(options);
        await sequence.init()

        let cytobands
        if (cytobandUrl) {
            cytobands = await loadCytobands(cytobandUrl, sequence.config);
        }

        let aliases
        if (aliasURL) {
            aliases = await loadAliases(aliasURL, sequence.config);
        }

        return new Genome(options, sequence, cytobands, aliases);
    },

    initializeGenomes: async function (config) {

        if (!GenomeUtils.KNOWN_GENOMES) {

            const table = {};

            // Get default genomes
            if(config.loadDefaultGenomes !== false) {
                const url  = DEFAULT_GENOMES_URL + `?randomSeed=${Math.random().toString(36)}&version=${version()}`;  // prevent caching
                const jsonArray = await igvxhr.loadJson(url, {});
                processJson(jsonArray);
            }

            // Add user-defined genomes
            const genomeList = config.genomeList || config.genomes;
            if (genomeList) {
                if (typeof genomeList === 'string') {
                    const jsonArray = await igvxhr.loadJson(genomeList, {})
                    processJson(jsonArray);
                } else {
                    processJson(genomeList);
                }
            }

            GenomeUtils.KNOWN_GENOMES = table;

            function processJson(jsonArray) {
                jsonArray.forEach(function (json) {
                    table[json.id] = json;
                });
                return table;
            }
        }
    },

    isWholeGenomeView: function (chr) {
        return 'all' === chr.toLowerCase();
    }
};


class Genome {
    constructor(config, sequence, ideograms, aliases) {

        this.config = config;
        this.id = config.id;
        this.sequence = sequence;
        this.chromosomeNames = sequence.chromosomeNames;
        this.chromosomes = sequence.chromosomes;  // An object (functions as a dictionary)
        this.ideograms = ideograms;
        this.featureDB = {};   // Hash of name -> feature, used for search function.

        this.wholeGenomeView = config.wholeGenomeView === undefined || config.wholeGenomeView;
        if (this.wholeGenomeView && Object.keys(sequence.chromosomes).length > 1) {
            constructWG(this, config);
        } else {
            this.wgChromosomeNames = sequence.chromosomeNames;
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

    showWholeGenomeView() {
        return this.config.wholeGenomeView !== false;
    }

    toJSON() {
        return Object.assign({}, this.config, {tracks: undefined});
    }

    getInitialLocus() {

    }

    getHomeChromosomeName() {
        if (this.showWholeGenomeView() && this.chromosomes.hasOwnProperty("all")) {
            return "all";
        } else {
            const chromosome = this.chromosomes[this.chromosomeNames[0]];
            if (chromosome.rangeLocus) {
                return chromosome.name + ":" + chromosome.rangeLocus;
            } else {
                return this.chromosomeNames[0];
            }
        }
    }

    getChromosomeName(str) {
        var chr = this.chrAliasTable[str.toLowerCase()];
        return chr ? chr : str;
    }

    getChromosome(chr) {
        chr = this.getChromosomeName(chr);
        return this.chromosomes[chr];
    }

    getCytobands(chr) {
        return this.ideograms ? this.ideograms[chr] : null;
    }

    getLongestChromosome() {

        var longestChr,
            chromosomes = this.chromosomes;
        for (let key in chromosomes) {
            if (chromosomes.hasOwnProperty(key)) {
                var chr = chromosomes[key];
                if (longestChr === undefined || chr.bpLength > longestChr.bpLength) {
                    longestChr = chr;
                }
            }
            return longestChr;
        }
    }

    getChromosomes() {
        return this.chromosomes;
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    getGenomeCoordinate(chr, bp) {

        var offset = this.getCumulativeOffset(chr);
        if (offset === undefined) return undefined;

        return offset + bp;
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    getChromosomeCoordinate(genomeCoordinate) {

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
    getCumulativeOffset(chr) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this);
        }

        const queryChr = this.getChromosomeName(chr);
        return this.cumulativeOffsets[queryChr];

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
    }

    /**
     * Return the nominal genome length, this is the length of the main chromosomes (no scaffolds, etc).
     */
    getGenomeLength() {

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
}

function loadCytobands(cytobandUrl, config) {
    if (cytobandUrl.startsWith("data:")) {
        var data = decodeDataUri(cytobandUrl);
        return Promise.resolve(getCytobands(data));
    } else {
        return igvxhr.loadString(cytobandUrl, buildOptions(config))
            .then(function (data) {
                return getCytobands(data);
            });
    }

    function getCytobands(data) {
        var bands = [],
            lastChr,
            n = 0,
            c = 1,
            lines = splitLines(data),
            len = lines.length,
            cytobands = {};

        for (var i = 0; i < len; i++) {
            var tokens = lines[i].split("\t");
            var chr = tokens[0];
            if (!lastChr) lastChr = chr;

            if (chr !== lastChr) {

                cytobands[lastChr] = bands;
                bands = [];
                lastChr = chr;
                n = 0;
                c++;
            }

            if (tokens.length === 5) {
                //10	0	3000000	p15.3	gneg
                var start = parseInt(tokens[1]);
                var end = parseInt(tokens[2]);
                var name = tokens[3];
                var stain = tokens[4];
                bands[n++] = new Cytoband(start, end, name, stain);
            }
        }

        return cytobands;
    }

    function decodeDataUri(dataUri) {

        let plain

        if (dataUri.startsWith("data:application/gzip;base64")) {
            plain = URIUtils.decodeDataURI(dataUri)
        } else {

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

    return igvxhr.loadString(aliasURL, buildOptions(config))

        .then(function (data) {

            var lines = splitLines(data),
                aliases = [];

            lines.forEach(function (line) {
                if (!line.startsWith("#") && line.length > 0) aliases.push(line.split("\t"));
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

export default GenomeUtils;
