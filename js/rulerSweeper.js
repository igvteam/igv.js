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

import $ from "./vendor/jquery-3.3.1.slim.js";
import {validateLocusExtent} from "./util/igvUtils.js";
import {DOMUtils} from "../node_modules/igv-utils/src/index.js"

class RulerSweeper {

    constructor(viewport) {

        this.viewport = viewport;

        this.rulerSweeper = DOMUtils.div({ class: 'igv-ruler-sweeper'})
        viewport.contentDiv.appendChild(this.rulerSweeper)

        this.isMouseHandlers = undefined;
    }

    disableMouseHandlers() {
        $(this.viewport.contentDiv).off()
        this.isMouseHandlers = false;
    };

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

        this.viewport.contentDiv.addEventListener('mousedown', e => {

            isMouseDown = true
            isMouseIn = true;

            const { x } = DOMUtils.translateMouseCoordinates(e, this.viewport.contentDiv);
            left = mouseDownX = x;

            width = threshold;

            this.rulerSweeper.style.display = 'block';

            this.rulerSweeper.style.left = `${left}px`;
            this.rulerSweeper.style.width = `${width}px`;

        });

        this.viewport.contentDiv.addEventListener('mousemove', e => {

            let mouseCurrentX;

            if (isMouseDown && isMouseIn) {

                const { x } = DOMUtils.translateMouseCoordinates(e, this.viewport.contentDiv);
                mouseCurrentX = Math.max(Math.min(x, this.viewport.contentDiv.clientWidth), 0);

                dx = mouseCurrentX - mouseDownX;

                width = Math.abs(dx);
                this.rulerSweeper.style.width = `${width}px`;

                if (dx < 0) {
                    left = mouseDownX + dx;
                    this.rulerSweeper.style.left = `${left}px`;
                }

            }

        });

        this.viewport.contentDiv.addEventListener('mouseup', () => {

            let extent;

            if (true === isMouseDown && true === isMouseIn) {

                isMouseDown = isMouseIn = undefined;

                this.rulerSweeper.style.display = 'none';


                if (width > threshold) {

                    extent = { start: this.bp(left), end: this.bp(left + width) };

                    validateLocusExtent(this.viewport.browser.genome.getChromosome(this.viewport.referenceFrame.chr).bpLength, extent, this.viewport.browser.minimumBases());

                    this.viewport.referenceFrame.bpPerPixel = (Math.round(extent.end) - Math.round(extent.start)) /this.viewport.contentDiv.clientWidth;
                    this.viewport.referenceFrame.start = Math.round(extent.start);
                    this.viewport.referenceFrame.initialEnd = Math.round(extent.end);
                    this.viewport.browser.updateViews(this.viewport.referenceFrame);
                }

            }

        });

        this.isMouseHandlers = true;
    }

    bp(pixel) {
        return this.viewport.referenceFrame.start + (pixel * this.viewport.referenceFrame.bpPerPixel);
    }
}


export default RulerSweeper;
