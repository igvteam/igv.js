/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {DOMUtils} from "../node_modules/igv-utils/src/index.js"
import {validateGenomicExtent} from "./util/igvUtils.js"
import GenomeUtils from './genome/genome.js'

class RulerSweeper {

    constructor(rulerViewport, column, browser, referenceFrame) {

        this.rulerViewport = rulerViewport

        this.rulerSweeper = DOMUtils.div({class: 'igv-ruler-sweeper'})
        column.appendChild(this.rulerSweeper)

        this.browser = browser
        this.referenceFrame = referenceFrame

        this.isMouseHandlers = undefined

        this.addBrowserObserver()
    }

    addBrowserObserver() {

        const observerHandler = () => {
            if (this.referenceFrame) {
                GenomeUtils.isWholeGenomeView(this.referenceFrame.chr) ? this.removeMouseHandlers() : this.addMouseHandlers()
            }
        }

        // Viewport Content
        this.boundObserverHandler = observerHandler.bind(this)
        this.browser.on('locuschange', this.boundObserverHandler)

    }

    removeBrowserObserver() {
        this.browser.off('locuschange', this.boundObserverHandler)
    }

    addMouseHandlers() {

        if (true === this.isMouseHandlers) {
            return
        }

        const threshold = 1

        let isMouseDown
        let isMouseIn
        let mouseDownX
        let left
        let width
        let dx

        // Viewport Content
        this.boundContentMouseDownHandler = contentMouseDownHandler.bind(this)
        this.rulerViewport.contentDiv.addEventListener('mousedown', this.boundContentMouseDownHandler)

        function contentMouseDownHandler(event) {

            isMouseDown = true
            isMouseIn = true

            const {x} = DOMUtils.translateMouseCoordinates(event, this.rulerViewport.contentDiv)
            left = mouseDownX = x

            width = threshold

            this.rulerSweeper.style.display = 'block'

            this.rulerSweeper.style.left = `${left}px`
            this.rulerSweeper.style.width = `${width}px`

        }

        // Document
        this.boundDocumentMouseMoveHandler = documentMouseMoveHandler.bind(this)
        document.addEventListener('mousemove', this.boundDocumentMouseMoveHandler)

        function documentMouseMoveHandler(event) {

            let mouseCurrentX

            if (isMouseDown && isMouseIn) {

                const {x} = DOMUtils.translateMouseCoordinates(event, this.rulerViewport.contentDiv)
                mouseCurrentX = Math.max(Math.min(x, this.rulerViewport.contentDiv.clientWidth), 0)

                dx = mouseCurrentX - mouseDownX

                width = Math.abs(dx)
                this.rulerSweeper.style.width = `${width}px`

                if (dx < 0) {
                    left = mouseDownX + dx
                    this.rulerSweeper.style.left = `${left}px`
                }

            }

        }

        this.boundDocumentMouseUpHandler = documentMouseUpHandler.bind(this)
        document.addEventListener('mouseup', this.boundDocumentMouseUpHandler)

        function documentMouseUpHandler(event) {

            let genomicExtent

            if (true === isMouseDown && true === isMouseIn) {

                isMouseDown = isMouseIn = undefined

                this.rulerSweeper.style.display = 'none'

                if (width > threshold) {

                    genomicExtent =
                        {
                            start: this.referenceFrame.calculateEnd(left),
                            end: this.referenceFrame.calculateEnd(left+width),
                        }


                    const shiftKeyPressed = event.shiftKey

                    if (true === shiftKeyPressed) {
                        this.browser.roiManager.addROI(Object.assign({}, genomicExtent))
                    } else {

                        validateGenomicExtent(this.browser.genome.getChromosome(this.referenceFrame.chr).bpLength, genomicExtent, this.browser.minimumBases())
                        updateReferenceFrame(this.referenceFrame, genomicExtent, this.rulerViewport.contentDiv.clientWidth)
                        this.browser.updateViews(this.referenceFrame)

                    }

                }

            }

        }

        this.isMouseHandlers = true
    }

    removeMouseHandlers() {
        this.rulerViewport.contentDiv.removeEventListener('mousedown', this.boundContentMouseDownHandler)
        document.removeEventListener('mousemove', this.boundDocumentMouseMoveHandler)
        document.removeEventListener('mouseup', this.boundDocumentMouseUpHandler)
        this.isMouseHandlers = false
    }

    dispose() {
        this.removeBrowserObserver()
        this.removeMouseHandlers()
        this.rulerSweeper.remove()
    }

}

function updateReferenceFrame(referenceFrame, genomicExtent, pixelWidth) {
    referenceFrame.start = Math.round(genomicExtent.start)
    referenceFrame.end = Math.round(genomicExtent.end)
    referenceFrame.bpPerPixel = (referenceFrame.end - referenceFrame.start) / pixelWidth
}

export default RulerSweeper
