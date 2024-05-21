import $ from "../vendor/jquery-3.3.1.slim.js"
import {attributeNames, sampleDictionary} from "./sampleInfo.js"

function sortBySampleName() {

    const object = $('<div>')
    object.text('Sort by sample names')

    function sampleNameSort () {
        this.sampleKeys.sort((a, b) => this.trackView.sampleNameViewport.sortDirection * a.localeCompare(b))
        this.trackView.repaintViews()
        this.trackView.sampleNameViewport.sortDirection *= -1
    }

    return { object, click:sampleNameSort }

}

function doSortByAttributes(sampleInfo, sampleKeys) {

    let result = !(undefined === sampleDictionary)

    if (true === result) {

        const attributeNameSet = new Set(attributeNames)
        const anySampleKey = sampleKeys[0]
        const dictionary = sampleInfo.getAttributes(anySampleKey)

        if (undefined === dictionary) {
            return false
        } else {
            const sampleAttributeNames = Object.keys(sampleInfo.getAttributes(anySampleKey))

            for (const name of sampleAttributeNames) {
                if (false === attributeNameSet.has(name)) {
                    result = false
                    break
                }
            }
        }
    }

    return result
}

export { doSortByAttributes, sortBySampleName }
