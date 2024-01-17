/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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

import NavbarButton from "./navbarButton.js"
import {trackLabelsImage, trackLabelsImageHover} from "./navbarIcons/trackLabels.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class TrackLabelControl extends NavbarButton {

    constructor(parent, browser) {

        super(browser, parent, 'Track Labels', buttonLabel, trackLabelsImage, trackLabelsImageHover, browser.config.showTrackLabels)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowTrackLabels) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowTrackLabels) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {
            browser.doShowTrackLabels = !browser.doShowTrackLabels
            browser.setTrackLabelVisibility(browser.doShowTrackLabels)
            this.setState(browser.doShowTrackLabels)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(browser.config.showTrackLabelButton)

    }

}

export default TrackLabelControl
