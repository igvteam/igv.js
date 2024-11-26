import * as Icon from './utils/icons.js'
import * as DOMUtils from "./utils/dom-utils.js"
import makeDraggable from "./utils/draggable.js"
import ColorPicker from "./components/colorPicker.js"
import {createIcon} from "./utils/icons.js"

class Popover {

    constructor(parent, isDraggable, title, closeHandler) {

        this.parent = parent;

        this.popover = DOMUtils.div({ class: "igv-ui-popover" })
        parent.appendChild(this.popover)

        this.popoverHeader = DOMUtils.div();
        this.popover.appendChild(this.popoverHeader);

        const titleElement = DOMUtils.div();
        this.popoverHeader.appendChild(titleElement);
        if (title) {
            titleElement.textContent = title;
        }

        // attach close handler
        const el = DOMUtils.div()
        this.popoverHeader.appendChild(el)
        el.appendChild(createIcon('times'))
        el.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            closeHandler ? closeHandler() : this.dismiss()
        })

        if (true === isDraggable) {
            makeDraggable(this.popover, this.popoverHeader, { minX:0, minY:0 })
        }

        this.popoverContent = DOMUtils.div();
        this.popover.appendChild(this.popoverContent);

        this.popover.style.display = 'none'


    }

    configure(menuItems) {

        if (0 === menuItems.length) {
            return
        }

        const menuElements = createMenuElements(menuItems, this.popover)

        for (const { object } of menuElements) {
            this.popoverContent.appendChild(object)
        }

    }

    present(event) {

        this.popover.style.display = 'block'

        const parent = this.popover.parentNode
        const { x, y, width } = DOMUtils.translateMouseCoordinates(event, parent)
        this.popover.style.top  = `${ y }px`

        const { width: w } = this.popover.getBoundingClientRect()

        const xmax = x + w
        const delta = xmax - width

        this.popover.style.left = `${ xmax > width ? (x - delta) : x }px`
        this.popoverContent.style.maxWidth = `${ Math.min(w, width) }px`
    }

    presentContentWithEvent(e, content) {

        this.popover.style.display = 'block'

        this.popoverContent.innerHTML = content

        present(e, this.popover, this.popoverContent)

    }

    presentMenu(e, menuItems) {

        if (0 === menuItems.length) {
            return
        }

        this.popover.style.display = 'block'

        const menuElements = createMenuElements(menuItems, this.popover)
        for (let item of menuElements) {
            this.popoverContent.appendChild(item.object)
        }

        present(e, this.popover, this.popoverContent)
    }

    dismiss() {
        this.popover.style.display = 'none'
    }

    hide() {
        this.popover.style.display = 'none'
        this.dispose()
    }

    dispose() {

        if (this.popover) {
            this.popover.parentNode.removeChild(this.popover);
        }

        const keys = Object.keys(this)
        for (let key of keys) {
            this[ key ] = undefined
        }
    }

}

function present(e, popover, popoverContent) {

    const { x, y, width } = DOMUtils.translateMouseCoordinates(e, popover.parentNode)
    popover.style.top  = `${ y }px`

    const { width: w } = popover.getBoundingClientRect()

    const xmax = x + w
    const delta = xmax - width

    popover.style.left = `${ xmax > width ? (x - delta) : x }px`
    popoverContent.style.maxWidth = `${ Math.min(w, width) }px`


}

function createMenuElements(itemList, popover) {

    const list  = itemList.map(function (item, i) {
        let elem;

        if (typeof item === 'string') {
            elem = DOMUtils.div();
            elem.innerHTML = item;
        } else if (typeof item === 'Node') {
            elem = item;
        } else {
            if (typeof item.init === 'function') {
                item.init();
            }

            if ("checkbox" === item.type) {
                elem = Icon.createCheckbox("Show all bases", item.value);
            }

            // TODO: I can't find any use of this and should probably be deleted - data
            // else if("color" === item.type) {
            //     const colorPicker = new ColorPicker({
            //         parent: popover.parentElement,
            //         width: 364,
            //         //defaultColor: 'aqua',
            //         colorHandler: (color) => item.click(color)
            //     })
            //     elem = DOMUtils.div();
            //     if (typeof item.label === 'string') {
            //         elem.innerHTML = item.label;
            //     }
            //     const clickHandler =  e => {
            //         colorPicker.show();
            //         DOMUtils.hide(popover);
            //         e.preventDefault();
            //         e.stopPropagation()
            //     }
            //     elem.addEventListener('click', clickHandler);
            //     elem.addEventListener('touchend', clickHandler);
            //     elem.addEventListener('mouseup', function (e) {
            //         e.preventDefault();
            //         e.stopPropagation();
            //     })
            // }

            else {
                elem = DOMUtils.div();
                if (typeof item.label === 'string') {
                    elem.innerHTML = item.label;
                }
            }

            if (item.click && "color" !== item.type) {
                elem.addEventListener('click', handleClick);
                elem.addEventListener('touchend', handleClick);
                elem.addEventListener('mouseup', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                })

                // eslint-disable-next-line no-inner-declarations
                function handleClick(e) {
                    item.click();
                    DOMUtils.hide(popover);
                    e.preventDefault();
                    e.stopPropagation()
                }
            }
        }


        return { object: elem, init: item.init };
    })

    return list;
}

export { createMenuElements }
export default Popover;

