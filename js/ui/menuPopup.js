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
import {DOMUtils, UIUtils, makeDraggable} from "../../node_modules/igv-utils/src/index.js";
import GenericColorPicker from './genericColorPicker.js';
import { createCheckbox } from "../igv-icons.js";

const MenuPopup = function (parent) {

    this.popover = DOMUtils.div({ class: 'igv-menu-popup' })
    parent.appendChild(this.popover)

    const header = DOMUtils.div({ class: 'igv-menu-popup-header' })
    this.popover.appendChild(header)

    UIUtils.attachDialogCloseHandlerWithParent(header, () => this.hide())

    this.popoverContent = DOMUtils.div()
    this.popover.appendChild(this.popoverContent)

    makeDraggable(this.popover, header)

    header.addEventListener('click', e => {
        e.stopPropagation()
        e.preventDefault()
        // absorb click to prevent it leaking through to parent DOM element
    })

    this.hide()

}

MenuPopup.prototype.hide = function () {
    this.popover.style.display = 'none'
}

MenuPopup.prototype.presentMenuList = function (menuList) {

    hideAllMenuPopups()

    if (menuList.length > 0) {

        this.popoverContent.innerHTML = ''

        menuList = MenuUtils.trackMenuItemListHelper(menuList, this)

        for (let item of menuList) {

            if (item.init) {
                item.init();
            }

            let $e = item.object;
            if (0 === menuList.indexOf(item)) {
                $e.removeClass('igv-track-menu-border-top');
            }

            if ($e.hasClass('igv-track-menu-border-top') || $e.hasClass('igv-menu-popup-check-container')) {
                // do nothing
            } else if ($e.is('div')) {
                $e.addClass('igv-menu-popup-shim');
            }

            this.popoverContent.appendChild($e.get(0))

        }

        // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
        //       yield a width of zero (0).
        this.popover.style.display = 'flex'

        const { width } = this.popover.getBoundingClientRect()

        this.popover.style.left = `${ -width }px`
        this.popover.style.top = `${ 0 }px`

    }
};

MenuPopup.prototype.presentTrackContextMenu = function(e, menuItems) {

    this.popoverContent.innerHTML = ''

    const menuElements = createMenuElements(menuItems, this.popover)
    for (let { el } of menuElements) {
        this.popoverContent.appendChild(el)
    }

    present(e, this.popover)

}

MenuPopup.prototype.dispose = function () {

    this.popoverContent.innerHTML = ''
    this.popover.innerHTML = ''

    Object.keys(this).forEach(function (key) {
        this[key] = undefined;
    })
};

function createMenuElements(itemList, popover) {

    return itemList.map( item => {

        let el;

        if (typeof item === 'string' && '<hr/>' === item) {
            el = document.createElement('hr')
        } else  if (typeof item === 'string') {
            el = DOMUtils.div({ class:'context-menu'})
            el.innerHTML = item
        } else if (typeof item === 'Node') {
            el = item;
        } else {
            if (typeof item.init === 'function') {
                item.init();
            }

            if ("checkbox" === item.type) {
                el = createCheckbox("Show all bases", item.value);
            } else if("color" === item.type) {

                const colorPicker = new GenericColorPicker({ parent: popover.parentElement, width: 364 })
                colorPicker.configure(undefined, { color: color => item.click(color) })

                el = DOMUtils.div({ class:'context-menu'})
                if (typeof item.label === 'string') {
                    el.innerHTML = item.label;
                }
                const clickHandler =  e => {
                    colorPicker.show();
                    DOMUtils.hide(popover);
                    e.preventDefault();
                    e.stopPropagation()
                }
                el.addEventListener('click', clickHandler);
                el.addEventListener('touchend', clickHandler);
                el.addEventListener('mouseup', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                })
            } else {
                el = DOMUtils.div({ class:'context-menu'})
                if (typeof item.label === 'string') {
                    el.innerHTML = item.label;
                }
            }

            if (item.click && "color" !== item.type) {
                el.addEventListener('click', handleClick);
                el.addEventListener('touchend', handleClick);
                el.addEventListener('mouseup', function (e) {
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

        return { el, init: item.init };
    })

}

function present(e, popover) {

    // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
    //       yield a width of zero (0).
    popover.style.display = 'flex'

    const { x, y } = DOMUtils.translateMouseCoordinates(e, popover.parentNode)
    const { width } = popover.getBoundingClientRect()
    const xmax = x + width

    const { width:parentWidth } = popover.parentNode.getBoundingClientRect()

    popover.style.left = `${ xmax > parentWidth ? (x - (xmax - parentWidth)) : x }px`
    popover.style.top  = `${ y }px`

}

const hideAllMenuPopups = () => {

    const menus = document.querySelectorAll('.igv-menu-popup')
    for (let i = 0; i < menus.length; i++) {
        menus[ i ].style.display = 'none'
    }

}

export default MenuPopup;

