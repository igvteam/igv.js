
import * as DOMUtils from "../ui/utils/dom-utils.js"

class CursorGuide {

    constructor(columnContainer, browser) {
        this.browser = browser
        this.columnContainer = columnContainer

        this.horizontalGuide = DOMUtils.div({class: 'igv-cursor-guide-horizontal'})
        columnContainer.appendChild(this.horizontalGuide)

        this.verticalGuide = DOMUtils.div({class: 'igv-cursor-guide-vertical'})
        columnContainer.appendChild(this.verticalGuide)

        this.addMouseHandler(browser)

        this.setVisibility(browser.config.showCursorGuide)

    }

    addMouseHandler(browser) {

        this.boundMouseMoveHandler = mouseMoveHandler.bind(this)
        this.columnContainer.addEventListener('mousemove', this.boundMouseMoveHandler)

        function mouseMoveHandler(event) {

            const tag = event.target.tagName

            const {x, y} = DOMUtils.translateMouseCoordinates(event, this.columnContainer)
            this.horizontalGuide.style.top = `${y}px`

            if ('CANVAS' === event.target.tagName) {

                const viewport = findAncestorOfClass(event.target, 'igv-viewport')

                if (viewport && browser.getRulerTrackView()) {

                    this.verticalGuide.style.left = `${x}px`

                    const columns = browser.root.querySelectorAll('.igv-column')
                    let index = undefined
                    const viewportParent = viewport.parentElement
                    for (let i = 0; i < columns.length; i++) {
                        if (undefined === index && viewportParent === columns[i]) {
                            index = i
                        }
                    }

                    if (!(undefined === index)) {

                        const rulerViewport = browser.getRulerTrackView().viewports[index]
                        const result = rulerViewport.mouseMove(event)

                        if (result) {

                            const {start, bp, end} = result
                            const interpolant = (bp - start) / (end - start)

                            if (this.customMouseHandler) {
                                this.customMouseHandler({start, bp, end, interpolant})
                            }
                        } // if (result)

                    } // if (index)

                } // if (viewport && browser.getRulerTrackView())

            } // if ('CANVAS' === event.target.tagName) {

        }
    }

    removeMouseHandler() {
        this.columnContainer.removeEventListener('mousemove', this.boundMouseMoveHandler)
    }

    setVisibility(showCursorGuide) {
        if (true === showCursorGuide) {
            this.show()
        } else {
            this.hide()
        }
    }

    show() {
        this.verticalGuide.style.display = 'block'
        this.horizontalGuide.style.display = 'block'

    }

    hide() {

        this.verticalGuide.style.display = 'none'
        this.horizontalGuide.style.display = 'none'

        if (this.browser.getRulerTrackView()) {
            for (let viewport of this.browser.getRulerTrackView().viewports) {
                viewport.tooltip.style.display = 'none'
            }
        }

    }

}

/**
 * Walk up the tree until a parent is found with the given classname.  If no ancestor is found return undefined.
 * @param target
 * @param classname
 * @returns {*}
 */
function findAncestorOfClass(target, classname) {

    while (target.parentElement) {
        if (target.parentElement.classList.contains(classname)) {
            return target.parentElement
        } else {
            target = target.parentElement
        }
    }
    return undefined

}


export default CursorGuide
