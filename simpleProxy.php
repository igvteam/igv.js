<?php

// TODO -- check host name and protect from external use

// Uncomment the block below if deploying this file to a remote server (i.e. origin different than calling js).

// Allow from any origin
//header("Access-Control-Allow-Origin: *");
//header('Access-Control-Allow-Credentials: true');
//header('Access-Control-Allow-Headers:  RANGE, Cache-control, If-None-Match, Content-Type');
//
//
//
//// respond to preflights
//if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
//   // return only the headers and not the content
//   // only allow CORS if we're doing a GET - i.e. no saving for now.
//    header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); //..
//    header('Access-Control-Max-Age: 3600');
//  exit(0);
//}

//$url = "http://t2dgenetics.org/mysql/rest/server/trait-search";

parse_str(file_get_contents("php://input"));


// Simple echo script for post requests to get around same-origin policy when server headers are no an option.
// Note -- for development only, do not use this in production without verifying content and request origins, etc.


//$url = "http://t2dgenetics.org/mysql/rest/server/trait-search";
//$data = file_get_contents("php://input");
parse_str(file_get_contents("php://input"));

$params = array('http' => array(
               'method' => 'GET',
               'header' => 'Content-type: application/json'
            ));

$ctx = stream_context_create($params);

$response = gzencode(file_get_contents($url, false, $ctx));

if ($response === false) {
    throw new Exception("Problem reading data from $url, $php_errormsg");
    echo("Problem reading data from $url, $php_errormsg");
} else {
    echo( $response);
}


?>