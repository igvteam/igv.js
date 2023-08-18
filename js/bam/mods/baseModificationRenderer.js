
import {byteToUnsignedInt} from "./baseModificationUtils.js"
import {getModColor} from "./baseModificationColors.js"


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

    drawModifications(alignment, y, height, context, colorOption) { //alignment, bpStart, locScale, rowRect, ctx, colorOption) {

        const threshold = 0.5   // TODO - parameter

        const {ctx, pixelEnd, bpStart, bpPerPixel} = context

        const baseModificationSets = alignment.getBaseModificationSets()
        if (baseModificationSets) {

            for (let block of alignment.blocks) {

                if(block.type === 'S') continue;   // Soft clip

                // Compute bounds
                const pY = y
                const dY = height
                let dX = Math.max(1, (1.0 / bpPerPixel))

                // Loop through sequence for this block
                for (let i = block.seqOffset; i < block.seqOffset + block.len; i++) {

                    let pX = ((block.start + (i - block.seqOffset) - bpStart) / bpPerPixel)
                    // Don't draw out of clipping rect
                    if (pX > pixelEnd) {
                        break
                    } else if (pX + dX < 0) {
                        continue
                    }

                    // Search all sets for modifications of this base, select modification with largest likelihood
                    let maxLh = -1
                    let noModLh = 255
                    let modification = undefined
                    let canonicalBase = 0

                    for (let bmSet of baseModificationSets) {
                        if (bmSet.containsPosition(i)) {
                            const lh = byteToUnsignedInt(bmSet.likelihoods.get(i))
                            noModLh -= lh
                            if (!modification || lh > maxLh) {         // TODO -- filter
                                modification = bmSet.modification
                                canonicalBase = bmSet.canonicalBase
                                maxLh = lh
                            }
                        }
                    }


                    if (modification) {

                        const scaledThreshold = threshold * 255

                        let c
                        if (noModLh > maxLh && colorOption === "basemod2" && noModLh >= scaledThreshold) {
                            c = getModColor("NONE_" + canonicalBase, noModLh, colorOption);
                        } else if (maxLh >= scaledThreshold) {
                            c = getModColor(modification, maxLh, colorOption);
                        }

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




export default BaseModificationRenderer
