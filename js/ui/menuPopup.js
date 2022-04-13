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

const MenuPopup = function (parent) {

    this.popup = DOMUtils.div({class: 'igv-menu-popup'})
    parent.appendChild(this.popup)

    const header = DOMUtils.div({class: 'igv-menu-popup-header'})
    this.popup.appendChild(header)

    // UIUtils.attachDialogCloseHandlerWithParent(header, () => this.hide())

    this.popoverContent = DOMUtils.div()
    this.popup.appendChild(this.popoverContent)

    makeDraggable(this.popup, header)

    // absorb clicks to prevent them bubbling up to parent DOM element
    header.addEventListener('click', e => {
        e.stopPropagation()
        e.preventDefault()

    })

    this.hide()

}

MenuPopup.prototype.hide = function () {
    this.popup.style.display = 'none'
}

MenuPopup.prototype.presentMenuList = function (menuList) {

    hideAllMenuPopups()

    if (menuList.length > 0) {

        this.popoverContent.innerHTML = ''

        menuList = MenuUtils.trackMenuItemListHelper(menuList, this)

        for (let item of menuList) {

            if (item.init) {
                item.init()
            }

            let $e = item.object
            if (0 === menuList.indexOf(item)) {
                $e.removeClass('igv-track-menu-border-top')
            }

            if ($e.hasClass('igv-track-menu-border-top') || $e.hasClass('igv-menu-popup-check-container')) {
                // do nothing
            } else if ($e.is('div')) {
                $e.addClass('igv-menu-popup-shim')
            }

            this.popoverContent.appendChild($e.get(0))

        }

        // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
        //       yield a width of zero (0).
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

MenuPopup.prototype.presentTrackContextMenu = function (e, menuItems) {

    this.popoverContent.innerHTML = ''

    const menuElements = createMenuElements(menuItems, this.popup)
    for (let {el} of menuElements) {
        this.popoverContent.appendChild(el)
    }

    present(e, this.popup)

}

MenuPopup.prototype.dispose = function () {

    this.popoverContent.innerHTML = ''
    this.popup.innerHTML = ''

    Object.keys(this).forEach(function (key) {
        this[key] = undefined
    })
}

function createMenuElements(itemList, popup) {

    return itemList.map(item => {

        let el

        if (typeof item === 'string' && '<hr/>' === item) {
            el = document.createElement('hr')
        } else if (typeof item === 'string') {
            el = DOMUtils.div({class: 'context-menu'})
            el.innerHTML = item
        } else if (typeof item === 'Node') {
            el = item
        } else {
            if (typeof item.init === 'function') {
                item.init()
            }

            if ("checkbox" === item.type) {
                el = createCheckbox("Show all bases", item.value)
            } else if ("color" === item.type) {

                const colorPicker = new GenericColorPicker({parent: popup.parentElement, width: 364})
                colorPicker.configure(undefined, {color: color => item.click(color)})

                el = DOMUtils.div({class: 'context-menu'})
                if (typeof item.label === 'string') {
                    el.innerHTML = item.label
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
                el = DOMUtils.div({class: 'context-menu'})
                if (typeof item.label === 'string') {
                    el.innerHTML = item.label
                }
            }

            if (item.click && "color" !== item.type) {
                el.addEventListener('click', handleClick)
                el.addEventListener('touchend', handleClick)
                el.addEventListener('mouseup', function (e) {
                    e.preventDefault()
                    e.stopPropagation()
                })

                // eslint-disable-next-line no-inner-declarations
                function handleClick(e) {
                    item.click()
                    DOMUtils.hide(popup)
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
        }

        return {el, init: item.init}
    })

}

function present(e, popup) {

    // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
    //       yield a width of zero (0).
    popup.style.display = 'flex'

    const {x, y} = DOMUtils.translateMouseCoordinates(e, popup.parentNode)
    const {width} = popup.getBoundingClientRect()
    const xmax = x + width

    const {width: parentWidth} = popup.parentNode.getBoundingClientRect()

    popup.style.left = `${xmax > parentWidth ? (x - (xmax - parentWidth)) : x}px`
    popup.style.top = `${y}px`

}

const hideAllMenuPopups = () => {

    document.removeEventListener('click', hideAllMenuPopups)

    const menus = document.querySelectorAll('.igv-menu-popup')
    for (let menu of menus) {
        menu.style.display = 'none'
    }

}

export default MenuPopup

