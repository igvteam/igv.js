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

var igv = (function (igv) {

    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.AneuFeatureSource = function (config, thefilename) {

        this.config = config || {};
        // check if type is redline or diff
        //console.log("AneuFeatureSource:  filename="+thefilename+", config="+JSON.stringify(config));
        // need function to cut off last part of file and add redline or diff file
     
        var getPath = function(urlorfile) {            
            var last = urlorfile.lastIndexOf("/");
            var path = urlorfile.substring(0, last+1);
           // console.log("Getting path of file or url "+urlorfile+"="+path);
            return path;
        }
     
        if (config.localFile) {
            
            var path = getPath(config.localFile.name);
            this.localFile = config.localFile;
            this.filename =path + thefilename;
          //  console.log("Got localfile: "+JSON.stringify(config)+", this.filename="+this.filename);
        }
        else {
            
            var path = getPath(config.url);
            
            this.url =path + thefilename;         
            this.filename = thefilename;
            this.headURL = config.headURL || this.filename;
         //   console.log("Got URL: "+config.url+"-> url="+this.url);
        }


        this.parser = getParser("aneu");
    };


    function getParser(format) {
        return new igv.FeatureParser(format);
    }

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     * @param task
     */
    igv.AneuFeatureSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        var myself = this,
            range = new igv.GenomicInterval(chr, bpStart, bpEnd),
            featureCache = this.featureCache;

        if (featureCache && (featureCache.range === undefined || featureCache.range.containsRange(range))) {//}   featureCache.range.contains(queryChr, bpStart, bpEnd))) {
            var features = this.featureCache.queryFeatures(chr, bpStart, bpEnd);
           // console.log("getFeatures: got "+features.length+" cached features on chr "+chr);
            success(features);

        }
        else {
          //  console.log("getFeatures: calling loadFeatures");
            this.loadFeatures(function (featureList) {
                  //  console.log("Creating featureCache with "+featureList.length+ " features");
                    myself.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one                    
                    // Finally pass features for query interval to continuation
                    
                    var features = myself.featureCache.queryFeatures(chr, bpStart, bpEnd);
                  //  console.log("calling success "+success);
                  //  console.log("features from queryCache "+features);
                    success(features);

                },
                task,
                range);   // Currently loading at granularity of chromosome
        }

    };

    igv.AneuFeatureSource.prototype.allFeatures = function (success) {

        this.getFeatureCache(function (featureCache) {
            success(featureCache.allFeatures());
        });

    };

    /**
     * Get the feature cache.  This method is exposed for use by cursor.  Loads all features (no index).
     * @param success
     */
    igv.AneuFeatureSource.prototype.getFeatureCache = function (success) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache);
        }
        else {
            this.loadFeatures(function (featureList) {
                //myself.featureMap = featureMap;
                myself.featureCache = new igv.FeatureCache(featureList);
                // Finally pass features for query interval to continuation
                success(myself.featureCache);

            });
        }
    }

    /**
     *
     * @param success
     * @param task
     * @param range -- genomic range to load. 
     */
    igv.AneuFeatureSource.prototype.loadFeatures = function (success, task, range) {

        var myself = this   ;
        var parser = myself.parser;
        var options = {
                    headers: myself.config.headers,           // http headers, not file header
                    tokens: myself.config.tokens,           // http headers, not file header
                    success: function (data) {
                       // console.log("Loaded data, calling parser.parseFeatures: parser="+parser);
                        myself.header = parser.parseHeader(data);
                        var features = parser.parseFeatures(data);
                        //console.log("Calling success "+success);
                        //console.log("nr features in argument "+features.length);
                        success(features);   // <= PARSING DONE HERE
                    },
                    error: function(msg) {
                       console.log("Error loading: "+msg);
                    },
                    task: task
        };
      //  console.log("=================== load features. File is: "+myself.localFile+"/"+myself.url);
        if (myself.localFile) {
        //    console.log("Loading local file: "+JSON.stringify(localFile));
            igvxhr.loadStringFromFile(myself.localFile, options);
        }
        else {
            //console.log("Loading URL "+myself.url);
            igvxhr.loadString(myself.url, options);
        }        
        
       
        function getContentLength(continuation) {
            if (myself.contentLength) {
                continuation(myself.contentLength);
            }
            else {
                // Get the content length first, so we don't try to read beyond the end of the file
                igvxhr.getContentLength(myself.headURL, {
                    headers: myself.config.headers,
                    success: function (contentLength) {
                        myself.contentLength = contentLength;
                        continuation(contentLength);

                    },
                    error: function () {
                        myself.contentLength = -1;
                        continuation(-1);
                    }
                });
            }
        }
    }

    return igv;
})
(igv || {});
