import * as DOMUtils from "../ui/utils/dom-utils.js"

class ViewportCenterLine {

    constructor(browser, referenceFrame, column) {

        this.browser = browser
        this.referenceFrame = referenceFrame
        this.column = column

        this.container = DOMUtils.div({class: 'igv-center-line'})
        column.appendChild(this.container)

        if (browser.doShowCenterLine) {
            this.show()
        } else {
            this.hide()
        }
    }

    repaint() {

        if (this.referenceFrame) {

            const ppb = 1.0 / this.referenceFrame.bpPerPixel
            if (ppb > 1) {
                const width = Math.floor(this.referenceFrame.toPixels(1))
                this.container.style.width = `${width}px`
                this.container.classList.remove('igv-center-line-thin')
                this.container.classList.add('igv-center-line-wide')
            } else {
                this.container.style.width = '1px'
                this.container.classList.remove('igv-center-line-wide')
                this.container.classList.add('igv-center-line-thin')
            }
        }
    }

    show() {
        this.isVisible = true
        this.container.style.display = 'block'
        this.repaint()
    }

    hide() {
        this.isVisible = false
        this.container.style.display = 'none'
    }

    resize() {
        this.repaint()
    }
}

export default ViewportCenterLine
