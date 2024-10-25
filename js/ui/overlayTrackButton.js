import NavbarButton from "./navbarButton.js"
import {overlayTrackImage, overlayTrackImageHover} from "./navbarIcons/overlayTrack.js"
import {buttonLabel} from "./navbarIcons/buttonLabel.js"
import MergedTrack from "../feature/mergedTrack.js"


class OverlayTrackButton extends NavbarButton {
    constructor(parent, browser) {

        super(parent, browser, 'Overlay Tracks', buttonLabel, overlayTrackImage, overlayTrackImageHover, false)

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

        const tracks = this.browser.getSelectedTrackViews().map(({track}) => track)
        for (const track of tracks) {
            track.selected = false
        }

        // Flatten any merged tracks.  Must do this before their removal
        const flattenedTracks = []
        for (let t of tracks) {
            if ("merged" === t.type) {
                flattenedTracks.push(...t.tracks)
            } else {
                flattenedTracks.push(t)
            }
        }

        const config =
            {
                name: 'Overlay',
                type: 'merged',
                autoscale: false,
                alpha: 0.5, //fudge * (1.0/tracks.length),
                height: Math.max(...tracks.map(({height}) => height)),
                order: Math.min(...tracks.map(({order}) => order)),
            }

        const mergedTrack = new MergedTrack(config, this.browser, flattenedTracks)

        for (const track of tracks) {
            const idx = this.browser.trackViews.indexOf(track.trackView)
            this.browser.trackViews.splice(idx, 1)
            track.trackView.dispose()
        }

        this.browser.addTrack(config, mergedTrack)
        mergedTrack.trackView.updateViews()

    }

}

function isOverlayTrackCriteriaMet(browser) {

    const selected = browser.getSelectedTrackViews()

    if (selected && selected.length > 1) {

        const criteriaSet = new Set(['wig', 'merged'])

        const list = selected.filter(({track}) => criteriaSet.has(track.type))

        return list.length > 1

    } else {
        return false
    }

}

export {isOverlayTrackCriteriaMet}
export default OverlayTrackButton
