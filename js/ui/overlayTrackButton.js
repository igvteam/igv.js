import NavbarButton from "./navbarButton.js"
import { overlayTrackImage, overlayTrackImageHover } from "./navbarIcons/overlayTrack.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"
import {didSelectSingleTrackType, getMultiSelectedTrackViews} from "./menuUtils.js"
import MergedTrack from "../feature/mergedTrack.js"


class OverlayTrackButton extends NavbarButton {
    constructor(browser, parent) {

        super(browser, parent, 'Overlay Tracks', buttonLabel, overlayTrackImage, overlayTrackImageHover, false)

        this.button.addEventListener('mouseenter', () => this.setState(true))
        this.button.addEventListener('mouseleave', () => this.setState(false))

        const mouseClickHandler = () => {
            this.setVisibility(false)
            trackOverlayClickHandler.call(this)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

function trackOverlayClickHandler(e) {

    if (true === isOverlayTrackCriteriaMet(this.browser)) {

        const tracks = getMultiSelectedTrackViews(this.browser).map(({ track }) => track)
        for (const track of tracks) {
            track.isMultiSelection = false
        }

        // Flatten any merged tracks.  Must do this before there removal
        const flattenedTracks = []
        for(let t of tracks) {
            if("merged" === t.type) {
                flattenedTracks.push(...t.tracks)
            } else {
                flattenedTracks.push(t)
            }
        }

        const config =
            {
                name: 'Overlay',
                type: 'merged',
                alpha: 0.5, //fudge * (1.0/tracks.length),
                height: Math.max(...tracks.map(({ height }) => height)),
                order: Math.min(...tracks.map(({ order }) => order)),
                _tracks: flattenedTracks
            }

        const mergedTrack = new MergedTrack(config, this.browser)

        for (const track of tracks) {
            this.browser.removeTrack(track)
        }

        this.browser.addTrack(config, mergedTrack)

    }

}

function isOverlayTrackCriteriaMet(browser) {

    const selected = getMultiSelectedTrackViews(browser)

    if (selected && selected.length > 1) {

        const criteriaSet = new Set([ 'wig', 'merged' ])

        const list = selected.filter(({ track }) => criteriaSet.has(track.type))

        return list.length > 1

    } else {
        return false
    }

}

export { isOverlayTrackCriteriaMet }
export default OverlayTrackButton
