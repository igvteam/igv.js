import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"


/**
 * Configurable properties
 * Locus {chr, start, end}
 * url - url to image.   Later url to webservice to fetch image
 */

class ImageTrack extends TrackBase {

    static defaults = {}

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        super.init(config)

        if (!config.images) {
            throw Error("images are required")
        }

        this.locus = config.locus
        this.type = "image"
        this.resolutionAware = true
    }


    async postInit() {

        this._images = []

        for (let i of this.config.images) {
            const img = new Image()
            img.onload = () => {
                i.img = img
                i.bpPerPixel = (i.end - i.start) / img.width
                this._images.push(i)
            }
            img.onerror = (err) => {
                console.error(err)
            }
            //if (img.complete) {   //cached image
            //    img.onload()
           // }
            img.src = i.src
        }

    }

    computePixelHeight(features) {
        return features ? features.height : 0
    }


    menuItemList() {

        const menuItems = []

        return menuItems
    }


    async getFeatures(chr, start, end, bpPerPixel) {
        // Return  image.  Scaled or not?
        return this.selectImage(chr, start, end, bpPerPixel)
    }

    selectImage(chr, start, end, bpPerPixel) {

        // Select the highest resolution image containing the interval.  If no image contains the interval return
        // the lowest resolution image if it overlaps
        if(this._images.length == 0) {
            return null
        }
        this._images.sort((a, b) => a.bpPerPixel < b.bpPerPixel ? -1 : 1)
        for(let i of this._images) {
            if(i.bpPerPixel > bpPerPixel) {
                return i
            }
        }
        const lowRes = this._images[this._images.length-1]
        if(lowRes.chr === chr) {
            return lowRes
        } else {
            return null
        }
    }

    draw({context, pixelTop, pixelWidth, pixelHeight, features, bpPerPixel, bpStart}) {

        const image = features.img
        if (image) {
            const nw = image.width
            const nh = image.height
            const imageBpPerPixel = (features.end - features.start) / nw
            const scale = imageBpPerPixel / bpPerPixel
            const x = (features.start - bpStart) / bpPerPixel
            context.drawImage(image, x, 0, scale * nw, nh)
        } else {
            //console.log("No image");
        }

    }

    get supportsWholeGenome() {
        return false
    }

}


export default ImageTrack
