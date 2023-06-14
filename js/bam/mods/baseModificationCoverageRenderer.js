import {getModColor, getNoModColor, noModColor5MC} from "./baseModificationColors.js"

function drawModifications(context,
                           pX,
                           pBottom,
                           dX,
                           barHeight,
                           pos,
                           alignmentContainer,
                           colorOption) {

    switch (colorOption) {
        case "5mc":
            draw5MC(context, pX, pBottom, dX, barHeight, pos, alignmentContainer, false)
            break
        case "5c":
            draw5MC(context, pX, pBottom, dX, barHeight, pos, alignmentContainer, true)
            break
        default:
        //draw(context, pX, pBottom, dX, barHeight, pos, alignmentCounts);
    }
}


// private static void draw(RenderContext context,
//     int pX,
//     int pBottom,
//     int dX,
//     int barHeight,
//     int pos,
//     AlignmentCounts alignmentCounts) {
//
//     BaseModificationCounts modificationCounts = alignmentCounts.getModifiedBaseCounts();
//
//     if (modificationCounts != null) {
//
//         Graphics2D graphics = context.getGraphics();
//
//         for (BaseModificationCounts.Key key : modificationCounts.getAllModifications()) {
//
//             // The number of modification calls, some of which might have likelihood of zero
//             int modificationCount = modificationCounts.getCount(pos, key);
//
//             if (barHeight > 0 && modificationCount > 0) {
//
//                 byte base = (byte) key.getBase();
//                 byte complement = SequenceUtil.complement(base);
//                 char modStrand = key.getStrand();
//                 String modification = key.getModification();
//
//                 // Count of bases at this location that could potentially be modified, accounting for strand
//                 int baseCount = alignmentCounts.getPosCount(pos, base) + alignmentCounts.getNegCount(pos, complement);
//
//                 int calledBarHeight = (int) ((((float) modificationCount) / baseCount) * barHeight);
//                 Color modColor = BaseModificationColors.getModColor(modification, (byte) 255, ColorOption.BASE_MODIFICATION);
//
//                 float averageLikelihood = (float) (modificationCounts.getLikelhoodSum(pos, key)) / (modificationCount * 255);
//                 int modHeight = (int) (averageLikelihood * calledBarHeight);
//
//                 // Generic modification
//                 float threshold = PreferencesManager.getPreferences().getAsFloat("SAM.BASEMOD_THRESHOLD");
//                 if (averageLikelihood > threshold && modHeight > 0) {
//                     int baseY = pBottom - modHeight;
//                     graphics.setColor(modColor);
//                     graphics.fillRect(pX, baseY, dX, modHeight);
//                     pBottom = baseY;
//                 }
//             }
//         }
//     }
// }
function draw5MC(ctx, pX, pBottom, dX, barHeight, pos, alignmentContainer, allMods) {

    const modificationCounts = alignmentContainer.baseModCounts
    const coverageMap = alignmentContainer.coverageMap

    if (modificationCounts) {

        const base = 'C'
        const complement = 'G'

        const likelihoodSums = new Map()
        const modCounts = new Map()
        for (let key of modificationCounts.allModifications) {

            // This coloring mode is exclusively for "C" modifications
            if (key.getCanonicalBase() != 'C') continue
            if (key.modification === "m" || allMods) {
                const mod = key.modification
                const count = modificationCounts.getCount(pos, key)
                if (count > 0) {
                    modCounts.set(mod, count)
                    const likelhoodSum = modificationCounts.getLikelhoodSum(pos, key)
                    likelihoodSums.set(mod, likelhoodSum)
                }
            }
        }

        if (likelihoodSums.size > 0) {

            // Count of bases at this location that could potentially be modified
            // double modifiableBaseCount = alignmentCounts.getPosCount(pos, base) + alignmentCounts.getNegCount(pos, complement);

            const modifiableBaseCount = coverageMap.getPosCount(pos, base) + coverageMap.getNegCount(pos, complement)

            // Compute "snp factor", ratio of count of base calls that could be modfied (on either strand) to
            // total count. This is normally close to 1, but can be less due non CG bases at this location (e.g. snps)
            const cgCount = coverageMap.getCount(pos, base) + coverageMap.getCount(pos, complement)
            const snpFactor = cgCount / coverageMap.getTotalCount(pos)

            const calledBarHeight = snpFactor * barHeight
            const t = modifiableBaseCount * 255   // If all bases are called this is the total sum of all likelihoods, including "no mod" likelihood

            // Likelihood of no modification.  It is assumed that the likelihood of no modification == (1 - sum(likelihood))
            const c = Math.max(...modCounts.values())
            let noModProb = c * 255
            for (let m of modCounts.keys()) {
                if (likelihoodSums.has(m)) {
                    noModProb -= likelihoodSums.get(m)
                }
            }

            // Draw "no mod" bar
            const noModHeight = (noModProb / t) * calledBarHeight
            let baseY = pBottom - noModHeight
            ctx.fillStyle = noModColor5MC
            ctx.fillRect(pX, baseY, dX, noModHeight)

            // Loop through modifications drawing bar for each
            const orderedMods = Array.from(likelihoodSums.keys())
            orderedMods.sort((o1, o2) => -1 * o1.compareTo(o2))
            for (let m of orderedMods) {
                const mModHeight = ((likelihoodSums.get(m)) / t) * calledBarHeight
                if (mModHeight > 0) {
                    const mColor = getModColor(m, 255, "5mc")
                    baseY -= mModHeight
                    ctx.fillStyle = mColor
                    ctx.fillRect(pX, baseY, dX, mModHeight)
                }
            }
        }
    }
}

export {drawModifications}

