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

export { sortBySampleName }
