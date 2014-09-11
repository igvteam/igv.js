var igv = (function (igv) {

    igv.Browser = function (type) {

        this.type = type ? type : "IGV";
        this.div = document.createElement("div");

        this.trackHeight = 100;
        $( "input[id='trackHeightInput']" ).val( this.trackHeight );

        this.rootHeight = 0;
        this.searchURL = "http://www.broadinstitute.org/webservices/igv/locus?genome=hg19&name=";
    };

    igv.Browser.prototype.loadTrack = function (config) {

        var path = config.url;

        if (path.endsWith(".bed") || path.endsWith(".bed.gz")) {
            this.addTrack (new igv.GeneTrack(config));
        } else if (path.endsWith(".bam")) {
            this.addTrack (new igv.BAMTrack(config));
        } else if (path.endsWith(".wig") || path.endsWith(".wig.gz") ||
            path.endsWith(".bedgraph") || path.endsWith(".bedgraph.gz")) {
            this.addTrack (new igv.WIGTrack(config));
        }

        // TODO -- error message "unsupported filed type"

    }

    /**
     * Add a new track.  Each track is associated with the following DOM elements
     *
     *      controlDiv  - div on the left for track controls and legend
     *      contentDiv  - a div element wrapping all the track content.  Height can be > viewportDiv height
     *      viewportDiv - a div element through which the track is viewed.  This might have a vertical scrollbar
     *      canvas     - canvas element upon which the track is drawn.  Child of contentDiv
     *
     * The width of all elements should be equal.  Height of the viewportDiv is controlled by the user, but never
     * greater than the contentDiv height.   Height of contentDiv and canvas are equal, and governed by the data
     * loaded.
     *
     * @param track
     * @param position
     */
    igv.Browser.prototype.addTrack = function (track, position) {

        var trackPanel = new igv.TrackView(track, this);

        if (trackPanel.track instanceof igv.EqtlTrack) {
            trackPanel.trackDiv.style.height = this.trackHeight + "px";
            trackPanel.canvas.height = this.trackHeight;
            trackPanel.canvas.style.height = this.trackHeight + "px";
            trackPanel.controlDiv.style.height = this.trackHeight + "px";
            trackPanel.controlCanvas.height = this.trackHeight;
            trackPanel.controlCanvas.style.height = this.trackHeight + "px";
            trackPanel.viewportDiv.style.height = this.trackHeight + "px";
        }

        this.trackContainerDiv.appendChild(trackPanel.trackDiv);

        trackPanel.order = this.trackPanels.length;

        this.trackPanels.push(trackPanel);

        // Keeps the tracks in the right order and the Gene track pinned to the bottom
        this.trackPanels.sort(function (a, b) {
            return a.order - b.order;
        });

        this.layoutTrackPanels(this.trackPanels);

        if (this.cursorModel) {
            this.cursorModel.initializeHistogram(trackPanel.track, function () {
                trackPanel.repaint()
            });
        }
        else {
            trackPanel.repaint();
        }

    };

    igv.Browser.prototype.removeTrack = function (track) {

        // Find track panel
        var trackPanelRemoved;
        for (var i = 0; i < this.trackPanels.length; i++) {
            if (track === this.trackPanels[i].track) {
                trackPanelRemoved = this.trackPanels[i];
                break;
            }
        }

        if (trackPanelRemoved) {

            this.trackPanels.splice(this.trackPanels.indexOf(trackPanelRemoved), 1);
            this.trackContainerDiv.removeChild(trackPanelRemoved.trackDiv);

            this.layoutTrackPanels(this.trackPanels);

        }
    };

    igv.Browser.prototype.setTrackHeight = function (newHeight) {

        this.trackHeight = newHeight;

        this.trackPanels.forEach(function (panel) {
            panel.setTrackHeight(newHeight);
        });
        this.layoutTrackPanels(this.trackPanels);

    };

    igv.Browser.prototype.layoutTrackPanels = function (trackPanels) {

        var changingRootHeight;
        trackPanels.forEach(function (tp, index, tps) {

            if (0 === index) {
                tp.trackDiv.style.top = "0px";
                changingRootHeight = parseInt(tp.trackDiv.style.height) + parseInt(tp.marginBottom);
            } else {
                tp.trackDiv.style.top = changingRootHeight + "px";
                changingRootHeight += parseInt(tp.trackDiv.style.height) + parseInt(tp.marginBottom);
            }

        });

    };

    igv.Browser.prototype.repaint = function () {

        if (this.ideoPanel) {
            this.ideoPanel.repaint();
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }
        this.trackPanels.forEach(function (panel) {
            panel.repaint();
        });
    };

    igv.Browser.prototype.update = function () {

        if (this.ideoPanel) {
            this.ideoPanel.repaint();
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }
        this.trackPanels.forEach(function (trackPanel) {

            trackPanel.update();

        });
    };

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    igv.Browser.prototype.trackViewportWidth = function () {
        if (this.trackPanels && this.trackPanels.length > 0) {
            return this.trackPanels[0].viewportDiv.clientWidth;
        }
        else {
            return this.trackContainerDiv.clientWidth;
        }

    }

    igv.Browser.prototype.goto = function (chr, start, end) {

        // GTEX HACK -- need aliases
        if (this.type === "GTEX" && !chr.startsWith("chr")) chr = "chr" + chr;

        var w, chromosome, viewportWidth;

        viewportWidth = this.trackViewportWidth();

        this.referenceFrame.chr = chr;

        // If end is undefined,  interpret start as the new center.
        if (!end) {

            w = Math.round(viewportWidth * this.referenceFrame.bpPerPixel / 2);
            start = start - w;
            end = start + 2 * w;
        }

        if (start < 0) {
            end += -start;
            start = 0;
        }

        if (this.genome) {
            chromosome = this.genome.getChromosome(this.referenceFrame.chr);
            if (chromosome && end > chromosome.length) {
                start -= (end - chromosome.length);
                end = chromosome.length;
            }
        }

        this.referenceFrame.start = start;
        this.referenceFrame.bpPerPixel = (end - start) / (viewportWidth);
        this.update();
    }

    // Zoom in by a factor of 2, keeping the same center location
    igv.Browser.prototype.zoomIn = function () {

        var newScale, center, viewportWidth;
        viewportWidth = this.trackViewportWidth();

        newScale = Math.max(1 / 14, this.referenceFrame.bpPerPixel / 2);
        if (newScale == this.referenceFrame.bpPerPixel) return;

        center = this.referenceFrame.start + this.referenceFrame.bpPerPixel * viewportWidth / 2;
        this.referenceFrame.start = center - newScale * viewportWidth / 2;
        this.referenceFrame.bpPerPixel = newScale;
        this.update();
    }

    // Zoom out by a factor of 2, keeping the same center location if possible
    igv.Browser.prototype.zoomOut = function () {

        var newScale, maxScale, center, chrLength, widthBP, viewportWidth;
        viewportWidth = this.trackViewportWidth();

        newScale = this.referenceFrame.bpPerPixel * 2;
        chrLength = 250000000;
        if (this.genome) {
            var chromosome = this.genome.getChromosome(this.referenceFrame.chr);
            if (chromosome) {
                chrLength = chromosome.length;
            }
        }
        maxScale = chrLength / viewportWidth;
        if (newScale > maxScale) newScale = maxScale;

        center = this.referenceFrame.start + this.referenceFrame.bpPerPixel * viewportWidth / 2;
        widthBP = newScale * viewportWidth;

        this.referenceFrame.start = Math.round(center - widthBP / 2);

        if (this.referenceFrame.start < 0) this.referenceFrame.start = 0;
        else if (this.referenceFrame.start > chrLength - widthBP) this.referenceFrame.start = chrLength - widthBP;

        this.referenceFrame.bpPerPixel = newScale;
        this.update();
    }

    igv.Browser.prototype.search = function (feature) {

        if (feature.contains(":") && feature.contains("-")) {

            var tokens = feature.split(":");
            var chr = tokens[0];
            var posTokens = tokens[1].split("-");
            var start = parseInt(posTokens[0].replace(/,/g, "")) - 1;
            var end = parseInt(posTokens[1].replace(/,/g, ""));

            if (end > start) {
                this.goto(chr, start, end);
            }

        }

        else {

            if (this.searchURL) {

                var spinner = igv.getSpinner(this.trackContainerDiv);
                var url = this.searchURL + feature;
                var browser = this;

                igv.loadData(url, function (data) {


                    spinner.stop();

                    var lines = data.split("\n");
                    var len = lines.length;
                    // First line is header, skip
                    var lineNo = 0;
                    while (lineNo < len) {
                        // EGFR	chr7:55,086,724-55,275,031	refseq
                        var line = lines[lineNo++];
                        //console.log(line);
                        var tokens = line.split("\t");
                        //console.log("tokens lenght = " + tokens.length);
                        if (tokens.length >= 3) {
                            var f = tokens[0];
                            if (f.toUpperCase() == feature.toUpperCase()) {

                                var source = tokens[2].trim();
                                var type = source == "gtex" ? 'snp' : 'gene';

                                var locusTokens = tokens[1].split(":");
                                var chr = locusTokens[0].trim();
                                var rangeTokens = locusTokens[1].split("-");
                                var start = parseInt(rangeTokens[0].replace(/,/g, ''));
                                var end = parseInt(rangeTokens[1].replace(/,/g, ''));

                                if (browser.type === "GTEX") {
                                    var flanking = 1000000;
                                    start -= flanking;
                                    end += flanking;
                                    igv.selection = new igv.GtexSelection(type == 'gene' ? {gene: feature} : {snp: feature});
                                    browser.goto(chr, start, end);
                                    browser.update();
                                }
                                else {
                                    browser.goto(chr, start, end);
                                }

                                return;
                            }
                        }
                    }
                    // Nothing found
                    alert('No feature found with name "' + feature + '"');
                });
            }
        }
    }

    return igv;
})(igv || {});


