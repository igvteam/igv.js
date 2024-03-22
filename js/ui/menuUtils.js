import * as DOMUtils from "./utils/dom-utils.js"
import Panel from "./components/panel.js"
import Dialog from "./components/dialog.js"
import $ from "../vendor/jquery-3.3.1.slim.js"
import {colorPalettes} from "../util/colorPalletes.js"

const colorPickerTrackTypeSet = new Set([ 'bedtype', 'alignment', 'annotation', 'variant', 'wig', 'interact' ])

const vizWindowTypes = new Set(['alignment', 'annotation', 'variant', 'eqtl', 'snp', 'shoebox'])

const multiTrackSelectExclusionTypes = new Set(['sequence', 'ruler', 'ideogram'])

const autoScaleGroupColorHash =
    {

    };

class MenuUtils {
    constructor(browser) {
        this.browser = browser
        this.initialize()
    }

    initialize() {

        const panel = new Panel()
        panel.add('...')

        const config =
            {
                parent: this.browser.root,
                content: panel
            }

        this.dialog = new Dialog(config)
        this.browser.root.appendChild(this.dialog.elem)
        DOMUtils.hide(this.dialog.elem)
    }

    trackMenuItemList(trackView) {

        const list = []

        if (trackView.track.config.type !== 'sequence') {
            list.push(trackHeightMenuItem())
        }

        if (true === didMultiSelect(trackView)) {
            list.push(...this.multiSelectMenuItems(trackView))
        } else {
            if (trackView.track.config.type !== 'sequence') {
                list.push(trackRenameMenuItem())
            }
            list.push(...this.defaultMenuItems(trackView))
        }

        if (trackView.track.removable !== false) {
            list.push('<hr/>')
            list.push(trackRemovalMenuItem(trackView))
        }

        return list
    }

    defaultMenuItems(trackView) {

        const list = []

        if (canShowColorPicker(trackView.track)) {

            list.push('<hr/>')
            list.push(colorPickerMenuItem({trackView, label: "Set track color", option: "color"}))
            list.push(unsetColorMenuItem({trackView, label: "Unset track color"}))

            if(trackView.track.config.type === 'wig' || trackView.track.config.type === 'annotation') {
                list.push(colorPickerMenuItem({trackView, label: "Set alt color", option: "altColor"}))
                list.push(unsetAltColorMenuItem({trackView, label: "Unset alt color"}))
            }

        }

        if (trackView.track.menuItemList) {
            list.push(...trackView.track.menuItemList())
        }

        if (isVisibilityWindowType(trackView)) {
            list.push('<hr/>')
            list.push(visibilityWindowMenuItem())
        }

        return list
    }

    multiSelectMenuItems(trackView) {

        const list = []

        const selected = getMultiSelectedTrackViews(trackView.browser)
        const isSingleTrackType = didSelectSingleTrackType(selected.map(({ track }) => track.type))

        if (true === isSingleTrackType) {

            list.push(...this.defaultMenuItems(trackView))

            if ('wig' === trackView.track.type) {

                list.push('<hr/>')
                list.push(groupAutoScaleMenuItem())
            }

        } else {

            if (canShowColorPicker(trackView.track)) {

                list.push('<hr/>')
                list.push(colorPickerMenuItem({trackView, label: "Set track color", option: "color"}))
                list.push(unsetColorMenuItem({trackView, label: "Unset track color"}))

                if(trackView.track.config.type === 'wig' || trackView.track.config.type === 'annotation') {
                    list.push(colorPickerMenuItem({trackView, label: "Set alt color", option: "altColor"}))
                    list.push(unsetAltColorMenuItem({trackView, label: "Unset alt color"}))
                }

            }

        }

        return list

    }

}

function didMultiSelect(trackView) {
    const selected = getMultiSelectedTrackViews(trackView.browser)
    return selected && selected.length > 1 && new Set(selected).has(trackView)
}

function isVisibilityWindowType(trackView) {
    const track = trackView.track
    const hasVizWindow = track && track.config && track.config.visibilityWindow !== undefined
    return hasVizWindow || (track && vizWindowTypes.has(track.type))
}

function groupAutoScaleMenuItem() {

    const object = $('<div>')
    object.text('Group autoscale')

    function click(e) {

        const colorPalette = colorPalettes['Dark2']
        const randomIndex = Math.floor(Math.random() * colorPalette.length)

        const autoScaleGroupID = `auto-scale-group-${ DOMUtils.guid() }`
        autoScaleGroupColorHash[ autoScaleGroupID ] = colorPalette[randomIndex]

        for (const { track } of this.browser.multiSelectedTrackViews) {
            track.autoscaleGroup = autoScaleGroupID
        }

        this.browser.updateViews()
    }

    return { object, doAllMultiSelectedTracks:true, click }

}


function visibilityWindowMenuItem() {

    const object = $('<div>')
    object.text('Set visibility window')

    function click(e) {

        const callback = () => {

            let value = this.browser.inputDialog.value
            value = '' === value || undefined === value ? -1 : value.trim()

            this.visibilityWindow = Number.parseInt(value)
            this.config.visibilityWindow = Number.parseInt(value)

            this.trackView.updateViews()
        }

        const config =
            {
                label: 'Visibility Window',
                value: this.visibilityWindow,
                callback
            }
        this.browser.inputDialog.present(config, e)

    }

    return {object, click}

}

function trackRemovalMenuItem(trackView) {

    const str = isMultiSelectedTrackView(trackView) ? 'Remove tracks' : 'Remove track'

    const object = $('<div>')
    object.text(str)

    function trackRemovalHandler(e) {
        this.trackView.browser._removeTrack(this)
    }

    return { object, click:trackRemovalHandler, menuItemType: 'removeTrack' }

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

function unsetAltColorMenuItem({trackView, label}) {

    const $e = $('<div>')
    $e.text(label)

    return {
        object: $e,
        click: () => {
            trackView.track.altColor = undefined
            trackView.repaintViews()
        }
    }
}

function trackRenameMenuItem() {

    const object = $('<div>')
    object.text('Set track name')

    function click(e) {

        const callback = () => {
            let value = this.browser.inputDialog.value
            value = ('' === value || undefined === value) ? 'untitled' : value.trim()
            this.name = value
        }

        const config =
            {
                label: 'Track Name',
                value: (getTrackLabelText(this) || 'unnamed'),
                callback
            }

        this.browser.inputDialog.present(config, e)

    }

    return {object, click}


}

function trackHeightMenuItem() {

    const object = $('<div>')
    object.text('Set track height')

    function dialogHandler(e) {

        const callback = () => {

            const number = parseInt(this.browser.inputDialog.value, 10)

            if (undefined !== number) {

                const tracks = []
                if (isMultiSelectedTrackView(this.trackView)) {
                    tracks.push(...(getMultiSelectedTrackViews(this.trackView.browser).map(({ track }) => track)))
                } else {
                    tracks.push(this)
                }

                for (const track of tracks) {

                    // If explicitly setting the height adjust min or max, if necessary
                    if (track.minHeight !== undefined && track.minHeight > number) {
                        track.minHeight = number
                    }
                    if (track.maxHeight !== undefined && track.maxHeight < number) {
                        track.minHeight = number
                    }
                    track.trackView.setTrackHeight(number, true)

                    track.trackView.checkContentHeight()
                    track.trackView.repaintViews()

                    // Explicitly setting track height turns off autoHeight
                    track.trackView.autoHeight = false

                } // for (tracks)

            } // if (undefined !== number)

        } // callback

        const config =
            {
                label: 'Track Height',
                value: this.height,
                callback
            }

        this.browser.inputDialog.present(config, e)

    }

    return { object, dialog:dialogHandler }

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

function didSelectSingleTrackType(types) {
    const unique = [ ...new Set(types) ]
    return 1 === unique.length
}

function getMultiSelectedTrackViews(browser) {

    const candidates = browser.trackViews.filter(({ track }) => { return false === multiTrackSelectExclusionTypes.has(track.type) })

    let selected = candidates.filter(trackView => true === trackView.track.isMultiSelection)

    selected = 0 === selected.length ? undefined : selected

    return selected
}

function isMultiSelectedTrackView(trackView) {
    const selected = getMultiSelectedTrackViews(trackView.browser)
    return selected && selected.length > 1 && new Set(selected).has(trackView)
}

export { autoScaleGroupColorHash, canShowColorPicker, multiTrackSelectExclusionTypes, getMultiSelectedTrackViews, isMultiSelectedTrackView, didSelectSingleTrackType }

export default MenuUtils
