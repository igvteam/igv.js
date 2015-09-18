<!-- Note: This document is written in "markdown".  Please respect the markdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->

#Browser Control API#

After initialization the browser can be controlled through the object "igv.browser" using the commands described below. 

The igv.browser api  (preface commands with igv.browser.) | 
:-------- |
`loadTrack(config)` |
`search(locusOrGene) ` |
`zoomIn()` |
`zoomOut()` |

###loadTrack###

Load a bam track

    igv.browser.loadTrack({
      url: 'http://data.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
 
###search###
       
Search by gene symbol

`igv.browser.search('EGFR')`

Go to explicit location

`igv.browser.search('chr10:1000-2000;)`

###zoom###

Zoom in by a factor of 2 

`igv.browser.zoomIn()`

Zoom out by a factor of 2 

`igv.browser.zoomOut()`


###Track API###
Some track types have an API that controls both the rendering style used to present features and how - if desired - features are filtered out of a presentation.

####Alignment Shading####
Here we set the alignment rendering color based on the strand. Use `"none"` to set the color to the current `alignmentColor` setting.

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


