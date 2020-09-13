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
import {Zlib} from "../../node_modules/igv-utils/src/index.js";
import GenomicInterval from "./genomicInterval.js";
import Chromosome from "./chromosome.js";
import igvxhr from "../igvxhr.js";
import {buildOptions} from "../util/igvUtils.js";
import {StringUtils} from "../../node_modules/igv-utils/src/index.js";

const splitLines = StringUtils.splitLines;

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed']);

const FastaSequence = function (reference) {

    if (typeof reference.fastaURL === 'string' && reference.fastaURL.startsWith('data:')) {
        this.file = decodeDataUri(reference.fastaURL);
        this.indexed = false;  // dataURI is by definition not indexed
        this.isDataURI = true;
    } else {
        this.file = reference.fastaURL;
        this.indexed = reference.indexed !== false;   // Indexed unless it explicitly is not
        if (this.indexed) {
            this.indexFile = reference.indexURL || reference.indexFile || this.file + ".fai";
        }
    }
    this.withCredentials = reference.withCredentials;
    this.chromosomeNames = [];
    this.chromosomes = {};
    this.sequences = {};
    this.offsets = {};
    this.config = buildConfig(reference);

};

// Build a track-like config object from the referenceObject
function buildConfig(reference) {
    var key, config = {};
    for (key in reference) {
        if (reference.hasOwnProperty(key) && !reservedProperties.has(key)) {
            config[key] = reference[key];
        }
    }
    return config;
}

FastaSequence.prototype.init = function () {

    var self = this;

    if (self.indexed) {

        return self.getIndex()

    } else {
        return self.loadAll();
    }

}

FastaSequence.prototype.getSequence = function (chr, start, end) {
    if (this.indexed) {
        return getSequenceIndexed.call(this, chr, start, end);
    } else {
        return getSequenceNonIndexed.call(this, chr, start, end)
    }
}

function getSequenceIndexed(chr, start, end) {

    var self = this;

    var interval = self.interval;

    if (interval && interval.contains(chr, start, end)) {
        return Promise.resolve(getSequenceFromInterval(interval, start, end));
    } else {
        // Expand query, to minimum of 50kb
        var qstart = start;
        var qend = end;
        if ((end - start) < 50000) {
            var w = (end - start);
            var center = Math.round(start + w / 2);
            qstart = Math.max(0, center - 25000);
            qend = center + 25000;
        }

        return self.readSequence(chr, qstart, qend)

            .then(function (seqBytes) {
                self.interval = new GenomicInterval(chr, qstart, qend, seqBytes);
                return getSequenceFromInterval(self.interval, start, end);
            })
    }

    function getSequenceFromInterval(interval, start, end) {
        var offset = start - interval.start;
        var n = end - start;
        var seq = interval.features ? interval.features.substr(offset, n) : null;
        return seq;
    }

}


function getSequenceNonIndexed(chr, start, end) {

    var self = this;

    if (this.offsets[chr]) {
        start -= this.offsets[chr];
        end -= this.offsets[chr];
    }
    let prefix = "";
    if (start < 0) {
        for (let i = start; i < Math.min(end, 0); i++) {
            prefix += "*";
        }
    }

    if (end <= 0) {
        return Promise.resolve(prefix);
    }

    var seq = self.sequences[chr];
    const seqEnd = Math.min(end, seq.length)
    return Promise.resolve(prefix + seq.substring(start, end));
}

FastaSequence.prototype.getIndex = function () {

    if (this.index) {
        return Promise.resolve(this.index);
    } else {
        const self = this;
        return igvxhr.load(self.indexFile, buildOptions(self.config))

            .then(function (data) {

                const lines = splitLines(data);
                const len = lines.length;
                let lineNo = 0;
                let order = 0;
                self.index = {};

                while (lineNo < len) {
                    var tokens = lines[lineNo++].split("\t");
                    var nTokens = tokens.length;

                    if (nTokens === 5) {
                        // Parse the index line.
                        var chr = tokens[0];
                        var size = parseInt(tokens[1]);
                        var position = parseInt(tokens[2]);
                        var basesPerLine = parseInt(tokens[3]);
                        var bytesPerLine = parseInt(tokens[4]);

                        var indexEntry = {
                            size: size,
                            position: position,
                            basesPerLine: basesPerLine,
                            bytesPerLine: bytesPerLine
                        };

                        self.chromosomeNames.push(chr);
                        self.index[chr] = indexEntry;
                        self.chromosomes[chr] = new Chromosome(chr, order++, 0, size);
                    }
                }

                return self.index;

            })
    }

}

FastaSequence.prototype.loadAll = function () {

    var self = this;

    if (this.isDataURI) {
        return Promise.resolve(parseFasta(this.file));
    } else {
        return igvxhr.load(self.file, buildOptions(self.config))
            .then(parseFasta)
    }

    function parseFasta(data) {

        var lines = splitLines(data),
            len = lines.length,
            lineNo = 0,
            nextLine,
            currentSeq = "",
            currentChr,
            currentRangeLocus = undefined,
            currentOffset = 0,
            order = 0;


        while (lineNo < len) {
            nextLine = lines[lineNo++].trim();
            if (nextLine.startsWith("#") || nextLine.length === 0) {
                // skip
            } else if (nextLine.startsWith(">")) {
                if (currentSeq) {
                    self.chromosomeNames.push(currentChr);
                    self.sequences[currentChr] = currentSeq;
                    self.chromosomes[currentChr] = new Chromosome(currentChr, order++, currentOffset, currentOffset + currentSeq.length, currentRangeLocus);
                }

                const parts = nextLine.substr(1).split(/\s+/)

                // Check for samtools style locus string.   This is not perfect, and could fail on weird sequence names
                const nameParts = parts[0].split(':')
                currentChr = nameParts[0];
                currentSeq = "";
                currentOffset = 0
                currentRangeLocus = undefined;
                if (nameParts.length > 1 && nameParts[1].indexOf('-') > 0) {
                    const locusParts = nameParts[1].split('-')
                    if (locusParts.length === 2 &&
                        /^[0-9]+$/.test(locusParts[0]) &&
                        /^[0-9]+$/.test(locusParts[1])) {
                    }
                    const from = Number.parseInt(locusParts[0])
                    const to = Number.parseInt(locusParts[1])
                    if (to > from) {
                        currentOffset = from - 1;
                        self.offsets[currentChr] = currentOffset;
                        currentRangeLocus = nameParts[1];
                    }
                }
            } else {
                currentSeq += nextLine;
            }
        }
        // add last seq
        if (currentSeq) {
            self.chromosomeNames.push(currentChr);
            self.sequences[currentChr] = currentSeq;
            self.chromosomes[currentChr] = new Chromosome(currentChr, order++, currentOffset, currentOffset + currentSeq.length, currentRangeLocus);
        }
    }
}

FastaSequence.prototype.readSequence = function (chr, qstart, qend) {

    //console.log("Read sequence " + chr + ":" + qstart + "-" + qend);
    const self = this;

    let offset;
    let start;
    let end;
    let basesPerLine;
    let nEndBytes;

    return self.getIndex()

        .then(function () {

            var idxEntry = self.index[chr];
            if (!idxEntry) {
                console.log("No index entry for chr: " + chr);

                // Tag interval with null so we don't try again
                self.interval = new GenomicInterval(chr, qstart, qend, null);
                return null;

            } else {

                start = Math.max(0, qstart);    // qstart should never be < 0
                end = Math.min(idxEntry.size, qend);
                const bytesPerLine = idxEntry.bytesPerLine;
                basesPerLine = idxEntry.basesPerLine;
                const position = idxEntry.position;
                nEndBytes = bytesPerLine - basesPerLine;

                const startLine = Math.floor(start / basesPerLine);
                const endLine = Math.floor(end / basesPerLine);

                const base0 = startLine * basesPerLine;   // Base at beginning of start line

                offset = start - base0;

                const startByte = position + startLine * bytesPerLine + offset;

                const base1 = endLine * basesPerLine;
                const offset1 = end - base1;
                const endByte = position + endLine * bytesPerLine + offset1 - 1;
                const byteCount = endByte - startByte + 1;


                if (byteCount <= 0) {
                    console.error("No sequence for " + chr + ":" + qstart + "-" + qend)
                    return "";
                } else {
                    return igvxhr.load(self.file, buildOptions(self.config, {
                        range: {
                            start: startByte,
                            size: byteCount
                        }
                    }))
                }
            }
        })

        .then(function (allBytes) {

            if (!allBytes) {
                return null;
            } else {
                let nBases,
                    seqBytes = "",
                    srcPos = 0,
                    desPos = 0,
                    allBytesLength = allBytes.length;

                if (offset > 0) {
                    nBases = Math.min(end - start, basesPerLine - offset);
                    seqBytes += allBytes.substr(srcPos, nBases);
                    srcPos += (nBases + nEndBytes);
                    desPos += nBases;
                }

                while (srcPos < allBytesLength) {
                    nBases = Math.min(basesPerLine, allBytesLength - srcPos);
                    seqBytes += allBytes.substr(srcPos, nBases);
                    srcPos += (nBases + nEndBytes);
                    desPos += nBases;
                }

                return seqBytes;
            }
        })
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
    for (let i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i);
    }

    var inflate = new Zlib.Gunzip(bytes);
    var plain = inflate.decompress();

    let s = "";
    const len = plain.length;
    for (let i = 0; i < len; i++)
        s += String.fromCharCode(plain[i]);

    return s;
}

export default FastaSequence;
