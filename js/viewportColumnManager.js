import $ from './vendor/jquery-3.3.1.slim.js';
import {DOMUtils} from '../node_modules/igv-utils/src/index.js';
import {createColumn} from './util/igvUtils.js';

const viewportColumnManager =
    {
        createColumns: (columnContainer, count) => {

            for (let i = 0; i < count; i++) {
                if (0 === i) {
                    createColumn(columnContainer, 'igv-column')
                } else {
                    columnContainer.appendChild(DOMUtils.div({ class: 'igv-column-shim' }))
                    createColumn(columnContainer, 'igv-column')
                }
            }

            return document.querySelectorAll('.igv-column')
        },

        discardAllColumns: columnContainer => {
            columnContainer.querySelectorAll('.igv-column-shim').forEach(columnShim => columnShim.remove())
            columnContainer.querySelectorAll('.igv-column').forEach(column => column.remove())

        },

        removeColumnAtIndex: (i, column) => {
            const shim = 0 === i ? column.nextElementSibling : column.previousElementSibling
            column.remove()
            shim.remove()
        },

        insertAfter: $previous => {

            const columnShim = DOMUtils.div({ class: 'igv-column-shim' })
            $(columnShim).insertAfter($previous)

            const column = DOMUtils.div({ class: 'igv-column' })
            $(column).insertAfter($(columnShim))

            return column
        },

        insertBefore: ($guard, count) => {

            for (let i = 0; i < count; i++) {

                const column = DOMUtils.div({ class: 'igv-column' })
                $(column).insertBefore($guard)

                if (count > 1 && i > 0) {
                    const columnShim = DOMUtils.div({ class: 'igv-column-shim' })
                    $(columnShim).insertBefore($(column))
                }

            }

        },
    };

export { viewportColumnManager }
