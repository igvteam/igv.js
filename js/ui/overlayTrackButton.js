import NavbarButton from "./navbarButton.js"
import { overlayTrackImage, overlayTrackImageHover } from "./navbarIcons/overlayTrack.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"
import {didSelectSingleTrackType, getMultiSelectedTrackViews} from "./menuUtils.js"


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

        const trackConfigurations = tracks.map(( track ) => {
            const config = Object.assign({}, track.config)
            config.color = track.color
            config.autoscale = track.autoscale
            config.autoscaleGroup = track.autoscaleGroup
            return config
        })

        for (const track of tracks) {
            this.browser.removeTrack(track)
        }
        
        const fudge = 0.75

        const config =
            {
                name: 'Overlay',
                type: 'merged',
                autoscale: true,
                alpha: fudge * (1.0/tracks.length),
                height: Math.max(...tracks.map(({ height }) => height)),
                order: Math.min(...tracks.map(({ order }) => order)),
                tracks: trackConfigurations
            }

        this.browser.loadTrack(config)

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
