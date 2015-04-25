------------
Object types
------------


Misc notes on major object types

TrackView
---------

The "view" object for an igv track.  Interface between the track and html elements.


Track
-----

The "model" object for an igv track.  Responsible for rendering the track on a surface (typically a canvas 
context) provided by the view.  In some cases rendering is delegated to a pluggable function.

Properties

- type  track type, usually associated with the format of the backing file.  Recognized types include bed, wig, vcf, and bam. If type is not specified it is inferred from the file extension.
- url   url to the file or webservice for this track
- label  
- height  the track height in pixels
- visibilityWindow   for indexed annotation and alignment tracks, features are not shown when zoomed out past this value

Events

- onsearch   Function that will be called upon feature search (e.g. user types gene name in search box)

Functions

draw (canvas, refFrame, bpStart, bpEnd, width, height, continuation, task)
popupData (genomicLocation, xOffset, yOffset)


FeatureSource
-------------

Supplies features on demand to a track.  Typically each track will contain a dedicated FeatureSource backed by
a file or webservice.


Feature Types
-------------


Required properties:

chr
start
end

Functions

popupData(genomicLocation)   Optional.  Returns an array of {name value} objects to support popup text



Variant
-------

Follow the [GA4GH model] (http://ga4gh.org/documentation/api/v0.5.1/ga4gh_api.html) 


DataFeature
------------

chr
start
end
value


Renderer
--------

Function to render a single annotation feature.  Signature is

function(feature, bpStart, xScale, canvas)



