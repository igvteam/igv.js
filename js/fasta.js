// Indexed fasta files

var igv = (function (igv) {

    var instanceMap = {};

    igv.getFastaSequence = function(file, indexFile) {

        var inst = instanceMap[file];

        if(!inst) {
            inst = new FastaSequence(file, indexFile);
            instanceMap[file] = inst;
        }

        return inst;
    }

    var FastaSequence = function (file, indexFile) {

        if (!indexFile) {
            indexFile = file + ".fai";
        }

        this.file = file;
        this.indexFile = indexFile;

        // Coords are UCSC style  (first base is zero)
        this.getSequence = function (chr, start, end, continuation, task) {

            var interval = this.interval;
            if (interval && interval.contains(chr, start, end)) {
                continuation(getSequenceFromInterval(interval, start, end));
            }
            else {
                // Expand query, to maximum of 100kb
                var qstart = start;
                var qend = end;
                if ((end - start) < 100000) {
                    var w = (end - start);
                    var center = Math.round(start + w / 2);
                    qstart = center - 500000;
                    qend = center + 500000;
                }
                this.readSequence(chr, qstart, qend, function(seqBytes) {
                    this.interval = new igv.GenomicInterval(chr, qstart, qend, seqBytes);
                    continuation(getSequenceFromInterval(this.interval, start, end));
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

        this.loadIndex = function (callback) {

            var sequence = this;
            igv.loadData(this.indexFile, function (data) {

                var lines = data.split("\n");
                var len = lines.length;
                var lineNo = 0;
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

                        sequence.index[chr] = indexEntry;
                    }
                }

                if (callback) {
                    callback(sequence.index);
                }
            });
        };

        this.readSequence = function (chr, qstart, qend, continuation, task) {

            var fasta = this;

            if (!this.index) {
                this.loadIndex(function () {
                    fasta.readSequence(chr, qstart, qend, continuation, task);
                })
            } else {
                var idxEntry = this.index[chr];
                if (!idxEntry)   idxEntry = this.index["chr" + chr];
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


    }

    return igv;

})(igv || {});

