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

import {StringUtils} from "../../node_modules/igv-utils/src/index.js";

/**
 * Created by jrobinson on 4/7/16.
 */

const transcriptTypes = new Set(['transcript', 'primary_transcript', 'processed_transcript', 'mRNA', 'mrna',
    'lnc_RNA', 'miRNA', 'ncRNA', 'rRNA', 'scRNA', 'snRNA', 'snoRNA', 'tRNA']);
const cdsTypes = new Set(['CDS', 'cds']);
const codonTypes = new Set(['start_codon', 'stop_codon']);
const utrTypes = new Set(['5UTR', '3UTR', 'UTR', 'five_prime_UTR', 'three_prime_UTR', "3'-UTR", "5'-UTR"]);
const exonTypes = new Set(['exon', 'coding-exon']);

const transcriptModelParts = new Set();
for (let cltn of [transcriptTypes, cdsTypes, codonTypes, utrTypes, exonTypes]) {
    for (let t of cltn) {
        transcriptModelParts.add(t);
    }
}

function isTranscriptType(type) {
    return transcriptTypes.has(type) || type.endsWith("RNA") || type.endsWith("transcript");
}

function isTranscriptModelPart(type) {
    return transcriptModelParts.has(type) || type.endsWith("RNA")
}

class GFFHelper {

    constructor(options) {
        this.format = options.format;
        this.filterTypes = options.filterTypes === undefined ?
            new Set(['chromosome']) :
            new Set(options.filterTypes);
    }

    combineFeatures(features, genomicInterval) {

        let combinedFeatures;

        const filterTypes = this.filterTypes;
        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type));

        if ("gff3" === this.format) {
            const tmp = this.combineFeaturesById(features);
            combinedFeatures = this.combineFeaturesGFF(tmp);
        } else {
            combinedFeatures = this.combineFeaturesGFF(features);
        }
        combinedFeatures.sort(function (a, b) {
            return a.start - b.start;
        })
        this.numberExons(combinedFeatures, genomicInterval);
        return combinedFeatures;
    }

    /**
     * Combine multiple non-transcript model features with the same ID on the same chromosome into a single feature.
     * Features that are part of the transcript model (e.g. exon, mRNA, etc) are combined later.
     *
     * @param features
     * @returns {[]}
     */
    combineFeaturesById(features) {

        const chrIdMap = new Map();
        const combinedFeatures = [];

        for (let f of features) {
            if (isTranscriptModelPart(f.type)) {
                combinedFeatures.push(f);
            } else {
                let idMap = chrIdMap.get(f.chr);
                if (!idMap) {
                    idMap = new Map();
                    chrIdMap.set(f.chr, idMap);
                }

                let featureArray = idMap.get(f.id);
                if (featureArray) {
                    featureArray.push(f);
                } else {
                    idMap.set(f.id, [f]);
                }
            }
        }

        for (let idMap of chrIdMap.values()) {
            for (let featureArray of idMap.values()) {
                if (featureArray.length > 1) {
                    // Use the first feature as prototypical (for column 9 attributes), and adjust start/end
                    // Parts are represented as "exons", as that is how they are presented visually
                    const cf = featureArray[0];
                    cf.exons = [];
                    for (let f of featureArray) {
                        cf.start = Math.min(cf.start, f.start);
                        cf.end = Math.max(cf.end, f.end);
                        cf.exons.push({
                            start: f.start,
                            end: f.end
                        });
                    }
                    combinedFeatures.push(cf);
                } else {
                    combinedFeatures.push(featureArray[0]);
                }
            }
        }

        return combinedFeatures;
    }

    combineFeaturesGFF(features) {

        // Build dictionary of genes
        const genes = features.filter(f => "gene" === f.type || f.type.endsWith("_gene"));
        const geneMap = Object.create(null);
        for (let g of genes) {
            geneMap[g.id] = g;
        }

        // 1. Build dictionary of transcripts
        const transcripts = Object.create(null)
        const combinedFeatures = []
        const consumedFeatures = new Set();
        const filterTypes = this.filterTypes;

        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type))

        for (let f of features) {
            if (isTranscriptType(f.type)) {
                const transcriptId = f.id; // getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (undefined !== transcriptId) {
                    const gffTranscript = new GFFTranscript(f);
                    transcripts[transcriptId] = gffTranscript;
                    combinedFeatures.push(gffTranscript);
                    consumedFeatures.add(f);
                    const g = geneMap[f.parent];
                    if (g) {
                        gffTranscript.geneObject = g;
                        consumedFeatures.add(g);
                    }
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
                        if (!transcript && this.format === "gtf") {
                            // GTF does not require explicit transcript record, start one with this feature
                            transcript = new GFFTranscript({chr: f.chr, start: f.start, end: f.end, strand: f.strand});
                            transcripts[id] = transcript;
                            combinedFeatures.push(transcript);
                        }
                        if (transcript !== undefined) {
                            if(parents.length > 1) {
                                // Make a copy as exon can be modified differently by CDS, etc, for each transcript
                                const e2 = Object.assign({}, f);
                                transcript.addExon(e2);
                            } else {
                                transcript.addExon(f);
                            }
                            consumedFeatures.add(f);
                        }
                    }
                }
            }
        }

        // Add transcript parts
        for (let f of features) {
            if (cdsTypes.has(f.type) || utrTypes.has(f.type) || codonTypes.has(f.type)) {
                const parents = getParents(f);
                if (parents) {
                    for (let id of parents) {
                        let transcript = transcripts[id];
                        if (!transcript && this.format === "gtf") {
                            // GTF does not require explicit transcript record, start one with this feature
                            transcript = new GFFTranscript({chr: f.chr, start: f.start, end: f.end, strand: f.strand});
                            transcripts[id] = transcript;
                            combinedFeatures.push(transcript);
                        }
                        if (transcript !== undefined) {
                            if (utrTypes.has(f.type) || cdsTypes.has(f.type) || codonTypes.has(f.type)) {
                                transcript.addPart(f);
                            }
                            consumedFeatures.add(f);
                        }
                    }
                }
            }
        }

        // Introns are ignored, but are consumed if they belong to a transcript
        const introns = features.filter(f => f.type.includes("intron"));
        for (let i of introns) {
            const parents = getParents(i);
            for (let id of parents) {
                if (transcripts[id]) {
                    consumedFeatures.add(i);
                    break;
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

        return combinedFeatures;

        function getParents(f) {
            if (f.parent && f.parent.trim() !== "") {
                return f.parent.trim().split(",");
            } else {
                return null;
            }
        }
    }

    numberExons(features, genomicInterval) {

        for (let f of features) {
            if (f.exons &&
                (!genomicInterval ||
                    (f.end <= genomicInterval.end && f.start > genomicInterval.start))) {
                for (let i = 0; i < f.exons.length; i++) {
                    const exon = f.exons[i];
                    exon.number = f.strand === "-" ? f.exons.length - i : i + 1;
                }
            }
        }
    }
}


class GFFTranscript {

    constructor(feature) {
        Object.assign(this, feature);
        this.exons = [];
        this._parts = [];
    }

    addExon(feature) {

        this.exons.push(feature)

        // Expand feature --  for transcripts not explicitly represented in the file (gtf)
        this.start = Math.min(this.start, feature.start);
        this.end = Math.max(this.end, feature.end);
    }

    addPart(feature) {
        this._parts.push(feature);
    }

    assembleParts() {

        if (this._parts.length === 0) return;

        this._parts.sort(function (a, b) {
            return a.start - b.start;
        })

        // Create exons, if neccessary
        let lastStart = this._parts[0].start;
        let lastEnd = this._parts[0].end;
        for (let i = 1; i < this._parts.length; i++) {
            if (this._parts[i].start <= lastEnd) {
                lastEnd = Math.max(lastEnd, this._parts[i].end);
            } else {
                let exon = this.findExonContaining({start: lastStart, end: lastEnd});
                if (!exon) {
                    this.exons.push({start: lastStart, end: lastEnd});
                }
                lastStart = this._parts[i].start;
                lastEnd = this._parts[i].end;
            }
        }
        let exon = this.findExonContaining({start: lastStart, end: lastEnd});
        if (!exon) {
            this.exons.push({start: lastStart, end: lastEnd});
            this.start = Math.min(this.start, lastStart);
            this.end = Math.max(this.end, lastEnd);
        }


        for (let part of this._parts) {
            const type = part.type;
            if (cdsTypes.has(type) || codonTypes.has(type)) {
                this.addCDS(part);
            } else if (utrTypes.has(type)) {
                this.addUTR(part);
            } else {
                console.error("Unused transcript part: " + part.name);
            }
        }
        delete this._parts;
    }

    findExonContaining({start, end}) {
        for (let exon of this.exons) {
            if (exon.end >= end && exon.start <= start) {
                return exon;
            }
        }
        return undefined;
    }

    addCDS(cds) {

        let exon
        const exons = this.exons;

        for (let e of exons) {
            if (e.start <= cds.start && e.end >= cds.end) {
                exon = e;
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
            // cds.cdStart = cds.start
            // cds.cdEnd = cds.end
            // exons.push(cds)
            console.error("No exon found spanning " + cds.start + "-" + cds.end);
        }

        // Expand feature --  for transcripts not explicitly represented in the file (gtf files)
        // this.start = Math.min(this.start, cds.start);
        // this.end = Math.max(this.end, cds.end);

        this.cdStart = this.cdStart ? Math.min(cds.start, this.cdStart) : cds.start;
        this.cdEnd = this.cdEnd ? Math.max(cds.end, this.cdEnd) : cds.end;
    }

    addUTR(utr) {

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
            // utr.utr = true
            // exons.push(utr)
            console.error("No exon found spanning " + cds.start + "-" + cds.end);
        }

        // Expand feature --  for transcripts not explicitly represented in the file
        // this.start = Math.min(this.start, utr.start);
        // this.end = Math.max(this.end, utr.end);

    }

    finish() {

        this.assembleParts();

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

    popupData(genomicLocation) {

        const kvs = this.attributeString ? this.attributeString.split(';') : [];   // TODO -- what if gtf and gff2?
        const pd = []

        // If feature has an associated gene list its attributes first
        if (this.geneObject && typeof this.geneObject.popupData === 'function') {
            const gd = this.geneObject.popupData(genomicLocation);
            for (let e of gd) {
                pd.push(e);
            }
            pd.push('<hr/>');
        }
        if (this.name) {
            pd.push({name: 'name', value: this.name})
        }
        pd.push({name: 'type', value: this.type})
        for (let kv of kvs) {
            var t = kv.trim().split(this.delim, 2);
            if (t.length === 2 && t[1] !== undefined) {
                const key = t[0].trim();
                if ('name' === key.toLowerCase()) continue;
                let value = t[1].trim();
                //Strip off quotes, if any
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substr(1, value.length - 2);
                }
                pd.push({name: key, value: value});
            }
        }
        pd.push({
            name: 'position',
            value: `${this.chr}:${StringUtils.numberFormatter(this.start + 1)}-${StringUtils.numberFormatter(this.end)}`
        })


        // If clicked over an exon add its attributes
        for (let exon of this.exons) {
            if (genomicLocation >= exon.start && genomicLocation < exon.end && typeof exon.popupData === 'function') {
                pd.push('<hr/>')
                const exonData = exon.popupData(genomicLocation)
                for (let att of exonData) {
                    pd.push(att)
                }

                if (exon.children) {
                    for (let c of exon.children) {
                        pd.push('<hr/>')
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
}

export default GFFHelper;
