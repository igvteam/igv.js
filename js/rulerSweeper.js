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

import {validateLocusExtent} from "./util/igvUtils.js";
import {DOMUtils} from "../node_modules/igv-utils/src/index.js"
import GenomeUtils from './genome/genome.js';

class RulerSweeper {

    constructor(rulerViewport) {
        this.rulerSweeper = DOMUtils.div({ class: 'igv-ruler-sweeper'})
        rulerViewport.contentDiv.appendChild(this.rulerSweeper)

        this.rulerViewport = rulerViewport;

        this.isMouseHandlers = undefined

        this.addBrowserObserver()
    }

    addBrowserObserver() {

        // Viewport Content
        this.boundObserverHandler = observerHandler.bind(this)
        this.rulerViewport.browser.on('locuschange', this.boundObserverHandler)

        function observerHandler() {
            if (GenomeUtils.isWholeGenomeView(this.rulerViewport.referenceFrame.chr)) {
                this.removeMouseHandlers()
            } else {
                this.addMouseHandlers()
            }
        }    }

    removeBrowserObserver() {
        this.rulerViewport.browser.off('locuschange', this.boundObserverHandler)
    }

    addMouseHandlers() {

        if (true === this.isMouseHandlers) {
            return
        }

        let isMouseDown;
        let isMouseIn;
        let mouseDownX;
        let left;
        let width;
        let dx;

        let threshold = 1;

        // Viewport Content
        this.boundContentMouseDownHandler = contentMouseDownHandler.bind(this)
        this.rulerViewport.contentDiv.addEventListener('mousedown', this.boundContentMouseDownHandler)

        function contentMouseDownHandler(event) {

            isMouseDown = true
            isMouseIn = true;

            const { x } = DOMUtils.translateMouseCoordinates(event, this.rulerViewport.contentDiv);
            left = mouseDownX = x;

            width = threshold;

            this.rulerSweeper.style.display = 'block';

            this.rulerSweeper.style.left = `${left}px`;
            this.rulerSweeper.style.width = `${width}px`;

        }

        // Document
        this.boundDocumentMouseMoveHandler = documentMouseMoveHandler.bind(this)
        document.addEventListener('mousemove', this.boundDocumentMouseMoveHandler)

        function documentMouseMoveHandler(event) {

            // console.log(`${ Date.now() } RulerSweeper - documentMouseMoveHandler - target ${ event.target.nodeName }`)

            let mouseCurrentX;

            if (isMouseDown && isMouseIn) {

                const { x } = DOMUtils.translateMouseCoordinates(event, this.rulerViewport.contentDiv);
                mouseCurrentX = Math.max(Math.min(x, this.rulerViewport.contentDiv.clientWidth), 0);

                dx = mouseCurrentX - mouseDownX;

                width = Math.abs(dx);
                this.rulerSweeper.style.width = `${width}px`;

                if (dx < 0) {
                    left = mouseDownX + dx;
                    this.rulerSweeper.style.left = `${left}px`;
                }

            }

        }

        this.boundDocumentMouseUpHandler = documentMouseUpHandler.bind(this)
        document.addEventListener('mouseup', this.boundDocumentMouseUpHandler)

        function documentMouseUpHandler(event) {

            // console.log(`${ Date.now() } RulerSweeper - documentMouseUpHandler - target ${ event.target.nodeName }`)

            let extent;

            if (true === isMouseDown && true === isMouseIn) {

                isMouseDown = isMouseIn = undefined;

                this.rulerSweeper.style.display = 'none';


                if (width > threshold) {

                    extent = { start: bp(this.rulerViewport.referenceFrame, left), end: bp(this.rulerViewport.referenceFrame, left + width) };

                    validateLocusExtent(this.rulerViewport.browser.genome.getChromosome(this.rulerViewport.referenceFrame.chr).bpLength, extent, this.rulerViewport.browser.minimumBases());

                    this.rulerViewport.referenceFrame.bpPerPixel = (Math.round(extent.end) - Math.round(extent.start)) /this.rulerViewport.contentDiv.clientWidth;
                    this.rulerViewport.referenceFrame.start = Math.round(extent.start);
                    this.rulerViewport.referenceFrame.end = Math.round(extent.end);

                    this.rulerViewport.browser.updateViews(this.rulerViewport.referenceFrame);
                }

            }

        }

        this.isMouseHandlers = true;
    }

    removeMouseHandlers() {
        this.rulerViewport.contentDiv.removeEventListener('mousedown', this.boundContentMouseDownHandler)
        document.removeEventListener('mousemove', this.boundDocumentMouseMoveHandler)
        document.removeEventListener('mouseup', this.boundDocumentMouseUpHandler)
        this.isMouseHandlers = false;
    }

    dispose() {
        this.removeBrowserObserver()
        this.removeMouseHandlers()
        this.rulerSweeper.remove()
    }

}

function bp(referenceFrame, pixel) {
    return referenceFrame.start + (pixel * referenceFrame.bpPerPixel);
}

export default RulerSweeper;
