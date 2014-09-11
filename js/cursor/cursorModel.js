var cursor = (function (cursor) {

    const resevoirSampledRegionListLength = 10000;

    cursor.CursorModel = function (browser, regionDisplayJQueryObject) {

        var thang;

        this.browser = browser;
        this.regionDisplayJQueryObject = regionDisplayJQueryObject;

        this.regionWidth = 100;
        $( "input[id='regionSizeInput']" ).val( this.regionWidth );

        this.framePixelWidth = 24;
        $( "input[id='frameWidthInput']" ).val( this.framePixelWidth );

        this.frameMargin = 6;
        this.origin = 0;
        this.tracks = [];
        this.regions = [];

        this.prohibitSelfFilteringTrackHistogram = true;
    };

    cursor.CursorModel.prototype.updateRegionDisplay = function(downsamplingPercentage) {

        var numer,
            denom,
            downsamplingString = "";

        numer = igv.numberFormatter(this.getRegionList().length);
        denom = igv.numberFormatter(this.regions.length);

        if (downsamplingPercentage < 1.0) {

            downsamplingString = " Downsampling " + Math.floor(100.0 * downsamplingPercentage) + "%";
        }

        this.regionDisplayJQueryObject.text("Regions " + numer + " / " + denom + downsamplingString);
    };

    cursor.CursorModel.prototype.getRegionList = function () {

        return (undefined === this.filteredRegions) ? this.regions : this.filteredRegions;
    };

    cursor.CursorModel.prototype.setRegions = function (features) {

        var featuresLength,
            i;

        this.regions = [];
        this.filteredRegions = undefined;

        for (i = 0, featuresLength = features.length; i < featuresLength; i++) {
            this.regions.push(new cursor.CursorRegion(features[i]));
        }

        this.updateRegionDisplay(1);
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
                trackPanel.track.sortButton.className = "fa fa-bar-chart-o";
                trackPanel.track.sortButton.style.color = "black";

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

            myself.updateRegionDisplay(resevoirSampledRegionListLength/myself.filteredRegions.length);

            // If filteredRegions set is > 10,000 downsample
             if (myself.filteredRegions.length >= resevoirSampledRegionListLength) {

                myself.filteredRegions = resevoirSampledRegionList(myself.filteredRegions, resevoirSampledRegionListLength);
            }

            if (sortTrackPanelPostFiltering) {

                console.log("sort " + sortTrackPanelPostFiltering.track.label);

                // spin spinner
                spinner = igv.getSpinner(sortTrackPanelPostFiltering.viewportDiv);

                // TODO: This is wacky. Needs to be done to maintain sort direction
                sortTrackPanelPostFiltering.track.sortDirection *= -1;
                myself.sortRegions(sortTrackPanelPostFiltering.track.featureSource, sortTrackPanelPostFiltering.track.sortDirection, function (regions) {

                    sortTrackPanelPostFiltering.track.sortButton.className = "fa fa-signal";
                    sortTrackPanelPostFiltering.track.sortButton.style.color = "red";

                    spinner.stop();

                    myself.browser.update();

                });

            } else {
                myself.browser.update();
            }


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

        function resevoirSampledRegionList(array, max) {

            var downsampled = [],
                len = array.length,
                i,
                j,
                cnt = 0,
                elem;

            for (i = 0; i < len; i++) {

                elem = array[i];

                if (downsampled.length < max) {
                    downsampled.push(elem);
                }
                else {
                    // Resevoir sampling,  conditionally replace existing feature with new one.
                    j = Math.floor(Math.random() * cnt);
                    if (j < max) {
                        downsampled[j] = elem;
                    }
                }
                cnt++;

            }
            return downsampled;
        }
    };

    /**
     * Sort track based on signals from the feature source.   The continuation is called when sorting is complete.
     *
     * @param featureSource
     * @param sortDirection
     * @param continuation
     */
    cursor.CursorModel.prototype.sortRegions = function (featureSource, sortDirection, continuation) {

        "use strict";

//        console.log(navigator.userAgent);

        var regionWidth = this.regionWidth,
            regions = this.getRegionList(),
            filteredRegions = this.filteredRegions;

        if (!regions || 0 === regions.length) {
            continuation();
        }


        featureSource.getFeatureCache(function (featureCache) {

            // Assign score to regions for selected track (feature source)
            regions.forEach(function (region) {
                region.sortScore = region.getScore(featureCache, regionWidth);
            });

            var compFunction = function (cursorRegion1, cursorRegion2) {

                var s1 = cursorRegion1.sortScore;
                var s2 = cursorRegion2.sortScore;
                return sortDirection * (s1 === s2 ? 0 : (s1 > s2 ? -1 : 1));
            };

            // First, randomize the frames to prevent memory from previous sorts.  There are many ties (e.g. zeroes)
            // so a stable sort carries a lot of memory, which can imply correlations where none exist.
            regions.shuffle();

            // The built-in sort blows up in Chrome, and possibly other browsers, for large arrays.
            if (regions.length > 1000) {
                regions.heapSort(compFunction);
            }
            else {
                regions.sort(compFunction);
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

        var halfWidth = regionWidth/ 2,
            featureList;

        featureList = featureCache.queryFeatures(this.chr, this.location - halfWidth, this.location + halfWidth);

        return (featureList) ? true : false;

    };

    function isChrome() {
        return navigator.userAgent.contains("Chrome");
    }

    return cursor;

})(cursor || {});