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
import Dropdown from "./dropdown.js"
// Icon Button SVG
import { imageSaveImageSVG, imageSaveImageHoverSVG } from './navbarIcons/saveImage.js'
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class SaveImageControl extends NavbarButton {
    constructor(parent, browser) {

        super(parent, browser, 'Save Image', buttonLabel, imageSaveImageSVG, imageSaveImageHoverSVG, false)

        this.button.addEventListener('mouseenter', () => this.setState(true))

        this.button.addEventListener('mouseleave', () => {

            for (const el of this.button.querySelectorAll('div')) {
                if('block' === el.style.display) {
                    return
                }
            }

            this.setState(false)
        })

        this.dropdown = new Dropdown(this.button.parentNode, { top:24, left:-88 })

        const items =
            [
                {
                    label: "Save as SVG",
                    click: e => {
                        this.browser.saveSVGtoFile("igvjs.svg")
                        this.dropdown.dismiss()
                    }
                },
                {
                    label: "Save as PNG",
                    click: e => {
                        this.browser.savePNGtoFile("igvjs.png")
                        this.dropdown.dismiss()
                    }
                },
            ]

        this.dropdown.configure(items)

        this.button.addEventListener('click', e => {

            let takeAction
            if (e.target === this.button) {
                takeAction = true
            } else if (e.target.closest('svg')) {
                const parentDiv = e.target.closest('div')
                if (parentDiv === this.button) {
                    takeAction = true
                }
            }

            if (true === takeAction) {
                 'none' === this.dropdown.popover.style.display ? this.dropdown.present(e) : this.dropdown.dismiss()
            }

        })

        this.setVisibility(browser.config.showSVGButton)

    }

    navbarResizeHandler(navbarButtonCSSClass) {
        this.dropdown.dismiss()
        super.navbarResizeHandler(navbarButtonCSSClass)
    }

}

export default SaveImageControl
