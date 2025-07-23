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

import makeDraggable from "../utils/draggable.js"
import {attachDialogCloseHandlerWithParent} from "../utils/ui-utils.js"

class FilterManagerDialog {

    constructor(parent) {
        this.parent = parent
    }

    present(track, event) {

        const filters = track.getFilters()
        if (!filters || filters.length === 0) {
            return
        }

        // Create dialog container using existing SCSS classes
        const container = document.createElement('div')
        container.className = 'igv-clear-filters__container'
        container.style.cssText = `
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 5px;
            z-index: 10001;
            padding: 0;
        `

        // Create header with title and X button using proper SCSS classes
        const header = document.createElement('div')
        header.className = 'igv-roi-seg-filter-dialog__header'

        // Create title in header (left-justified)
        const title = document.createElement('div')
        title.style.cssText = `
            font-weight: 400;
            font-size: 16px;
            color: #333;
            margin-left: 12px;
            flex: 1;
        `
        title.textContent = 'Filters'
        header.appendChild(title)

        // Add X button using the same utility as other dialogs
        attachDialogCloseHandlerWithParent(header, () => {
            this.close()
        })

        container.appendChild(header)

        // Create content wrapper with proper padding
        const contentWrapper = document.createElement('div')
        contentWrapper.style.cssText = `padding: 12px;`

        // Create filter list
        const filterList = document.createElement('div')
        filterList.className = 'igv-clear-filters__track-container'

        for (const filter of filters) {
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
                
                // Find the current index of this filter in the track's filter list
                const currentFilters = track.getFilters()
                const currentIndex = currentFilters.findIndex(f => f.op === filter.op && f.value === filter.value)
                
                if (currentIndex !== -1) {
                    await track.removeFilter(currentIndex)
                    filterRow.remove()

                    // If no more filters, close dialog
                    if (filterList.children.length === 0) {
                        this.close()
                    }
                }
            })

            content.appendChild(description)
            content.appendChild(removeButton)

            filterRow.appendChild(content)
            filterList.appendChild(filterRow)
        }

        contentWrapper.appendChild(filterList)

        // Add content wrapper to container
        container.appendChild(contentWrapper)

        // Add to parent and show
        this.parent.appendChild(container)

        makeDraggable(container, header)

        // Store references for cleanup
        this.container = container

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
        if (this.container) {
            this.container.remove()
            this.container = null
        }

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler)
            this.escapeHandler = null
        }
    }

    generateFilterDescription(filter, trackType) {
        if (trackType === 'seg') {
            const op = filter.op === '>' ? 'Greater than' : 'Less than'
            return `${op} ${filter.value}`
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
