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


    igv.GFFHelper = function (format) {

        this.format = format;

    }

    igv.GFFHelper.prototype.combineFeatures = function (features) {

        return combineGTF(features);

    }

    function combineGTF(features) {

        var transcripts = {},
            combinedFeatures = [];

        // 1. Build dictionary of transcripts
        features.forEach(function (f) {
            var id, gffTranscript;
            if ("transcript" === f.type) {
                id = getAttribute(f.attributeString, "transcript_id");
                if (id) {
                    gffTranscript = new GFFTranscript(f);
                    transcripts[id] = gffTranscript;
                    combinedFeatures.push(gffTranscript);
                }
                else {
                    combinedFeatures.push(f);
                }
            }
            f.tagged = true;
        });


        // Add exons
        features.forEach(function (f) {
            var id, transcript;
            if ("exon" === f.type) {
                id = getAttribute(f.attributeString, "transcript_id");
                if (id) {
                    transcript = transcripts[id];
                    if (transcript) {
                        transcript.addExon(f);
                    }
                    else {
                        combinedFeatures.push(f);
                    }
                }
                else {
                    combinedFeatures.push(f);
                }
            }
            f.tagged = true;
        });


        // Apply CDS and UTR
        features.forEach(function (f) {
            var id, transcript;
            if ("CDS" === f.type || "UTR" === f.type || "start_codon" === f.type || "stop_codon" === f.type) {
                id = getAttribute(f.attributeString, "transcript_id");
                if (id) {
                    transcript = transcripts[id];
                    if (transcript) {
                        if ("UTR" === f.type) {
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
                else {
                    combinedFeatures.push(f);
                }
            }
            f.tagged = true;
        });

        // Finish transcripts
        combinedFeatures.forEach(function (f) {
            if(f instanceof GFFTranscript) f.finish();
        })

        // Orphaned features -- should not be any of these
        features.forEach(function (f) {
            if (!f.tagged) {
                combinedFeatures.push(f);
            }
            f.tagged = undefined;
        });

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

    function getAttribute(attributeString, attribute) {
        var kvs = attributeString.split(';'), i;
        for (i = 0; i < kvs.length; i++) {
            var t = kvs[i].trim().split(/\s+/, 2);
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

    GFFTranscript.prototype.addExon = function (exon) {
        this.exons.push(exon);
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
            if (cds.start > exon.start) {
                exon.cdStart = cds.start;
            }
            if (cds.end < exon.end) {
                exon.cdEnd = cds.end;
            }
        } else {
            exons.push({start: cds.start, end: cds.end});  // Create new exon
        }

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
            if (utr.start > exon.start) {
                exon.cdEnd = utr.start;
            }
            if (utr.end < exon.end) {
                exon.cdStart = utr.end;
            }
        } else {
            exons.push({start: utr.start, end: utr.end, utr: true});  // Create new exon
        }
    }

    GFFTranscript.prototype.finish = function () {
        this.exons.sort(function (a, b) {
            return a.start - b.start;
        })
    }

    return igv;

})(igv || {});