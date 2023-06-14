import {byteToUnsignedInt} from "./baseModificationUtils.js"
import {IGVColor} from "../../../node_modules/igv-utils/src/index.js"

/**
 * C Modifications
 * C m 5mC 5-Methylcytosine 27551
 * C h 5hmC 5-Hydroxymethylcytosine 76792
 * C f 5fC 5-Formylcytosine 76794
 * C c 5caC 5-Carboxylcytosine 76793
 * C C Ambiguity code; any C mod
 */

const mColor = "rgb(255,0,0)"
const hColor = "rgb(11, 132, 165)"
const oColor = "rgb(111, 78, 129)"
const fColor = "rgb(246, 200, 95)"
const cColor = "rgb(157, 216, 102)"
const gColor = "rgb(255, 160, 86)"
const eColor = "rgb(141, 221, 208)"
const bColor = "rgb(202, 71, 47)"
const noModColor5MC = "rgb(0,0,255)"
const genericColor = "rgb(132, 178, 158)"

const colors = new Map()
colors.set("mColor", mColor)
colors.set("hColor", hColor)
colors.set("oColor", oColor)
colors.set("fColor", fColor)
colors.set("cColor", cColor)
colors.set("gColor", gColor)
colors.set("eColor", eColor)
colors.set("bColor", bColor)
colors.set("genericColor", genericColor)
colors.set("noModColor5MC", noModColor5MC)


const colors5MC = new Map()
colors5MC.set("m", mColor)
colors5MC.set("h", hColor)
colors5MC.set("o", oColor)
colors5MC.set("f", fColor)
colors5MC.set("c", cColor)
colors5MC.set("g", gColor)
colors5MC.set("e", eColor)
colors5MC.set("b", bColor)
colors5MC.set("h", "rgb(255, 0, 255)")

/**
 * Cache for modified colors
 */
const modColorMap = new Map()
const modColorMap5MC = new Map()

//String modification, byte likelihood, AlignmentTrack.ColorOption colorOption
function getModColor(modification, likelihood, colorOption) {

    let baseColor = getBaseColor(modification, colorOption)

    let l = byteToUnsignedInt(likelihood)
    if (l > 255) {
        return baseColor
    }

    const key = modification + "--" + l
    if (colorOption === "BASE_MODIFICATION_5MC" ||
        colorOption === "BASE_MODIFICATION_C") {

        if (!modColorMap5MC.has(key)) {
            const alpha = Math.min(255, Math.floor((l * l / 64 - 4 * l + 256)))    // quadratic
            if (l >= 128) {
                const [r, g, b] = IGVColor.rgbComponents(baseColor)
                modColorMap5MC.set(key, `rgba(${r},${g},${b},${alpha/255}`)
            } else {
                const [r, g, b] = IGVColor.rgbComponents(noModColor5MC)
                modColorMap5MC.set(key, `rgba(${r},${g},${b},${alpha/255}`)
            }
        }

        return modColorMap5MC.get(key)

    } else {
        if (l > 250) {
            return baseColor
        }
        const threshold = 256 * 0 //PreferencesManager.getPreferences().getAsFloat("SAM.BASEMOD_THRESHOLD");
        if (l < threshold) {
            l = 0
        }
        if (!modColorMap.has(key)) {
            const [r, g, b] = IGVColor.rgbComponents(baseColor)
            modColorMap.set(key, `rgba(${r},${g},${b},${l/255}`)
        }
        return modColorMap.get(key)
    }
}

function getNoModColor(likelihood) {

    // Note the pallete will always return a color, either an initially seeded one if supplied or a random color.
    const baseColor = noModColor5MC

    const l = byteToUnsignedInt(likelihood)
    if (l > 255) {
        return baseColor
    }

    const key = "NOMOD--" + l

    if (!modColorMap5MC.has(key)) {
        const alpha = Math.min(255, Math.floor(l * l / 64 - 4 * l + 256))    // quadratic
        const [r, g, b] = IGVColor.rgbComponents(baseColor)
        modColorMap5MC.set(key, `rgba(${r},${g},${b},${alpha/255}`)

    }

    return modColorMap5MC.get(key)

}

function getBaseColor(modification, colorOption) {
    if ((colorOption === "5mc" || colorOption === "5c") && colors5MC.has(modification)) {
        return colors5MC.get(modification)
    } else if (colors.has(modification)) {
        return colors.get(modification)
    } else {
        return genericColor
    }
}

export {getModColor, getNoModColor, noModColor5MC}
