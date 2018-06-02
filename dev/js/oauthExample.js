/**
 * Created by jrobinso on 6/2/18.
 */

var scope = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/genomics https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";
var client_id = "661332306814-8nt29308rppg325bkq372vli8nm3na14.apps.googleusercontent.com";
var developerKey = 'AIzaSyBoqQcYKfBaH_Ws17D6Nl_1Y29Sj7SY3ZE';
var appId = "923031236522";
var oauthToken;


function initClient() {


    gapi.client.init({
        'clientId': client_id,
        'scope': scope

    }).then(function () {

        $("#signInButton").show();

        var div, options, browser;

        div = $("#myDiv")[0];
        options = {

            genome: "hg19",
            locus: 'myc',
            apiKey: 'AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0',
            tracks: [
                {
                    url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed",
                    name: "Genes",
                    order: 10000
                }
            ]
        };

        browser = igv.createBrowser(div, options);

        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    })

}


function handleSignInClick(event) {

}

function updateSigninStatus(isSignedIn) {

    var user = gapi.auth2.getAuthInstance().currentUser.get();
    igv.setGoogleOauthToken(user.getAuthResponse().access_token);
    oauthToken = user.getAuthResponse().access_token;
}

function signOut() {

    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        igv.setGoogleOauthToken(undefined);
        console.log('User signed out.');
    });
}

function onPickerApiLoad() {
    pickerApiLoaded = true;
    //createPicker();
}

// Create and render a Picker object for picking user Photos.
function createPicker() {
    var view,
        picker;

    if (oauthToken) {

        view = new google.picker.View(google.picker.ViewId.DOCS);

        picker = new google.picker
            .PickerBuilder()
            .setAppId(appId)
            .setOAuthToken(oauthToken)
            .addView(view)
            .setDeveloperKey(developerKey)
            .setCallback(pickerCallback)
            .build();

        picker.setVisible(true);
    }
}

// A simple callback implementation.
function pickerCallback(data) {
    var url, doc, name, format;

    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
        doc = data[google.picker.Response.DOCUMENTS][0];
        url = doc[google.picker.Document.URL];
        name = doc[google.picker.Document.NAME];

        format = igv.inferFileFormat(name);

        if(!format) {
            alert("Unrecognized file format: " + name);
        }
        else {
            igv.browser.loadTrack({
                url: url,
                name: name,
                format: format
            })
        }
    }

}
