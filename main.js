require('dotenv').config();
const xlsx = require("xlsx");
const express = require('express');
const request = require('request');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { resolve } = require('path');


const app = express();


async function requestGeocoding(addressString) {
    const address = encodeURI(addressString);
    const options = {
        uri:'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=' + address,
        headers: {
            'X-NCP-APIGW-API-KEY-ID': process.env.KEY_ID,
            'X-NCP-APIGW-API-KEY': process.env.KEY
        }
      }


      return new Promise((resolve) => {
        request(options, (err, response, body) => {
            //console.log(err);
            //console.log(response);
            //console.log(body);
            resolve(body);
          });
      });
}


function crawl(grad) {
    (async () => {
        const browser = await puppeteer.launch({slowMo: 100});
        const page = await browser.newPage();
        page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
        });
        await page.goto('https://work.mma.go.kr/caisBYIS/search/byjjecgeomsaek.do');
        
        if (!grad)
            // Set to '산업기능요원' for '복무형태'
            await page.select('select#eopjong_gbcd', '1');
        else
            // Set to '전문연구요원' for '복무형태'
            await page.select('select#eopjong_gbcd', '2');
        
        if (!grad)
        // Check '정보처리' for '업종선택
        await page.click('#eopjong_cd13');

        // Click submit button ('조회')
        await page.click('p > span.icon_search > a');

        // Variable to store all links to company
        let links = [];

        let pageLimit = 0;
        if (!grad)
            pageLimit = 8;
        else
            pageLimit = 22;
        for (let i = 0; i <= pageLimit; i++) {
            for (let j = 3; j <= 12; j++) {
                // Wait until the response came out
                await page.waitForSelector('th.title.t-alignLt a');

                // Collect the links
                // TODO: I do not understand the following code.
                const currentLinks = await page.$$eval('th.title.t-alignLt a', links => links.map(a => a.href));
                links = links.concat(currentLinks);
                console.log(currentLinks);

                if (i == 8 && j == 11)
                    break;

                // Visit next page
                const pageNumberElements = await page.$$('div.page_move_n a');
                await pageNumberElements[j].click();
            }
        }

        console.log(links);
        console.log("length", links.length);
        
        //const xlsxFile = xlsx.writeFile("병역지정업체검색_20220918.csv")
        let contents = 'Company Name,Address\n';
        for (const link of links) {
            await page.goto(link);
            await page.waitForSelector('table.table_row tbody tr td');
            const addressElement = await page.$$('table.table_row tbody tr td');
            //console.log(addressElement[1]);
            const companyName = await page.evaluate(el => el.textContent, addressElement[0]);
            const address = await page.evaluate(el => el.textContent, addressElement[1]);
            console.log(companyName, address);
            contents += companyName + ',' + address + '\n';
        };
        fs.writeFileSync('data.csv', contents);
        //fs.close('data.csv');
    })();
}

async function writeLocation(csvFile) {
    let contents = 'Address\n';
    let data = fs.readFileSync(csvFile);
    let lines = data.toString().split('\n').slice(1);
    let location = [];
    for (line of lines) {
        const address = line.split(',')[1];
        console.log(line);
        try {
            const ret = JSON.parse(await requestGeocoding(address));
            console.log(ret);
            //console.log(JSON.parse(ret).addresses);
            contents += line + "," + ret['addresses'][0]['x'] + "," + ret['addresses'][0]['y'] + '\n';
        } catch (err) {

        }
    }

    fs.writeFileSync('lat.csv', contents);
}


app.get('/', function (req, res) {
    // Set the header
    res.append('Content-Type', 'text/html; charset=utf-8');

    // Convert excel sheet into json
    //const json = xlsx.utils.sheet_to_json(file.Sheets[file.SheetNames[0]]);

    // Print the value
    /*json.forEach((row) => {
        res.write("<p>" + row['업체명'] + ' : ' + row['주소'] + "</p>");
    });
    res.end();*/

    let htm = fs.readFileSync('main.html', {encoding:'utf8', flag:'r'}).toString();
    res.write(htm);

    //res.sendFile(path.join(__dirname, '/main.html'));
    let data = fs.readFileSync('lat_undergrad.csv', {encoding:'utf8', flag:'r'}).toString();
    data = data.split('\n').slice(1);
    //data.
    //console.log(data);
    let cnt = 1;
    for (line of data) {
        let spli = line.split(',');
        let alt = spli[spli.length - 1];
        let log = spli[spli.length - 2];
        console.log(line);
        
        if (alt == undefined || log == undefined)
            break;
        res.write('var marker' + cnt.toString() + ' = new naver.maps.Marker({position: new naver.maps.LatLng(' + alt + "," + log +' ), map: map});\n');

        res.write("var contentString" + cnt.toString() + " = [");
        res.write("    '<div class=\"iw_inner\">',");
        res.write("    '   <h4>" + spli[0] + "</h4>',");
        //res.write("    '   <p>서울특별시 중구 태평로1가 31 | 서울특별시 중구 세종대로 110 서울특별시청',");
        //res.write("    '   </p>',");
        res.write("    '</div>'");
        res.write("].join('');");

        res.write("var infowindow" + cnt.toString() + " = new naver.maps.InfoWindow({");
        res.write("    content: contentString" + cnt.toString());
        res.write("});");

        res.write('naver.maps.Event.addListener(marker' + cnt.toString() + ', "click", function(e) {\n');
        res.write('    if (infowindow' + cnt.toString() + '.getMap()) {');
        res.write('        infowindow' + cnt.toString() + '.close();');
        res.write('    } else {');
        res.write('        infowindow' + cnt.toString() + '.open(map, marker' + cnt.toString() + ');');
        res.write('    }');
        res.write('});');

        res.write("infowindow" + cnt.toString() + ".open(map, marker" + cnt.toString() + ");");
        cnt += 1;
    }



    let htm2 = fs.readFileSync('main2.html', {encoding:'utf8', flag:'r'}).toString();
    res.write(htm2);
    res.end();
    //res.write()
});

app.get('/grad', function (req, res) {
    // Set the header
    res.append('Content-Type', 'text/html; charset=utf-8');

    // Convert excel sheet into json
    //const json = xlsx.utils.sheet_to_json(file.Sheets[file.SheetNames[0]]);

    // Print the value
    /*json.forEach((row) => {
        res.write("<p>" + row['업체명'] + ' : ' + row['주소'] + "</p>");
    });
    res.end();*/

    let htm = fs.readFileSync('main_grad.html', {encoding:'utf8', flag:'r'}).toString();
    res.write(htm);

    //res.sendFile(path.join(__dirname, '/main.html'));
    let data = fs.readFileSync('lat_grad.csv', {encoding:'utf8', flag:'r'}).toString();
    data = data.split('\n').slice(1);
    //data.
    //console.log(data);
    let cnt = 1;
    for (line of data) {
        let spli = line.split(',');
        let alt = spli[spli.length - 1];
        let log = spli[spli.length - 2];
        console.log(line);
        
        if (alt == undefined || log == undefined)
            break;
        res.write('var marker' + cnt.toString() + ' = new naver.maps.Marker({position: new naver.maps.LatLng(' + alt + "," + log +' ), map: map});\n');

        res.write("var contentString" + cnt.toString() + " = [");
        res.write("    '<div class=\"iw_inner\">',");
        res.write("    '   <h4>" + spli[0] + "</h4>',");
        //res.write("    '   <p>서울특별시 중구 태평로1가 31 | 서울특별시 중구 세종대로 110 서울특별시청',");
        //res.write("    '   </p>',");
        res.write("    '</div>'");
        res.write("].join('');");

        res.write("var infowindow" + cnt.toString() + " = new naver.maps.InfoWindow({");
        res.write("    content: contentString" + cnt.toString());
        res.write("});");

        res.write('naver.maps.Event.addListener(marker' + cnt.toString() + ', "click", function(e) {\n');
        res.write('    if (infowindow' + cnt.toString() + '.getMap()) {');
        res.write('        infowindow' + cnt.toString() + '.close();');
        res.write('    } else {');
        res.write('        infowindow' + cnt.toString() + '.open(map, marker' + cnt.toString() + ');');
        res.write('    }');
        res.write('});');

        res.write("infowindow" + cnt.toString() + ".open(map, marker" + cnt.toString() + ");");
        cnt += 1;
    }



    let htm2 = fs.readFileSync('main2.html', {encoding:'utf8', flag:'r'}).toString();
    res.write(htm2);
    res.end();
    //res.write()
});

app.listen(3000, () => {
    console.log("Starting the server..")
    //crawl(true);
    //requestGeocoding();
    //writeLocation('data_undergrad.csv');
    //writeLocation('data_grad.csv');

});
