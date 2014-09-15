<?php

header('Content-type: gibberish');

$data = file_get_contents("php://input");

echo($data);

?>
