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

import $ from "../vendor/jquery-3.3.1.slim.js";
import {setSampleNameViewportVisibility} from '../trackView.js'

class SampleNameControl {

    constructor($parent, browser) {

        this.$button = $('<div class="igv-navbar-button">')
        $parent.append(this.$button)

        this.$button.text('Sample Names')

        if (true === browser.sampleNamesVisible) {
            this.$button.addClass('igv-navbar-button-clicked')
        } else {
            this.$button.removeClass('igv-navbar-button-clicked')
        }

        this.$button.on('click.sample-name-control', () => {

            browser.sampleNamesVisible = !browser.sampleNamesVisible

            if (true === browser.sampleNamesVisible) {
                this.$button.addClass('igv-navbar-button-clicked')
            } else {
                this.$button.removeClass('igv-navbar-button-clicked')
            }

            setSampleNameViewportVisibility(browser)
        })

    }

    setState(isVisible) {
        if (true === isVisible) {
            this.$button.addClass('igv-navbar-button-clicked')
        } else {
            this.$button.removeClass('igv-navbar-button-clicked')
        }
    }

}

export default SampleNameControl
