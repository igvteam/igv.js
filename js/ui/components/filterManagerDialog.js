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
            max-width: 600px;
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
            content.style.cssText = 'display: flex; align-items: flex-start; gap: 8px;'

            // Create text container for the two-line layout
            const textContainer = document.createElement('div')
            textContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 2px;'

            // Create first line - filter condition
            const conditionLine = document.createElement('div')
            conditionLine.className = 'igv-clear-filters__description'
            conditionLine.textContent = this.generateFilterCondition(filter, track.type)

            // Create second line - genomic region
            const regionLine = document.createElement('div')
            regionLine.style.cssText = `
                font-size: 12px;
                color: #666;
                margin-left: 0;
            `
            regionLine.textContent = this.generateGenomicRegion(filter)

            textContainer.appendChild(conditionLine)
            textContainer.appendChild(regionLine)

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
                flex-shrink: 0;
                align-self: flex-start;
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

            content.appendChild(textContainer)
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

    generateFilterCondition(filter, trackType) {
        if (trackType === 'seg') {
            const op = filter.op === '>' ? 'Value greater than' : 'Value less than'
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

    generateGenomicRegion(filter) {
        if (filter.chr && filter.start !== undefined && filter.end !== undefined) {
            return `${filter.chr}:${filter.start.toLocaleString()}-${filter.end.toLocaleString()}`
        }
        return ''
    }

    generateFilterDescription(filter, trackType) {
        let description = ''

        // Add genomic region information if available
        if (filter.chr && filter.start !== undefined && filter.end !== undefined) {
            description += `${filter.chr}:${filter.start.toLocaleString()}-${filter.end.toLocaleString()} | `
        }

        // Add filter-specific description
        if (trackType === 'seg') {
            const op = filter.op === '>' ? 'Value greater than' : 'Value less than'
            description += `${op} ${filter.value}`
        } else if (trackType === 'mut' || trackType === 'maf') {
            if (filter.op === 'HAS') {
                const mutationTypes = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
                description += `Has mutation type: ${mutationTypes}`
            } else {
                const mutationTypes = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
                description += `No mutation type: ${mutationTypes}`
            }
        } else {
            description += 'Unknown filter type'
        }

        return description
    }
}

export default FilterManagerDialog
