import {DOMUtils} from '../node_modules/igv-utils/src/index.js';
import {createColumn, insertElementAfter, insertElementBefore} from './util/igvUtils.js';

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

        insertAfter: referenceElement => {

            const shim = DOMUtils.div({ class: 'igv-column-shim' })
            insertElementAfter(shim, referenceElement)

            const column = DOMUtils.div({ class: 'igv-column' })
            column.setAttribute('data-name', 'viewport')
            insertElementAfter(column, shim)

            return column
        },

        insertBefore: (referenceElement, count) => {

            for (let i = 0; i < count; i++) {

                const column = DOMUtils.div({ class: 'igv-column' })
                column.setAttribute('data-name', 'viewport')
                insertElementBefore(column, referenceElement)

                if (count > 1 && i > 0) {
                    const columnShim = DOMUtils.div({ class: 'igv-column-shim' })
                    insertElementBefore(columnShim, column)
                }

            }

        },
    };

export { viewportColumnManager }
