function testOauth() {

    var url = "https://accounts.google.com/o/oauth2/auth?" +
        "scope=https://www.googleapis.com/auth/genomics&" +
        "state=%2Fprofile&" +
        "redirect_uri=http%3A%2F%2Flocalhost%2Figv-web%2FemptyPage.html&" +
        "response_type=token&" +
        "client_id=661332306814-8nt29308rppg325bkq372vli8nm3na14.apps.googleusercontent.com";


    $.ajax(url, {

        success: function (data, status, xhr) {
            console.log(status);
        },
        error: function (xhr, options, e) {
            var statusCode =  xhr.statusCode();
            console.log(xhr.getResponseHeader("location"));
        },
        complete: function (xhr, status) {
            console.log(status);
        }
    });


}