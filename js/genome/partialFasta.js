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
import {igvxhr, StringUtils, Zlib} from "../../node_modules/igv-utils/src/index.js";
import GenomicInterval from "./genomicInterval.js";
import Chromosome from "./chromosome.js";
import {buildOptions} from "../util/igvUtils.js";

const splitLines = StringUtils.splitLines;

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed']);

class FastaSequence {


    constructor(reference) {

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

        // Build a track-like config object from the referenceObject
        const config = {};
        for (let key in reference) {
            if (reference.hasOwnProperty(key) && !reservedProperties.has(key)) {
                config[key] = reference[key];
            }
        }
        this.config = config;
    }


    async init() {
        if (this.indexed) {
            return this.getIndex()
        } else {
            return this.loadAll();
        }
    }

    async getSequence(chr, start, end) {
        if (this.indexed) {
            return this.getSequenceIndexed(chr, start, end);
        } else {
            return this.getSequenceNonIndexed(chr, start, end)
        }
    }

    async getSequenceIndexed(chr, start, end) {

        if (!(this.interval && this.interval.contains(chr, start, end))) {

            // Expand query, to minimum of 50kb
            let qstart = start;
            let qend = end;
            if ((end - start) < 50000) {
                const w = (end - start);
                const center = Math.round(start + w / 2);
                qstart = Math.max(0, center - 25000);
                qend = center + 25000;
            }

            const seqBytes = await this.readSequence(chr, qstart, qend);
            this.interval = new GenomicInterval(chr, qstart, qend, seqBytes);
        }

        const offset = start - this.interval.start;
        const n = end - start;
        const seq = this.interval.features ? this.interval.features.substr(offset, n) : null;
        return seq;
    }


    async getSequenceNonIndexed(chr, start, end) {

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

        const seq = this.sequences[chr];
        const seqEnd = Math.min(end, seq.length)
        return prefix + seq.substring(start, seqEnd);
    }


    async getIndex() {

        if (this.index) {
            return this.index;
        } else {
            const data = await igvxhr.load(this.indexFile, buildOptions(this.config));
            const lines = splitLines(data);
            const len = lines.length;
            let lineNo = 0;
            let order = 0;
            this.index = {};

            while (lineNo < len) {
                const tokens = lines[lineNo++].split("\t");
                const nTokens = tokens.length;

                if (nTokens === 5) {
                    // Parse the index line.
                    const chr = tokens[0];
                    const size = parseInt(tokens[1]);
                    const position = parseInt(tokens[2]);
                    const basesPerLine = parseInt(tokens[3]);
                    const bytesPerLine = parseInt(tokens[4]);

                    const indexEntry = {
                        size: size,
                        position: position,
                        basesPerLine: basesPerLine,
                        bytesPerLine: bytesPerLine
                    };

                    this.chromosomeNames.push(chr);
                    this.index[chr] = indexEntry;
                    this.chromosomes[chr] = new Chromosome(chr, order++, 0, size);
                }
            }
            return this.index;
        }
    }

    /**
     * 
     * @returns {Promise<void>}
     */
    async loadAll() {

        let data;
        if (this.isDataURI) {
            data = this.file;     // <= Strange convention, revisit.
        } else {
            data = await igvxhr.load(this.file, buildOptions(this.config))
        }

        const lines = splitLines(data);
        const len = lines.length;
        let lineNo = 0;
        let currentSeq;
        let currentRangeLocus;
        let currentOffset = 0;
        let order = 0;
        let nextLine;
        let currentChr;
        while (lineNo < len) {
            nextLine = lines[lineNo++].trim();
            if (nextLine.startsWith("#") || nextLine.length === 0) {
                // skip
            } else if (nextLine.startsWith(">")) {
                // Start the next sequence
                if (currentSeq) {
                    this.chromosomeNames.push(currentChr);
                    this.sequences[currentChr] = currentSeq;
                    this.chromosomes[currentChr] = new Chromosome(currentChr, order++, currentOffset, currentOffset + currentSeq.length, currentRangeLocus);
                }

                const parts = nextLine.substr(1).split(/\s+/)

                // Check for samtools style locus string.   This is not perfect, and could fail on weird sequence names
                const nameParts = parts[0].split(':');
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
                        this.offsets[currentChr] = currentOffset;
                        currentRangeLocus = nameParts[1];
                    }
                }
            } else {
                currentSeq += nextLine;
            }
        }
        // add last seq
        if (currentSeq) {
            this.chromosomeNames.push(currentChr);
            this.sequences[currentChr] = currentSeq;
            this.chromosomes[currentChr] = new Chromosome(currentChr, order++, currentOffset, currentOffset + currentSeq.length, currentRangeLocus);
        }

    }

    async readSequence(chr, qstart, qend) {

        // let offset;
        // let start;
        // let end;
        // let basesPerLine;
        // let nEndBytes;

        await this.getIndex();

        const idxEntry = this.index[chr];
        if (!idxEntry) {
            console.log("No index entry for chr: " + chr);

            // Tag interval with null so we don't try again
            this.interval = new GenomicInterval(chr, qstart, qend, null);
            return null;

        } else {

            const start = Math.max(0, qstart);    // qstart should never be < 0
            const end = Math.min(idxEntry.size, qend);
            const bytesPerLine = idxEntry.bytesPerLine;
            const basesPerLine = idxEntry.basesPerLine;
            const position = idxEntry.position;
            const nEndBytes = bytesPerLine - basesPerLine;
            const startLine = Math.floor(start / basesPerLine);
            const endLine = Math.floor(end / basesPerLine);
            const base0 = startLine * basesPerLine;   // Base at beginning of start line
            const offset = start - base0;
            const startByte = position + startLine * bytesPerLine + offset;
            const base1 = endLine * basesPerLine;
            const offset1 = end - base1;
            const endByte = position + endLine * bytesPerLine + offset1 - 1;
            const byteCount = endByte - startByte + 1;

            let allBytes;
            if (byteCount <= 0) {
                console.error("No sequence for " + chr + ":" + qstart + "-" + qend);
            } else {
                allBytes = await igvxhr.load(this.file, buildOptions(this.config, {
                    range: {
                        start: startByte,
                        size: byteCount
                    }
                }));
            }

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
        }
    }
}

function decodeDataUri(dataUri) {

    const split = dataUri.split(',');
    const info = split[0].split(':')[1];
    let dataString = split[1];

    if (info.indexOf('base64') >= 0) {
        dataString = atob(dataString);
    } else {
        dataString = decodeURI(dataString);
    }

    const bytes = new Uint8Array(dataString.length);
    for (let i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i);
    }

    const inflate = new Zlib.Gunzip(bytes);
    const plain = inflate.decompress();

    let s = "";
    const len = plain.length;
    for (let i = 0; i < len; i++)
        s += String.fromCharCode(plain[i]);

    return s;
}

export default FastaSequence;
export {decodeDataUri};
