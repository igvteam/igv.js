<!-- Note: This document is written in "markdown".  Please respect the markdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->

#Browser Control API#

After initialization the browser can be controlled through the object "igv.browser" using the commands described below. Note:  to load tracks or specify a locus on initial startup use the the startup "options" object, not the commands below.


The igv.browser api  (preface commands with igv.browser.) | 
:-------- |
`loadTrack(config)` |
`search(locusOrGene) ` |
`zoomIn()` |
`zoomOut()` |

###loadTrack###

Load a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
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


