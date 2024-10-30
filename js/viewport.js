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

import $ from "./vendor/jquery-3.3.1.slim.js"
import * as DOMUtils from "./ui/utils/dom-utils.js"
import AlertDialog from "./ui/components/alertDialog.js"
import SequenceTrack from "./sequenceTrack.js"

class Viewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {

        this.guid = DOMUtils.guid()
        this.trackView = trackView
        this.referenceFrame = referenceFrame

        this.browser = trackView.browser

        this.$viewport = $('<div class="igv-viewport">')
        viewportColumn.appendChild(this.$viewport.get(0))

        if (trackView.track.height) {
            this.setHeight(trackView.track.height)
        }

        // Create an alert dialog for the sequence track to copy ref sequence to.
        if (trackView.track instanceof SequenceTrack) {
            this.alert = new AlertDialog(this.$viewport.get(0))
        }

        this.contentTop = 0
        this.contentHeight = this.$viewport.height()


        this.$viewport.width(width)

        this.initializationHelper()

    }

    initializationHelper() {

    }

    showMessage(message) {
        if (!this.messageDiv) {
            this.messageDiv = document.createElement('div')
            this.messageDiv.className = 'igv-viewport-message'
            //this.contentDiv.append(this.messageDiv)
            this.$viewport.append($(this.messageDiv))
        }
        this.messageDiv.textContent = message
        this.messageDiv.style.display = 'inline-block'
    }

    hideMessage(message) {
        if (this.messageDiv)
            this.messageDiv.style.display = 'none'
    }

    setTrackLabel(label) {
    }

    startSpinner() {
    }

    stopSpinner() {
    }

    checkZoomIn() {
        return true
    }

    shift() {
    }

    setTop(contentTop) {

        this.contentTop = contentTop
        const viewportHeight = this.$viewport.height()
        const viewTop = -contentTop
        const viewBottom = viewTop + viewportHeight

        //this.$content.css('top', `${contentTop}px`)
        //
        // if (undefined === this.canvasVerticalRange || this.canvasVerticalRange.bottom < viewBottom || this.canvasVerticalRange.top > viewTop) {
        //     console.log("Repaint " + this.canvasVerticalRange)
        //    this.repaint()
        // }

    }

    async loadFeatures() {
        return undefined
    }

    clearCache() {

    }

    /**
     * Force a repaint.  Implementations provided by subclasses.
     */
    repaint() {
    }

    draw(drawConfiguration, features, roiFeatures) {
        console.log('Viewport - draw(drawConfiguration, features, roiFeatures)')
    }

    checkContentHeight(features) {

        let track = this.trackView.track
        features = features || this.cachedFeatures
        if ("FILL" === track.displayMode) {
            this.setContentHeight(this.$viewport.height())
        } else if (typeof track.computePixelHeight === 'function') {
            if (features && features.length > 0) {
                let requiredContentHeight = track.computePixelHeight(features)
                //let currentContentHeight = this.$content.height()
                let currentContentHeight = this.contentHeight
                if (requiredContentHeight !== currentContentHeight) {
                    this.setContentHeight(requiredContentHeight)
                }
            }
        }
    }

    getContentHeight() {
        //return this.$content.height()
        return this.contentHeight
    }

    setContentHeight(contentHeight) {
       this.contentHeight = contentHeight
    }

    isLoading() {
        return false
    }

    saveSVG() {

    }

    isVisible() {
        return this.$viewport.width()
    }

    setWidth(width) {
        this.$viewport.width(width)
    }

    getWidth() {
        return this.$viewport.width()
    }

    setHeight(h) {
        this.$viewport.height(h)
    }

    getContentTop() {
        return this.contentTop
    }

    containsPosition(chr, position) {
        console.log('Viewport - containsPosition(chr, position)')
    }

    addMouseHandlers() {
    }

    removeMouseHandlers() {
    }

    /**
     * Called when the associated track is removed.  Do any needed cleanup here.
     */
    dispose() {

        this.$viewport.get(0).remove()

        // Null out all properties -- this should not be neccessary, but just in case there is a
        // reference to self somewhere we want to free memory.
        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

export default Viewport
