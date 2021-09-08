import $ from "./vendor/jquery-3.3.1.slim.js";
import IdeogramViewportController from "./ideogramViewportController.js";
import TrackViewportController from "./trackViewportController.js";
import RulerViewportController from "./rulerViewportController.js";

const createViewportController = (trackView, column, referenceFrame, width) => {

    if ('ruler' === trackView.track.type) {
        return new RulerViewportController(trackView, $(column), referenceFrame, width);
    } else if ('ideogram' === trackView.track.type) {
        return new IdeogramViewportController(trackView, $(column), referenceFrame, width);
    } else {
        return new TrackViewportController(trackView, $(column), referenceFrame, width);
    }

}

export { createViewportController }
