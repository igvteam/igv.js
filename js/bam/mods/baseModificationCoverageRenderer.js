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

        let selectedModification
        const parts = colorOption.split(":")
        if(parts.length == 2) {
            colorOption = parts[0]
            selectedModification = parts[1]
        }

        //Set<BaseModificationKey> allModificationKeys = modificationCounts.getAllModificationKeys();
        //List<BaseModificationKey> sortedKeys = new ArrayList<>(allModificationKeys);
        const sortedKeys = Array.from(modificationCounts.allModifications)
        sortedKeys.sort(BaseModificationKey.compare)

        const total = coverageMap.getTotalCount(pos)

        // If site has no modification likelihoods skip (don't draw only "NONE_")
        const realModificationKeys = sortedKeys.filter(key => {
            if (selectedModification) {
                return selectedModification === key.modification
            } else {
                return !key.modification.startsWith("NONE_")
            }
        })
        if(!realModificationKeys.find(key => modificationCounts.getCount(pos, key, 0, false) > 0)) {
            return
        }

        for (let key of sortedKeys) {

            //if (filter && !filter.pass(key.modification, key.getCanonicalBase())) continue;

            if (key.modification.startsWith("NONE_") && colorOption !== "basemod2")
                continue

            if(selectedModification && selectedModification !== key.modification && !key.modification.startsWith("NONE_")) {
                continue
            }


            const base = key.base
            const compl = complementBase(base)

            const modifiable = coverageMap.getCount(pos, base) + coverageMap.getCount(pos, compl)
            const detectable = modificationCounts.simplexModifications.has(key.modification) ?
                coverageMap.getPosCount(pos, base) + coverageMap.getNegCount(pos, compl) :
                modifiable


            if (detectable == 0) continue  //No informative reads

            const includeNoMod = colorOption === "basemod2"

            const count = modificationCounts.getCount(pos, key, threshold, includeNoMod )
            if (count == 0) continue

            const modFraction = (modifiable / total) * (count / detectable)
            const modHeight = Math.round(modFraction * barHeight)

            const likelihoodSum = modificationCounts.getLikelihoodSum(pos, key, threshold, includeNoMod)
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
