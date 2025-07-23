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

class FilterManagerDialog {

    constructor(parent) {
        this.parent = parent
        this.currentTrack = null
    }

    /**
     * Present the filter management dialog for a specific track
     * @param {Object} track - The track instance to manage filters for
     * @param {Event} event - The event that triggered the dialog
     */
    present(track, event) {
        const filters = track.getFilters()
        if (!filters || filters.length === 0) {
            return
        }

        // Create modal container
        const modal = document.createElement('div')
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `

        // Create dialog container using existing SCSS classes
        const container = document.createElement('div')
        container.className = 'igv-clear-filters__container'
        container.style.maxWidth = '400px'
        container.style.maxHeight = '80vh'
        container.style.overflowY = 'auto'

        // Create header
        const header = document.createElement('div')
        header.style.cssText = `
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 12px;
            color: #333;
        `
        header.textContent = `Manage Filters - ${track.name || track.type} Track`

        container.appendChild(header)

        // Create filter list
        const filterList = document.createElement('div')
        filterList.className = 'igv-clear-filters__track-container'

        filters.forEach((filter, index) => {
            const filterRow = document.createElement('div')
            filterRow.className = 'igv-clear-filters__row'

            // Create content container
            const content = document.createElement('div')
            content.className = 'igv-clear-filters__content'

            // Create description
            const description = document.createElement('div')
            description.className = 'igv-clear-filters__description'
            description.textContent = this.generateFilterDescription(filter, track.type)

            // Create remove button
            const removeButton = document.createElement('button')
            removeButton.textContent = 'Remove'
            removeButton.style.cssText = `
                padding: 4px 8px;
                background-color: #5ea4e0;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-left: 8px;
            `
            removeButton.addEventListener('click', async (e) => {
                e.stopPropagation()
                await track.removeFilter(index)
                filterRow.remove()

                // If no more filters, close dialog
                if (filterList.children.length === 0) {
                    this.close()
                }
            })

            content.appendChild(description)
            content.appendChild(removeButton)

            filterRow.appendChild(content)
            filterList.appendChild(filterRow)
        })

        container.appendChild(filterList)

        // Create button container
        const buttonContainer = document.createElement('div')
        buttonContainer.className = 'igv-clear-filters__button-container'

        // Create close button
        const closeButton = document.createElement('button')
        closeButton.className = 'igv-clear-filters__button igv-clear-filters__button--cancel'
        closeButton.textContent = 'Close'
        closeButton.addEventListener('click', () => {
            this.close()
        })

        buttonContainer.appendChild(closeButton)
        container.appendChild(buttonContainer)

        // Add to modal and show
        modal.appendChild(container)
        document.body.appendChild(modal)

        // Store references for cleanup
        this.modal = modal
        this.container = container

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close()
            }
        })

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close()
            }
        }
        document.addEventListener('keydown', escapeHandler)
        this.escapeHandler = escapeHandler
    }

    close() {
        if (this.modal) {
            this.modal.remove()
            this.modal = null
            this.container = null
        }

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler)
            this.escapeHandler = null
        }
    }

    /**
     * Generate a human-readable description of a filter
     * @param {Object} filter - The filter object
     * @param {string} trackType - The track type ('seg', 'mut', etc.)
     * @returns {string} - Human-readable filter description
     */
    generateFilterDescription(filter, trackType) {
        if (trackType === 'seg') {
            const op = filter.op === '>' ? 'greater than' : 'less than'
            return `Copy number ${op} ${filter.value}`
        } else if (trackType === 'mut' || trackType === 'maf') {
            if (filter.op === 'HAS') {
                const mutationTypes = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
                return `Has mutation type: ${mutationTypes}`
            } else {
                const mutationTypes = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
                return `No mutation type: ${mutationTypes}`
            }
        }
        return 'Unknown filter type'
    }
}

export default FilterManagerDialog
