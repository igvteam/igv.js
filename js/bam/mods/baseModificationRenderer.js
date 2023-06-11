/*
            Alignment alignment,
            double bpStart,
            double locScale,
            Rectangle rowRect,
            Graphics g,
            AlignmentTrack.ColorOption colorOptio
 */

import {byteToUnsignedInt} from "./baseModificationUtils.js"
import {getModColor, getNoModColor} from "./baseModificationColors.js"

const colorOption = "BASE_MODIFICATION_5MC"

class BaseModificationRenderer {

    constructor(alignmentTrack) {
        this.alignmentTrack = alignmentTrack
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
    }

    drawModifications(alignment, y, height) { //alignment, bpStart, locScale, rowRect, ctx, colorOption) {

        switch (colorOption) {
            case "BASE_MODIFICATION_5MC":
                this.draw5mC(alignment, y, height, false)
                break
            case "BASE_MODIFICATION_C":
                this.draw5mC(alignment, y, height, true)
                break

            //  default:
            //      draw(alignment, bpStart, locScale, rowRect, g);
        }

    }

    draw5mC(alignment, y, height, allMods) { //, bpStart, bpPerPixel, rowRect, ctx, allMods) {

        const {ctx, pixelEnd, bpStart, bpEnd, bpPerPixel, refSequence, refSequenceStart} = this.context

        const baseModificationSets = alignment.getBaseModificationSets()
        if (baseModificationSets) {

            for (let block of alignment.blocks) {

                // Compute bounds
                const pY = y
                const dY = height
                let dX = Math.max(1, (1.0 / bpPerPixel))

                // Loop through sequence for this block
                for (let i = block.seqOffset; i <  block.seqOffset + block.len; i++) {

                    let pX = ((block.start + (i - block.seqOffset) - bpStart) / bpPerPixel)
                    // Don't draw out of clipping rect
                    if (pX > pixelEnd) {
                        break
                    } else if (pX + dX < 0) {
                        continue
                    }

                    // Search all sets for modifications of this base, select modification with largest likelihood
                    let lh = -1
                    let modification = undefined

                    // Compare likelihoods, including likelihood of no modification
                    let noModificationLikelihood = 255
                    for (let bmSet of baseModificationSets) {

                        // This coloring mode is exclusively for "C" modifications, either 5mC or all C mods
                        if (bmSet.getCanonicalBase() !== 'C') continue
                        if (bmSet.modification === "m" || allMods) {

                            if (bmSet.containsPosition(i)) {
                                const l = byteToUnsignedInt(bmSet.likelihoods.get(i))
                                noModificationLikelihood -= l
                                if (!modification || l > lh) {
                                    modification = bmSet.modification
                                    lh = l
                                }
                            }
                        }
                    }


                    if (modification) {
                        const c = noModificationLikelihood > lh ?
                            getNoModColor(noModificationLikelihood) :
                            getModColor(modification, lh, "BASE_MODIFICATION_5MC")
                        ctx.fillStyle = c

                        // Expand narrow width to make more visible
                        if (dX < 3) {
                            dX = 3
                            pX--
                        }
                        ctx.fillRect(pX, pY, dX, Math.max(1, dY - 2))
                    }
                }
            }
        }
    }
}

function drawModifications(alignment, bpStart, locScale, rowRect, ctx, colorOption) {

    switch (colorOption) {
        case "BASE_MODIFICATION_5MC":
            draw5mC(alignment, bpStart, locScale, rowRect, ctx, false)
            break
        case "BASE_MODIFICATION_C":
            draw5mC(alignment, bpStart, locScale, rowRect, ctx, true)
            break

        //  default:
        //      draw(alignment, bpStart, locScale, rowRect, g);
    }

}

/**
 * Helper function for AlignmentRenderer.  Draw base modifications over alignment.
 *
 * @param alignment
 * @param bpStart
 * @param locScale
 * @param rowRect
 * @param g
 */
// private static void draw(
//         Alignment alignment,
//         double bpStart,
//         double locScale,
//         Rectangle rowRect,
//         Graphics g) {
//
//     List<BaseModificationSet> baseModificationSets = alignment.getBaseModificationSets();
//
//     if (baseModificationSets != null) {
//         for (AlignmentBlock block : alignment.getAlignmentBlocks()) {
//             // Compute bounds
//             int pY = (int) rowRect.getY();
//             int dY = (int) rowRect.getHeight();
//             int dX = (int) Math.max(1, (1.0 / locScale));
//
//             for (int i = block.getBases().startOffset; i < block.getBases().startOffset + block.getBases().length; i++) {
//
//                 int blockIdx = i - block.getBases().startOffset;
//                 int pX = (int) ((block.getStart() + blockIdx - bpStart) / locScale);
//
//                 // Don't draw out of clipping rect
//                 if (pX > rowRect.getMaxX()) {
//                     break;
//                 } else if (pX + dX < rowRect.getX()) {
//                     continue;
//                 }
//
//                 // Search all sets for modifications of this base.  For now keeps mod with > probability
//                 // TODO -- merge mods in some way
//                 byte lh = 0;
//                 String modification = null;
//                 for (BaseModificationSet bmSet : baseModificationSets) {
//                     if (bmSet.containsPosition(i)) {
//                         if (modification == null || Byte.toUnsignedInt(bmSet.getLikelihoods().get(i)) > Byte.toUnsignedInt(lh)) {
//                             modification = bmSet.getModification();
//                             lh = bmSet.getLikelihoods().get(i);
//                         }
//                     }
//                 }
//
//                 if (modification != null) {
//
//                     Color c = BaseModificationColors.getModColor(modification, lh, AlignmentTrack.ColorOption.BASE_MODIFICATION);
//                     g.setColor(c);
//
//                     // Expand narrow width to make more visible
//                     if (dX < 3) {
//                         dX = 3;
//                         pX--;
//                     }
//                     g.fillRect(pX, pY, dX, Math.max(1, dY - 2));
//                 }
//             }
//         }
//     }
// }

/**
 * Helper function for AlignmentRenderer.  Draw base modifications over alignment for "5mC" mode.
 * <p>
 * Notes:
 * Designed primarily for visualization of 5mC modifications compatible with existing bisulfite seq viz
 * - 5mC methylated bases colored red
 * - Non modified bases colored blue
 * - Other modificationc colored as defined in BaseModificationColors
 * <p>
 * If multiple modifications are specified for a base the modification with the highest probability is
 * drawn.
 *
 * @param alignment
 * @param bpStart
 * @param locScale
 * @param rowRect
 * @param ctx
 */
function draw5mC(alignment, bpStart, locScale, rowRect, ctx, allMods) {

    const baseModificationSets = alignment.getBaseModificationSets()
    if (baseModificationSets) {

        /*
         start: scPos,
                seqOffset: seqOffset,
                len: c.len,
                type: 'S'
         */

        for (let block of alignment.blocks) {
            // Compute bounds
            let pY = rowRect.y
            const dY = rowRect.height
            let dX = Math.max(1, (1.0 / locScale))

            for (let i = block.start; i < block.start + block.len; i++) {

                const blockIdx = i - block.start
                let pX = ((block.start + blockIdx - bpStart) / locScale)

                // Don't draw out of clipping rect
                if (pX > rowRect.x + rowRect.width) {
                    break
                } else if (pX + dX < rowRect.x) {
                    continue
                }

                // Search all sets for modifications of this base, select modification with largest likelihood
                let lh = -1
                let modification

                // Compare likelihoods, including likelihood of no modification
                let noModificationLikelihood = 255
                for (let bmSet of baseModificationSets) {

                    // This coloring mode is exclusively for "C" modifications, either 5mC or all C mods
                    if (bmSet.getCanonicalBase() != 'C') continue
                    if (bmSet.modification === "m" || allMods) {
                        if (bmSet.containsPosition(i)) {
                            const l = byteToUnsignedInt(bmSet.likelihoods.get(i))
                            noModificationLikelihood -= l
                            if (!modification || l > lh) {
                                modification = bmSet.modification
                                lh = l
                            }
                        }
                    }
                }

                if (modification) {

                    const c = noModificationLikelihood > lh ?
                        getNoModColor(noModificationLikelihood) :
                        getModColor(modification, lh, "BASE_MODIFICATION_5MC")
                    ctx.fillStyle = c

                    // Expand narrow width to make more visible
                    if (dX < 3) {
                        dX = 3
                        pX--
                    }
                    ctx.fillRect(pX, pY, dX, Math.max(1, dY - 2))
                }
            }
        }
    }
}

export default BaseModificationRenderer

