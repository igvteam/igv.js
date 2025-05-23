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
import {clearFiltersImage, clearFiltersImageHover} from "./navbarIcons/clearFilters.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class ClearFiltersButton extends NavbarButton {

    constructor(parent, browser) {

        super(parent, browser, 'Clear Filters', buttonLabel, clearFiltersImage, clearFiltersImageHover, false)

        this.button.addEventListener('mouseenter', () => {
            this.setState(true)
        })

        this.button.addEventListener('mouseleave', () => {
            this.setState(false)
        })


        this.tableRowContent = new Map()

        const mouseClickHandler = () => {
            this.presentTable(this.tableRowContent)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)
        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)
    }

    setTableRowContent(string) {
        const [ key, value ] = string.split('#')
        this.tableRowContent.set(key, value)
    }

    presentTable(tableRowContent) {

        const existingPanel = document.querySelector('.igv-clear-filters__container')
        if (existingPanel) {
            existingPanel.remove()
        }

        const panel = document.createElement('div')
        document.body.appendChild(panel)
        panel.className = 'igv-clear-filters__container'
        panel.style.position = 'fixed'
        panel.style.top = '50%'
        panel.style.left = '50%'
        panel.style.transform = 'translate(-50%, -50%)'
        panel.style.zIndex = '1000'

        for (const [key, value] of tableRowContent) {
            const row = document.createElement('div')
            row.className = 'igv-clear-filters__row'
            panel.appendChild(row)

            const checkbox = document.createElement('input')
            row.appendChild(checkbox)
            checkbox.type = 'checkbox'
            checkbox.className = 'igv-clear-filters__checkbox'
            checkbox.dataset.key = 'trackType'
            checkbox.dataset.value = key

            const content = document.createElement('div')
            row.appendChild(content)
            content.className = 'igv-clear-filters__content'
            content.textContent = value

        }

        // Add apply button
        const applyButton = document.createElement('button')
        panel.appendChild(applyButton)

        applyButton.className = 'igv-clear-filters__button'
        applyButton.textContent = 'Apply'
        applyButton.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('.igv-clear-filters__row input:checked')
            const trackTypes = Array.from(checkboxes).map(({ dataset }) => dataset.value)
            for (const type of trackTypes) {
                if ('seg' === type) {
                    const st = this.browser.findTracks("type", "seg")
                    if (st.length > 0) {
                        await Promise.all(st.map(track => track.setSampleFilter(undefined)))
                    }
                } else if ('mut' === trackType) {
                    const mt = this.browser.findTracks("type", "mut")
                    if (mt.length > 0) {
                        await Promise.all(mt.map(track => track.setSampleFilter(undefined)))
                    }
                }
            }
            panel.remove()
        })

    }

}

export default ClearFiltersButton
