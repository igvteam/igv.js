<?php

// TODO -- check host name and protect from external use

$data = file_get_contents("php://input");

$filename = tempnam("../tmp", "tmp");

file_put_contents($filename, $data); //$data);

echo(pathinfo($filename, PATHINFO_FILENAME));

?>
