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

    igv.FastaSequence = function (file, indexFile) {

        if (!indexFile) {
            indexFile = file + ".fai";
        }

        this.file = file;
        this.indexFile = indexFile;
    };

    igv.FastaSequence.prototype.getSequence = function (chr, start, end, continuation, task) {

        var myself = this,
            interval = myself.interval;

        if (interval && interval.contains(chr, start, end)) {

            continuation(getSequenceFromInterval(interval, start, end));
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


            this.readSequence(chr, qstart, qend, function (seqBytes) {
                    myself.interval = new igv.GenomicInterval(chr, qstart, qend, seqBytes);
                    continuation(getSequenceFromInterval(myself.interval, start, end));
                },
                task);
        }

        function getSequenceFromInterval(interval, start, end) {
            var offset = start - interval.start;
            var n = end - start;
            var seq = interval.features ? interval.features.substr(offset, n) : null;
            return seq;
        }

    };

    igv.FastaSequence.prototype.loadIndex = function (continuation) {

        var sequence = this;

        igv.loadData(this.indexFile, function (data) {

            var lines = data.splitLines();
            var len = lines.length;
            var lineNo = 0;

            sequence.chromosomeNames = [];
            sequence.index = {};
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

                    sequence.chromosomeNames.push(chr);
                    sequence.index[chr] = indexEntry;
                }
            }

            if (continuation) {
                continuation(sequence.index);
            }
        });
    };

    igv.FastaSequence.prototype.readSequence = function (chr, qstart, qend, continuation, task) {

        //console.log("Read sequence " + chr + ":" + qstart + "-" + qend);
        var fasta = this;

        if (!this.index) {
            this.loadIndex(function () {
                fasta.readSequence(chr, qstart, qend, continuation, task);
            })
        } else {
            var idxEntry = this.index[chr];
            if (!idxEntry) {
                console.log("No index entry for chr: " + chr);

                // Tag interval with null so we don't try again
                fasta.interval = new igv.GenomicInterval(chr, qstart, qend, null);
                continuation(null);
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
                    return;
                }

                var dataLoader = new igv.DataLoader(fasta.file);
                dataLoader.range = {start: startByte, size: byteCount};
                dataLoader.loadBinaryString(function (allBytes) {

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

                        continuation(seqBytes);
                    },
                    task);
            }
        }
    };


    return igv;

})(igv || {});

