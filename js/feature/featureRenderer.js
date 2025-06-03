import {
    aminoAcidSequenceRenderThreshold,
    calculateFeatureCoordinates, getFeatureLabelY, translationDict
} from "./featureRendererUtils.js"
import IGVGraphics from "../igv-canvas.js"
import {complementSequence} from "../util/sequenceUtils.js"
import {getEonStart, getExonEnd, getExonPhase} from "./exonUtils.js"

class FeatureRenderer {
    constructor(config) {
        this.margin = config.margin || 10
        this.displayMode = config.displayMode || "EXPANDED"
        this.expandedRowHeight = config.expandedRowHeight || 30
        this.squishedRowHeight = config.squishedRowHeight || 15
        this.arrowSpacing = 30
        this.featureHeight = config.featureHeight || 14
        this.labelDisplayMode = config.labelDisplayMode
        this.type = config.type
        this.snpColors = config.type === "SNP" ? ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)'] : undefined
        this.colorBy = config.colorBy
        this.color = config.color
        this.browser = config.browser
    }

    draw(options) {
        const {features, context, bpPerPixel, bpStart, bpEnd, pixelWidth, pixelHeight, chr} = options

        // If drawing amino acids fetch cached sequence interval
        if (bpPerPixel < aminoAcidSequenceRenderThreshold) {
            options.sequenceInterval = this.browser.genome.getSequenceInterval(chr, bpStart, bpEnd)
        }

        // Replace IGVGraphics.fillRect with native canvas methods
        context.fillStyle = "rgb(255, 255, 255)"
        context.fillRect(0, 0, pixelWidth, pixelHeight)

        if (features) {
            const rowFeatureCount = []
            options.rowLastX = []
            options.rowLastLabelX = []

            for (let feature of features) {
                if (feature.start > bpStart && feature.end < bpEnd) {
                    const row = this.displayMode === "COLLAPSED" ? 0 : feature.row || 0
                    if (!rowFeatureCount[row]) {
                        rowFeatureCount[row] = 1
                    } else {
                        rowFeatureCount[row]++
                    }
                    options.rowLastX[row] = -Number.MAX_SAFE_INTEGER
                    options.rowLastLabelX[row] = -Number.MAX_SAFE_INTEGER
                }
            }

            const maxFeatureCount = Math.max(1, Math.max(...(rowFeatureCount.filter(c => !isNaN(c)))))
            const pixelsPerFeature = pixelWidth / maxFeatureCount

            let lastPxEnd = []
            const selectedFeatures = []

            for (let feature of features) {
                if (feature.end < bpStart) continue
                if (feature.start > bpEnd) break

                if (this.displayMode === 'COLLAPSED' && this.browser.qtlSelections.hasPhenotype(feature.name)) {
                    selectedFeatures.push(feature)
                }

                const row = this.displayMode === 'COLLAPSED' ? 0 : feature.row
                options.drawLabel = pixelsPerFeature > 10
                const pxEnd = Math.ceil((feature.end - bpStart) / bpPerPixel)
                const last = lastPxEnd[row]

                if (!last || pxEnd > last) {
                    this.render(feature, bpStart, bpPerPixel, pixelHeight, context, options)

                    // Ensure a visible gap between features
                    const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                    if (last && pxStart - last <= 0) {
                        context.globalAlpha = 0.5
                        context.strokeStyle = "rgb(255, 255, 255)"
                        context.beginPath()
                        context.moveTo(pxStart, 0)
                        context.lineTo(pxStart, pixelHeight)
                        context.stroke()
                        context.globalAlpha = 1.0
                    }
                    lastPxEnd[row] = pxEnd
                }
            }

            // Redraw selected features to ensure visibility in collapsed mode
            for (let feature of selectedFeatures) {
                options.drawLabel = true
                this.render(feature, bpStart, bpPerPixel, pixelHeight, context, options)
            }
        }
    }

    render(feature, bpStart, xScale, pixelHeight, ctx, options) {

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

                            if (options.bpPerPixel < aminoAcidSequenceRenderThreshold && options.sequenceInterval) {

                                const leftExon = i > 0 && feature.exons[i - 1].readingFrame !== undefined ? feature.exons[i - 1] : undefined
                                const riteExon = i < feature.exons.length - 1 && feature.exons[i + 1].readingFrame !== undefined ? feature.exons[i + 1] : undefined

                                this.renderAminoAcidSequence(ctx, feature.strand, leftExon, exon, riteExon, bpStart, options.bpPerPixel, py, h, options.sequenceInterval)
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
                this.renderFeatureLabel(ctx, feature, coord.px, coord.px1, py, options)
            }
        } finally {
            ctx.restore()
        }
    }

    renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, options) {

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
            let selected = this.browser.qtlSelections.hasPhenotype(feature.name)

            const geneFontStyle = {
                textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
                fillStyle: color,
                strokeStyle: color,
                font: "12px Helvetica"
            }

            console.log("Current font settings:", ctx.font)
            const textMetrics = ctx.measureText(name)
            const xleft = centerX - textMetrics.width / 2
            const xright = centerX + textMetrics.width / 2
            const lastLabelX = options.rowLastLabelX[feature.row] || -Number.MAX_SAFE_INTEGER
            if (xleft > lastLabelX || selected) {
                options.rowLastLabelX[feature.row] = xright

                ctx.clearRect(
                    centerX - textMetrics.width / 2 - 1,
                    labelY - textMetrics.actualBoundingBoxAscent - 1,
                    textMetrics.width + 2,
                    textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent + 2)
                IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform)
            }

        } finally {
            ctx.restore()
        }
    }

    renderAminoAcidSequence(ctx, strand, leftExon, exon, riteExon, bpStart, bpPerPixel, y, height, sequenceInterval) {

        const aaColors =
            [
                'rgb(124,124,204)',
                'rgb(12, 12, 120)'
            ]


        ctx.save()

        const renderAminoAcidLetter = (strand, width, xs, y, aminoAcidLetter) => {

            if ('STOP' === aminoAcidLetter) {
                aminoAcidLetter = '*'
            }

            const aminoAcidLetterWidth = ctx.measureText(aminoAcidLetter).width
            IGVGraphics.fillText(ctx, aminoAcidLetter, xs + (width - aminoAcidLetterWidth) / 2, y - 4, {fillStyle: '#ffffff'})
        }

        const doPaint = (strand, start, end, aminoAcidLetter, colorToggle, index) => {

            const xs = Math.round((start - bpStart) / bpPerPixel)
            const xe = Math.round((end - bpStart) / bpPerPixel)

            const width = xe - xs

            let aaLetter
            if (undefined === aminoAcidLetter) {

                if(sequenceInterval.hasSequence(start, end)) {

                    const sequence = sequenceInterval.getSequence(start, end)
                    if (sequence && 3 === sequence.length) {
                        const key = '+' === strand ? sequence : complementSequence(sequence.split('').reverse().join(''))
                        aaLetter = translationDict[key]
                    }
                }

            } else {
                aaLetter = aminoAcidLetter
            }

            if ('M' === aminoAcidLetter) {
                ctx.fillStyle = '#83f902'
            } else if ('M' === aaLetter && 0 === index) {
                ctx.fillStyle = '#83f902'
            } else if ('STOP' === aaLetter) {
                ctx.fillStyle = '#ff2101'
            } else {
                ctx.fillStyle = aaColors[colorToggle]
            }

            ctx.fillRect(xs, y, width, height)

            if (aaLetter) {
                ctx.save()
                renderAminoAcidLetter(strand, width, xs, y + height, aaLetter)
                ctx.restore()
            }

            const widthBP = end - start
            return widthBP > 0 && widthBP < 3 ? {start, end} : undefined
        }

        const phase = getExonPhase(exon)
        let ss = getEonStart(exon)
        let ee = getExonEnd(exon)

        let bpTripletStart
        let bpTripletEnd

        let remainder
        let aminoAcidBackdropColorCounter = 1
        let colorToggle
        let index
        if ('+' === strand) {

            if (phase > 0) {
                ss += phase
            }

            aminoAcidBackdropColorCounter = 1
            for (index = 0, bpTripletStart = ss; bpTripletStart < ee; index++, bpTripletStart += 3) {
                colorToggle = aminoAcidBackdropColorCounter % 2
                bpTripletEnd = Math.min(ee, bpTripletStart + 3)
                remainder = doPaint(strand, bpTripletStart, bpTripletEnd, undefined, aminoAcidBackdropColorCounter % 2, index)
                ++aminoAcidBackdropColorCounter
            }

            if (phase > 0 || remainder) {

                const result = phase > 0
                    ? this.getAminoAcidLetterWithExonGap(strand, phase, ss - phase, ss, remainder, leftExon, exon, riteExon, sequenceInterval)
                    : this.getAminoAcidLetterWithExonGap(strand, undefined, undefined, undefined, remainder, leftExon, exon, riteExon, sequenceInterval)

                if (result) {
                    const {left, rite} = result

                    if (left) {
                        doPaint(strand, ss - phase, ss, left.aminoAcidLetter, 0, undefined)
                    }

                    if (rite) {
                        doPaint(strand, remainder.start, remainder.end, rite.aminoAcidLetter, colorToggle, undefined)
                    }

                }

            }

        } else {

            if (phase > 0) {
                ee -= phase
            }

            aminoAcidBackdropColorCounter = 1
            index = 0
            for (index = 0, bpTripletEnd = ee; bpTripletEnd > ss; index++, bpTripletEnd -= 3) {
                colorToggle = aminoAcidBackdropColorCounter % 2
                bpTripletStart = Math.max(ss, bpTripletEnd - 3)
                remainder = doPaint(strand, bpTripletStart, bpTripletEnd, undefined, aminoAcidBackdropColorCounter % 2, index)
                ++aminoAcidBackdropColorCounter
            }

            if (phase > 0 || remainder) {

                const result = phase > 0
                    ? getAminoAcidLetterWithExonGap.call(this, strand, phase, ee, ee + phase, remainder, leftExon, exon, riteExon, sequenceInterval)
                    : getAminoAcidLetterWithExonGap.call(this, strand, undefined, undefined, undefined, remainder, leftExon, exon, riteExon, sequenceInterval)

                if (result) {
                    const {left, rite} = result

                    if (rite) {
                        doPaint(strand, ee, ee + phase, rite.aminoAcidLetter, 0, undefined)
                    }

                    if (left) {
                        doPaint(strand, remainder.start, remainder.end, left.aminoAcidLetter, colorToggle, undefined)
                    }

                }

            }

        }

        ctx.restore()
    }

    getAminoAcidLetterWithExonGap(strand, phase, phaseExtentStart, phaseExtentEnd, remainder, leftExon, exon, riteExon, sequenceInterval) {

        let ss
        let ee
        let stringA = ''
        let stringB = ''
        let triplet = ''

        const aminoAcidLetters = {left: undefined, rite: undefined}
        if ('+' === strand) {

            if (phase) {
                stringB = sequenceInterval.getSequence(phaseExtentStart, phaseExtentEnd)

                if (!stringB) {
                    return undefined
                }

                [ss, ee] = [getExonEnd(leftExon) - (3 - phase), getExonEnd(leftExon)]
                stringA = sequenceInterval.getSequence(ss, ee)

                if (!stringA) {
                    return undefined
                }

                triplet = stringA + stringB
                aminoAcidLetters.left = {triplet, aminoAcidLetter: translationDict[triplet]}
            }

            if (remainder) {
                stringA = sequenceInterval.getSequence(remainder.start, remainder.end)

                if (!stringA) {
                    return undefined
                }

                const ritePhase = getExonPhase(riteExon)
                const riteStart = getEonStart(riteExon)
                stringB = sequenceInterval.getSequence(riteStart, riteStart + ritePhase)

                if (!stringB) {
                    return undefined
                }

                triplet = stringA + stringB
                aminoAcidLetters.rite = {triplet, aminoAcidLetter: translationDict[triplet]}
            }

        } else {

            if (phase) {
                stringA = sequenceInterval.getSequence(phaseExtentStart, phaseExtentEnd)

                if (undefined === stringA) {
                    return undefined
                }

                [ss, ee] = [getEonStart(riteExon), getEonStart(riteExon) + (3 - phase)]
                stringB = sequenceInterval.getSequence(ss, ee)

                if (undefined === stringB) {
                    return undefined
                }

                triplet = stringA + stringB
                triplet = complementSequence(triplet.split('').reverse().join(''))
                aminoAcidLetters.rite = {triplet, aminoAcidLetter: translationDict[triplet]}
            }

            if (remainder) {
                stringB = sequenceInterval.getSequence(remainder.start, remainder.end)

                if (undefined === stringB) {
                    return undefined
                }

                const leftPhase = getExonPhase(leftExon)
                const leftEnd = getExonEnd(leftExon)
                stringA = sequenceInterval.getSequence(leftEnd - leftPhase, leftEnd)

                if (undefined === stringA) {
                    return undefined
                }

                triplet = stringA + stringB
                triplet = complementSequence(triplet.split('').reverse().join(''))
                aminoAcidLetters.left = {triplet, aminoAcidLetter: translationDict[triplet]}
            }
        }

        return aminoAcidLetters
    }

    computePixelHeight(features) {
        if (this.displayMode === "COLLAPSED") {
            return this.margin + this.expandedRowHeight
        } else {
            let maxRow = 0
            if (features && (typeof features.forEach === "function")) {
                for (let feature of features) {
                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row
                    }
                }
            }

            return this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight)
        }
    }

    getColorForFeature(feature) {
        if (this.colorBy === 'function') {
            return this.getColorByFunction(feature)
        } else if (this.colorBy === 'class') {
            return this.getColorByClass(feature)
        } else {
            return this.color || 'rgb(0,0,150)'
        }
    }

    getColorByFunction(feature) {
        const codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel'])
        const codingSynonSet = new Set(['coding-synon'])
        const spliceSiteSet = new Set(['splice-3', 'splice-5'])
        const untranslatedSet = new Set(['untranslated-5', 'untranslated-3'])
        const locusSet = new Set(['near-gene-3', 'near-gene-5'])
        const intronSet = new Set(['intron'])

        const funcArray = feature.func.split(',')
        const priorities = funcArray.map(func => {
            if (codingNonSynonSet.has(func) || spliceSiteSet.has(func)) {
                return 3
            } else if (codingSynonSet.has(func)) {
                return 2
            } else if (untranslatedSet.has(func)) {
                return 1
            } else {
                return 0
            }
        })

        const priority = Math.max(...priorities)
        return this.snpColors[priority]
    }

    getColorByClass(feature) {
        const cls = feature['class']
        if (cls === 'deletion') {
            return this.snpColors[3]
        } else if (cls === 'mnp') {
            return this.snpColors[2]
        } else if (cls === 'microsatellite' || cls === 'named') {
            return this.snpColors[1]
        } else {
            return this.snpColors[0]
        }
    }
}

export default FeatureRenderer
