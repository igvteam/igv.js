
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

export { doSortByAttributes }
