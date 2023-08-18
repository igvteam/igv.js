import {getModColor} from "./baseModificationColors.js"
import {complementBase} from "../../util/sequenceUtils.js"
import BaseModificationKey from "./baseModificationKey.js"

function drawModifications(ctx,
                           pX,
                           pBottom,
                           dX,
                           barHeight,
                           pos,
                           alignmentContainer,
                           colorOption,
                           threshold) {

    const modificationCounts = alignmentContainer.baseModCounts
    const coverageMap = alignmentContainer.coverageMap

    if (modificationCounts) {

        //Set<BaseModificationKey> allModificationKeys = modificationCounts.getAllModificationKeys();
        //List<BaseModificationKey> sortedKeys = new ArrayList<>(allModificationKeys);
        const sortedKeys = Array.from(modificationCounts.allModifications)
        sortedKeys.sort(BaseModificationKey.compare)

        const total = coverageMap.getTotalCount(pos)

        for (let key of sortedKeys) {

            //if (filter && !filter.pass(key.modification, key.getCanonicalBase())) continue;

            if (key.modification.startsWith("NONE_") && colorOption !== "basemod2")
                continue

            const base = key.base
            const compl = complementBase(base)

            const modifiable = coverageMap.getCount(pos, base) + coverageMap.getCount(pos, compl)
            const detectable = modificationCounts.simplexModifications.has(key.modification) ?
                coverageMap.getPosCount(pos, base) + coverageMap.getNegCount(pos, compl) :
                modifiable


            if (detectable == 0) continue  //No informative reads

            const count = modificationCounts.getCount(pos, key, threshold, colorOption === "basemod2")
            if (count == 0) continue

            const modFraction = (modifiable / total) * (count / detectable)
            const modHeight = Math.round(modFraction * barHeight)

            const likelihoodSum = modificationCounts.getLikelihoodSum(pos, key, threshold, "basemod2")
            const averageLikelihood = likelihoodSum / count

            const baseY = pBottom - modHeight
            const modColor = getModColor(key.modification, averageLikelihood, colorOption)

            ctx.fillStyle = modColor
            ctx.fillRect(pX, baseY, dX, modHeight)
            pBottom = baseY

        }
    }
}


export {drawModifications}
