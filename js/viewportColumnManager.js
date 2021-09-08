import $ from './vendor/jquery-3.3.1.slim.js';
import {DOMUtils} from '../node_modules/igv-utils/src/index.js';
import {createColumn, insertElementBefore, insertElementAfter} from './util/igvUtils.js';

const viewportColumnManager =
    {
        createColumns: (columnContainer, count) => {

            for (let i = 0; i < count; i++) {
                if (0 === i) {
                    createColumn(columnContainer, 'igv-column', 'viewport')
                } else {
                    columnContainer.appendChild(DOMUtils.div({ class: 'igv-column-shim' }))
                    createColumn(columnContainer, 'igv-column', 'viewport')
                }
            }

        },

        removeColumnAtIndex: (i, column) => {
            const shim = 0 === i ? column.nextElementSibling : column.previousElementSibling
            column.remove()
            shim.remove()
        },

        insertAfter: $previous => {

            const shim = DOMUtils.div({ class: 'igv-column-shim' })
            $(shim).insertAfter($previous)

            const column = DOMUtils.div({ class: 'igv-column' })
            column.setAttribute('data-name', 'viewport')
            $(column).insertAfter($(shim))

            return column
        },

        insertBefore: ($guard, count) => {

            for (let i = 0; i < count; i++) {

                const column = DOMUtils.div({ class: 'igv-column' })
                column.setAttribute('data-name', 'viewport')
                $(column).insertBefore($guard)

                if (count > 1 && i > 0) {
                    const columnShim = DOMUtils.div({ class: 'igv-column-shim' })
                    $(columnShim).insertBefore($(column))
                }

            }

        },
    };

export { viewportColumnManager }
