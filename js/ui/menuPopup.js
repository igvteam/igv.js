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

import $ from "../vendor/jquery-3.3.1.slim.js";
import MenuUtils from "./menuUtils.js"
import {DOMUtils, UIUtils, makeDraggable} from "../../node_modules/igv-utils/src/index.js";
import { ColorPicker } from '../../node_modules/igv-ui/dist/igv-ui.js'

const trackMenuItemListHelper = MenuUtils.trackMenuItemListHelper

const MenuPopup = function ($parent) {

    // popover container
    this.$popover = $('<div>', {class: 'igv-menu-popup'});
    $parent.append(this.$popover);

    // popover header
    let $popoverHeader = $('<div>', {class: 'igv-menu-popup-header'});
    this.$popover.append($popoverHeader);

    UIUtils.attachDialogCloseHandlerWithParent($popoverHeader.get(0), () => this.$popover.hide());

    this.$popoverContent = $('<div>');
    this.$popover.append(this.$popoverContent);

    makeDraggable(this.$popover.get(0), $popoverHeader.get(0));

    $popoverHeader.on('click.menu-popup-dismiss', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // absorb click to prevent it leaking through to parent DOM element
    });

};

MenuPopup.prototype.presentMenuList = function (dx, dy, list) {

    hideAllMenuPopups()

    if (list.length > 0) {

        this.$popoverContent.empty();

        list = trackMenuItemListHelper(list, this.$popover);

        for (let item of list) {

            if (item.init) {
                item.init();
            }

            let $e = item.object;
            if (0 === list.indexOf(item)) {
                $e.removeClass('igv-track-menu-border-top');
            }

            if ($e.hasClass('igv-track-menu-border-top') || $e.hasClass('igv-menu-popup-check-container')) {
                // do nothing
            } else if ($e.is('div')) {
                $e.addClass('igv-menu-popup-shim');
            }

            this.$popoverContent.append($e);

        }

        this.$popover.css({left: (dx + 'px'), top: (dy + 'px')});
        this.$popover.show();

    }
};

MenuPopup.prototype.presentTrackContextMenu = function(e, menuItems) {

    this.$popoverContent.empty()

    const menuElements = createMenuElements(menuItems, this.$popover.get(0))
    for (let item of menuElements) {
        this.$popoverContent.get(0).appendChild(item.object)
    }

    present(e, this.$popover.get(0))

    this.$popover.show()

}

MenuPopup.prototype.dispose = function () {
    this.$popover.empty();
    this.$popoverContent.empty();
    Object.keys(this).forEach(function (key) {
        this[key] = undefined;
    })
};

function createMenuElements(itemList, popover) {

    return itemList.map( item => {

        let elem;

        if (typeof item === 'string' && '<hr/>' === item) {
            elem = document.createElement('hr')
        } else  if (typeof item === 'string') {
            elem = DOMUtils.div({ class:'context-menu'})
            elem.innerHTML = item
        } else if (typeof item === 'Node') {
            elem = item;
        } else {
            if (typeof item.init === 'function') {
                item.init();
            }

            if ("checkbox" === item.type) {
                elem = Icon.createCheckbox("Show all bases", item.value);
            } else if("color" === item.type) {
                const colorPicker = new ColorPicker({
                    parent: popover.parentElement,
                    width: 364,
                    //defaultColor: 'aqua',
                    colorHandler: (color) => item.click(color)
                })
                elem = DOMUtils.div({ class:'context-menu'})
                if (typeof item.label === 'string') {
                    elem.innerHTML = item.label;
                }
                const clickHandler =  e => {
                    colorPicker.show();
                    DOMUtils.hide(popover);
                    e.preventDefault();
                    e.stopPropagation()
                }
                elem.addEventListener('click', clickHandler);
                elem.addEventListener('touchend', clickHandler);
                elem.addEventListener('mouseup', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                })
            } else {
                elem = DOMUtils.div({ class:'context-menu'})
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

}

function present(e, popover) {

    const { x, y } = DOMUtils.translateMouseCoordinates(e, popover.parentNode)

    // parent bbox
    const { width } = popover.parentNode.getBoundingClientRect()
    const { width: w } = popover.getBoundingClientRect()

    const xmax = x + w

    popover.style.left = `${ xmax > width ? (x - (xmax - width)) : x }px`
    popover.style.top  = `${ y }px`

}

const hideAllMenuPopups = () => $('.igv-menu-popup').hide()

export default MenuPopup;

