import { DOMUtils } from "../node_modules/igv-utils/src/index.js";
import $ from "./vendor/jquery-3.3.1.slim.js";

// css - $igv-track-drag-column-width: 12px;
const igv_track_manipulation_handle_width = 12

let currentDragHandle = undefined

class TrackDragControl {
    constructor(trackDragColumn) {
        this.column = trackDragColumn
    }

    addDragHandle(browser, trackView) {

        const dragHandle = DOMUtils.div({ class: 'igv-track-drag-handle' })
        this.column.appendChild(dragHandle)

        trackView.dragHandle = dragHandle

        trackView.dragHandle.style.height = `${ trackView.track.height }px`

        trackView.dragHandle.addEventListener('mousedown', event => {
            event.preventDefault();

            currentDragHandle = event.target
            currentDragHandle.classList.add('igv-track-drag-handle-hover')

            // console.log('dragHandle.mouseDown - currentDragHandle = event.target')

            browser.startTrackDrag(trackView);
        })

        $(document).on(`mouseup.${ trackView.namespace }`, event => {
            event.preventDefault();

            browser.endTrackDrag()

            let str = ''
            if (currentDragHandle && event.target !== currentDragHandle) {
                str = ' - remove hover style'
                currentDragHandle.classList.remove('igv-track-drag-handle-hover')
            }

            // console.log(`document.mouseup.${ trackView.namespace } - currentDragHandle = undefined${ str }`)

            currentDragHandle = undefined
        })

        trackView.dragHandle.addEventListener('mouseenter', e => {
            e.preventDefault();

            if (undefined === currentDragHandle) {
                e.target.classList.add('igv-track-drag-handle-hover')
            }

            browser.updateTrackDrag(trackView);
        })

        trackView.dragHandle.addEventListener('mouseout', e => {
            e.preventDefault();

            if (undefined === currentDragHandle) {
                e.target.classList.remove('igv-track-drag-handle-hover')
            }
        })

    }

    removeDragHandle(trackView) {

        if (trackView.dragHandle) {
            $(trackView.dragHandle).off()
            trackView.dragHandle.remove()
            $(document).off(`mouseup.${ trackView.namespace }`)
        }

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
