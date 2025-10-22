import {isExon, isTranscript, isTranscriptPart} from "./so.js"
import {GFFFeature, GFFTranscript} from "./gffFeature.js"


class GFFHelper {

    static gffNameFields = new Set(["Name", "transcript_id", "gene_name", "gene", "gene_id", "alias", "locus", "name" ])
    constructor(options) {
        this.format = options.format
        this.nameField = options.nameField
        this.filterTypes = options.filterTypes === undefined ?
            new Set(['chromosome']) :
            new Set(options.filterTypes)
    }

    combineFeatures(features, genomicInterval) {

        let combinedFeatures

        const filterTypes = this.filterTypes
        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type))

        if ("gff3" === this.format) {
            const tmp = this.combineFeaturesById(features)
            combinedFeatures = this.combineFeaturesByType(tmp)
        } else {
            combinedFeatures = this.combineFeaturesByType(features)
        }

        this.numberExons(combinedFeatures, genomicInterval)
        this.nameFeatures(combinedFeatures)
        return combinedFeatures
    }

    /**
     * Combine multiple non-transcript model features with the same ID on the same chromosome into a single feature.
     * Features that are part of the transcript model (e.g. exon, mRNA, etc) are combined later.
     *
     * @param features
     * @returns {[]}
     */
    combineFeaturesById(features) {

        const chrIdMap = new Map()
        const combinedFeatures = []

        for (let f of features) {
            if (isTranscriptPart(f.type) || isTranscript(f.type) || !f.id) {
                combinedFeatures.push(f)
            } else {
                let idMap = chrIdMap.get(f.chr)
                if (!idMap) {
                    idMap = new Map()
                    chrIdMap.set(f.chr, idMap)
                }

                let featureArray = idMap.get(f.id)
                if (featureArray) {
                    featureArray.push(f)
                } else {
                    idMap.set(f.id, [f])
                }
            }
        }

        for (let idMap of chrIdMap.values()) {
            for (let featureArray of idMap.values()) {
                if (featureArray.length > 1) {
                    // Use the first feature as prototypical (for column 9 attributes), and adjust start/end
                    // Parts are represented as "exons", as that is how they are presented visually
                    const cf = featureArray[0]
                    cf.exons = []
                    for (let f of featureArray) {
                        cf.start = Math.min(cf.start, f.start)
                        cf.end = Math.max(cf.end, f.end)
                        cf.exons.push({
                            start: f.start,
                            end: f.end
                        })
                    }
                    combinedFeatures.push(cf)
                } else {
                    combinedFeatures.push(featureArray[0])
                }
            }
        }

        return combinedFeatures
    }

    combineFeaturesByType(features) {

        // Build dictionary of genes
        const genes = features.filter(f => "gene" === f.type || f.type.endsWith("_gene"))
        const geneMap = Object.create(null)
        for (let g of genes) {
            geneMap[g.id] = g
        }

        // 1. Build dictionary of transcripts
        const transcripts = Object.create(null)
        const combinedFeatures = []
        const consumedFeatures = new Set()
        const filterTypes = this.filterTypes

        features = features.filter(f => filterTypes === undefined || !filterTypes.has(f.type))

        for (let f of features) {
            if (isTranscript(f.type)) {
                const transcriptId = f.id // getAttribute(f.attributeString, "transcript_id", /\s+/);
                if (undefined !== transcriptId) {
                    const gffTranscript = new GFFTranscript(f)
                    transcripts[transcriptId] = gffTranscript
                    combinedFeatures.push(gffTranscript)
                    consumedFeatures.add(f)
                    const g = geneMap[f.parent]
                    if (g) {
                        gffTranscript.geneObject = g
                        consumedFeatures.add(g)
                    }
                }
            }
        }

        // Add exons and transcript parts
        for (let f of features) {
            if (isTranscriptPart(f.type)) {
                const parents = getParents(f)
                if (parents) {
                    for (let id of parents) {

                        let transcript = transcripts[id]
                        if (!transcript && this.format === "gtf") {
                            // GTF does not require explicit a transcript or mRNA record, start one with this feature.
                            const psuedoTranscript = Object.assign({}, f)
                            psuedoTranscript.type = "transcript"
                            transcript = new GFFTranscript(psuedoTranscript)
                            transcripts[id] = transcript
                            combinedFeatures.push(transcript)
                        }
                        if (transcript !== undefined) {

                            if (isExon(f.type)) {
                                if (parents.length > 1) {
                                    // Multiple parents, this is unusual.  Make a copy as exon can be modified
                                    // differently by CDS, etc, for each parent
                                    const e2 = new GFFFeature(f)
                                    transcript.addExon(e2)
                                } else {
                                    transcript.addExon(f)
                                }
                            } else {
                                transcript.addPart(f)
                            }
                            consumedFeatures.add(f)
                        }
                    }
                }
            }
        }

        // Finish transcripts
        combinedFeatures.forEach(function (f) {
            if (typeof f.finish === "function") {
                f.finish()
            }
        })

        // Add other features
        const others = features.filter(f => !consumedFeatures.has(f))
        for (let f of others) {
            combinedFeatures.push(f)
        }

        return combinedFeatures

        function getParents(f) {
            if (f.parent && f.parent.trim() !== "") {
                return f.parent.trim().split(",")
            } else {
                return null
            }
        }
    }

    numberExons(features, genomicInterval) {

        for (let f of features) {
            if (f.exons &&
                (!genomicInterval ||
                    (f.end <= genomicInterval.end && f.start > genomicInterval.start))) {
                for (let i = 0; i < f.exons.length; i++) {
                    const exon = f.exons[i]
                    exon.number = f.strand === "-" ? f.exons.length - i : i + 1
                }
            }
        }
    }

    nameFeatures(features) {
        // Find name (label) property
        for (let f of features) {
            if(typeof f.getAttributeValue === 'function') {
                if (this.nameField) {
                    f.name = f.getAttributeValue(this.nameField)
                } else {
                    for (let nameField of GFFHelper.gffNameFields) {
                        const v = f.getAttributeValue(nameField)
                        if (v) {
                            f.name = v
                            break
                        }
                    }
                }
            }
        }
    }
}


export default GFFHelper

