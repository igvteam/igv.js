import $ from './vendor/jquery-3.3.1.slim.js'
import {DOMUtils, StringUtils} from '../node_modules/igv-utils/src/index.js'
import {maxViewportContentHeight} from './trackView.js'
import {randomRGB} from './util/colorPalletes.js'

// css - $igv-scrollbar-outer-width: 14px;
const igv_scrollbar_outer_width = 14

class TrackScrollbarControl {

    constructor(columnContainer) {
        this.column = DOMUtils.div({ class: 'igv-scrollbar-column' })
        columnContainer.appendChild(this.column)
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
                TrackScrollbarControl.moveScroller(trackView,y - parseInt( $(innerScroll).data('yDown') ))
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

    static moveScroller(trackView, delta) {

        const y = $(trackView.innerScroll).position().top + delta
        const top = Math.min(Math.max(0, y), trackView.outerScroll.clientHeight - trackView.innerScroll.clientHeight)
        $(trackView.innerScroll).css('top', `${ top }px`);

        const contentHeight = maxViewportContentHeight(trackView.viewports)
        const contentTop = -Math.round(top * (contentHeight / trackView.viewports[ 0 ].$viewport.height()))

        // console.log(`moveScroller contentTop(${ StringUtils.numberFormatter(contentTop) })`)

        for (let viewport of trackView.viewports) {
            viewport.setTop(contentTop)
        }

        trackView.sampleNameViewport.trackScrollDelta = delta
        trackView.sampleNameViewport.setTop(contentTop)

    }

}


export { igv_scrollbar_outer_width }
export default TrackScrollbarControl
