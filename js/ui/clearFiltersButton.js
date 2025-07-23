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

        // Map of track types to their filter specifications
        // Each track type can have multiple filters
        this.trackFilters = new Map()

        // Add list to track checked checkboxes
        this.checkedCheckboxes = []

        const mouseClickHandler = () => {
            this.presentTable(this.trackFilters)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)
        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(false)
    }

    /**
     * Set the filter content for a track type. Filters are accumulated by track type.
     * @param {string} filterDescription - Description of the filter being added
     * @param {string} trackType - The track type (e.g., 'seg', 'mut', 'maf')
     */
    setTableRowContent(filterDescription, trackType) {
        if (!this.trackFilters.has(trackType)) {
            this.trackFilters.set(trackType, [])
        }

        // Add the new filter description to the list for this track type
        this.trackFilters.get(trackType).push(filterDescription)
    }

    presentTable(trackFilters) {

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

        for (const [trackType, filterDescriptions] of trackFilters) {
            // Create a container for this track type's filters
            const trackContainer = document.createElement('div')
            trackContainer.className = 'igv-clear-filters__track-container'
            panel.appendChild(trackContainer)

            // Add track type header
            const trackHeader = document.createElement('div')
            trackHeader.className = 'igv-clear-filters__track-header'
            trackContainer.appendChild(trackHeader)

            const trackCheckbox = document.createElement('input')
            trackHeader.appendChild(trackCheckbox)
            trackCheckbox.type = 'checkbox'
            trackCheckbox.className = 'igv-clear-filters__checkbox'
            trackCheckbox.dataset.trackType = trackType

            // Add event handler to track type checkbox
            trackCheckbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked
                const filterCheckboxes = trackContainer.querySelectorAll('.igv-clear-filters__filter-checkbox')

                // Check/uncheck all filter checkboxes for this track type
                filterCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked
                    if (isChecked) {
                        if (!this.checkedCheckboxes.includes(checkbox)) {
                            this.checkedCheckboxes.push(checkbox)
                        }
                    } else {
                        const index = this.checkedCheckboxes.indexOf(checkbox)
                        if (index > -1) {
                            this.checkedCheckboxes.splice(index, 1)
                        }
                    }
                })
            })

            const trackName = document.createElement('span')
            trackHeader.appendChild(trackName)
            trackName.className = 'igv-clear-filters__track-name'
            trackName.textContent = this.getTrackTypeDisplayName(trackType)

            // Add individual filter rows
            filterDescriptions.forEach((description, index) => {
                const row = document.createElement('div')
                row.className = 'igv-clear-filters__row'
                trackContainer.appendChild(row)

                const checkbox = document.createElement('input')
                row.appendChild(checkbox)
                checkbox.type = 'checkbox'
                checkbox.className = 'igv-clear-filters__filter-checkbox'
                checkbox.dataset.trackType = trackType
                checkbox.dataset.filterIndex = index

                // Add event handler to filter checkbox
                checkbox.addEventListener('change', (event) => {
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
                content.innerHTML = description
            })
        }

        // Add button container
        const buttonContainer = document.createElement('div')
        panel.appendChild(buttonContainer)
        buttonContainer.className = 'igv-clear-filters__button-container'

        // Add apply button
        const applyButton = document.createElement('button')
        buttonContainer.appendChild(applyButton)
        applyButton.className = 'igv-clear-filters__button'
        applyButton.textContent = 'Remove selected filters'
        applyButton.addEventListener('click', async () => {
            // Group checked checkboxes by track type
            const trackTypeFilterMap = new Map()

            for (const checkbox of this.checkedCheckboxes) {
                const trackType = checkbox.dataset.trackType
                if (!trackTypeFilterMap.has(trackType)) {
                    trackTypeFilterMap.set(trackType, [])
                }
                trackTypeFilterMap.get(trackType).push(parseInt(checkbox.dataset.filterIndex))
            }

            // Remove filters from individual tracks
            for (const [trackType, filterDescriptions] of trackFilters) {
                const filterIndicesToRemove = trackTypeFilterMap.get(trackType)

                if (filterIndicesToRemove && filterIndicesToRemove.length > 0) {
                    // Get all tracks of this type and remove filters from each
                    const tracks = this.browser.findTracks("type", trackType)
                    const sortedIndices = filterIndicesToRemove.sort((a, b) => b - a)

                    for (const track of tracks) {
                    for (const index of sortedIndices) {
                            await track.removeFilter(index)
                        }
                    }

                    // Remove the corresponding filter descriptions from our map
                    const currentDescriptions = this.trackFilters.get(trackType) || []
                    const updatedDescriptions = currentDescriptions.filter((_, index) => !filterIndicesToRemove.includes(index))

                    if (updatedDescriptions.length > 0) {
                        this.trackFilters.set(trackType, updatedDescriptions)
                    } else {
                        this.trackFilters.delete(trackType)
                    }
                }
            }

            // Clear the checked checkboxes array
            this.checkedCheckboxes = []

            panel.remove()

            if (this.trackFilters.size === 0) {
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

    /**
     * Get a display name for a track type
     * @param {string} trackType - The track type
     * @returns {string} - Display name for the track type
     */
    getTrackTypeDisplayName(trackType) {
        switch (trackType) {
            case 'seg':
                return 'Copy Number'
            case 'mut':
                return 'Mutation'
            case 'maf':
                return 'Mutation'
            default:
                return trackType.charAt(0).toUpperCase() + trackType.slice(1)
        }
    }

    /**
     * Generate a filter description from a filter configuration
     * @param {Object} filterConfig - The filter configuration object
     * @param {string} trackType - The track type
     * @returns {string} - Human-readable description of the filter
     */
    static generateFilterDescription(filterConfig, trackType) {
        const { type, op, value, chr, start, end } = filterConfig
        const region = `${chr}:${start}-${end}`

        switch (trackType) {
            case 'seg':
                if (type === 'VALUE') {
                    const comparison = op === '>' ? 'greater than' : 'less than'
                    return `Copy number: Value ${comparison} ${value} in region ${region}`
                }
                break
            case 'mut':
            case 'maf':
                if (type === 'MUTATION_TYPE') {
                    const mutationTypes = Array.isArray(value) ? value.join(', ') : value
                    const hasNot = op === 'HAS' ? 'have' : 'do not have'
                    return `Mutations: that ${hasNot} ${mutationTypes} in region ${region}`
                }
                break
            default:
                return `Filter: ${type} ${op} ${value} in region ${region}`
        }

        return `Filter: ${type} ${op} ${value} in region ${region}`
    }

}

export default ClearFiltersButton
