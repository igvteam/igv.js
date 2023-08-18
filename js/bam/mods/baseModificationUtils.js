import BaseModificationSet from "./baseModificationSet.js"
import {reverseComplementSequence} from "../../util/sequenceUtils.js"

const codeValues = new Map([
    ["m", "5mC"],
    ["h", "5hmC"],
    ["f", "5fC"],
    ["c", "5caC"],
    ["g", "5hmU"],
    ["e", "5fU"],
    ["b", "5caU"],
    ["a", "6mA"],
    ["o", "8xoG"],
    ["n", "Xao"],
    ["C", "Unknown C"],
    ["T", "Unknown T"],
    ["A", "Unknown A"],
    ["G", "Unknown G"],
    ["N", "Unknown"]
])


function modificationName(modification) {
    return "Base modification: " + ((codeValues.has(modification)) ? codeValues.get(modification) : "Uknown")
}


/**
 * Parse the mm tag creating a base modification set for each modification listed.
 *
 * @param mm       MM tag value, string, examples
 *                 C+m?,5,12,0; :   A single modification, 1 set is returned
 *                 C+mh,5,12,0; :   Two modifications, 2 sets are returned
 *                 C+m,5,12,0;C+h,5,12,0;   Two modifications, 2 sets are returned
 * @param ml  byte[]
 * @param sequence
 * @return List<BaseModificationSet>
 */
function getBaseModificationSets(mm, ml, sequence, isNegativeStrand) {

    const origSequence = sequence
    if (isNegativeStrand) {
        sequence = reverseComplementSequence(sequence)
    }

    const modificationSets = []


    const mmTokens = mm.split(";")
    let mlIdx = 0      // likelihood array index

    for (let mmi of mmTokens) {

        const tokens = mmi.split(",") //Globals.commaPattern.split(mm);
        const base = tokens[0].charAt(0)
        const strand = tokens[0].charAt(1)
        const skippedBasesCalled = tokens[0].endsWith(".")    // False by default.

        if (tokens.length == 1) {
            // Legal but not handled yet, indicates modification is not present.  Perhaps not relevant for visualization
        } else {

            const modificationString = tokens[0].endsWith(".") || tokens[0].endsWith("?") ?
                tokens[0].substring(2, tokens[0].length - 1) :
                tokens[0].substring(2)

            // Parse modifications, this is rather complex, commensurate with the spec.  Unless a chebi code, modifications
            // are restricted to single characters, a multi-character string that is not a chebi code indicates
            // multiple modifications
            let modifications = []
            if (modificationString.length > 1) {
                if (isChEBI(modificationString)) {
                    modifications.push(modificationString)
                } else {
                    for (let i = 0; i < modificationString.length; i++) {
                        modifications.push(modificationString.substring(i, i + 1))
                    }
                }
            } else {
                modifications.push(modificationString)
            }


            // Create a positions -> likelihood map for each modification
            //Map<String, Map<Integer, Byte>> likelihoodMap = new HashMap<>();
            const likelihoodMap = new Map()
            for (let m of modifications) {
                likelihoodMap.set(m, new Map())
            }

            let idx = 1  // position array index,  positions start at index 1
            let skip = Number.parseInt(tokens[idx++])
            let p = 0
            let matchCount = 0

            while (p < sequence.length) {

                if (base === 'N' || sequence[p] === base) {
                    const position = isNegativeStrand ? sequence.length - 1 - p : p
                    if (matchCount === skip) {
                        for (let modification of modifications) {
                            const likelihood = !ml ? 255 : ml[mlIdx++]
                            likelihoodMap.get(modification).set(position, likelihood)
                        }
                        if (idx < tokens.length) {
                            skip = Number.parseInt(tokens[idx++])
                            matchCount = 0
                        } else {
                            if (skippedBasesCalled) {
                                // MM tag is exhausted, but continue scanning for skipped bases
                                skip = -1;
                            } else {
                                // If skipped bases are not called unmodified we are done.
                                break;
                            }
                        }
                    } else {
                        if (skippedBasesCalled) {
                            // Skipped bases are assumed be called "modification present with 0% probability",
                            // i.e modification has been called to be not present (as opposed to unknown)
                            for (let modification of modifications) {
                                likelihoodMap.get(modification).set(position, 0)
                            }
                        }
                        matchCount++
                    }
                }
                p++
            }

            for (let m of modifications) {
                modificationSets.push(new BaseModificationSet(base, strand, m, likelihoodMap.get(m)))
            }
        }
    }

    return modificationSets
}

/**
 * If a string can be converted to a positive integer assume its a ChEBI ID
 *
 * @param str
 * @return
 */
function isChEBI(str) {
    if (!str) {
        return false
    }
    const length = str.length
    if (length == 0) {
        return false
    }
    for (let i = 0; i < length; i++) {
        const c = str.charAt(i)
        if (c < '0' || c > '9') {
            return false
        }
    }
    return true
}

/**
 * Mimics Java's Byte.toUnsignedInt(). This is not a general function, only works for "byte" range -128 -> 128  Useful for Java port*
 * @param b
 */
function byteToUnsignedInt(b) {
    return b < 0 ? b + 256 : b
}

export {modificationName, isChEBI, getBaseModificationSets, byteToUnsignedInt}
