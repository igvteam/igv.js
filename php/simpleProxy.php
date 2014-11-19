<?php

// TODO -- check host name and protect from external use



//$url = "http://t2dgenetics.org/mysql/rest/server/trait-search";

parse_str(file_get_contents("php://input"));


$response = file_get_contents($url);

if ($response === false) {
    throw new Exception("Problem reading data from " . $url, $php_errormsg);
    echo("Problem reading data from $url, $php_errormsg");
} else {
    echo( $response);
}


?>