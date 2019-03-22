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


    const transcriptTypes = new Set(['transcript', 'primary_transcript', 'processed_transcript', 'mRNA', 'mrna']);
    const cdsTypes = new Set(['CDS', 'cds']);
    const codonTypes = new Set(['start_codon', 'stop_codon']);
    const utrTypes = new Set(['5UTR', '3UTR', 'UTR', 'five_prime_UTR', 'three_prime_UTR', "3'-UTR", "5'-UTR"]);
    const exonTypes = new Set(['exon', 'coding-exon']);

    igv.GFFHelper = function (options) {
        this.format = options.format;
        if(options.filterTypes) {
            this.filterTypes = new Set(options.filterTypes)
        }
    }

    igv.GFFHelper.prototype.combineFeatures = function (features) {

        if ("gff3" === this.format) {
            return combineFeaturesGFF.call(this, features);
        }
        else {
            return combineFeaturesGTF.call(this, features);
        }
    }

    function combineFeaturesGTF(features) {

        const transcripts = Object.create(null)
        const combinedFeatures = []
        const consumedFeatures = new Set();
        const filterTypes = this.filterTypes;

        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type))

        // 1. Build dictionary of transcripts
        for (let f of features) {
            if (transcriptTypes.has(f.type)) {
                const transcriptId = f.id
                if (undefined !== transcriptId) {
                    const gffTranscript = new GFFTranscript(f);
                    transcripts[transcriptId] = gffTranscript;
                    combinedFeatures.push(gffTranscript);
                    consumedFeatures.add(f)
                }
            }
        }

        // Add exons
        for (let f of features) {
            if (exonTypes.has(f.type)) {
                const id = f.id;   // transcript_id,  GTF groups all features with the same ID, does not have a parent/child hierarchy
                if (id) {
                    let transcript = transcripts[id];
                    if (transcript === undefined) {
                        transcript = new GFFTranscript(f);    // GTF does not require an explicit transcript record
                        transcripts[id] = transcript;
                        combinedFeatures.push(transcript);
                    }
                    transcript.addExon(f);
                    consumedFeatures.add(f)
                }
            }
        }

        // Apply CDS and UTR
        for (let f of features) {
            if (cdsTypes.has(f.type) || utrTypes.has(f.type) || codonTypes.has(f.type)) {
                const id = f.id;
                if (id) {
                    let transcript = transcripts[id];
                    if (transcript === undefined) {
                        transcript = new GFFTranscript(f);
                        transcripts[id] = transcript;
                        combinedFeatures.push(transcript);
                    }
                    if (utrTypes.has(f.type)) {
                        transcript.addUTR(f);
                    }
                    else if (cdsTypes.has(f.type)) {
                        transcript.addCDS(f);
                    }
                    else if (codonTypes.has(f.type)) {
                        // Ignore for now
                    }
                    consumedFeatures.add(f)
                }
            }
        }

        // Finish transcripts
        for (let f of combinedFeatures) {
            if (typeof f.finish === "function") {
                f.finish();
            }
        }

        // Add other features
        const others = features.filter(f => !consumedFeatures.has(f))
        for (let f of others) {
            combinedFeatures.push(f);
        }

        combinedFeatures.sort(function (a, b) {
            return a.start - b.start;
        })

        return combinedFeatures;

    }

    function combineFeaturesGFF(features) {

        // 1. Build dictionary of transcripts
        const transcripts = Object.create(null)
        const combinedFeatures = []
        const consumedFeatures = new Set();
        const filterTypes = this.filterTypes;

        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type))

        for (let f of features) {
            if (transcriptTypes.has(f.type)) {
                const transcriptId = f.id; // getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (undefined !== transcriptId) {
                    const gffTranscript = new GFFTranscript(f);
                    transcripts[transcriptId] = gffTranscript;
                    combinedFeatures.push(gffTranscript);
                    consumedFeatures.add(f)
                }
            }
        }

        // Add exons
        for (let f of features) {
            if (exonTypes.has(f.type)) {
                const parents = getParents(f);
                if (parents) {
                    for (let id of parents) {
                        let transcript = transcripts[id];
                        if (transcript !== undefined) {
                            transcript.addExon(f);
                            consumedFeatures.add(f)
                        }
                    }
                }
            }
        }

        // Apply CDS and UTR
        for (let f of features) {
            if (cdsTypes.has(f.type) || utrTypes.has(f.type) || codonTypes.has(f.type)) {
                const parents = getParents(f);
                if (parents) {
                    for (let id of parents) {
                        let transcript = transcripts[id];
                        if (transcript !== undefined) {
                            if (utrTypes.has(f.type)) {
                                transcript.addUTR(f);
                            }
                            else if (cdsTypes.has(f.type)) {
                                transcript.addCDS(f);
                            }
                            else if (codonTypes.has(f.type)) {
                                // Ignore for now
                            }
                            consumedFeatures.add(f);
                        }
                    }
                }
            }
        }

        // Finish transcripts
        combinedFeatures.forEach(function (f) {
            if (typeof f.finish === "function") {
                f.finish();
            }
        })

        // Add other features
        const others = features.filter(f => !consumedFeatures.has(f))
        for (let f of others) {
            combinedFeatures.push(f);
        }

        combinedFeatures.sort(function (a, b) {
            return a.start - b.start;
        })

        return combinedFeatures;

        function getParents(f) {
            if (f.parent && f.parent.trim() !== "") {
                return f.parent.trim().split(",");
            }
            else {
                return null;
            }
        }

    }

    var GFFTranscript = function (feature) {
        Object.assign(this, feature);
        this.exons = [];
    }

    GFFTranscript.prototype.addExon = function (feature) {

        this.exons.push(feature)

        // Expand feature --  for transcripts not explicitly represented in the file
        this.start = Math.min(this.start, feature.start);
        this.end = Math.max(this.end, feature.end);
    }

    GFFTranscript.prototype.addCDS = function (cds) {

        let exon
        const exons = this.exons;

        // Find exon containing CDS
        for (let i = 0; i < exons.length; i++) {
            if (exons[i].start <= cds.start && exons[i].end >= cds.end) {
                exon = exons[i];
                break;
            }
        }

        if (exon) {
            exon.cdStart = exon.cdStart ? Math.min(cds.start, exon.cdStart) : cds.start;
            exon.cdEnd = exon.cdEnd ? Math.max(cds.end, exon.cdEnd) : cds.end;
            if (!exon.children) {
                exon.children = []
            }
            exon.children.push(cds)
        } else {
            cds.cdStart = cds.start
            cds.ccdEnd = cds.end
            exons.push(cds)
        }

        // Expand feature --  for transcripts not explicitly represented in the file (gtf files)
        this.start = Math.min(this.start, cds.start);
        this.end = Math.max(this.end, cds.end);

        this.cdStart = this.cdStart ? Math.min(cds.start, this.cdStart) : cds.start;
        this.cdEnd = this.cdEnd ? Math.max(cds.end, this.cdEnd) : cds.end;
    }

    GFFTranscript.prototype.addUTR = function (utr) {

        let exon
        const exons = this.exons;

        // Find exon containing CDS
        for (let i = 0; i < exons.length; i++) {
            if (exons[i].start <= utr.start && exons[i].end >= utr.end) {
                exon = exons[i];
                break;
            }
        }

        if (exon) {
            if (utr.start === exon.start && utr.end === exon.end) {
                exon.utr = true;
            } else {
                if (utr.end < exon.end) {
                    exon.cdStart = utr.end
                }
                if (utr.start > exon.start) {
                    exon.cdEnd = utr.start
                }
            }
            if (!exon.children) {
                exon.children = []
            }
            exon.children.push(utr)

        } else {
            utr.utr = true
            exons.push(utr)
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

    GFFTranscript.prototype.popupData = function (genomicLocation) {

        const kvs = this.attributeString.split(';')
        const pd = []
        pd.push({name: 'type', value: this.type})
        pd.push({name: 'start', value: this.start + 1})
        pd.push({name: 'end', value: this.end})

        for (let kv of kvs) {
            var t = kv.trim().split(this.delim, 2);
            if (t.length === 2 && t[1] !== undefined) {
                const key = t[0].trim();
                let value = t[1].trim();
                //Strip off quotes, if any
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substr(1, value.length - 2);
                }
                pd.push({name: key, value: value});
            }
        }

        // If clicked over an exon add its attributes
        for (let exon of this.exons) {
            if (genomicLocation >= exon.start && genomicLocation < exon.end) {
                pd.push("<hr>")
                const exonData = exon.popupData(genomicLocation)
                for (let att of exonData) {
                    pd.push(att)
                }

                if (exon.children) {
                    for (let c of exon.children) {
                        pd.push("<hr>")
                        const exonData = c.popupData(genomicLocation)
                        for (let att of exonData) {
                            pd.push(att)
                        }
                    }
                }

            }
        }


        return pd;
    }

    return igv;

})(igv || {});
