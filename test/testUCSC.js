/**
 * Created by turner on 2/24/14.
 */
function runUCSCTests() {

    test( "UCSC track line", 2, function() {

        var trackLine = 'track name="My Track" color=(0,0,0)';

        var trackProperties = igv.ucsc.parseTrackLine(trackLine);

        equal('My Track', trackProperties["name"]);
        equal('(0,0,0)', trackProperties["color"]);

    });

}
