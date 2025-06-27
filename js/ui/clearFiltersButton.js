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

        super(parent, browser, 'Filters', buttonLabel, clearFiltersImage, clearFiltersImageHover, false)

        this.button.addEventListener('mouseenter', () => {
            this.setState(true)
        })

        this.button.addEventListener('mouseleave', () => {
            this.setState(false)
        })


        this.tableRowContent = new Map()

        // Add list to track checked checkboxes
        this.checkedCheckboxes = []

        const mouseClickHandler = () => {
            this.presentTable(this.tableRowContent)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)
        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(false)
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
        this.browser.root.appendChild(panel)
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

            // Add event handler to checkbox
            checkbox.addEventListener('change', (event) => {
                // console.log('Checkbox changed:', {
                //     checked: event.target.checked,
                //     value: event.target.dataset.value,
                //     element: event.target
                // })

                // Track checked checkboxes
                if (event.target.checked) {
                    this.checkedCheckboxes.push(event.target)
                } else {
                    const index = this.checkedCheckboxes.indexOf(event.target)
                    if (index > -1) {
                        this.checkedCheckboxes.splice(index, 1)
                    }
                }
            })

            const content = document.createElement('div')
            row.appendChild(content)
            content.className = 'igv-clear-filters__content'
            content.textContent = value

        }

        // Add button container
        const buttonContainer = document.createElement('div')
        panel.appendChild(buttonContainer)
        buttonContainer.className = 'igv-clear-filters__button-container'

        // Add apply button
        const applyButton = document.createElement('button')
        buttonContainer.appendChild(applyButton)
        applyButton.className = 'igv-clear-filters__button'
        applyButton.textContent = 'Remove filters'
        applyButton.addEventListener('click', async () => {

            const trackTypes = Array.from(this.checkedCheckboxes).map(({ dataset }) => dataset.value)
            for (const type of trackTypes) {
                const track = this.browser.findTracks("type", type)
                if (track.length > 0) {
                    await Promise.all(track.map(track => track.setSampleFilter(undefined)))
                }
            }

            // Remove checked checkboxes and their corresponding tableRowContent entries
            for (const checkbox of this.checkedCheckboxes) {
                const parent = checkbox.parentElement
                parent.remove()
                this.tableRowContent.delete(checkbox.dataset.value)
            }

            // Clear the checked checkboxes array
            this.checkedCheckboxes = []

            panel.remove()

            if (this.tableRowContent.size === 0) {
                this.setVisibility(false)
            }
        })

        // Add cancel button
        const cancelButton = document.createElement('button')
        buttonContainer.appendChild(cancelButton)
        cancelButton.className = 'igv-clear-filters__button igv-clear-filters__button--cancel'
        cancelButton.textContent = 'Cancel'
        cancelButton.addEventListener('click', () => {
            panel.remove()
        })

    }

}

export default ClearFiltersButton
