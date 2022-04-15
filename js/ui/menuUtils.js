import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import $ from "../vendor/jquery-3.3.1.slim.js"
import {createCheckbox} from "../igv-icons.js"
import {getMultiSelectedTrackViews, isMultiSelectedTrackView} from '../trackView.js'
import wigTrack from "../feature/wigTrack.js"

/**
 * Configure item list for track "gear" menu.
 * @param trackView
 */

const colorPickerTrackTypeSet = new Set([ 'bedtype', 'alignment', 'annotation', 'variant', 'wig', 'interact' ])

const vizWindowTypes = new Set(['alignment', 'annotation', 'variant', 'eqtl', 'snp', 'shoebox'])

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

function isVisibilityWindowType(track) {
    const hasVizWindow = track.config && track.config.visibilityWindow !== undefined
    return hasVizWindow || vizWindowTypes.has(track.type)
}
function groupAutoScaleMenuItem() {

    const object = $('<div>')
    object.text('AutoScale Group')

    function click(e) {

        const trackViews = getMultiSelectedTrackViews(this.browser)

        const autoScaleGroupID = `auto-scale-group-${DOMUtils.guid()}`

        for (const trackView of trackViews) {

            if (undefined === trackView.track.autoscaleGroup) {
                trackView.track.autoscaleGroup = autoScaleGroupID
            }

        }

        this.browser.updateViews(true)

    }

    return { object, click }

}

function trackOverlayMenuItem() {

    const object = $('<div>')
    object.text('Overlay Tracks')

    function click(e) {

        const trackViews = getMultiSelectedTrackViews(this.browser)

        if (trackViews) {

            const wigTracks = trackViews.filter(({ track }) => 'wig' === track.type).map(({ track }) => track)
            const wigConfigs = wigTracks.map((track) => Object.assign(track.config, { color:wigTrack.color }))

            // for (const wigTrack of wigTracks) {
            //     wigTrack.config.color = wigTrack.color
            // }
            //
            // const trackConfigs = wigTracks.map(track => {
            //
            //     const config = Object.assign({}, track.config)
            //
            //     if (track.dataRange) {
            //         config.min = track.dataRange.min
            //         config.max = track.dataRange.max
            //     }
            //
            //     return config
            // })
            //
            // const reducedTrackConfigs = trackConfigs.map(({ type, format, url, color }) => {
            //     return { type, format, url, color }
            // })

            const config =
                {
                    name: 'Overlay - autoscaled',
                    type: 'merged',
                    autoscale: true,
                    height: 128,
                    order: Math.min(...wigTracks.map(({ order }) => order)),
                    tracks: wigConfigs
                }


            for (const wigTrack of wigTracks) {
                this.browser._removeTrack(wigTrack)
            }


            this.browser.loadTrack(config)

        }

    }

    return { object, doTrackOverlay:true, click }

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


export { canShowColorPicker }

export default MenuUtils
