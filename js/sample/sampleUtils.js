function sortBySampleName() {
    const object = document.createElement('div');
    object.textContent = 'Sort by sample names';

    function sampleNameSort() {
        this.sampleKeys.sort((a, b) => this.trackView.sampleNameViewport.sortDirection * a.localeCompare(b));
        this.trackView.repaintViews();
        this.trackView.sampleNameViewport.sortDirection *= -1;
    }

    return { object, click: sampleNameSort };
}

function doSortByAttributes(sampleInfo, sampleKeys) {
    const attributeNameSet = new Set(sampleInfo.attributeNames);
    const anySampleKey = sampleKeys[0];
    const dictionary = sampleInfo.getAttributes(anySampleKey);

    if (dictionary === undefined) {
        return false;
    } else {
        const sampleAttributeNames = Object.keys(sampleInfo.getAttributes(anySampleKey));
        for (const name of sampleAttributeNames) {
            if (!attributeNameSet.has(name)) {
                return false;
            }
        }
    }

    return true;
}

export { doSortByAttributes, sortBySampleName };
