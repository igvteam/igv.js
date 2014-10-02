var cursor = (function (cursor) {

    const resevoirSampledRegionListLength = 10000;

    cursor.CursorModel = function (browser, regionDisplayJQueryObject) {

        this.browser = browser;
        this.regionDisplayJQueryObject = regionDisplayJQueryObject;

        this.regionWidth = 100;
        $( "input[id='regionSizeInput']" ).val( this.regionWidth );

        this.framePixelWidth = 24;
        $( "input[id='frameWidthInput']" ).val( this.framePixelWidth );

        this.frameMargin = 6;
        this.tracks = [];

        this.regions = [];
        this.filteredRegions = this.regions;

    };

    // NOTE: This is depricated and nolonger used
    cursor.CursorModel.prototype.exportRegions = function() {

        var myself = this,
            exportedRegions = "",
            form,
            hiddenFilenameInput,
            hiddenDownloadContent;

        form = document.createElement("form");
        document.body.appendChild(form);
        form.setAttribute("method", "post");
        form.setAttribute("action", "php/igvdownload.php");

        // file name
        hiddenFilenameInput = document.createElement("input");
        form.appendChild(hiddenFilenameInput);
        hiddenFilenameInput.setAttribute("type", "hidden");
        hiddenFilenameInput.setAttribute("name", "filename");
        hiddenFilenameInput.setAttribute("value", "cursor-regions.bed");

        // ingest contents of textarea named #downloadContent
        hiddenDownloadContent = document.createElement("input");
        form.appendChild(hiddenDownloadContent);
        hiddenDownloadContent.setAttribute("type", "hidden");
        hiddenDownloadContent.setAttribute("name", "downloadContent");

        this.filteredRegions.forEach(function (region) {
            exportedRegions += region.exportRegion(myself.regionWidth);
        });

        hiddenDownloadContent.setAttribute("value", exportedRegions);

        // submit and self-destruct
        form.submit();
        form.detach();

    };

    cursor.CursorModel.prototype.updateRegionDisplay = function()  {

        var numer,
            denom,
            downsamplingString = "";

        numer = igv.numberFormatter(this.filteredRegions.length);
        denom = igv.numberFormatter(this.regions.length);

        this.regionDisplayJQueryObject.text("Regions " + numer + " / " + denom + downsamplingString);
    };

    cursor.CursorModel.prototype.regionsToRender = function () {

        return (undefined === this.subSampledFilteredRegions) ? this.filteredRegions : this.subSampledFilteredRegions;
    };

    cursor.CursorModel.prototype.setRegions = function (features) {

        var featuresLength,
            i;

        this.regions = [];

        for (i = 0, featuresLength = features.length; i < featuresLength; i++) {
            this.regions.push(new cursor.CursorRegion(features[i]));
        }

        this.filteredRegions = this.regions;

        this.updateRegionDisplay();
        this.filterRegions();

    };

    cursor.CursorModel.prototype.initializeHistogram = function (track, continutation) {

        var myself = this;

        track.cursorHistogram.initializeBins();

        track.featureSource.getFeatureCache(function (featureCache) {

            myself.regions.forEach(function (region) {

                var score = region.getScore(featureCache, myself.regionWidth);
                track.cursorHistogram.insertScore(score);

            });

            track.cursorHistogram.render(track);

            if (continutation) {
                continutation();
            }

        });

    };

    cursor.CursorModel.prototype.filterRegions = function (doSortRegions) {

        var trackPackages = [],
            filterPackages = [],
            howmany = 0,
            sortTrackPanelPostFiltering,
            myself = this;

        this.browser.trackPanels.forEach(function (trackPanel, tpIndex, trackPanels) {

            trackPanel.track.getFeatureCache(function (featureCache) {

                trackPackages.push({ track: trackPanel.track, trackFilter: trackPanel.track.trackFilter, featureCache: featureCache, cursorHistogram: trackPanel.track.cursorHistogram });

                if (trackPanel.track.isSorted()) {
                    sortTrackPanelPostFiltering = trackPanel;
                }

                // sorting will be lost during filtering
                trackPanel.track.sortButton.className = "fa fa-bar-chart-o igv-control-sort-fontawesome";

                if (trackPanel.track.trackFilter.isFilterActive) {
                    filterPackages.push({trackFilter: trackPanel.track.trackFilter, featureCache: featureCache });
                }

                if (++howmany == trackPanels.length) runFilters();
            });
        });

        function runFilters() {

            var spinner;

            if (0 === filterPackages.length) {
                // No filters
                myself.filteredRegions = myself.regions;
            }
            else {

                myself.filteredRegions = [];

                myself.regions.forEach(function (region) {

                    var success,
                        score,
                        passFilter = true;

                    trackPackages.forEach(function (trackPackage) {

                        if (true === passFilter) {

                            success = trackPackage.trackFilter.evaluate(trackPackage.featureCache, region, myself.regionWidth);
                            if (false === success) {

                                passFilter = false;
                            }

                        }

                    });

                    if (passFilter) {
                        myself.filteredRegions.push(region);
                    }

                });
            }

            if (sortTrackPanelPostFiltering) {

                // spin spinner
                spinner = igv.getSpinner(sortTrackPanelPostFiltering.viewportDiv);

                // TODO: This is wacky. Needs to be done to maintain sort direction
                sortTrackPanelPostFiltering.track.sortDirection *= -1;
                myself.sortRegions(sortTrackPanelPostFiltering.track.featureSource, sortTrackPanelPostFiltering.track.sortDirection, function () {

                    sortTrackPanelPostFiltering.track.sortButton.className = "fa fa-bar-chart-o igv-control-sort-fontawesome-selected";

                    spinner.stop();

                    myself.browser.update();

                });

            } else {

                if (myself.filteredRegions.length >= Number.MAX_VALUE /*resevoirSampledRegionListLength*/) {

                    myself.subSampledFilteredRegions = resevoirSampledRegionList(myself.filteredRegions, resevoirSampledRegionListLength);
                } else {

                    myself.subSampledFilteredRegions = myself.filteredRegions;
                }

                myself.browser.update();
            }

            myself.updateRegionDisplay();

            // better histogram code
            trackPackages.forEach(function (trackPackage) {

                trackPackage.cursorHistogram.initializeBins();

                myself.regions.forEach(function (region) {

                    var score,
                        doIncludeRegionForHistogramRender = true;

                    filterPackages.forEach(function (filterPackage) {

                        var success;

                        if (trackPackage.trackFilter === filterPackage.trackFilter) {

                            // do nothing

                        } else if (true === doIncludeRegionForHistogramRender) {

                            success = filterPackage.trackFilter.evaluate(filterPackage.featureCache, region, myself.regionWidth);

                            if (false === success) {

                                doIncludeRegionForHistogramRender = false;
                            }

                        }

                    });

                    if (doIncludeRegionForHistogramRender) {

                        score = region.getScore(trackPackage.featureCache, myself.regionWidth);
                        trackPackage.cursorHistogram.insertScore(score);
                    }

                });

                trackPackage.cursorHistogram.render(trackPackage.track);

            });

        }

    };

    function resevoirSampledRegionList(regions, max) {

        var subsampledRegions = [],
            len = regions.length,
            i,
            j,
            cnt = 0,
            elem;

        for (i = 0; i < len; i++) {

            elem = regions[ i ];

            if (subsampledRegions.length < max) {
                subsampledRegions.push(elem);
            }
            else {
                // Resevoir sampling,  conditionally replace existing feature with new one.
                j = Math.floor(Math.random() * cnt);
                if (j < max) {
                    subsampledRegions[ j ] = elem;
                }
            }
            cnt++;

        }
        return subsampledRegions;
    }

    /**
     * Sort track based on signals from the feature source.   The continuation is called when sorting is complete.
     *
     * @param featureSource
     * @param sortDirection
     * @param continuation
     */
    cursor.CursorModel.prototype.sortRegions = function (featureSource, sortDirection, continuation) {

        "use strict";

        var myself = this,
            regionWidth = this.regionWidth;

        if (!this.filteredRegions || 0 === this.filteredRegions.length) {
            continuation();
        }

        if (myself.filteredRegions.length >= Number.MAX_VALUE /*resevoirSampledRegionListLength*/) {

            myself.subSampledFilteredRegions = resevoirSampledRegionList(myself.filteredRegions, resevoirSampledRegionListLength);
        } else {

            myself.subSampledFilteredRegions = myself.filteredRegions;
        }







        featureSource.getFeatureCache(function (featureCache) {

            // Assign score to regions for selected track (feature source)
            myself.subSampledFilteredRegions.forEach(function (region) {
                region.sortScore = region.getScore(featureCache, regionWidth);
            });

            var compFunction = function (cursorRegion1, cursorRegion2) {

                var s1 = cursorRegion1.sortScore;
                var s2 = cursorRegion2.sortScore;
                return sortDirection * (s1 === s2 ? 0 : (s1 > s2 ? -1 : 1));
            };

            // First, randomize the frames to prevent memory from previous sorts.  There are many ties (e.g. zeroes)
            // so a stable sort carries a lot of memory, which can imply correlations where none exist.
            myself.subSampledFilteredRegions.shuffle();

            // The built-in sort blows up in Chrome, and possibly other browsers, for large arrays.
            if (myself.subSampledFilteredRegions.length > 1000) {
                myself.subSampledFilteredRegions.heapSort(compFunction);
            }
            else {
                myself.subSampledFilteredRegions.sort(compFunction);
            }

            continuation();
        });


    };

    cursor.CursorRegion = function (feature) {

        this.chr = feature.chr;
        this.location = Math.round((feature.start + feature.end) / 2);
    };

    /**
     * Compute a score over the region bounds and pass it on to the continuation.
     *
     * @param featureCache
     * @param regionWidth
     * @returns {number}
     */
    cursor.CursorRegion.prototype.getScore = function (featureCache, regionWidth) {

        var regionStart = this.location - regionWidth / 2,
            regionEnd   = this.location + regionWidth / 2,
            score,
            featureCacheQueryResults,
            features;

        featureCacheQueryResults = featureCache.queryFeatures(this.chr, regionStart, regionEnd);

        // If no features, bail.
        if (!featureCacheQueryResults || 0 === featureCacheQueryResults.length) {
            return -1;
        }

        // Only assess scores for features bounded bu the region
        features = [];
        featureCacheQueryResults.forEach(function (f){

            if (f.end >= regionStart && f.start < regionEnd) {
                features.push(f);
            }

        });

        // If no features, bail.
        if (0 === features) {
            return -1;
        }

        score = 0;
        featureCacheQueryResults.forEach(function (feature) {

            if (undefined === feature.score) {

                // Have a feature, but no defined score
                score = 1000;
            } else {

                // Take max score of all features in region
                score = Math.max(feature.score, score);
            }

        });

        if (-1 === score) {
            console.log("Features " + featureList.length + ". Should not return score = -1 for filter consideration.");
        }

        return score;
    };

    cursor.CursorRegion.prototype.isRegionEmpty = function (featureCache, regionWidth) {

        var halfWidth = regionWidth/2,
            featureList;

        featureList = featureCache.queryFeatures(this.chr, this.location - halfWidth, this.location + halfWidth);

        return (featureList) ? true : false;

    };

    // BED Format: The first 100 bases of a chromosome are defined as chromStart=0, chromEnd=100,
    // and span the bases 0 - 99.
    cursor.CursorRegion.prototype.exportRegion = function (regionWidth) {

        var halfWidth = regionWidth/2;

        // Add 1 to end to conform to BED format
        return this.chr + "\t" + (this.location - halfWidth) + "\t" + (this.location + halfWidth + 1) + "\n";

    };

    function isChrome() {
        return navigator.userAgent.contains("Chrome");
    }

    return cursor;

})(cursor || {});