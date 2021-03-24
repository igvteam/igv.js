import $ from "./vendor/jquery-3.3.1.slim.js";
import IdeogramViewport from "./ideogramViewport.js";
import ViewPort from "./viewport.js";
import RulerViewport from "./rulerViewport.js";

const createViewport = (trackView, column, referenceFrame, width) => {

    if ('ruler' === trackView.track.type) {
        return new RulerViewport(trackView, $(column), referenceFrame, width);
    } else if ('ideogram' === trackView.track.type) {
        return new IdeogramViewport(trackView, $(column), referenceFrame, width);
    } else {
        return new ViewPort(trackView, $(column), referenceFrame, width);
    }

}

export { createViewport }
