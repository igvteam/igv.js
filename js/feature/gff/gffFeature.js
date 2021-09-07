import {StringUtils} from "../../../node_modules/igv-utils/src/index.js";
import {isCoding, isIntron, isUTR} from "./so.js";
import {parseAttributeString} from "./gff.js";

const filterPopupProperties = new Set(["id", "parent", "name"])

class GFFFeature {

    constructor(properties) {
        Object.assign(this, properties);
    }

    popupData(genomicLocation) {

        const pd = this.geneObject ? this.geneObject.popupData() : [];

        if (this.geneObject) {
            pd.push('<hr/>');
        }

        if (this.name) {
            pd.push({name: 'Name', value: this.name});
        }

        pd.push({name: 'Type', value: this.type});
        pd.push({name: 'Source', value: this.source});

        if (this.attributeString) {
            const atts = parseAttributeString(this.attributeString, this.delim);
            for (let [key, value] of atts) {
                if (value !== undefined && value.length > 0 && !filterPopupProperties.has(key.toLowerCase())) {
                    pd.push({name: key + ":", value: value});
                }
            }
        }
        pd.push({
            name: 'Location',
            value: `${this.chr}:${StringUtils.numberFormatter(this.start + 1)}-${StringUtils.numberFormatter(this.end)}`
        })
        return pd;
    }

    getAttributeValue(attributeName) {
        if (this.hasOwnProperty(attributeName)) {
            return this[attributeName];
        } else {
            // TODO -- fetch from attribute string and cache
            if (!this._attributeCache) {
                this._attributeCache = new Map();
            } else if (this._attributeCache.has(attributeName)) {
                return this._attributeCache.get(attributeName);
            } else {
                const atts = parseAttributeString(this.attributeString, this.delim);
                let v;
                for (let [key, value] of atts) {
                    if (key === attributeName) {
                        v = value;
                        break;
                    }
                }
                this._attributeCache.set(attributeName, v);
                return v
            }
        }
    }
}

class GFFTranscript extends GFFFeature {

    constructor(feature) {
        super(feature);
        this.exons = [];
        this.parts = [];
    }

    addExon(feature) {

        this.exons.push(feature)

        // Expand feature --  for transcripts not explicitly represented in the file (gtf)
        this.start = Math.min(this.start, feature.start);
        this.end = Math.max(this.end, feature.end);
    }

    addPart(feature) {
        this.parts.push(feature);
    }

    assembleParts() {

        if (this.parts.length === 0) return;

        this.parts.sort(function (a, b) {
            return a.start - b.start;
        })

        // Create exons, if neccessary
        let lastStart = this.parts[0].start;
        let lastEnd = this.parts[0].end;
        for (let i = 1; i < this.parts.length; i++) {
            const part = this.parts[i];
            if (isIntron(part.type)) {
                continue;
            }
            if (part.start <= lastEnd) {
                lastEnd = Math.max(lastEnd, part.end);
            } else {
                let exon = this.findExonContaining({start: lastStart, end: lastEnd});
                if (!exon) {
                    this.exons.push({start: lastStart, end: lastEnd, psuedo: true});
                }
                lastStart = part.start;
                lastEnd = part.end;
            }
        }
        let exon = this.findExonContaining({start: lastStart, end: lastEnd});
        if (!exon) {
            this.exons.push({start: lastStart, end: lastEnd, psuedo: true});
            this.start = Math.min(this.start, lastStart);
            this.end = Math.max(this.end, lastEnd);
        }


        for (let part of this.parts) {
            const type = part.type;
            if (isCoding(type)) {
                this.addCDS(part);
            } else if (isUTR(type)) {
                this.addUTR(part);
            }
        }
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

        const pd = super.popupData(genomicLocation);

        // If clicked over an exon add its attributes
        for (let exon of this.exons) {
            if (exon.pseudo) continue;  // An implicit exon
            if (genomicLocation >= exon.start && genomicLocation < exon.end && typeof exon.popupData === 'function') {
                pd.push('<hr/>')
                const exonData = exon.popupData(genomicLocation)
                for (let att of exonData) {
                    pd.push(att)
                }
            }
        }

        for (let part of this.parts) {
            if (genomicLocation >= part.start && genomicLocation < part.end && typeof part.popupData === 'function') {
                pd.push('<hr/>')
                const partData = part.popupData(genomicLocation)
                for (let att of partData) {
                    pd.push(att)
                }
            }
        }


        return pd;
    }
}

export {GFFFeature, GFFTranscript};
