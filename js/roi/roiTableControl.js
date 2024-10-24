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

import NavbarButton from "../ui/navbarButton.js"
import {roiImage, roiImageHover} from "../ui/navbarIcons/roi.js"
import { buttonLabel } from "../ui/navbarIcons/buttonLabel.js"

class ROITableControl extends NavbarButton {

    constructor(parent, browser)  {

        super(parent, browser, ['ROI', 'Regions of Interest Table'], buttonLabel, roiImage, roiImageHover, false)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowROITable) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowROITable) {
                this.setState(false)
            }
        })

        this.button.addEventListener('click', () => this.buttonHandler(!browser.doShowROITable))

        this.setVisibility(false)  // Hide initially, it will be un-hidden if ROIs are loaded

    }

    buttonHandler(status) {
        this.setState(status)
        this.browser.setROITableVisibility(status)
    }
}


export default ROITableControl
