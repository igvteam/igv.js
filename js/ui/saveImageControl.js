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

import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import NavbarButton from "./navbarButton.js"

// Icon Button SVG
import { imageSaveImageSVG, imageSaveImageHoverSVG } from './navbarIcons/saveImage.js'

// Icon Button child SVG for PNG and SVG
import { pngImage, pngHoverImage, svgImage, svgHoverImage } from './navbarIcons/saveImage.js'

// Text Button child SVG for PNG and SVG
import { pngText, pngTextHover, svgText, svgTextHover } from './navbarIcons/saveImage.js'

const pngImageURL = `url("data:image/svg+xml,${ encodeURIComponent(pngImage) }")`
const svgImageURL = `url("data:image/svg+xml,${ encodeURIComponent(svgImage) }")`

const pngHoverImageURL = `url("data:image/svg+xml,${ encodeURIComponent(pngHoverImage) }")`
const svgHoverImageURL = `url("data:image/svg+xml,${ encodeURIComponent(svgHoverImage) }")`

const pngTextURL = `url("data:image/svg+xml,${ encodeURIComponent(pngText) }")`
const svgTextURL = `url("data:image/svg+xml,${ encodeURIComponent(svgText) }")`

const pngHoverTextURL = `url("data:image/svg+xml,${ encodeURIComponent(pngTextHover) }")`
const svgHoverTextURL = `url("data:image/svg+xml,${ encodeURIComponent(svgTextHover) }")`

import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class SaveImageControl extends NavbarButton {
    constructor(parent, browser) {

        super(browser, parent, 'Save Image', buttonLabel, imageSaveImageSVG, imageSaveImageHoverSVG, false)

        this.button.addEventListener('mouseenter', () => this.setState(true))

        this.button.addEventListener('mouseleave', () => {

            for (const el of this.button.querySelectorAll('div')) {
                if('block' === el.style.display) {
                    return
                }
            }

            this.setState(false)
        })

        this.button.addEventListener('click', () => {
            for (const el of this.button.querySelectorAll('div')) {
                el.style.display = 'none' === el.style.display ? 'block' : 'none'
            }
        })

        this.setVisibility(browser.config.showSVGButton)

    }

    configureTextButton(title) {
        super.configureTextButton(title)
        this.configureSVG(svgTextURL, svgHoverTextURL, pngTextURL, pngHoverTextURL)
    }

    configureIconButton() {
        this.button.classList.add('igv-navbar-icon-button')
        this.configureSVG(svgImageURL, svgHoverImageURL, pngImageURL, pngHoverImageURL)
    }

    configureSVG(svgURL, svgHoverURL, pngURL, pngHoverURL) {

        // save svg image
        const svgElement = DOMUtils.div()
        this.button.appendChild(svgElement)
        svgElement.style.backgroundImage = svgURL

        svgElement.addEventListener('click', () => {
            this.browser.saveSVGtoFile({})
            this.setState(false)
        })

        svgElement.addEventListener('mouseenter', () => svgElement.style.backgroundImage = svgHoverURL)

        svgElement.addEventListener('mouseleave', () => svgElement.style.backgroundImage = svgURL)

        svgElement.style.display = 'none'

        // save png image
        const pngElement = DOMUtils.div()
        this.button.appendChild(pngElement)
        pngElement.style.backgroundImage = pngURL

        pngElement.addEventListener('click', e => {
            this.browser.savePNGtoFile(undefined)
            this.setState(false)
        })

        pngElement.addEventListener('mouseenter', () => pngElement.style.backgroundImage = pngHoverURL)

        pngElement.addEventListener('mouseleave', () => pngElement.style.backgroundImage = pngURL)

        pngElement.style.display = 'none'

    }

}

export default SaveImageControl
