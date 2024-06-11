import $ from "../vendor/jquery-3.3.1.slim.js"

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


        const attributeNameSet = new Set(sampleInfo.attributeNames)
        const anySampleKey = sampleKeys[0]
        const dictionary = sampleInfo.getAttributes(anySampleKey)

        if (undefined === dictionary) {
            return false
        } else {
            const sampleAttributeNames = Object.keys(sampleInfo.getAttributes(anySampleKey))
            for (const name of sampleAttributeNames) {
                if (false === attributeNameSet.has(name)) {
                    return false
                }
            }
        }

    return true
}

export { doSortByAttributes, sortBySampleName }
