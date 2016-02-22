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

var igv = (function (igv) {

    igv.FastaSequence = function (reference) {

        this.file = reference.fastaURL;
        this.indexed = reference.indexed !== false;   // Indexed unless it explicitly is not
        if (this.indexed) {
            this.indexFile = reference.indexFile || this.file + ".fai";
        }
        this.withCredentials = reference.withCredentials;

    };

    igv.FastaSequence.prototype.init = function () {

        var self = this;

        if (self.indexed) {

            return new Promise(function (fulfill, reject) {

                self.getIndex().then(function (index) {
                    var order = 0;
                    self.chromosomes = {};
                    self.chromosomeNames.forEach(function (chrName) {
                        var bpLength = self.index[chrName].size;
                        self.chromosomes[chrName] = new igv.Chromosome(chrName, order++, bpLength);
                    });


                    // Ignore index, getting chr names as a side effect.  Really bad practice
                    fulfill();
                }).catch(reject);
            });
        }
        else {
            return self.loadAll();
        }

    }

    igv.FastaSequence.prototype.getSequence = function (chr, start, end) {

        if (this.indexed) {
            return getSequenceIndexed.call(this, chr, start, end);
        }
        else {
            return getSequenceNonIndexed.call(this, chr, start, end);

        }

    }

    function getSequenceIndexed(chr, start, end) {

        var self = this;

        return new Promise(function (fulfill, reject) {
            var interval = self.interval;

            if (interval && interval.contains(chr, start, end)) {

                fulfill(getSequenceFromInterval(interval, start, end));
            }
            else {

                //console.log("Cache miss: " + (interval === undefined ? "nil" : interval.chr + ":" + interval.start + "-" + interval.end));

                // Expand query, to minimum of 100kb
                var qstart = start;
                var qend = end;
                if ((end - start) < 100000) {
                    var w = (end - start);
                    var center = Math.round(start + w / 2);
                    qstart = Math.max(0, center - 50000);
                    qend = center + 50000;
                }


                self.readSequence(chr, qstart, qend).then(function (seqBytes) {
                    self.interval = new igv.GenomicInterval(chr, qstart, qend, seqBytes);
                    fulfill(getSequenceFromInterval(self.interval, start, end));
                }).catch(reject);
            }

            function getSequenceFromInterval(interval, start, end) {
                var offset = start - interval.start;
                var n = end - start;
                var seq = interval.features ? interval.features.substr(offset, n) : null;
                return seq;
            }
        });
    }


    function getSequenceNonIndexed(chr, start, end) {

        var self = this;

        return new Promise(function (fulfill, reject) {
            var seq = self.sequences[chr];
            if (seq && seq.length > end) {
                fulfill(seq.substring(start, end));
            }
        });

    }

    igv.FastaSequence.prototype.getIndex = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {

            if (self.index) {
                fulfill(self.index);
            } else {
                igvxhr.load(self.indexFile, {
                    withCredentials: self.withCredentials
                }).then(function (data) {
                    var lines = data.splitLines();
                    var len = lines.length;
                    var lineNo = 0;

                    self.chromosomeNames = [];     // TODO -- eliminate this side effect !!!!
                    self.index = {};               // TODO -- ditto
                    while (lineNo < len) {

                        var tokens = lines[lineNo++].split("\t");
                        var nTokens = tokens.length;
                        if (nTokens == 5) {
                            // Parse the index line.
                            var chr = tokens[0];
                            var size = parseInt(tokens[1]);
                            var position = parseInt(tokens[2]);
                            var basesPerLine = parseInt(tokens[3]);
                            var bytesPerLine = parseInt(tokens[4]);

                            var indexEntry = {
                                size: size, position: position, basesPerLine: basesPerLine, bytesPerLine: bytesPerLine
                            };

                            self.chromosomeNames.push(chr);
                            self.index[chr] = indexEntry;
                        }
                    }

                    if (fulfill) {
                        fulfill(self.index);
                    }
                }).catch(reject);
            }
        });
    }

    igv.FastaSequence.prototype.loadAll = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {
            self.chromosomeNames = [];
            self.chromosomes = {};
            self.sequences = {};

            igvxhr.load(self.file, {
                withCredentials: self.withCredentials

            }).then(function (data) {

                var lines = data.splitLines(),
                    len = lines.length,
                    lineNo = 0,
                    nextLine,
                    currentSeq = "",
                    currentChr,
                    order = 0;


                while (lineNo < len) {
                    nextLine = lines[lineNo++].trim();
                    if (nextLine.startsWith("#") || nextLine.length === 0) {
                        continue;
                    }
                    else if (nextLine.startsWith(">")) {
                        if (currentSeq) {
                            self.chromosomeNames.push(currentChr);
                            self.sequences[currentChr] = currentSeq;
                            self.chromosomes[currentChr] = new igv.Chromosome(currentChr, order++, currentSeq.length);
                        }
                        currentChr = nextLine.substr(1).split("\\s+")[0];
                        currentSeq = "";
                    }
                    else {
                        currentSeq += nextLine;
                    }
                }

                fulfill();

            });
        });
    }

    igv.FastaSequence.prototype.readSequence = function (chr, qstart, qend) {

        //console.log("Read sequence " + chr + ":" + qstart + "-" + qend);
        var self = this;

        return new Promise(function (fulfill, reject) {
            self.getIndex().then(function () {

                var idxEntry = self.index[chr];
                if (!idxEntry) {
                    console.log("No index entry for chr: " + chr);

                    // Tag interval with null so we don't try again
                    self.interval = new igv.GenomicInterval(chr, qstart, qend, null);
                    fulfill(null);

                } else {

                    var start = Math.max(0, qstart);    // qstart should never be < 0
                    var end = Math.min(idxEntry.size, qend);
                    var bytesPerLine = idxEntry.bytesPerLine;
                    var basesPerLine = idxEntry.basesPerLine;
                    var position = idxEntry.position;
                    var nEndBytes = bytesPerLine - basesPerLine;

                    var startLine = Math.floor(start / basesPerLine);
                    var endLine = Math.floor(end / basesPerLine);

                    var base0 = startLine * basesPerLine;   // Base at beginning of start line

                    var offset = start - base0;

                    var startByte = position + startLine * bytesPerLine + offset;

                    var base1 = endLine * basesPerLine;
                    var offset1 = end - base1;
                    var endByte = position + endLine * bytesPerLine + offset1 - 1;
                    var byteCount = endByte - startByte + 1;
                    if (byteCount <= 0) {
                        fulfill(null);
                    }

                    igvxhr.load(self.file, {
                        range: {start: startByte, size: byteCount}
                    }).then(function (allBytes) {

                        var nBases,
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

                        fulfill(seqBytes);
                    }).catch(reject)
                }
            }).catch(reject)
        });
    }


    return igv;

})(igv || {});

