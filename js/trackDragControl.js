import { DOMUtils } from "../node_modules/igv-utils/src/index.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import {randomRGB} from "./util/colorPalletes.js";

// css - $igv-track-drag-column-width: 12px;
const igv_track_manipulation_handle_width = 12

class TrackDragControl {
    constructor(columnContainer) {
        this.column = DOMUtils.div({ class: 'igv-track-drag-column' })
        columnContainer.appendChild(this.column)
    }

    addDragHandle(browser, trackView) {

        const dragHandle = DOMUtils.div({ class: 'igv-track-drag-handle' })
        this.column.appendChild(dragHandle);

        // dragHandle.style.backgroundColor = randomRGB(150, 250)
        dragHandle.style.height = `${ trackView.track.height }px`

        dragHandle.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            browser.startTrackDrag(trackView);
        })

        dragHandle.addEventListener('mouseup', e => {
            e.preventDefault();
            e.stopPropagation();
            browser.endTrackDrag();
        })

        dragHandle.addEventListener('mouseenter', e => {
            e.preventDefault();
            e.stopPropagation();
            if (browser.dragTrack) {
                browser.updateTrackDrag(trackView);
            }
        })

        trackView.dragHandle = dragHandle;
    }

    removeDragHandle(trackView) {
        $(trackView.dragHandle).off()
        trackView.dragHandle.remove()
    }

    addDragShim(trackView) {

        const dragHandle = DOMUtils.div({ class: 'igv-track-drag-shim' })
        this.column.appendChild(dragHandle);

        // dragHandle.style.backgroundColor = randomRGB(150, 250)
        dragHandle.style.height = `${ trackView.track.height }px`

        trackView.dragHandle = dragHandle

    }

}

export { igv_track_manipulation_handle_width }
export default TrackDragControl
