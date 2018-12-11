/**
 * Created by jrobinso on 6/2/18.
 */


function initClient() {

    var scope = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/genomics https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";

    let browser;

    igv.google.loadGoogleProperties("https://s3.amazonaws.com/igv.org.app/web_client_google")

        .then(function (properties) {

            return gapi.client.init({
                'clientId': properties["client_id"],
                'scope': scope
            });
        })
        
        .then(function (ignore) {
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        })

        .then(function () {

            var div, options;

            div = $("#myDiv")[0];
            options = {
                genome: "hg19",
                apiKey: igv.google.properties["api_key"],
                queryParametersSupported: true
            };

            igv.createBrowser(div, options)
                .then(function (b) {
                    igv.browser = b;
                })

            
        })

    //
    // function handleSignInClick(event) {
    //     // Nothing to do
    // }

    function updateSigninStatus(isSignedIn) {

        if (isSignedIn) {
            //$("#signInButton").hide();

            var user = gapi.auth2.getAuthInstance().currentUser.get();
            var profile = user.getBasicProfile();
            var username = profile.getName();
            $("#switchUserLink").html("Logged in as: " + username);

        }

    }

}



// Create and render a Picker object for picking files.
function createPicker() {
    var view, view2, accessToken;

    getAccessToken()

        .then(function (accessToken) {

            if (accessToken) {

                view = new google.picker.DocsView(google.picker.ViewId.DOCS);
                view.setIncludeFolders(true)

                view2 = new google.picker.DocsView(google.picker.ViewId.DOCS);
                view2.setEnableTeamDrives(true);
                view2.setIncludeFolders(true)



                picker = new google.picker
                    .PickerBuilder()
                    .setAppId(igv.google.properties["project_number"])
                    .setOAuthToken(igv.oauth.google.access_token)
                    .addView(view)
                    .addView(view2)
                    .setDeveloperKey(igv.google.properties["developer_key"])
                    .setCallback(pickerCallback)
                    .enableFeature(google.picker.Feature.SUPPORT_TEAM_DRIVES)
                    .build();

                picker.setVisible(true);
            }
            else {
                igv.browser.presentAlert("Sign into Google before using picker");
            }
        })
        .catch(function (error) {
            console.log(error)
        })


    function getAccessToken() {

        if (igv.oauth.google.access_token) {
            return Promise.resolve(igv.oauth.google.access_token);
        } else {
            return signIn();
        }
    }


    function signIn() {

        var scope, options;

        scope = "https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";

        options = new gapi.auth2.SigninOptionsBuilder();
        //options.setAppPackageName('com.example.app');
        options.setPrompt('select_account');
        options.setScope(scope);

        return gapi.auth2.getAuthInstance().signIn(options)

            .then(function (user) {

                var authResponse = user.getAuthResponse();

                igv.setGoogleOauthToken(authResponse["access_token"]);

                return authResponse["access_token"];
            })
    }

    function switchUser() {
        bookmark();
        signIn();
    }

    function pickerCallback(data) {
        var url, doc, name, format, id, downloadURL;

        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            doc = data[google.picker.Response.DOCUMENTS][0];
            url = doc[google.picker.Document.URL];
            name = doc[google.picker.Document.NAME];
            id = doc[google.picker.Document.ID];

           /// format = igv.inferFileFormat(name);

           // if (!format) {
           //     alert("Unrecognized file format: " + name);
           // }
           // else {

                downloadURL = "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media";

                igv.browser.loadSession({
                    url: downloadURL,
                    filename: name,
                    //name: name,
                    //format: format
                })
           // }
        }

    }
}

function bookmark() {

    var surl,
        path,
        idx;

    path = window.location.href.slice();
    idx = path.indexOf("?");

    surl = (idx > 0 ? path.substring(0, idx) : path) + "?sessionURL=blob:" + igv.browser.compressedSession();

    window.history.pushState({}, "IGV", surl);
}


