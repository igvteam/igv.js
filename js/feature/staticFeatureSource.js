/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
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

import {FeatureCache} from "../../node_modules/igv-utils/src/index.js"
import {computeWGFeatures, packFeatures} from "./featureUtils.js"

/**
 * feature source for features supplied directly, as opposed to reading and parsing from a file or webservice
 *
 * @param config
 * @constructor
 */
class StaticFeatureSource {

    constructor(config, genome) {

        this.config = config
        this.genome = genome
        this.queryable = false
        this.updateFeatures(config.features)

    }

    updateFeatures(features) {
        features = fixFeatures(features, this.genome)
        packFeatures(features)
        if (this.config.mappings) {
            mapProperties(features, this.config.mappings)
        }
        this.featureCache = new FeatureCache(features, this.genome)
    }

    /**
     * Required function for all data source objects.  Fetches features for the
     * range requested.
     *
     * This function is complex due to the variety of reader types backing it, some indexed, some queryable,
     * some not.
     *
     * @param chr
     * @param start
     * @param end
     * @param bpPerPixel
     */
    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow}) {

        const genome = this.genome
        const queryChr = genome ? genome.getChromosomeName(chr) : chr
        const isWholeGenome = ("all" === queryChr.toLowerCase())

        // Various conditions that can require a feature load
        //   * view is "whole genome" but no features are loaded
        //   * cache is disabled
        //   * cache does not contain requested range
        if (isWholeGenome) {
            return computeWGFeatures(this.featureCache.getAllFeatures(), this.genome, this.maxWGCount)
        } else {
            return this.featureCache.queryFeatures(queryChr, start, end)
        }
    }

    //
    // supportsWholeGenome() {
    //    return true
    // }

    getAllFeatures() {
        return this.featureCache.getAllFeatures()
    }

}


/**
 * This function is used to apply properties normally added during parsing to  features supplied directly in the
 * config as an array of objects.   At the moment the only application is bedpe type features.
 * @param features
 */
function fixFeatures(features, genome) {

    if (genome) {
        for (let feature of features) {
            feature.chr = genome.getChromosomeName(feature.chr)
        }
    }

    return features
}



function mapProperties(features, mappings) {
    let mappingKeys = Object.keys(mappings)
    features.forEach(function (f) {
        mappingKeys.forEach(function (key) {
            f[key] = f[mappings[key]]
        })
    })
}



export default StaticFeatureSource
