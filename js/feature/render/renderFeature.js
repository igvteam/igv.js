import IGVGraphics from "../../igv-canvas.js"
import {getCodingStart, getCodingEnd, getExonPhase} from "../exonUtils.js"
import {translationDict} from "../../util/translationDict.js"
import {reverseComplementSequence} from "../../util/sequenceUtils.js"

const aminoAcidSequenceRenderThreshold = 0.25

/**
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @returns {{px: number, px1: number, pw: number, h: number, py: number}}
 */
function calculateFeatureCoordinates(feature, bpStart, xScale) {
    let px = (feature.start - bpStart) / xScale
    let px1 = (feature.end - bpStart) / xScale
    //px = Math.round((feature.start - bpStart) / xScale),
    //px1 = Math.round((feature.end - bpStart) / xScale),
    let pw = px1 - px

    if (pw < 3) {
        pw = 3
        px -= 1.5
    }

    return {
        px: px,
        px1: px1,
        pw: pw
    }
}

/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 * @param options  genomic state
 */
function renderFeature(feature, bpStart, xScale, pixelHeight, ctx, options) {

    try {
        ctx.save()

        // Set ctx color to a known valid color.  If getColorForFeature returns an invalid color string it is ignored, and
        // this default will be used.
        ctx.fillStyle = this.color
        ctx.strokeStyle = this.color

        const color = this.getColorForFeature(feature)
        // const color = '+' === feature.strand ? 'rgba(135,206,235,0.5)' : 'rgba(255,20,147,0.5)'

        ctx.fillStyle = color
        ctx.strokeStyle = color

        let h
        let py
        if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
            h = this.featureHeight / 2
            py = this.margin + this.squishedRowHeight * feature.row
        } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
            h = this.featureHeight
            py = this.margin + this.expandedRowHeight * feature.row
        } else {  // collapsed
            h = this.featureHeight
            py = this.margin
        }

        const pixelWidth = options.pixelWidth   // typical 3*viewportWidth

        const cy = py + h / 2
        const h2 = h / 2
        const py2 = cy - h2 / 2

        const exonCount = feature.exons ? feature.exons.length : 0
        const coord = calculateFeatureCoordinates(feature, bpStart, xScale)
        const step = this.arrowSpacing
        const direction = feature.strand === '+' ? 1 : feature.strand === '-' ? -1 : 0

        if (exonCount === 0) {
            // single-exon transcript
            const xLeft = Math.max(0, coord.px)
            const xRight = Math.min(pixelWidth, coord.px1)
            const width = xRight - xLeft

            ctx.fillRect(xLeft, py, width, h)

            if (direction !== 0) {
                ctx.fillStyle = "white"
                ctx.strokeStyle = "white"
                for (let x = xLeft + step / 2; x < xRight; x += step) {
                    // draw arrowheads along central line indicating transcribed orientation
                    IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy)
                    IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy)
                }
                ctx.fillStyle = color
                ctx.strokeStyle = color
            }
        } else {

            // multi-exon transcript
            IGVGraphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy) // center line for introns
            const xLeft = Math.max(0, coord.px) + step / 2
            const xRight = Math.min(pixelWidth, coord.px1)
            for (let x = xLeft; x < xRight; x += step) {
                // draw arrowheads along central line indicating transcribed orientation
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy)
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy)
            }

            for (let i = 0; i < feature.exons.length; i++) {

                const exon = feature.exons[i]

                // draw the exons
                let ePx = Math.round((exon.start - bpStart) / xScale)
                let ePx1 = Math.round((exon.end - bpStart) / xScale)
                let ePw = Math.max(1, ePx1 - ePx)
                let ePxU

                if (ePx + ePw < 0) {
                    continue  // Off the left edge
                }
                if (ePx > pixelWidth) {
                    break // Off the right edge
                }

                if (exon.utr) {
                    ctx.fillRect(ePx, py2, ePw, h2) // Entire exon is UTR
                } else {
                    if (exon.cdStart) {
                        ePxU = Math.round((exon.cdStart - bpStart) / xScale)
                        ctx.fillRect(ePx, py2, ePxU - ePx, h2) // start is UTR
                        ePw -= (ePxU - ePx)
                        ePx = ePxU
                    }
                    if (exon.cdEnd) {
                        ePxU = Math.round((exon.cdEnd - bpStart) / xScale)
                        ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2) // start is UTR
                        ePw -= (ePx1 - ePxU)
                        ePx1 = ePxU
                    }

                    ePw = Math.max(ePw, 1)

                    ctx.fillRect(ePx, py, ePw, h)

                    if (exon.readingFrame !== undefined) {

                        if (options.bpPerPixel < aminoAcidSequenceRenderThreshold &&
                            options.sequenceInterval) {

                            renderAminoAcidSequence(ctx, feature.strand, feature.exons, i, bpStart, options.bpPerPixel, py, h, options.sequenceInterval, options.axis)
                        }
                    }

                    // Arrows
                    if (ePw > step + 5 && direction !== 0 && options.bpPerPixel > aminoAcidSequenceRenderThreshold) {
                        ctx.fillStyle = "white"
                        ctx.strokeStyle = "white"
                        for (let x = ePx + step / 2; x < ePx1; x += step) {
                            // draw arrowheads along central line indicating transcribed orientation
                            IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy)
                            IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy)
                        }
                        ctx.fillStyle = color
                        ctx.strokeStyle = color

                    }
                }
            }
        }

        if (options.drawLabel && this.displayMode !== "SQUISHED") {
            renderFeatureLabel.call(this, ctx, feature, coord.px, coord.px1, py, options.referenceFrame, options)
        }
    } finally {
        ctx.restore()
    }
}

function renderAminoAcidSequence(ctx, strand, exons, exonIndex, bpStart, bpPerPixel, y, height, sequenceInterval, axis) {

    const aaColors =
        [
            'rgb(124,124,204)',
            'rgb(12, 12, 120)'
        ]

    const plusStrand = '+' === strand

    ctx.save()

    const renderAminoAcidLetter = (width, xs, y, aminoAcidLetter) => {

        if ('STOP' === aminoAcidLetter) {
            aminoAcidLetter = '*'
        }

        // Pre-flip about the letter's center for juicebox's y-axis transpose, as for feature labels
        if ('y' === axis) {
            IGVGraphics.labelTransformWithContext(ctx, xs + width / 2)
        }

        const aminoAcidLetterWidth = ctx.measureText(aminoAcidLetter).width
        IGVGraphics.fillText(ctx, aminoAcidLetter, xs + (width - aminoAcidLetterWidth) / 2, y - 4, {fillStyle: '#ffffff'})
    }

    // Paint the backdrop of a codon, or of the part of one in this exon, and its letter if it has one
    const paintCodon = (start, end, aminoAcidLetter, colorToggle, isStartCandidate) => {

        const xs = Math.round((start - bpStart) / bpPerPixel)
        const xe = Math.round((end - bpStart) / bpPerPixel)
        const width = xe - xs

        if ('M' === aminoAcidLetter && isStartCandidate) {
            ctx.fillStyle = '#83f902'
        } else if ('STOP' === aminoAcidLetter) {
            ctx.fillStyle = '#ff2101'
        } else {
            ctx.fillStyle = aaColors[colorToggle]
        }

        ctx.fillRect(xs, y, width, height)

        if (aminoAcidLetter) {
            ctx.save()
            renderAminoAcidLetter(width, xs, y + height, aminoAcidLetter)
            ctx.restore()
        }
    }

    // Translate a codon from its part in this exon and the given number of bases from the exons upstream (5') and
    // downstream (3') of it, none for a codon wholly in this exon.  Undefined if those exons or any of the sequence
    // are missing, as at the first or last exon of a feature covering part of a protein.
    const translateCodon = (start, end, upstreamCount, downstreamCount) => {
        const [leftCount, riteCount] = plusStrand ? [upstreamCount, downstreamCount] : [downstreamCount, upstreamCount]
        const left = neighbouringCodingSegments(exons, exonIndex, -1, leftCount)
        const rite = neighbouringCodingSegments(exons, exonIndex, 1, riteCount)
        if (!left || !rite) {
            return undefined
        }
        let triplet = ''
        for (const [segmentStart, segmentEnd] of [...left, [start, end], ...rite]) {
            const sequence = sequenceInterval.getSequence(segmentStart, segmentEnd)
            if (!sequence) {
                return undefined
            }
            triplet += sequence
        }
        return translationDict[plusStrand ? triplet : reverseComplementSequence(triplet)]
    }

    const exon = exons[exonIndex]
    const codingStart = getCodingStart(exon)
    const codingEnd = getCodingEnd(exon)
    const codingLength = codingEnd - codingStart

    // A stretch of this exon in genomic coordinates, given as offsets from the 5' edge of its coding region
    const stretch = (from, to) => plusStrand ? [codingStart + from, codingStart + to] : [codingEnd - to, codingEnd - from]

    // The bases at the 5' edge that finish a codon begun in an earlier exon.  An exon shorter than its phase lies
    // wholly inside that codon, which is then finished by the exons after it.
    const phase = getExonPhase(exon) || 0
    const leadLength = Math.min(phase, codingLength)

    const nextExon = exons[exonIndex + (plusStrand ? 1 : -1)]

    // The backdrop of a leading split codon is painted even when the codon can't be translated, as the loop below
    // does for a trailing one
    if (leadLength > 0) {
        const [start, end] = stretch(0, leadLength)
        paintCodon(start, end, translateCodon(start, end, 3 - phase, phase - leadLength), 0, true)
    }

    for (let offset = leadLength, index = 0; offset < codingLength; offset += 3, index++) {
        const [start, end] = stretch(offset, Math.min(offset + 3, codingLength))

        // The last codon is finished by the next exon if it runs past this one, but only if the next exon agrees
        // that it starts with the rest of it
        const missing = 3 - (end - start)
        const aminoAcidLetter = 0 === missing || (nextExon && getExonPhase(nextExon) === missing)
            ? translateCodon(start, end, 0, missing)
            : undefined

        paintCodon(start, end, aminoAcidLetter, (index + 1) % 2, 0 === index || missing > 0)
    }

    ctx.restore()
}

/**
 * @param ctx       the canvas 2d context
 * @param feature
 * @param featureX  feature start in pixel coordinates
 * @param featureX1 feature end in pixel coordinates
 * @param featureY  feature y-coordinate
 * @param referenceFrame  genomic state
 * @param options  options
 */
function renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, referenceFrame, options) {

    try {
        ctx.save()

        const labelField = this.config.labelField ? this.config.labelField : 'name'
        let name = feature[labelField]
        if (name === undefined && feature.gene) name = feature.gene.name
        if (name === undefined) name = feature.id || feature.ID
        if (!name || name === '.') return

        let pixelXOffset = options.pixelXOffset || 0
        const t1 = Math.max(featureX, -pixelXOffset)
        const t2 = Math.min(featureX1, -pixelXOffset + options.viewportWidth)
        let centerX = (t1 + t2) / 2
        //let centerX = (featureX + featureX1) / 2

        let transform
        if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
            transform = {rotate: {angle: 45}}
        }
        const labelY = getFeatureLabelY(featureY, transform)

        let color = this.getColorForFeature(feature)
        let selected = this.browser.qtlSelections.hasPhenotype(feature.name)

        const geneFontStyle = {
            textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
            fillStyle: color,
            strokeStyle: color
        }

        const textMetrics = ctx.measureText(name)
        const xleft = centerX - textMetrics.width / 2
        const xright = centerX + textMetrics.width / 2
        const lastLabelX = options.rowLastLabelX[feature.row] || -Number.MAX_SAFE_INTEGER
        if (options.labelAllFeatures || xleft > lastLabelX || selected) {
            options.rowLastLabelX[feature.row] = xright

            ctx.clearRect(
                centerX - textMetrics.width / 2 - 1,
                labelY - textMetrics.actualBoundingBoxAscent - 1,
                textMetrics.width + 2,
                textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent + 2)

            // juicebox transposes y-axis tiles, which mirrors text. Pre-flip the label about its center
            // so it reads correctly, and stays on its feature, once transposed.
            if ('y' === options.axis) {
                IGVGraphics.labelTransformWithContext(ctx, centerX)
            }
            IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform)

        }

    } finally {
        ctx.restore()
    }
}

function getFeatureLabelY(featureY, transform) {
    return transform ? featureY + 20 : featureY + 25
}

/**
 * The n coding bases nearest to an exon on one side, which span more than one exon when the nearest has fewer than n.
 *
 * @param exons
 * @param exonIndex  index of the exon
 * @param step  -1 for the exons to the left, 1 for those to the right
 * @param n  number of bases
 * @returns {number[][]|undefined} [start, end] segments in genomic order, undefined if there are not n coding bases
 * on that side
 */
function neighbouringCodingSegments(exons, exonIndex, step, n) {
    const segments = []
    for (let i = exonIndex + step; n > 0; i += step) {
        const exon = exons[i]
        if (!exon || exon.readingFrame === undefined) {
            return undefined
        }
        const start = getCodingStart(exon)
        const end = getCodingEnd(exon)
        const length = Math.min(n, end - start)
        if (length <= 0) {
            return undefined
        }
        segments.push(step < 0 ? [end - length, end] : [start, start + length])
        n -= length
    }
    return step < 0 ? segments.reverse() : segments
}


// exon

export {aminoAcidSequenceRenderThreshold, calculateFeatureCoordinates, renderFeature}


