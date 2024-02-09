import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
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
            list.push(trackRemovalMenuItem())
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

        if ('merged' === trackView.track.type) {
            list.push('<hr/>')
            list.push(trackSeparationMenuItem())
            list.push(overlayTrackAlphaAdjustmentMenuItem())
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

                list.push('<hr/>')
                list.push(trackOverlayMenuItem())
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

function overlayTrackAlphaAdjustmentMenuItem() {

    const container = DOMUtils.div()
    container.innerText = 'Set transparency'

    function dialogPresentationHandler (e) {
        const callback = alpha => {
            this.alpha = Math.max(0.001, alpha)
            this.updateViews()
        }

        const config =
            {
                label: 'Transparency',
                value: this.alpha,
                min: 0.0,
                max: 1.0,
                scaleFactor: 1000,
                callback
            }

        this.browser.sliderDialog.present(config, e)
    }

    return { object: $(container), dialog:dialogPresentationHandler }
}

function trackSeparationMenuItem() {

    const object = $('<div>')
    object.text('Separate tracks')

    function click(e) {

        const configs = this.config.tracks.map(overlayConfig => {
            const config = { ...overlayConfig }
            config.isMergedTrack = undefined
            config.order = this.order
            return config
        })

        const _browser = this.browser

        _browser.removeTrack(this)
        _browser.loadTrackList(configs)
    }

    return { object, click }
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

function trackOverlayMenuItem() {

    const object = $('<div>')
    object.text('Overlay tracks')

    function click(e) {

        const trackViews = getMultiSelectedTrackViews(this.browser)

        if (trackViews) {

            const wigTracks = trackViews.filter(({ track }) => 'wig' === track.type).map(({ track }) => track)

            const wigConfigs = wigTracks.map(( track ) => {
                const config = Object.assign({}, track.config)
                config.color = track.color
                config.autoscale = track.autoscale
                config.autoscaleGroup = track.autoscaleGroup
                return config
            })

            for (const wigTrack of wigTracks) {
                this.browser.removeTrack(wigTrack)
            }

            const fudge = 0.75

            const config =
                {
                    name: 'Overlay',
                    type: 'merged',
                    autoscale: true,
                    alpha: fudge * (1.0/wigTracks.length),
                    height: Math.max(...wigTracks.map(({ height }) => height)),
                    order: Math.min(...wigTracks.map(({ order }) => order)),
                    tracks: wigConfigs
                }

            this.browser.loadTrack(config)

        }

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

// TODO: Implement dialog-presenting track removal for multi-select
function IN_PROGRESS_PRESENTS_DIALOG_trackRemovalMenuItem() {

    const object = $('<div>')
    object.text('Remove track')

    function dialogHandler() {

        if (isMultiSelectedTrackView(this.trackView)) {

            const browser = this.browser

            const alertCallback = () => {
                const trackViews = getMultiSelectedTrackViews(browser)
                for (const { track } of trackViews) {
                    browser.removeTrack(track)
                }
            }

            browser.alert.present('Delete Tracks?', alertCallback)

        } else {
            this.trackView.browser.removeTrack(this)
        }

    }

    return { object, dialog:dialogHandler }
}

function trackRemovalMenuItem() {

    const object = $('<div>')
    object.text('Remove track')

    function trackRemovalHandler(e) {
        this.trackView.browser._removeTrack(this)
    }

    return { object, click:trackRemovalHandler }

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

export { autoScaleGroupColorHash, canShowColorPicker, multiTrackSelectExclusionTypes, getMultiSelectedTrackViews, isMultiSelectedTrackView }

export default MenuUtils
