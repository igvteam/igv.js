import {DOMUtils} from '../../node_modules/igv-utils/src/index.js'
import $ from "../vendor/jquery-3.3.1.slim.js"
import {createCheckbox} from "../igv-icons.js"
import {getMultiSelectedTrackViews} from '../trackView.js'

/**
 * Configure item list for track "gear" menu.
 * @param trackView
 */

const colorPickerTrackTypeSet = new Set([ 'bedtype', 'alignment', 'annotation', 'variant', 'wig', 'interact' ])

const MenuUtils = {

    trackMenuItemList: function (trackView) {

        const vizWindowTypes = new Set(['alignment', 'annotation', 'variant', 'eqtl', 'snp'])

        const hasVizWindow = trackView.track.config && trackView.track.config.visibilityWindow !== undefined

        let menuItems = []

        if (trackView.track.config.type !== 'sequence') {
            menuItems.push(trackRenameMenuItem(trackView))
            menuItems.push(trackHeightMenuItem(trackView))
        }

        if (canShowColorPicker(trackView.track)) {``
            menuItems.push('<hr/>')
            menuItems.push(colorPickerMenuItem({trackView, label: "Set track color", option: "color"}))
            menuItems.push(unsetColorMenuItem({trackView, label: "Unset track color"}))

            if (trackView.track.altColor) {
                menuItems.push(colorPickerMenuItem({trackView, label: "Set alt color", option: "altColor"}))
            }

        }

        if (trackView.track.menuItemList) {
            menuItems = menuItems.concat(trackView.track.menuItemList())
        }

        if (hasVizWindow || vizWindowTypes.has(trackView.track.type)) {
            menuItems.push('<hr/>')
            menuItems.push(visibilityWindowMenuItem(trackView))
        }

        if (trackView.track.removable !== false) {
            menuItems.push('<hr/>')
            menuItems.push(trackRemovalMenuItem(trackView))
        }

        if ('wig' === trackView.track.type) {

            const selected = getMultiSelectedTrackViews(trackView.browser)

            if (selected && new Set(selected).has(trackView)) {
                menuItems.push('<hr/>')
                menuItems.push(trackMergeMenuItem(trackView))
            }

        }

        if ('wig' === trackView.track.type) {

            const selected = getMultiSelectedTrackViews(trackView.browser)

            if (selected && new Set(selected).has(trackView)) {
                menuItems.push('<hr/>')
                menuItems.push(groupAutoScaleMenuItem(trackView))
            }

        }

        return menuItems
    },

    numericDataMenuItems: function (trackView) {

        const menuItems = []

        menuItems.push('<hr/>')

        // Data range
        const object = $('<div>')
        object.text('Set data range')

        const click = () => {
            trackView.browser.dataRangeDialog.configure(trackView)
            trackView.browser.dataRangeDialog.present($(trackView.browser.columnContainer))
        }
        menuItems.push({object, click})

        if (trackView.track.logScale !== undefined) {
            menuItems.push({
                    object: $(createCheckbox("Log scale", trackView.track.logScale)),
                    click: () => {
                        trackView.track.logScale = !trackView.track.logScale
                        trackView.repaintViews()
                    }
                }
            )
        }

        menuItems.push({
                object: $(createCheckbox("Autoscale", trackView.track.autoscale)),
                click: () => {
                    trackView.track.autoscale = !trackView.track.autoscale
                    trackView.updateViews()
                }
            }
        )


        return menuItems
    },

    trackMenuItemListHelper: function (itemList, menuPopup) {

        var list = []

        if (itemList.length > 0) {

            list = itemList.map(function (item, i) {
                var $e

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

                if (item.click) {
                    $e.on('click', handleClick)
                    $e.on('touchend', function (e) {
                        handleClick(e)
                    })
                    $e.on('mouseup', function (e) {
                        e.preventDefault()
                        e.stopPropagation()
                    })

                    // eslint-disable-next-line no-inner-declarations
                    function handleClick(e) {
                        item.click(e)
                        menuPopup.hide()
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }

                return {object: $e, init: (item.init || undefined)}
            })
        }

        return list
    },

    createMenuItem(label, action) {
        const object = $('<div>')
        object.text(label)
        return {object, click: action}
    }
}

function groupAutoScaleMenuItem(trackView) {

    const object = $('<div>')
    object.text('AutoScale Group')

    const click = () => {

        const selectedTrackViews = getMultiSelectedTrackViews(trackView.browser)

        if (selectedTrackViews) {

            const scalableTrackViews = selectedTrackViews.filter(({ track }) => { return 'wig' === track.type })

            if (scalableTrackViews.length > 0) {

                const autoScaleGroupID = `auto-scale-group-${DOMUtils.guid()}`

                for (trackView of scalableTrackViews) {

                    if (undefined === trackView.track.autoscaleGroup) {
                        trackView.track.autoscaleGroup = autoScaleGroupID
                    }

                } // for (scalableTrackViews)

                trackView.browser.updateViews(true)

            } // if (scalableTrackViews.length > 0)


        } // if (selectedTrackViews)

    }

    return { object, click }

}

function trackMergeMenuItem(trackView) {

    const object = $('<div>')
    object.text('Merge tracks')

    const click = () => {

        const selected = getMultiSelectedTrackViews(trackView.browser)

        let tracks = []
        if (selected) {

            tracks = selected
                .filter(({ track }) => {
                    return 'wig' === track.type
                })
                .map(({ track }) => {
                    return track.config
                })

        }

        const config =
            {
                height: 128,
                name: 'Merge You Very Much',
                type: 'merged',
                tracks
            }

        trackView.browser.loadTrack(config)
    }

    return { object, click }

}

function visibilityWindowMenuItem(trackView) {

    const click = e => {

        const callback = () => {

            let value = trackView.browser.inputDialog.input.value
            value = '' === value || undefined === value ? -1 : value.trim()

            trackView.track.visibilityWindow = Number.parseInt(value)
            trackView.track.config.visibilityWindow = Number.parseInt(value)

            trackView.updateViews()
        }

        const config =
            {
                label: 'Visibility Window',
                value: (trackView.track.visibilityWindow),
                callback
            }
        trackView.browser.inputDialog.present(config, e)

    }

    const object = $('<div>')
    object.text('Set visibility window')
    return {object, click}

}

function trackRemovalMenuItem(trackView) {

    const object = $('<div>')
    object.text('Remove track')

    const click = () => {

        const selected = getMultiSelectedTrackViews(trackView.browser)
        if (selected && new Set(selected).has(trackView)) {

            for (let { browser, track } of selected) {
                browser.removeTrack(track)
            }
        } else {
            trackView.browser.removeTrack(trackView.track)
        }

    }

    return {object, click }

}

function colorPickerMenuItem({trackView, label, option}) {

    const object = $('<div>')
    object.text(label)

    return {
        object,
        click: () => trackView.presentColorPicker(option)
    }
}

function unsetColorMenuItem({trackView, label}) {

    const object = $('<div>')
    object.text(label)

    return {
        object,
        click: () => {
            trackView.track.color = undefined
            trackView.repaintViews()
        }
    }
}

function trackRenameMenuItem(trackView) {

    const click = e => {

        const callback = function () {
            let value = trackView.browser.inputDialog.input.value
            value = ('' === value || undefined === value) ? 'untitled' : value.trim()
            trackView.track.name = value
        }

        const config =
            {
                label: 'Track Name',
                value: (getTrackLabelText(trackView.track) || 'unnamed'),
                callback
            }

        trackView.browser.inputDialog.present(config, e)

    }

    const object = $('<div>')
    object.text('Set track name')
    return {object, click}


}

function trackHeightMenuItem(trackView) {

    const click = e => {

        const callback = () => {

            const number = Number(trackView.browser.inputDialog.input.value, 10)

            if (undefined !== number) {

                const selected = getMultiSelectedTrackViews(trackView.browser)

                const list = selected && new Set(selected).has(trackView) ? selected : [ trackView ]

                for (let tv of list) {

                    // If explicitly setting the height adjust min or max, if necessary
                    if (tv.track.minHeight !== undefined && tv.track.minHeight > number) {
                        tv.track.minHeight = number
                    }
                    if (tv.track.maxHeight !== undefined && tv.track.maxHeight < number) {
                        tv.track.minHeight = number
                    }
                    tv.setTrackHeight(number, true)

                    tv.checkContentHeight()
                    tv.repaintViews()

                    // Explicitly setting track height turns off autoHeight
                    tv.track.autoHeight = false

                } // for (list)

            } //if ()

        } // callback

        const config =
            {
                label: 'Track Height',
                value: trackView.track.height,
                callback
            }

        trackView.browser.inputDialog.present(config, e)

    } // click

    const object = $('<div>')
    object.text('Set track height')
    return {object, click}


}

function getTrackLabelText(track) {
    var vp,
        txt

    vp = track.trackView.viewports[0]
    txt = vp.$trackLabel.text()

    return txt
}

function canShowColorPicker(track) {
    return undefined === track.type || colorPickerTrackTypeSet.has(track.type)
}

export { canShowColorPicker }

export default MenuUtils
