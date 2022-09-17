const xlsx = require("xlsx");
const express = require('express')

const file = xlsx.readFile("병역지정업체검색_20220918.xls")

const app = express();

app.get('/', function (req, res) {
    // Set the header
    res.append('Content-Type', 'text/html; charset=utf-8');
    
    // Convert excel sheet into json
    const json = xlsx.utils.sheet_to_json(file.Sheets[file.SheetNames[0]]);

    // Print the value
    json.forEach((row) => {
        res.write("<p>" + row['업체명'] + ' : ' + row['주소'] + "</p>");
    });
    res.end();
});

app.listen(3000, () => {
    console.log("Starting the server..")
});
