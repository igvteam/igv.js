import GtexUtils from "../../gtex/gtexUtils.js"
import IGVGraphics from "../../igv-canvas.js"
import {randomRGB, randomRGBConstantAlpha} from "../../util/colorPalletes.js"
import {StringUtils} from "../../../node_modules/igv-utils/src/index.js"
import {getAminoAcidLetterWithExonGap, getEonStart, getExonEnd, getExonPhase} from "../exonUtils.js"
import {translationDict} from "../../sequenceTrack.js"

const aminoAcidSequenceRenderThreshold = 2

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

        // const color = this.getColorForFeature(feature)
        const color = '+' === feature.strand ? '#008cff' : '#ff2101'

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

                const exon = feature.exons[ i ]

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
                    // DUGLA HACK
                    // ctx.fillStyle = '#6e6e6e'
                    ctx.fillRect(ePx, py2, ePw, h2) // Entire exon is UTR
                    // ctx.fillStyle = color
                } else {
                    if (exon.cdStart) {
                        ePxU = Math.round((exon.cdStart - bpStart) / xScale)

                        // DUGLA HACK
                        // ctx.fillStyle = '#d278ff'
                        ctx.fillRect(ePx, py2, ePxU - ePx, h2) // start is UTR
                        // ctx.fillStyle = color

                        ePw -= (ePxU - ePx)
                        ePx = ePxU

                    }
                    if (exon.cdEnd) {
                        ePxU = Math.round((exon.cdEnd - bpStart) / xScale)

                        // DUGLA HACK
                        // ctx.fillStyle = '#d278ff'
                        ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2) // start is UTR
                        // ctx.fillStyle = color

                        ePw -= (ePx1 - ePxU)
                        ePx1 = ePxU
                    }

                    ePw = Math.max(ePw, 1)

                    // DUGLA HACK
                    // ctx.fillStyle = '#cefa6e'
                    ctx.fillRect(ePx, py, ePw, h)
                    // ctx.fillStyle = color

                    if (exon.readingFrame !== undefined) {
                        const width = Math.max(1, Math.ceil(1 / options.bpPerPixel))
                        if (width >= aminoAcidSequenceRenderThreshold) {

                            const leftExon = i > 0                        && feature.exons[i - 1].readingFrame !== undefined ? feature.exons[i - 1] : undefined
                            const riteExon = i < feature.exons.length - 1 && feature.exons[i + 1].readingFrame !== undefined ? feature.exons[i + 1] : undefined

                            renderAminoAcidSequence.call(this, ctx, feature.chr, feature.strand, leftExon, exon, riteExon, bpStart, options.bpPerPixel, py, h, color)
                        }
                    }

                    // Arrows
                    if (ePw > step + 5 && direction !== 0) {
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

function renderAminoAcidSequence(ctx, chr, strand, leftExon, exon, riteExon, bpStart, bpPerPixel, y, height) {

    ctx.save()

    const renderNucleotideLetters = (sequence, width, xs, y) => {
        const baseLetterWindow = Math.floor(width/sequence.length)
        for (let i = 0; i < sequence.length; i++) {
            const baseLetter = sequence[ i ]
            const letterWidth = ctx.measureText(baseLetter).width
            IGVGraphics.fillText(ctx, baseLetter, xs + (i * baseLetterWindow) + (baseLetterWindow - letterWidth)/2, y, { fillStyle: '#000' })
        }
    }

    let toggle = 0
    const rendeAminoAcidLetter = (strand, sequence, width, xs, y, aminoAcidLetter) => {

        if (aminoAcidLetter) {
            const aminoAcidLetterWidth = ctx.measureText(aminoAcidLetter).width
            IGVGraphics.fillText(ctx, aminoAcidLetter, xs + (width - aminoAcidLetterWidth)/2, y - 4, { fillStyle: '#00f' })
        } else if (3 === sequence.length) {
            const key = '+' === strand ? sequence : sequence.split('').reverse().join('')
            const aminoAcidLetter = translationDict[key]
            const aminoAcidLetterWidth = ctx.measureText(aminoAcidLetter).width
            IGVGraphics.fillText(ctx, aminoAcidLetter, xs + (width - aminoAcidLetterWidth)/2, y - 4, { fillStyle: '#00f' })
        } else {
            renderNucleotideLetters(sequence, width, xs, y)
        }
    }

    const doPaint = (strand, start, end, diagnosticColor, aminoAcidLetter) => {

        const xs = Math.round((start - bpStart) / bpPerPixel)
        const xe = Math.round((end - bpStart) / bpPerPixel)

        const width = xe - xs

        if (diagnosticColor) {
            ctx.fillStyle = diagnosticColor
        } else {
            if ('+' === strand) {
                ctx.fillStyle = 0 === toggle ? '#008cff' : 'rgba(135,206,235,0.36)'
            } else {
                ctx.fillStyle = 0 === toggle ? '#ff726e' : 'rgba(255,0,0,0.22)'
            }
        }

        toggle = 1 - toggle

        ctx.fillRect(xs, y, width, height)

        if (aminoAcidLetter) {
            ctx.save()
            rendeAminoAcidLetter(strand, undefined, width, xs, y + height, aminoAcidLetter)
            ctx.restore()
        } else {
            const sequence = this.browser.genome.getSequenceSync(chr, start, end)

            if (sequence && 3 === sequence.length) {
                ctx.save()
                rendeAminoAcidLetter(strand, sequence, width, xs, y + height, aminoAcidLetter)
                ctx.restore()
            }

        }

        const widthBP = end - start
        return widthBP > 0 && widthBP < 3 ? { start, end } : undefined
    }

    const phase = getExonPhase(exon)
    let ss = getEonStart(exon)
    let ee = getExonEnd(exon)

    let bpTripletStart
    let bpTripletEnd

    let remainder
    if ('+' === strand) {

        if (phase > 0) {
            ss += phase
        }

        for (bpTripletStart = ss; bpTripletStart < ee; bpTripletStart += 3) {
            bpTripletEnd = Math.min(ee, bpTripletStart + 3)
            remainder = doPaint(strand, bpTripletStart, bpTripletEnd, undefined, undefined)
        }

        if (phase > 0) {
            const result = getAminoAcidLetterWithExonGap.call(this, chr, strand, phase, ss - phase, ss, remainder, leftExon, exon, riteExon)

            if (result) {
                const { left, rite } = result
                doPaint(strand, ss - phase, ss, '#83f902', left.aminoAcidLetter)

                if (rite) {
                    doPaint(strand, remainder.start, remainder.end, undefined, rite.aminoAcidLetter)
                }

            }

        }

    } else {

        if (phase > 0) {
            ee -= phase
        }

        for (bpTripletEnd = ee; bpTripletEnd > ss; bpTripletEnd -= 3) {
            bpTripletStart = Math.max(ss, bpTripletEnd - 3)
            remainder = doPaint(strand, bpTripletStart, bpTripletEnd, undefined, undefined)
        }

        if (phase > 0) {
            const result = getAminoAcidLetterWithExonGap.call(this, chr, strand, phase, ee, ee + phase, remainder, leftExon, exon, riteExon)

            if (result) {
                const { left, rite } = result
                doPaint(strand, ee, ee + phase, '#83f902', rite.aminoAcidLetter)

                if (left) {
                    doPaint(strand, remainder.start, remainder.end, undefined, left.aminoAcidLetter)
                }


            }

        }

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

        let name = feature.name
        if (name === undefined && feature.gene) name = feature.gene.name
        if (name === undefined) name = feature.id || feature.ID
        if (!name || name === '.') return


        let pixelXOffset = options.pixelXOffset || 0
        const t1 = Math.max(featureX, -pixelXOffset)
        const t2 = Math.min(featureX1, -pixelXOffset + options.viewportWidth)
        let centerX = (t1 + t2) / 2

        let transform
        if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
            transform = {rotate: {angle: 45}}
        }
        const labelY = getFeatureLabelY(featureY, transform)

        let color = this.getColorForFeature(feature)
        let geneColor
        let gtexSelection = false
        if (referenceFrame.selection && GtexUtils.gtexLoaded) {
            // TODO -- for gtex, figure out a better way to do this
            gtexSelection = true
            geneColor = referenceFrame.selection.colorForGene(name)
        }

        const geneFontStyle = {
            textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
            fillStyle: geneColor || color,
            strokeStyle: geneColor || color
        }

        const textBox = ctx.measureText(name)
        const xleft = centerX - textBox.width / 2
        const xright = centerX + textBox.width / 2
        const lastLabelX = options.rowLastLabelX[feature.row] || -Number.MAX_SAFE_INTEGER
        if (options.labelAllFeatures || xleft > lastLabelX || gtexSelection) {
            options.rowLastLabelX[feature.row] = xright

            if ('y' === options.axis) {
                ctx.save()
                IGVGraphics.labelTransformWithContext(ctx, centerX)
                IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform)
                ctx.restore()
            } else {
                IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform)
            }
        }

    } finally {
        ctx.restore()
    }
}

function getFeatureLabelY(featureY, transform) {
    return transform ? featureY + 20 : featureY + 25
}

// exon

export { aminoAcidSequenceRenderThreshold, calculateFeatureCoordinates, renderFeature }


