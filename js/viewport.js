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

import * as DOMUtils from "./ui/utils/dom-utils.js"
import AlertDialog from "./ui/components/alertDialog.js"
import SequenceTrack from "./sequenceTrack.js"

class Viewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {
        this.guid = DOMUtils.guid()
        this.trackView = trackView;
        this.referenceFrame = referenceFrame;

        this.browser = trackView.browser;

        this.viewportElement = document.createElement('div');
        this.viewportElement.className = 'igv-viewport';
        viewportColumn.appendChild(this.viewportElement);

        if (trackView.track.height) {
            this.setHeight(trackView.track.height);
        }

        // Create an alert dialog for the sequence track to copy ref sequence to.
        if (trackView.track instanceof SequenceTrack) {
            this.alert = new AlertDialog(this.viewportElement);
        }

        this.contentTop = 0;
        this.contentHeight = this.viewportElement.clientHeight;

        this.setWidth(width);

        this.initializationHelper();
    }

    initializationHelper() {}

    showMessage(message) {
        if (!this.messageDiv) {
            this.messageDiv = document.createElement('div');
            this.messageDiv.className = 'igv-viewport-message';
            this.viewportElement.appendChild(this.messageDiv);
        }
        this.messageDiv.textContent = message;
        this.messageDiv.style.display = 'inline-block';
    }

    hideMessage() {
        if (this.messageDiv) {
            this.messageDiv.style.display = 'none';
        }
    }

    setTrackLabel(label) {}

    startSpinner() {}

    stopSpinner() {}

    checkZoomIn() {
        return true;
    }

    shift() {}

    setTop(contentTop) {
        this.contentTop = contentTop;
    }

    async loadFeatures() {
        return undefined;
    }

    clearCache() {}

    repaint() {}

    draw(drawConfiguration, features, roiFeatures) {
        console.log('Viewport - draw(drawConfiguration, features, roiFeatures)');
    }

    checkContentHeight(features) {
        const track = this.trackView.track;
        features = features || this.cachedFeatures;
        if (track.displayMode === 'FILL') {
            this.setContentHeight(this.viewportElement.clientHeight);
        } else if (typeof track.computePixelHeight === 'function') {
            if (features && features.length > 0) {
                const requiredContentHeight = track.computePixelHeight(features);
                if (requiredContentHeight !== this.contentHeight) {
                    this.setContentHeight(requiredContentHeight);
                }
            }
        }
    }

    getContentHeight() {
        return this.contentHeight;
    }

    setContentHeight(contentHeight) {
        this.contentHeight = contentHeight;
    }

    isLoading() {
        return false;
    }

    saveSVG() {}

    isVisible() {
        return this.viewportElement.clientWidth > 0;
    }

    setWidth(width) {
        this.viewportElement.style.width = `${width}px`;
    }

    getWidth() {
        return this.viewportElement.clientWidth;
    }

    setHeight(height) {
        this.viewportElement.style.height = `${height}px`;
    }

    getContentTop() {
        return this.contentTop;
    }

    containsPosition(chr, position) {
        console.log('Viewport - containsPosition(chr, position)');
    }

    addMouseHandlers() {}

    dispose() {
        this.viewportElement.remove();

        // Nullify all properties to free memory
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                this[key] = undefined;
            }
        }
    }
}

export default Viewport;
