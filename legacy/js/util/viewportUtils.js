import RulerViewport from "../rulerViewport.js"
import IdeogramViewport from "../ideogramViewport.js"
import TrackViewport from "../trackViewport.js"


function createViewport(trackView, column, referenceFrame, width) {

    if ('ruler' === trackView.track.type) {
        return new RulerViewport(trackView, column, referenceFrame, width)
    } else if ('ideogram' === trackView.track.id) {
        return new IdeogramViewport(trackView, column, referenceFrame, width)
    } else {
        const viewportObject = new TrackViewport(trackView, column, referenceFrame, width)
        referenceFrame.viewport = viewportObject
        return viewportObject
    }
}


export {createViewport}
