import makeDraggable from "./utils/draggable.js"
import {attachDialogCloseHandlerWithParent} from "./utils/ui-utils.js"
import * as DOMUtils from "./utils/dom-utils.js"
import GenericColorPicker from "./components/genericColorPicker.js"
import {createCheckbox} from "../igv-icons.js"
import $ from "../vendor/jquery-3.3.1.slim.js"

class MenuPopup {
    constructor(parent) {
        this.popover = DOMUtils.div({class: 'igv-menu-popup'})

        parent.appendChild(this.popover)
        this.parent = parent

        const header = DOMUtils.div({class: 'igv-menu-popup-header'})
        this.popover.appendChild(header)

        attachDialogCloseHandlerWithParent(header, () => this.popover.style.display = 'none')

        this.popoverContent = DOMUtils.div()
        this.popover.appendChild(this.popoverContent)

        makeDraggable(this.popover, header)

        // absorb click to prevent it leaking through to parent DOM element
        header.addEventListener('click', e => {
            e.stopPropagation()
            e.preventDefault()
        })

        this.popover.style.display = 'none'

    }

    presentMenuList(trackView, menuList) {

        hideAllMenuPopups(this.parent)

        if (menuList.length > 0) {

            this.popoverContent.innerHTML = ''

            const parsedList = this.parseMenuList(trackView, menuList)

            for (let item of parsedList) {

                if (item.init) {
                    item.init()
                }

                let $e = item.object
                if (0 === parsedList.indexOf(item)) {
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
            this.popover.style.display = 'flex'

            const {width} = this.popover.getBoundingClientRect()

            this.popover.style.left = `${-width}px`
            this.popover.style.top = `${0}px`

        }
    }

    parseMenuList(trackView, menuList) {

        return menuList.map((item, i) => {

            let $e

            // name and object fields checked for backward compatibility
            if (item.name) {
                $e = $('<div>')
                $e.text(item.name)
            } else if (item.object) {
                $e = item.object
            } else if (typeof item.label === 'string') {
                $e = $('<div>')
                $e.html(item.label)
            } else if (typeof item === 'string') {

                if (item.startsWith("<")) {
                    $e = $(item)
                } else {
                    $e = $("<div>" + item + "</div>")
                }
            }

            if (0 === i) {
                $e.addClass('igv-track-menu-border-top')
            }

            if (item.click || item.dialog) {

                const handleClick = e => {
                    e.preventDefault()
                    e.stopPropagation()

                    if (item.click) {

                        if (trackView.track.selected) {

                            const multiSelectedTrackViews = trackView.browser.getSelectedTrackViews()

                            if (true === item.doAllMultiSelectedTracks) {
                                item.click.call(trackView.track, e)
                            } else {

                                if ('removeTrack' === item.menuItemType) {

                                    const callback = () => {

                                        trackView.browser.overlayTrackButton.setVisibility(false)

                                        for (const { track } of multiSelectedTrackViews) {
                                            item.click.call(track, e)
                                        }
                                    }

                                    const count = multiSelectedTrackViews.length

                                    const config =
                                        {
                                            html: `Are you sure you want to delete ${ count } tracks?`,
                                            callback
                                        }

                                    trackView.browser.menuUtils.dialog.present(config, e)

                                } else {

                                    for (const { track } of multiSelectedTrackViews) {
                                        item.click.call(track, e)
                                    }

                                }
                            }

                        } else {
                            item.click.call(trackView.track, e)
                        }

                    } else if (item.dialog) {
                        item.dialog.call(trackView.track, e)
                    }

                    this.popover.style.display = 'none'
                }

                $e.on('click', handleClick)

                $e.on('touchend', e => handleClick(e))

                $e.on('mouseup', function (e) {
                    e.preventDefault()
                    e.stopPropagation()
                })

            }

            return {object: $e, init: (item.init || undefined)}
        })

    }

    presentTrackContextMenu(e, menuItems) {

        this.popoverContent.innerHTML = ''

        const menuElements = createMenuElements(menuItems, this.popover)
        for (let {el} of menuElements) {
            this.popoverContent.appendChild(el)
        }

        present(e, this.popover)

    }

    hide() {
        this.popover.style.display = 'none'
    }

    dispose() {

        this.popoverContent.innerHTML = ''
        this.popover.innerHTML = ''

        Object.keys(this).forEach(function (key) {
            this[key] = undefined
        })
    }
}

function createMenuElements(itemList, popover) {

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
            }

            // TODO: I can't find any use of this and should probably be deleted - data
            // else if ("color" === item.type) {
            //
            //     const colorPicker = new GenericColorPicker(popover.parentElement)
            //     colorPicker.configure({color: 'grey'})
            //
            //     el = DOMUtils.div({class: 'context-menu'})
            //     if (typeof item.label === 'string') {
            //         el.innerHTML = item.label
            //     }
            //     const clickHandler = e => {
            //         colorPicker.show()
            //         DOMUtils.hide(popover)
            //         e.preventDefault()
            //         e.stopPropagation()
            //     }
            //     el.addEventListener('click', clickHandler)
            //     el.addEventListener('touchend', clickHandler)
            //     el.addEventListener('mouseup', function (e) {
            //         e.preventDefault()
            //         e.stopPropagation()
            //     })
            // }

            else {
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
                    DOMUtils.hide(popover)
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
        }

        return {el, init: item.init}
    })

}

function present(e, popover) {

    // NOTE: style.display most NOT be 'none' when calculating width. a display = 'none' will always
    //       yield a width of zero (0).
    popover.style.display = 'flex'

    const {x, y} = DOMUtils.translateMouseCoordinates(e, popover.parentNode)
    const {width} = popover.getBoundingClientRect()
    const xmax = x + width

    const {width: parentWidth} = popover.parentNode.getBoundingClientRect()

    popover.style.left = `${xmax > parentWidth ? (x - (xmax - parentWidth)) : x}px`
    popover.style.top = `${y}px`

}

const hideAllMenuPopups = parent => {

    const menus = parent.querySelectorAll('.igv-menu-popup')
    for (const menu of menus) {
        menu.style.display = 'none'
    }

}

export default MenuPopup

