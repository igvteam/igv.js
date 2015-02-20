Note: This document is written in "markdown".  Please respect the [markdown conventions] (http://daringfireball.net/projects/markdown/) when editig.


#Browser Initialization#

Client pages interact with IGV through the singleton "igv.browser" object.  The object is created and initialized with the function

    igv.createBrowser(div, options)

The first argument is the parent div,  IGV  inserts itself into the dom here. The second argument is an object
defining configuration options, described in more detail below.  

The following example initializes IGV with two tracks: one genomic sequence and one gene annotations.  

        options = {
            showKaryo: false,
            showNavigation: true,
            fastaURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta",
            cytobandURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt",
            tracks: [
                {
                    type: "sequence"
                    order: 9999
                },
                {
                    url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
                    label: "Genes",
                    order: 10000
                }
            ]
        };

        browser = igv.createBrowser(div, options);
        
        
        
##Browser Configuration Options##
    
    showKaryo       optional    if true the whole-genome karyotype view is displayed. 
    showNavigation  optional    if true show basic navigation controls (search, zoom in, zoom out)
    fastaURL        required*   url to an indexed fasta file.  Required if genome id is not specified.
    cytobandURL     required*   url to a cytoband file in UCSC format.  Required if genome id is not specified.
    genome          required*   genome identifier. Required if fastaURL is not specified.
    tracks          optional    array of track descriptors to be displayed initially 
    trackDefaults  optional default settings for specific track type (see example below)
    locus           optional    initial genome location
    flanking        optional    distance (in bp) to pad either side of gene when navigating 
            

###Track Defaults. BAM track example.###
The follow sets the default value for coverage threshold to 0.2 and enables quality weighting when performing the mismatch calculation.

            trackDefaults : {
                bam: {
                    coverageThreshold: 0.2,
                    coverageQualityWeight: true
                }
            }
            
###General options applicable to all track types###

Tracks configuration uses json-style objects.   With exception of "url" all parameters are optional.

    url       url to the resource.  Protocol-less urls are recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
    indexURL  url to associated index file (bai, idx, or tbi file)
    headURL   url for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ
    type      string identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg"
    label     user-visible name for the track
    color     default color for features.  Can be overriden in certain file formats
    height    initial track height
    maxHeight maximum track height for those track types that expand automatically.  Can be overriden by user via menu
    order     integer specifying tracks vertical placement relative to other tracks.  Use to pin tracks to top (large negative number) or bottom (large positive number)

####Alignment track (type = "bam")####

    visibilityWindow    Window size in bp at which alignments are loaded.  Default = 30000 (30kb)    
    alignmentRowHeight  height of each alignment row.   Default = 14
    coverageTrackHeight  height of coverage track   Default = 50
    alignmentColor      default color for alignments    Default = "rgb(185, 185, 185)"
    negStrandColor      for "color by strand" option.  Default = "rgb(150, 150, 230)"
    posStrandColor      for "color by strand" option.  Default = "rgb(230, 150, 150)"
    deletionColor       color of line connecting blocks from deletion (cigar = "d").  Default = "black"
    skippedColor        color of line connection blocks for cigar "n". Default = "rgb(150, 170, 170)"
    coverageColor       color of coverage track. Default = "rgb(185, 185, 185)"

####Copy number track (type = "seg")####

    sampleHeight   Height of individual sample row (default = 2)
    posColorScale  Heat map scale for copy number gain.
    negColorScale  Heat map scale for copy number loss
    
    TODO -- heatmap scale json description   



###Track API###
Some track types have an API that controls both the style of rendering used to present features and how - if desired - features are filtered out of a presentation. 

####Alignment Shading####
Here we set alignment rendering color based on the strand. Using `"none"` sets the color to the current `alignmentColor` setting for the track.

	var bamTrack = new igv.BAMTrack(config);
	bamTrack.alignmentShading = "strand";

####Alignment Row Sorting####
Alignment rows can be sorted by nucleotide, start location, or strand using the strings `"NUCLEOTIDE"`, `"START"` or `"STRAND"` respectively. Here we sort by nucleotide.

	var bamTrack = new igv.BAMTrack(config);
	bamTrack.sortOption = { sort: "NUCLEOTIDE" };

Sort is performed with the `sortAlignmentRows(genomicLocation, sortOption, continuation)` function.

	bamTrack.sortAlignmentRows(genomicLocation, bamTrack.sortOption, continuation);

####Alignment Row Filtering####
Alignment rows can be filtered by mapping quality and strand. Filtering is performed by basing a filter options object to the function `bamTrack.filterAlignments(filterOption, continuation)`.

Here is the format of a filter option:
  
	{
		name : filterName,
		params : [ param0, param1, ..., paramN ]
	}

Supported filters:
#####mapping quality#####
Set either to `undefined` to ignore that threshold
	
	{
		name : mappingQuality,
		params : [ lowQuality, lowQuality ]
	}

#####strand#####
	
	{
		name : strand,
		params : [ true or false ]
	}



#Browser Control API#

After initialization the browser can be controlled through the object "igv.browser" using the commands described below.

Note:  To load tracks or specify a locus on initial startup use the the startup "options" object, not the commands below.

The igv.browser api  (preface commands with igv.browser.)

    loadTrack(config)
    
    search(locusOrGene) 
    
    zoomIn();
    
    zoomOut();


###loadTracks###

The following example loads a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
 
###search###
       
Search by gene symbol

    igv.browser.search('EGFR')

Go to explicit location

    igv.browser.search('chr10:1000-2000;)

###zoomIn###

Zoom in by a factor of 2

    igv.browser.zoomIn();

Zoom out by a factor of 2

    igv.browser.zoomOut();


