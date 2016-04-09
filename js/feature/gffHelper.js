/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
 * Author: Jim Robinson
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

/**
 * Created by jrobinson on 4/7/16.
 */

var igv = (function (igv) {

    var transcriptTypes;
    var cdsTypes;
    var utrTypes;
    var exonTypes;

    function setTypes() {
        transcriptTypes = new Set();
        cdsTypes = new Set();
        utrTypes = new Set();
        exonTypes = new Set();
        transcriptTypes.addAll(['transcript', 'primary_transcript', 'processed_transcript', 'mRNA', 'mrna']);
        cdsTypes.addAll(['CDS', 'cds', 'start_codon', 'stop_codon']);
        utrTypes.addAll(['5UTR', '3UTR', 'UTR', 'five_prime_UTR', 'three_prime_UTR', "3'-UTR", "5'-UTR"]);
        exonTypes.addAll(['exon', 'coding-exon']);


    }

    igv.GFFHelper = function (format) {
        this.format = format;
    }

    igv.GFFHelper.prototype.combineFeatures = function (features) {

        return combineGTF(features);

    }

    function combineGTF(features) {

        if (transcriptTypes === undefined) setTypes();

        var transcripts = {},
            combinedFeatures = [];

        // 1. Build dictionary of transcripts  -- transcript records are not required in gtf / gff v2
        features.forEach(function (f) {
            var transcriptId, gffTranscript;
            if (transcriptTypes.has(f.type)) {
                transcriptId = f.id; // getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (transcriptId) {
                    gffTranscript = new GFFTranscript(f);
                    transcripts[transcriptId] = gffTranscript;
                    combinedFeatures.push(gffTranscript);
                }
                else {
                    combinedFeatures.push(f);
                }
            }
        });


        // Add exons
        features.forEach(function (f) {
            var id, transcript;
            if (exonTypes.has(f.type)) {
                id = f.id; //getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (id) {
                    transcript = transcripts[id];
                    if (transcript === undefined) {
                        transcript = new GFFTranscript(f);
                        transcripts[id] = transcript;
                        combinedFeatures.push(transcript);
                    }
                    transcript.addExon(f);
                }
                else {
                    combinedFeatures.push(f);  // error?
                }
            }
        });


        // Apply CDS and UTR
        features.forEach(function (f) {
            var id, transcript;
            if (cdsTypes.has(f.type) || utrTypes.has(f.type)) {
                id = f.id; //getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (id) {
                    transcript = transcripts[id];
                    if (transcript === undefined) {
                        transcript = new GFFTranscript(f);
                        transcripts[id] = transcript;
                        combinedFeatures.push(transcript);
                    }

                    if (utrTypes.has(f.type)) {
                        transcript.addUTR(f);
                    }
                    else {
                        transcript.addCDS(f);
                    }

                }
                else {
                    combinedFeatures.push(f);
                }
            }
        });

        // Finish transcripts
        combinedFeatures.forEach(function (f) {
            if (f instanceof GFFTranscript) f.finish();
        })

        combinedFeatures.sort(function (a, b) {
            return a.start - b.start;
        })

        return combinedFeatures;

    }

    function parseAttributeString(attributeString) {

        var kvs = attributeString.split(';'),
            dict = {};
        kvs.forEach(function (kv) {
            var t = kv.split('=', 2);
            if (t.length === 2)
                dict[t[0]] = t[1];
        });
        return dict;
    }

    function getAttribute(attributeString, attribute, delim) {
        var kvs = attributeString.split(';'), i;
        for (i = 0; i < kvs.length; i++) {
            var t = kvs[i].trim().split(delim, 2);
            if (t.length === 2 && attribute === t[0])
                return t[1];
        }
        return null;
    }

    GFFTranscript = function (feature) {
        Object.assign(this, feature);
        this.exons = [];
        this.attributeString = feature.attributeString;
    }

    GFFTranscript.prototype.addExon = function (feature) {
        this.exons.push({
            start: feature.start,
            end: feature.end
        });
        // Expand feature --  for transcripts not explicitly represented in the file
        this.start = Math.min(this.start, feature.start);
        this.end = Math.max(this.end, feature.end);
    }

    GFFTranscript.prototype.addCDS = function (cds) {

        var i, exon,
            exons = this.exons;

        // Find exon containing CDS
        for (i = 0; i < exons.length; i++) {
            if (exons[i].start <= cds.start && exons[i].end >= cds.end) {
                exon = exons[i];
                break;
            }
        }

        if (exon) {
            exon.cdStart = exon.cdStart ? Math.min(cds.start, exon.cdStart) : cds.start;
            exon.cdEnd = exon.cdEnd ? Math.max(cds.end, exon.cdEnd) : cds.end;

        } else {
            exons.push({start: cds.start, end: cds.end, cdStart: cds.start, cdEnd: cds.end});  // Create new exon
        }

        // Expand feature --  for transcripts not explicitly represented in the file
        this.start = Math.min(this.start, cds.start);
        this.end = Math.max(this.end, cds.end);

        this.cdStart = this.cdStart ? Math.min(cds.start, this.cdStart) : cds.start;
        this.cdEnd = this.cdEnd ? Math.max(cds.end, this.cdEnd) : cds.end;

    }

    GFFTranscript.prototype.addUTR = function (utr) {

        var i, exon,
            exons = this.exons;

        // Find exon containing CDS
        for (i = 0; i < exons.length; i++) {
            if (exons[i].start <= utr.start && exons[i].end >= utr.end) {
                exon = exons[i];
                break;
            }
        }

        if (exon) {
            if (utr.start === exon.start && utr.end === exon.end) {
                exon.utr = true;
            }

        } else {
            exons.push({start: utr.start, end: utr.end, utr: true});  // Create new exon
        }

        // Expand feature --  for transcripts not explicitly represented in the file
        this.start = Math.min(this.start, utr.start);
        this.end = Math.max(this.end, utr.end);
    }

    GFFTranscript.prototype.finish = function () {

        var cdStart = this.cdStart;
        var cdEnd = this.cdEnd;

        this.exons.sort(function (a, b) {
            return a.start - b.start;
        })

        // Search for UTR exons that were not explicitly tagged
        if (cdStart) {
            this.exons.forEach(function (exon) {
                if (exon.end < cdStart || exon.start > cdEnd) exon.utr = true;
            });
        }

    }

    return igv;

})(igv || {});