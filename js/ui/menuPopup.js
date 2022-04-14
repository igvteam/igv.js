/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import MenuUtils from "./menuUtils.js"
import {DOMUtils, makeDraggable, UIUtils} from "../../node_modules/igv-utils/src/index.js"
import GenericColorPicker from './genericColorPicker.js'
import {createCheckbox} from "../igv-icons.js"

class MenuPopup {

    constructor(parent) {

        this.popup = DOMUtils.div({class: 'igv-menu-popup'})
        parent.appendChild(this.popup)

        this.popup.style.display = 'none'

    }

    presentMenuList(menuList) {

        hideAllMenuPopups()

        if (menuList.length > 0) {

            this.popup.innerHTML = ''

            menuList = MenuUtils.trackMenuItemListHelper(menuList, this)

            for (let item of menuList) {

                if (item.init) {
                    item.init()
                }

                this.popup.appendChild(item.object.get(0))

            }

            // NOTE: style.display most NOT be 'none' when calculating width.
            // a display = 'none' will always yield a width of zero (0).
            this.popup.style.display = 'flex'

            const {width} = this.popup.getBoundingClientRect()

            this.popup.style.left = `${-width}px`
            this.popup.style.top = `${0}px`

            document.addEventListener('click', event => {
                event.stopPropagation()
                hideAllMenuPopups()
            })

        }
    }

    presentTrackContextMenu(event, menuItems) {

        this.popup.innerHTML = ''

        const menuElements = createMenuElements(this.popup, menuItems)
        for (let { el } of menuElements) {
            this.popup.appendChild(el)
        }

        present(event, this.popup)

    }

    hide() {
        this.popup.style.display = 'none'
    }

    dispose() {

        this.popup.innerHTML = ''

        Object.keys(this).forEach(function (key) {
            this[key] = undefined
        })
    }

}

function hideAllMenuPopups() {

    document.removeEventListener('click', hideAllMenuPopups)

    const menus = document.querySelectorAll('.igv-menu-popup')
    for (let menu of menus) {
        menu.style.display = 'none'
    }

}

function createMenuElements(popup, menuItems) {

    return menuItems.map(menuItem => {

        let el

        if (typeof menuItem === 'string' && '<hr/>' === menuItem) {
            el = document.createElement('hr')
        } else if (typeof menuItem === 'string') {
            el = DOMUtils.div()
            el.innerHTML = menuItem
        } else if (typeof menuItem === 'Node') {
            el = menuItem
        } else {
            if (typeof menuItem.init === 'function') {
                menuItem.init()
            }

            if ("checkbox" === menuItem.type) {
                el = createCheckbox("Show all bases", menuItem.value)
            } else if ("color" === menuItem.type) {

                const colorPicker = new GenericColorPicker({parent: popup.parentElement, width: 364})
                colorPicker.configure(undefined, {color: color => menuItem.click(color)})

                el = DOMUtils.div()
                if (typeof menuItem.label === 'string') {
                    el.innerHTML = menuItem.label
                }
                const clickHandler = e => {
                    colorPicker.show()
                    DOMUtils.hide(popup)
                    e.preventDefault()
                    e.stopPropagation()
                }
                el.addEventListener('click', clickHandler)
                el.addEventListener('touchend', clickHandler)
                el.addEventListener('mouseup', function (e) {
                    e.preventDefault()
                    e.stopPropagation()
                })
            } else {
                el = DOMUtils.div()
                if (typeof menuItem.label === 'string') {
                    el.innerHTML = menuItem.label
                }
            }

            if (menuItem.click && "color" !== menuItem.type) {
                el.addEventListener('click', handleClick)
                el.addEventListener('touchend', handleClick)
                el.addEventListener('mouseup', function (e) {
                    e.preventDefault()
                    e.stopPropagation()
                })

                // eslint-disable-next-line no-inner-declarations
                function handleClick(e) {
                    menuItem.click()
                    DOMUtils.hide(popup)
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
        }

        return {el, init: menuItem.init}
    })

}

function present(event, popup) {

    // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
    //       yield a width of zero (0).
    popup.style.display = 'flex'

    const {x, y} = DOMUtils.translateMouseCoordinates(event, popup.parentNode)
    const {width} = popup.getBoundingClientRect()
    const xmax = x + width

    const {width: parentWidth} = popup.parentNode.getBoundingClientRect()

    popup.style.left = `${xmax > parentWidth ? (x - (xmax - parentWidth)) : x}px`
    popup.style.top = `${y}px`

}

export default MenuPopup

