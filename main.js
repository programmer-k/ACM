require('dotenv').config();
const xlsx = require("xlsx");
const express = require('express')
const request = require('request')


const file = xlsx.readFile("병역지정업체검색_20220918.xls")
const app = express();


function requestGeocoding() {
    const address = encodeURI('서울특별시 중구 퇴계로22길11-8');
    const options = {
        uri:'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=' + address,
        headers: {
            'X-NCP-APIGW-API-KEY-ID': process.env.KEY_ID,
            'X-NCP-APIGW-API-KEY': process.env.KEY
        }
      }
      request(options, (err, response, body) => {
        //console.log(err);
        //console.log(response);
        console.log(body);
      });
}


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
    requestGeocoding();
});
