import {getCodingLength, getCodingStart, getCodingEnd} from "../feature/exonUtils.js"
import {searchFeatures} from "../searchFeatures.js"

const log = console

function isValidHGVS(notation) {
    if (!notation) return false
    // We only need to validate that we can parse the notation in the search method.
    // Check for basic structure: <accession>:g.<position> or <accession>:c.<position> or <accession>:p.<position>
    // We don't validate the variant details since we only need the position for searching.

    // Genomic: g.\d+ (with optional range and anything after)
    const genomic = "g\\.\\d+.*"
    // Coding: c. followed by optional -, *, then digits, with optional intronic offset and anything after
    const coding = "c\\.[-*]?\\d+.*"
    // Non-coding: n. followed by optional leading '-' then digits, anything after
    const nonCoding = "n\\.-?\\d+.*"
    // Protein: p. followed by optional AA letters, digits, with optional range and anything after
    const protein = "p\\.[A-Za-z*]*\\d+.*"
    // Optional gene symbol in parentheses immediately after accession
    const accessionWithOptionalGene = "^[A-Za-z0-9_.]+(?:\\([^)]+\\))?"

    const pattern = new RegExp(accessionWithOptionalGene + ":(?:" + genomic + "|" + coding + "|" + nonCoding + "|" + protein + ")$")
    return pattern.test(notation)
}

/**
 * Searches for the given HGVS notation in the provided genome.
 * Returns a SearchResult with the corresponding chromosome and position if found,
 * otherwise returns null.
 */
async function search(hgvs, browser) {

    if (!isValidHGVS(hgvs)) {
        return null
    }

    const genome = browser.genome

    // Determine type and extract accession and position
    const idxG = hgvs.indexOf(":g.")
    const idxC = hgvs.indexOf(":c.")
    const idxP = hgvs.indexOf(":p.")
    const idxN = hgvs.indexOf(":n.")
    let type
    let idx
    if (idxG >= 0) {
        type = "g"
        idx = idxG
    } else if (idxC >= 0) {
        type = "c"
        idx = idxC
    } else if (idxN >= 0) {
        type = "n"
        idx = idxN
    } else if (idxP >= 0) {
        type = "p"
        idx = idxP
    } else {
        return null
    }
    let accession = hgvs.substring(0, idx)
    // Strip optional trailing gene symbol in parentheses, e.g., "NM_000302.3(PLOD1)" -> "NM_000302.3"
    if (accession.endsWith(")")) {
        const openIdx = accession.lastIndexOf('(')
        if (openIdx > 0) {
            accession = accession.substring(0, openIdx)
        }
    }
    const positionPart = hgvs.substring(idx + 3) // skip ':g.' or ':c.' or ':p.'

    if (type === "g") {
        if (!positionPart) return null
        // Match genomic positions including:
        // - Simple position: 123
        // - Range: 123_456
        // - Uncertain positions: 123_? or ?_456 or (123_456)
        // Extract just the numeric positions, ignoring variant notation after
        const match = positionPart.match(/^\(?(\d+)(?:_(\d+|\?))?/)
        if (!match) return null
        const start = parseInt(match[1], 10)
        const endGroup = match[2]
        // If end is '?' or undefined, use start as end
        const end = (endGroup && endGroup !== '?') ? parseInt(endGroup, 10) : start
        const aliasRecord = await genome.getAliasRecord(accession)
        const chr = aliasRecord ? aliasRecord.chr : accession
        return {chr, start: start - 1, end: end}

    } else if (type === "p") {

        // Protein notation not supported for search currently.  The code below is ported from Java and kept for
        // future reference.
        return null;

        // // Protein position mapping: map codon(s) to genomic span.
        // const transcript = await getTranscript(browser, accession)
        // if (!transcript) return null
        //
        // const proteinPart = positionPart
        // const pm = proteinPart.match(/^[A-Za-z*]{0,3}(\d+)(?:_[A-Za-z*]{0,3}(\d+))?/)
        // if (!pm) return null
        // let p1 = parseInt(pm[1], 10)
        // const p2Str = pm[2]
        // let p2 = p1
        // if (p2Str) {
        //     p2 = parseInt(p2Str, 10)
        // }
        //
        // const codon1 = transcript.getCodon(genome, transcript.chr, p1)
        // if (!codon1 || !codon1.isGenomePositionsSet()) return null
        // let start1 = Math.min(...codon1.getGenomePositions())
        // let end1 = Math.max(...codon1.getGenomePositions())
        //
        // let regionStart = start1
        // let regionEnd = end1
        // if (p2 !== p1) {
        //     const codon2 = transcript.getCodon(genome, transcript.chr, p2)
        //     if (!codon2 || !codon2.isGenomePositionsSet()) return null
        //     let start2 = Math.min(...codon2.getGenomePositions())
        //     let end2 = Math.max(...codon2.getGenomePositions())
        //     regionStart = Math.min(start1, start2)
        //     regionEnd = Math.max(end1, end2)
        // }
        // const halfOpenEnd = regionEnd + 1
        // return {chr: transcript.chr, start: regionStart, end: halfOpenEnd}

    } else if (type === "n") {

        // Non-coding transcript mapping: n.123 or n.-123 maps relative to transcript start
        const transcript = await getTranscript(browser, accession)
        if (!transcript) return null

        // Parse signed position with optional range and intronic offset (e.g., n.123, n.123_456, n.-7080_-1781, n.123+5)
        const matcher = positionPart.match(/^(-?\d+)(?:_(-?\d+))?([+-]\d+)?/)
        if (!matcher) return null

        const t1 = parseInt(matcher[1], 10)
        const t2Str = matcher[2]
        const t2 = t2Str != null ? parseInt(t2Str, 10) : t1

        // Map both transcript positions to genomic
        let g1 = transcriptPositionToGenomicPosition(transcript, t1)
        let g2 = transcriptPositionToGenomicPosition(transcript, t2)
        if (g1 <= 0 || g2 <= 0) return null

        // Apply intronic offset (if any) to BOTH endpoints, strand-aware
        const offsetStr = matcher[3]
        if (offsetStr) {
            let offset = parseInt(offsetStr, 10)
            if (transcript.getStrand && transcript.strand === '-') offset = -offset
            g1 += offset
            g2 += offset
        }

        // Normalize to genomic span regardless of strand
        const regionStart = Math.min(g1, g2)
        const regionEndInclusive = Math.max(g1, g2)
        const halfOpenEnd = regionEndInclusive + 1
        return {chr: transcript.chr, start: regionStart, end: halfOpenEnd}

    } else { // "c"

        const transcript = await getTranscript(browser, accession)
        if (transcript) {
            // UTR 5' c.-N with optional range and intronic offset (e.g., c.-211_-215 or c.-211-1058C>G)
            const utr5Matcher = positionPart.match(/^-(\d+)(?:_-(\d+))?([+-]\d+)?/)
            if (utr5Matcher) {
                const n1 = parseInt(utr5Matcher[1], 10)
                const n2Str = utr5Matcher[2]
                const n2 = n2Str != null ? parseInt(n2Str, 10) : null
                const firstCodingGenomic = codingToGenomePosition(transcript, 1)
                if (firstCodingGenomic > 0) {
                    let g1 = transcript.strand === '+' ? (firstCodingGenomic - n1) : (firstCodingGenomic + n1)
                    let g2 = g1
                    if (n2 != null) {
                        g2 = transcript.strand === '+' ? (firstCodingGenomic - n2) : (firstCodingGenomic + n2)
                    }
                    // Apply intronic offset (single value) to both ends if present
                    const offsetStr = utr5Matcher[3]
                    if (offsetStr) {
                        let offset = parseInt(offsetStr, 10)
                        if (transcript.strand === '-') offset = -offset
                        g1 += offset
                        g2 += offset
                    }
                    const start = Math.min(g1, g2)
                    const endInclusive = Math.max(g1, g2)
                    const endExclusive = endInclusive + 1
                    return {resultType: "LOCUS", chr: transcript.chr, start, end: endExclusive}
                }
                return null
            }

            // UTR 3' c.*N with optional range and intronic offset (e.g., c.*526_*529delATCA or c.*123+45)
            const utr3Matcher = positionPart.match(/^\*(\d+)(?:_\*(\d+))?([+-]\d+)?/)
            if (utr3Matcher) {
                const n1 = parseInt(utr3Matcher[1], 10)
                const n2Str = utr3Matcher[2]
                const n2 = n2Str != null ? parseInt(n2Str, 10) : null
                let codingLen = 0
                if (transcript.exons) {
                    for (const exon of transcript.exons) {
                        codingLen += getCodingLength(exon)
                    }
                }
                if (codingLen > 0) {
                    const lastCodingGenomic = codingToGenomePosition(transcript, codingLen)
                    if (lastCodingGenomic > 0) {
                        let g1 = transcript.strand === '+' ? (lastCodingGenomic + n1) : (lastCodingGenomic - n1)
                        let g2 = g1
                        if (n2 != null) {
                            g2 = transcript.strand === '+' ? (lastCodingGenomic + n2) : (lastCodingGenomic - n2)
                        }
                        // Apply intronic offset (single value) to both ends if present
                        const offsetStr = utr3Matcher[3]
                        if (offsetStr) {
                            let offset = parseInt(offsetStr, 10)
                            if (transcript.strand === '-') offset = -offset
                            g1 += offset
                            g2 += offset
                        }
                        const start = Math.min(g1, g2)
                        const endInclusive = Math.max(g1, g2)
                        const endExclusive = endInclusive + 1
                        return {resultType: "LOCUS", chr: transcript.chr, start, end: endExclusive}
                    }
                }
                return null
            }

            // CDS position with optional range
            // First parse endpoints c.X(_Y)? ignoring intronic offsets
            const cpos = positionPart.match(/^(\d+)(?:_(\d+))?/)
            if (!cpos) return null
            const c1 = parseInt(cpos[1], 10)
            const c2Str = cpos[2]
            const c2 = c2Str != null ? parseInt(c2Str, 10) : c1

            // Map both coding positions to genomic
            let g1 = codingToGenomePosition(transcript, c1)
            let g2 = codingToGenomePosition(transcript, c2)
            if (g1 <= 0 || g2 <= 0) return null

            // Now parse optional intronic offsets for each endpoint separately
            // Patterns like: 123+5 or 123-2 at the beginning, optionally followed by _ and second with offset
            const offs = positionPart.match(/^(\d+)([+-]\d+)?(?:_(\d+)([+-]\d+)?)?/)
            if (offs) {
                const off1Str = offs[2]
                const off2Str = offs[4]
                if (off1Str) {
                    let off1 = parseInt(off1Str, 10)
                    if (transcript.strand === '-') off1 = -off1
                    g1 += off1
                }
                if (off2Str) {
                    let off2 = parseInt(off2Str, 10)
                    if (transcript.strand === '-') off2 = -off2
                    g2 += off2
                }
            }

            // If there is no explicit second coding position, ensure single-site locus
            if (c2Str == null) {
                g2 = g1
            }

            const start = Math.min(g1, g2)
            const endInclusive = Math.max(g1, g2)
            const endExclusive = endInclusive + 1
            return {chr: transcript.chr, start, end: endExclusive}
        }
        return null
    }

}

async function getTranscript(browser, accession) {
    return searchFeatures(browser, accession)
}

/**
 * Convert a transcript position (1-based, from transcription start) to genomic position
 * for non-coding transcripts. Walks through exons to find the genomic coordinate.
 */
function transcriptPositionToGenomicPosition(transcript, transcriptPos) {
    // Handle positions upstream of transcript start (negative n. values)
    if (transcriptPos <= 0) {
        const d = Math.abs(transcriptPos)
        return transcript.strand === '+' ? (transcript.getStart() - d) : (transcript.getEnd() + d)
    }

    const exons = transcript.exons
    if (!exons || exons.length === 0) {
        // No exons, treat as simple feature
        if (transcript.strand === '+') {
            return transcript.getStart() + transcriptPos - 1
        } else {
            return transcript.getEnd() - transcriptPos + 1
        }
    }

    const positive = transcript.strand === '+'
    let accumulatedLength = 0

    // Sort exons appropriately based on strand
    const sortedExons = exons.slice()
    if (!positive) {
        sortedExons.sort((e1, e2) => e2.getStart() - e1.getStart())
    } else {
        sortedExons.sort((e1, e2) => e1.getStart() - e2.getStart())
    }

    for (const exon of sortedExons) {
        const exonLength = exon.getEnd() - exon.getStart()
        if (accumulatedLength + exonLength >= transcriptPos) {
            // Position is in this exon
            const offsetInExon = transcriptPos - accumulatedLength - 1
            if (positive) {
                return exon.getStart() + offsetInExon
            } else {
                return exon.getEnd() - offsetInExon - 1
            }
        }
        accumulatedLength += exonLength
    }

    // Position beyond transcript end
    return -1
}

/**
 * Translate a 1-based coding position to a 0-based genomic position.  Supports HGVS parsing
 *
 * @param codingPosition 1-based coding position
 * @return 0-based genomic position, or -1 if not found.
 */
function codingToGenomePosition(feature, codingPosition) {
    if (codingPosition <= 0) {
        return -1
    }
    const cdna = codingPosition - 1  // Convert to 0-based

    const exons = feature.exons
    if (!exons) {
        return -1
    }

    const strand = feature.strand
    // if (strand === 'NONE') {
    //     throw new Error("Cannot translate from coding position on an unstranded feature.")
    // }
    const positive = strand === '+'

    let codingLength = 0
    for (let i = 0; i < exons.length; i++) {
        const exon = positive ? exons[i] : exons[exons.length - 1 - i]
        const exonCodingLength = getCodingLength(exon)
        if (codingLength + exonCodingLength > cdna) {
            const cdnaOffset = cdna - codingLength
            if (positive) {
                return getCodingStart(exon) + cdnaOffset
            } else {
                return getCodingEnd(exon) - 1 - cdnaOffset
            }
        }
        codingLength += exonCodingLength
    }

    return -1
}

/**
 * Returns genomic HGVS notation: <RefSeqAccession>:g.<position>
 * Example: NC_000001.11:g.1234567
 */
async function getHGVSPosition(genome, chr, position) {
    try {
        const aliasRecord = await genome.getAliasRecord(chr)
        let accession = null

        if (aliasRecord) {
            for (const alias of Object.values(aliasRecord)) {
                if (alias.startsWith("NC_") || alias.startsWith("NT_") || alias.startsWith("NW_") ||
                    alias.startsWith("NG_") || alias.startsWith("NM_") || alias.startsWith("NR_") ||
                    alias.startsWith("NP_")) {
                    accession = alias
                    break
                }
            }
        }

        if (!accession) {
            accession = chr
        }

        return `${accession}:g.${position}`
    } catch (e) {
        log.error("Error getting HGVS position", e)
        return null
    }
}

/**
 * Returns HGVS annotation for the position, for ref and alt bases.  If a MANE transcript is available that is
 * used with coding notation (c.), otherwise genome position is used with genomic notation (g.).
 * Example: NM_000302.3:c.1234A>G or NM_000302.3:c.123+5T>C (intronic) or NC_000001.11:g.1234567G>A
 *
 * @param genome The genome
 * @param chr The chromosome name
 * @param position The genomic position (0-based)
 * @param reference The reference base (single-character string)
 * @param alternate The alternate base (single-character string)
 * @return {Promise<string|null>} HGVS notation string, or null if error
 */
async function createHGVSAnnotation(genome, chr, position, reference, alternate) {

    try {
        const transcript = await genome.getManeTranscriptAt(chr, position)

        if (transcript && transcript.exons) {

            // Ensure bases are uppercase
            reference = reference.toUpperCase()
            alternate = alternate.toUpperCase()

            if (transcript.strand === '-') {
                reference = complementBase(reference)
                alternate = complementBase(alternate)
            }


            let positionString = ""

            let transcriptName = transcript.name
            for (const key of Object.keys(transcript)) {
                const value = transcript[key]
                if (typeof value === 'string' && (value.startsWith("NM_") || value.startsWith("NR_"))) {
                    transcriptName = value
                    break
                }
            }

            if (transcriptName) {
                // Check if position is within an exon (coding or non-coding)
                let positionIsInExon = false
                for (const exon of transcript.exons) {
                    if (position >= exon.start && position < exon.end) {
                        positionIsInExon = true
                        break
                    }
                }

                const positive = transcript.strand === '+'

                if (positionIsInExon) {
                    // Try to convert to coding position
                    const codingPosition = genomeToCodingPosition(position, positive, transcript.exons)

                    if (codingPosition >= 0) {
                        // Position is in a coding region, return c. notation (1-based)
                        positionString = `${transcriptName}:c.${codingPosition + 1}`
                    } else {
                        // Position is in an exon but not coding - check if in UTR
                        const firstCodingPos = codingToGenomePosition(transcript, 1)
                        if (firstCodingPos > 0) {
                            // Calculate total coding length
                            let codingLen = 0
                            for (const exon of transcript.exons) {
                                codingLen += getCodingLength(exon)
                            }
                            const lastCodingPos = codingToGenomePosition(transcript, codingLen)

                            // Check if in 5' UTR
                            if ((positive && position < firstCodingPos) || (!positive && position > firstCodingPos)) {
                                const distance = Math.abs(position - firstCodingPos)
                                positionString = `${transcriptName}:c.-${distance}`
                            }
                            // Check if in 3' UTR
                            else if ((positive && position >= lastCodingPos) || (!positive && position <= lastCodingPos)) {
                                const distance = Math.abs(position - lastCodingPos) + 1
                                positionString = `${transcriptName}:c.*${distance}`
                            }
                        }
                    }
                } else {
                    // Position is intronic - find nearest exon boundary
                    // For HGVS, we reference the last coding base in the nearest exon
                    let nearestExonEdge = -1
                    let nearestCodingPos = -1
                    let minDistance = Number.MAX_SAFE_INTEGER

                    for (const exon of transcript.exons) {
                        if (getCodingLength(exon) === 0) continue // Skip non-coding exons

                        // Check distance to the last coding base at the start side of the exon
                        // exon.start is 0-based inclusive
                        const distToStart = Math.abs(position - exon.start)
                        if (distToStart > 0 && distToStart < minDistance) {
                            minDistance = distToStart
                            nearestExonEdge = exon.start
                            // Get coding position of first base in this exon
                            nearestCodingPos = genomeToCodingPosition(getCodingStart(exon), positive, transcript.exons)
                        }

                        // Check distance to the last coding base at the end side of the exon
                        // exon.end is 0-based exclusive, so last base is at end-1
                        const distToEnd = Math.abs(position - (exon.end - 1))
                        if (distToEnd > 0 && distToEnd < minDistance) {
                            minDistance = distToEnd
                            nearestExonEdge = exon.end - 1
                            // Get coding position of last base in this exon
                            nearestCodingPos = genomeToCodingPosition(getCodingEnd(exon) - 1, positive, transcript.exons)
                        }
                    }

                    if (nearestCodingPos >= 0) {
                        // Calculate offset: positive = downstream of exon, negative = upstream of exon
                        let offset = position - nearestExonEdge
                        // For positive strand: + means to the right, - means to the left
                        // For negative strand: + means to the left (genomically), - means to the right
                        // But in HGVS, the sign is relative to transcript direction, so we need to flip for negative strand
                        if (!positive) {
                            offset = -offset
                        }
                        const sign = offset >= 0 ? "+" : ""
                        positionString = `${transcriptName}:c.${nearestCodingPos + 1}${sign}${offset}`
                    }
                }
            }

            return positionString + reference + ">" + alternate
        }

        // Fallback to genomic notation
        const aliasRecord = await genome.getAliasRecord(chr)
        let accession = chr

        if (aliasRecord) {
            for (const alias of Object.values(aliasRecord)) {
                if (alias.startsWith("NC_") || alias.startsWith("NT_") || alias.startsWith("NW_") ||
                    alias.startsWith("NG_") || alias.startsWith("NM_") || alias.startsWith("NR_") ||
                    alias.startsWith("NP_")) {
                    accession = alias
                    break
                }
            }
        }

        // HGVS genomic coordinate is 1-based; position parameter is 0-based
        return `${accession}:g.${position + 1}${reference}>${alternate}`
    } catch (e) {
        log.error("Error creating HGVS annotation", e)
        return null
    }
}

// Helper function to complement a base (string)
function complementBase(base) {
    const complementMap = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' }
    return complementMap[base] || base
}

function genomeToCodingPosition(genomePosition, positive, exons) {

    if (exons) {

        /*
         We loop over all exons, either from the beginning or the end.
         Increment position only on coding regions.
         */

        let codingOffset = 0

        for (let exnum = 0; exnum < exons.length; exnum++) {

            const exon = positive ? exons[exnum] : exons[exons.length - 1 - exnum]

            if (exon.start <= genomePosition && exon.end > genomePosition) {
                const delta = positive
                    ? genomePosition - getCodingStart(exon)
                    : getCodingEnd(exon) - genomePosition - 1
                return codingOffset + delta
            }

            codingOffset += getCodingLength(exon)
        }
    }
    return -1
}



export const HGVS = {
    isValidHGVS,
    search,
    getHGVSPosition,
    createHGVSAnnotation
}
