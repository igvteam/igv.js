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
import {igvxhr, StringUtils, BGZip, URIUtils} from "../../node_modules/igv-utils/src/index.js";
import Chromosome from "./chromosome.js";
import {buildOptions} from "../util/igvUtils.js";

const splitLines = StringUtils.splitLines;

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed']);

class NonIndexedFasta {


    constructor(reference) {

        this.fastaURL = reference.fastaURL;
        this.withCredentials = reference.withCredentials;
        this.chromosomeNames = [];
        this.chromosomes = {};
        this.sequences = new Map();
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
            return this.loadAll();
    }

    async getSequence(chr, start, end) {

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

        const seq = this.sequences.get(chr);
        const seqEnd = Math.min(end, seq.length)
        return prefix + seq.substring(start, seqEnd);
    }

    async loadAll() {

        let data;
        if (typeof this.fastaURL === 'string' && this.fastaURL.startsWith('data:')) {
            let bytes = BGZip.decodeDataURI(this.fastaURL);
            data = "";
            const len = bytes.length;
            for (let i = 0; i < len; i++)
                data += String.fromCharCode(bytes[i]);
        } else {
            data = await igvxhr.load(this.fastaURL, buildOptions(this.config))
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
                    this.sequences.set(currentChr, currentSeq);
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
            this.sequences.set(currentChr, currentSeq);
            this.chromosomes[currentChr] = new Chromosome(currentChr, order++, currentOffset, currentOffset + currentSeq.length, currentRangeLocus);
        }

    }

}


export default NonIndexedFasta;
