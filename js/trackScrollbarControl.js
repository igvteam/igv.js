import $ from './vendor/jquery-3.3.1.slim.js'
import {DOMUtils} from '../node_modules/igv-utils/src/index.js'

// css - $igv-scrollbar-outer-width: 14px;
const igv_scrollbar_outer_width = 14

class TrackScrollbarControl {

    constructor(trackScrollbarColumn) {
        this.column = trackScrollbarColumn
    }

    addScrollbar(trackView, columnContainer) {

        const outerScroll = DOMUtils.div()
        this.column.appendChild(outerScroll)

        // outerScroll.style.backgroundColor = randomRGB(150, 250);
        outerScroll.style.height = `${ trackView.track.height }px`

        const innerScroll = DOMUtils.div()
        outerScroll.appendChild(innerScroll)

        trackView.innerScroll = innerScroll
        trackView.outerScroll = outerScroll

        const namespace = 'track-scrollbar-' + DOMUtils.guid()

        $(innerScroll).on(`mousedown.${ trackView.namespace }`, event => {
            event.stopPropagation()
            const { y } = DOMUtils.pageCoordinates(event)
            $(innerScroll).data('yDown', y.toString());

            $(columnContainer).on(`mousemove.${ trackView.namespace }`, event => {
                event.stopPropagation()
                const { y } = DOMUtils.pageCoordinates(event)
                trackView.moveScroller(y - parseInt( $(innerScroll).data('yDown') ))
                $(innerScroll).data('yDown', y.toString());

            })

        })

        $(columnContainer).on(`mouseup.${ trackView.namespace }`, () => $(columnContainer).off(`mousemove.${ trackView.namespace }`))

    }

    removeScrollbar(trackView, columnContainer) {

        if (trackView.outerScroll) {

            if (trackView.innerScroll) {

                $(trackView.innerScroll).off(trackView.namespace)
                trackView.innerScroll.remove()

                $(columnContainer).off(trackView.namespace)
            }

            trackView.outerScroll.remove()

        }

    }

    addScrollbarShim(trackView) {
        const outerScroll = DOMUtils.div()
        this.column.appendChild(outerScroll)

        // outerScroll.style.backgroundColor = randomRGB(150, 250)
        outerScroll.style.height = `${ trackView.track.height }px`

        trackView.outerScroll = outerScroll
    }

}


export { igv_scrollbar_outer_width }
export default TrackScrollbarControl
