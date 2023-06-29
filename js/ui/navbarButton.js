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
import {navbarResponsiveClasses} from "../responsiveNavbar.js"

class NavbarButton {

    constructor(browser, parent, title, image, initialButtonState) {

        this.browser = browser

        this.button = DOMUtils.div({class: 'igv-navbar-text-button'})
        this.button.setAttribute('title', title)
        parent.appendChild(this.button)

        this.image = image

        this.responsiveString = '-text'
        // this.responsiveString = '-image'

        this.setState(initialButtonState)

        browser.on('navbar-resize', toggleButtonContainer => {

            const replacement = 'igv-navbar-toggle-button-container-hidden' === toggleButtonContainer ? '-image' : '-text'

            if (replacement !== this.responsiveString) {
                const str = this.button.style.backgroundImage
                this.button.style.backgroundImage = str.replace(this.responsiveString, replacement)
                this.responsiveString = replacement

                if ('-text' === this.responsiveString) {
                    this.button.classList.remove('igv-navbar-icon-button')
                    this.button.classList.add('igv-navbar-text-button')
                } else {
                    this.button.classList.remove('igv-navbar-text-button')
                    this.button.classList.add('igv-navbar-icon-button')
                }
            }
        })
    }

    setState(doSomething) {
        this.button.style.backgroundImage = true === doSomething ? `url('/images/${this.image}${this.responsiveString}-hover.svg')` : `url('/images/${this.image}${this.responsiveString}.svg')`
    }

    show() {
        this.button.style.display = 'block'
    }

    hide() {
        this.button.style.display = 'none'
    }

    setVisibility(isVisible) {
        if (true === isVisible) {
            this.show()
        } else {
            this.hide()
        }
    }

}

export default NavbarButton
