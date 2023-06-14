import {IGVColor} from "../../node_modules/igv-utils/src/index.js"
import IGVGraphics from "../igv-canvas.js"
import PairedAlignment from "./pairedAlignment.js"
import {PaletteColorTable} from "../util/colorPalletes.js"
import {getChrColor} from "./bamTrack.js"
import BaseModificationRenderer from "./mods/baseModificationRenderer.js"

const DEFAULT_ALIGNMENT_COLOR = "rgb(185, 185, 185)"
const DEFAULT_CONNECTOR_COLOR = "rgb(200, 200, 200)"
const bisulfiteColorFw1 = "rgb(195, 195, 195)"
const bisulfiteColorRev1 = "rgb(195, 210, 195)"


class AlignmentRenderer {

    constructor(alignmentTrack) {
        this.alignmentTrack = alignmentTrack
        this.baseModRenderer = new BaseModificationRenderer(alignmentTrack)
    }

    /**
     * Update the context in which alignments are drawn.
     *  ctx,
     *  bpPerPixel,
     *  bpStart,
     *  bpEnd,
     *  pixelEnd,
     *  refSequence,
     *  refSequenceStart
     *
     * @param context
     */
    updateContext(context) {
        this.context = context
        this.baseModRenderer.updateContext(context)
    }

    drawAlignment(alignment, y, height) {

        if (alignment instanceof PairedAlignment) {

            this.drawPairConnector(alignment, y, height)

            this.drawSingleAlignment(alignment.firstAlignment, y, height,)

            if (alignment.secondAlignment) {
                this.drawSingleAlignment(alignment.secondAlignment, y, height)
            }

        } else {
            this.drawSingleAlignment(alignment, y, height)
        }

    }

    // bpStart, bpPerPixel, ctx, pixelWidth
    drawSingleAlignment(alignment, y, height) {

        const {ctx, pixelEnd, bpStart, bpEnd, bpPerPixel, refSequence, refSequenceStart} = this.context
        const showSoftClips = this.alignmentTrack.showSoftClips
        const showAllBases = this.alignmentTrack.showAllBases
        const nucleotideColors = this.alignmentTrack.nucleotideColors

        // TODO -- remove, these are checked earlier
        //if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
        //    return
        //}

        const blocks = showSoftClips ? alignment.blocks : alignment.blocks.filter(b => 'S' !== b.type)

        let alignmentColor = this.getAlignmentColor(alignment)
        const outlineColor = alignmentColor
        if (alignment.mq <= 0) {
            alignmentColor = IGVColor.addAlpha(alignmentColor, 0.15)
        }
        IGVGraphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: outlineColor})

        // Save bases to draw into an array for later drawing, so they can be overlaid on insertion blocks,
        // which is relevant if we have insertions with size label
        const basesToDraw = []

        for (let b = 0; b < blocks.length; b++) {   // Can't use forEach here -- we need ability to break

            const block = blocks[b]

            // Somewhat complex test, neccessary to insure gaps are drawn.
            // If this is not the last block, and the next block starts before the orign (off screen to left) then skip.
            if ((b !== blocks.length - 1) && blocks[b + 1].start < bpStart) continue

            // drawBlock returns bases to draw, which are drawn on top of insertion blocks (if they're wider than
            // the space between two bases) like in Java IGV
            basesToDraw.push(...drawBlock.call(this, block, b))

            if ((block.start + block.len) > bpEnd) {
                // Do this after drawBlock to insure gaps are drawn
                break
            }
        }

        if (alignment.gaps) {
            const yStrokedLine = y + height / 2
            for (let gap of alignment.gaps) {
                const sPixel = (gap.start - bpStart) / bpPerPixel
                const ePixel = ((gap.start + gap.len) - bpStart) / bpPerPixel
                const lineWidth = ePixel - sPixel
                const gapLenText = gap.len.toString()
                const gapTextWidth = gapLenText.length * 6
                const gapCenter = sPixel + (lineWidth / 2)

                const color = ("D" === gap.type) ? this.alignmentTrack.deletionColor : this.alignmentTrack.skippedColor

                IGVGraphics.strokeLine(ctx, sPixel, yStrokedLine, ePixel, yStrokedLine, {
                    strokeStyle: color,
                    lineWidth: 2,
                })

                // Add gap width as text like Java IGV if it fits nicely and is a multi-base gap
                if (this.alignmentTrack.showDeletionText && gap.len > 1 && lineWidth >= gapTextWidth + 8) {
                    const textStart = gapCenter - (gapTextWidth / 2)
                    IGVGraphics.fillRect(ctx, textStart - 1, y - 1, gapTextWidth + 2, 12, {fillStyle: "white"})
                    IGVGraphics.fillText(ctx, gapLenText, textStart, y + 10, {
                        'font': 'normal 10px monospace',
                        'fillStyle': this.deletionTextColor,
                    })
                }
            }
        }

        if (alignment.insertions && this.alignmentTrack.parent.showInsertions) {
            let lastXBlockStart = -1
            for (let insertionBlock of alignment.insertions) {
                if (this.alignmentTrack.hideSmallIndels && insertionBlock.len <= this.alignmentTrack.indelSizeThreshold) {
                    continue
                }
                if (insertionBlock.start < bpStart) {
                    continue
                }
                if (insertionBlock.start > bpEnd) {
                    break
                }

                const refOffset = insertionBlock.start - bpStart
                const insertLenText = insertionBlock.len.toString()

                const textPixelWidth = 2 + (insertLenText.length * 6)
                const basePixelWidth = (!this.alignmentTrack.showInsertionText || insertionBlock.len === 1)
                    ? 2
                    : Math.round(insertionBlock.len / bpPerPixel)
                const widthBlock = Math.max(Math.min(textPixelWidth, basePixelWidth), 2)

                const xBlockStart = (refOffset / bpPerPixel) - (widthBlock / 2)
                if ((xBlockStart - lastXBlockStart) > 2) {
                    const props = {fillStyle: this.alignmentTrack.insertionColor}

                    // Draw decorations like Java IGV to make an 'I' shape
                    IGVGraphics.fillRect(ctx, xBlockStart - 2, y, widthBlock + 4, 2, props)
                    IGVGraphics.fillRect(ctx, xBlockStart, y + 2, widthBlock, height - 4, props)
                    IGVGraphics.fillRect(ctx, xBlockStart - 2, y + height - 2, widthBlock + 4, 2, props)

                    // Show # of inserted bases as text if it's a multi-base insertion and the insertion block
                    // is wide enough to hold text (its size is capped at the text label size, but can be smaller
                    // if the browser is zoomed out and the insertion is small)
                    if (this.alignmentTrack.showInsertionText && insertionBlock.len > 1 && basePixelWidth > textPixelWidth) {
                        IGVGraphics.fillText(ctx, insertLenText, xBlockStart + 1, y + 10, {
                            'font': 'normal 10px monospace',
                            'fillStyle': this.insertionTextColor,
                        })
                    }
                    lastXBlockStart = xBlockStart
                }
            }
        }

        for (let {bbox, baseColor, readChar} of basesToDraw) {
            const threshold = 1.0 / 10.0
            if (bpPerPixel <= threshold && bbox.height >= 8) {
                // render letter
                const fontHeight = Math.min(10, bbox.height)
                ctx.font = '' + fontHeight + 'px sans-serif'
                const center = bbox.x + (bbox.width / 2.0)
                IGVGraphics.strokeText(ctx, readChar, center - (ctx.measureText(readChar).width / 2), fontHeight - 1 + bbox.y, {strokeStyle: baseColor})
            } else {

                // render colored block
                IGVGraphics.fillRect(ctx, bbox.x, bbox.y, bbox.width, bbox.height, {fillStyle: baseColor})
            }
        }

        if("5mc" === this.alignmentTrack.colorBy) {
            this.baseModRenderer.drawModifications(alignment, y, height)
        }

        function drawBlock(block, b) {
            // Collect bases to draw for later rendering
            const blockBasesToDraw = []

            const blockStartPixel = (block.start - bpStart) / bpPerPixel
            const blockEndPixel = ((block.start + block.len) - bpStart) / bpPerPixel
            const blockWidthPixel = Math.max(1, blockEndPixel - blockStartPixel)

            //const arrowHeadWidthPixel = alignmentRowHeight / 2.0;
            const nomPixelWidthOnRef = 100 / bpPerPixel
            const arrowHeadWidthPixel = Math.min(height / 2.0, nomPixelWidthOnRef / 6)

            const isSoftClip = 'S' === block.type

            const strokeOutline =
                alignment.mq <= 0 ||
                this.alignmentTrack.highlightedAlignmentReadNamed === alignment.readName ||
                isSoftClip

            let blockOutlineColor = outlineColor
            if (this.alignmentTrack.highlightedAlignmentReadNamed === alignment.readName) blockOutlineColor = 'red'
            else if (isSoftClip) blockOutlineColor = 'rgb(50,50,50)'

            // Test for last block
            if ((alignment.strand && b === blocks.length - 1) || (!alignment.strand && b === 0)) {
                let xListPixel
                let yListPixel
                if (true === alignment.strand) {
                    xListPixel = [blockStartPixel, blockEndPixel, blockEndPixel + arrowHeadWidthPixel, blockEndPixel, blockStartPixel, blockStartPixel]
                    yListPixel = [y, y, y + (height / 2.0), y + height, y + height, y]

                } else {  // negative strand
                    xListPixel = [blockEndPixel, blockStartPixel, blockStartPixel - arrowHeadWidthPixel, blockStartPixel, blockEndPixel, blockEndPixel]
                    yListPixel = [y, y, y + (height / 2.0), y + height, y + height, y]

                }
                IGVGraphics.fillPolygon(ctx, xListPixel, yListPixel, {fillStyle: alignmentColor})

                if (strokeOutline) {
                    IGVGraphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: blockOutlineColor})
                }
            }
            // Internal block
            else {
                IGVGraphics.fillRect(ctx, blockStartPixel, y, blockWidthPixel, height, {fillStyle: alignmentColor})
                if (strokeOutline) {
                    ctx.save()
                    ctx.strokeStyle = blockOutlineColor
                    ctx.strokeRect(blockStartPixel, y, blockWidthPixel, height)
                    ctx.restore()
                }
            }


            // Read base coloring
            if (isSoftClip ||
                showAllBases ||
                this.alignmentTrack.parent.showMismatches && (refSequence && alignment.seq && alignment.seq !== "*")) {

                const seq = alignment.seq ? alignment.seq.toUpperCase() : undefined
                const qual = alignment.qual
                const seqOffset = block.seqOffset
                const widthPixel = Math.max(1, 1 / bpPerPixel)


                for (let i = 0, len = block.len; i < len; i++) {

                    const xPixel = ((block.start + i) - bpStart) / bpPerPixel

                    if (xPixel + widthPixel < 0) continue   // Off left edge
                    if (xPixel > pixelEnd) break  // Off right edge

                    let readChar = seq ? seq.charAt(seqOffset + i) : ''
                    const offsetBP = block.start - refSequenceStart
                    const refChar = offsetBP + i >= 0 ? refSequence.charAt(offsetBP + i) : ''

                    if (readChar === "=") {
                        readChar = refChar
                    }
                    if (readChar === "X" || refChar !== readChar || isSoftClip || showAllBases) {

                        let baseColor
                        if("5mc" === this.alignmentTrack.colorBy || "5c" === this.alignmentTrack.colorBy) {
                            baseColor = "gray"
                        }
                        else if (!isSoftClip && qual !== undefined && qual.length > seqOffset + i) {
                            const readQual = qual[seqOffset + i]
                            baseColor = shadedBaseColor(readQual, nucleotideColors[readChar])
                        } else {
                            baseColor = nucleotideColors[readChar]
                        }
                        if (baseColor) {
                            blockBasesToDraw.push({
                                bbox: {
                                    x: xPixel,
                                    y: y,
                                    width: widthPixel,
                                    height: height
                                },
                                baseColor,
                                readChar,
                            })
                        }
                    }
                }
            }

            return blockBasesToDraw
        }

    }

    drawPairConnector(alignment, yRect, alignmentHeight) {
        const {ctx, pixelEnd, bpStart, bpEnd, bpPerPixel, refSequence, refSequenceStart} = this.context
        var connectorColor = this.getConnectorColor(alignment.firstAlignment),
            xBlockStart = (alignment.connectingStart - bpStart) / bpPerPixel,
            xBlockEnd = (alignment.connectingEnd - bpStart) / bpPerPixel,
            yStrokedLine = yRect + alignmentHeight / 2

        if ((alignment.connectingEnd) < bpStart || alignment.connectingStart > bpEnd) {
            return
        }
        if (alignment.mq <= 0) {
            connectorColor = IGVColor.addAlpha(connectorColor, 0.15)
        }
        IGVGraphics.setProperties(ctx, {fillStyle: connectorColor, strokeStyle: connectorColor})
        IGVGraphics.strokeLine(ctx, xBlockStart, yStrokedLine, xBlockEnd, yStrokedLine)

    }

    /**
     * Return the color for connectors in paired alignment view.   If explicitly set return that, otherwise return
     * the alignment color, unless the color option can result in split colors (separte color for each mate).
     *
     * @param alignment
     * @returns {string}
     */
    getConnectorColor(alignment) {

        if (this.alignmentTrack.pairConnectorColor) {
            return this.alignmentTrack.pairConnectorColor
        }

        switch (this.alignmentTrack.colorBy) {
            case "strand":
            case "firstOfPairStrand":
            case "pairOrientation":
            case "tag":
                if (this.alignmentTrack.color) {
                    return (typeof this.alignmentTrack.color === "function") ? this.alignmentTrack.color(alignment) : this.alignmentTrack.color
                } else {
                    return DEFAULT_CONNECTOR_COLOR
                }
            default:
                return this.getAlignmentColor(alignment)

        }
    }

    getAlignmentColor(alignment) {

        let color = DEFAULT_ALIGNMENT_COLOR   // The default color if nothing else applies
        if (this.alignmentTrack.color) {
            color = (typeof this.alignmentTrack.color === "function") ? this.alignmentTrack.color(alignment) : this.alignmentTrack.color
        } else {
            color = DEFAULT_ALIGNMENT_COLOR
        }
        const option = this.alignmentTrack.colorBy
        switch (option) {
            // case BISULFITE:
            // case BASE_MODIFICATION:
            // case BASE_MODIFICATION_5MC:
            // case BASE_MODIFICATION_C:
            // case SMRT_SUBREAD_IPD:
            // case SMRT_SUBREAD_PW:
            // case SMRT_CCS_FWD_IPD:
            // case SMRT_CCS_FWD_PW:
            // case SMRT_CCS_REV_IPD:
            // case SMRT_CCS_REV_PW:

            case "5mc":
            case "5c":
                // Just a simple forward/reverse strand color scheme that won't clash with the methylation rectangles.
                color = (true === alignment.strand) ? bisulfiteColorFw1 : bisulfiteColorRev1

                break

            case "strand":
                color = alignment.strand ? this.alignmentTrack.posStrandColor : this.alignmentTrack.negStrandColor
                break

            case "firstOfPairStrand":

                if (alignment instanceof PairedAlignment) {
                    color = alignment.firstOfPairStrand() ? this.alignmentTrack.posStrandColor : this.alignmentTrack.negStrandColor
                } else if (alignment.isPaired()) {

                    if (alignment.isFirstOfPair()) {
                        color = alignment.strand ? this.alignmentTrack.posStrandColor : this.alignmentTrack.negStrandColor
                    } else if (alignment.isSecondOfPair()) {
                        color = alignment.strand ? this.alignmentTrack.negStrandColor : this.alignmentTrack.posStrandColor
                    } else {
                        console.error("ERROR. Paired alignments are either first or second.")
                    }
                }
                break

            case "unexpectedPair":
            case "pairOrientation":

                if (this.alignmentTrack.pairOrientation && alignment.pairOrientation) {
                    const oTypes = orientationTypes[this.alignmentTrack.pairOrientation]
                    if (oTypes) {
                        const pairColor = this.alignmentTrack.pairColors[oTypes[alignment.pairOrientation]]
                        if (pairColor) {
                            color = pairColor
                            break
                        }
                    }
                }
                if ("pairOrientation" === option) {
                    break
                }

            case "tlen":
            case "fragmentLength":

                if (alignment.mate && alignment.isMateMapped()) {
                    if (alignment.mate.chr !== alignment.chr) {
                        color = getChrColor(alignment.mate.chr)
                    } else if (this.minTemplateLength && Math.abs(alignment.fragmentLength) < this.minTemplateLength) {
                        color = this.alignmentTrack.smallTLENColor
                    } else if (this.maxTemplateLength && Math.abs(alignment.fragmentLength) > this.maxTemplateLength) {
                        color = this.alignmentTrack.largeTLENColor
                    }
                }
                break

            case "tag":
                const tagValue = alignment.tags()[this.colorByTag]
                if (tagValue !== undefined) {
                    if (this.alignmentTrack.bamColorTag === this.alignmentTrack.colorByTag) {
                        // UCSC style color option
                        color = "rgb(" + tagValue + ")"
                    } else {
                        if (!this.alignmentTrack.tagColors) {
                            this.alignmentTrack.tagColors = new PaletteColorTable("Set1")
                        }
                        color = this.alignmentTrack.tagColors.getColor(tagValue)
                    }
                }
                break
        }

        return color

    }
}

function shadedBaseColor(qual, baseColor) {

    const minQ = 5   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
    const maxQ = 20  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);

    let alpha
    if (qual < minQ) {
        alpha = 0.1
    } else {
        alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)))
    }
    // Round alpha to nearest 0.1
    alpha = Math.round(alpha * 10) / 10.0

    if (alpha < 1) {
        baseColor = IGVColor.addAlpha(baseColor, alpha)
    }
    return baseColor
}

const orientationTypes = {

    "fr": {
        "F1R2": "LR",
        "F2R1": "LR",
        "F1F2": "LL",
        "F2F1": "LL",
        "R1R2": "RR",
        "R2R1": "RR",
        "R1F2": "RL",
        "R2F1": "RL"
    },

    "rf": {
        "R1F2": "LR",
        "R2F1": "LR",
        "R1R2": "LL",
        "R2R1": "LL",
        "F1F2": "RR",
        "F2F1": "RR",
        "F1R2": "RL",
        "F2R1": "RL"
    },

    "ff": {
        "F2F1": "LR",
        "R1R2": "LR",
        "F2R1": "LL",
        "R1F2": "LL",
        "R2F1": "RR",
        "F1R2": "RR",
        "R2R1": "RL",
        "F1F2": "RL"
    }
}

export default AlignmentRenderer