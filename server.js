var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var qs = require('querystring');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
// Uncomment to implement Mongoose
/*
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://127.0.0.1:27017/aha_twpm');
mongoose.connection.once('connected', function () {
    console.log("connected to aha_twpm database");
});
*/
//app.use('/aha', bodyParser.urlencoded({extended: true}));
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({extended: false});
var textParser = bodyParser.text({ type: 'application/x-www-form-urlencoded'});
//app.use('/aha', bodyParser.text());
//app.use('/twpm', bodyParser.json());
app.use(bodyParser.text({ type: 'application/x-www-form-urlencoded'}));
app.use(bodyParser.json({type: 'application/json'}));
//app.use(bodyParser.json({type: 'application/vnd.api+json'}));


app.use(function (req, res, next) {
//    console.log(req.headers);
    next();
});

function getKey(service) {
    var theData = fs.readFileSync('./config.json', 'utf-8', function (err, data) {
        if (err) {
            return console.log(err);
        };
        return data;
    });
    theData = theData.replace(/^\s+|\s+$/g, '');
    console.log(theData);
    var theJSON = JSON.parse(theData);
    console.log(theJSON);
    var key = theJSON[service];
    key = key.replace(/^\s+|\s+$/g, '');
    return key
};

function getAhaFeature (featureID, theResponse, reqObject, reqOptions) {
    var ahaKey = getKey('aha');
    console.log(ahaKey);
    var buff = new Buffer(ahaKey);
    var authStr = buff.toString('base64');
    console.log(authStr);
    var options = {
        host: 'websystem3.aha.io',
        path: '/api/v1/features/' + featureID + '.json',
        port: 443,
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
            'Content-Length': 0,
            'Authorization': 'Basic ' + authStr,
            'User-Agent': 'Test Integration Script (mmiraglia@pint.com)'
        }
    };
    var httpReq = https.request(options, function (response) {
        var str = '';
        response.on('data', function(chunk) {
            str += chunk;
            console.log('data received: ');
        });
        response.on('end', function () {
            console.log('hit request end');
            console.log(str);
            console.log(response.statusCode);
            /*theResponse.write('<!DOCTYPE html><head></head><body>');
            theResponse.write(str);
            theResponse.write('</body></html>');
            theResponse.end();*/
            var featureJSON = JSON.parse(str);
            reqObject['todo-item']['description'] = featureJSON['feature']['description']['body'];
            createTWPMTask (reqObject, reqOptions, theResponse);
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.end();
}

function testSlack (theResponse) {
    var attachJson = JSON.parse('[{"pretext": "pre-hello","text":"text-world"}]');
    var reqObject = {
        token: '',
        channel: 'C039EEZEW',
        text: 'Test from node server',
        username: 'TestBot',
        parse: 'full',
        /*attachments: attachJson,*/
        unfurl_links: true,
        unfurl_media: false
    };
    var reqOptions = {
        host: 'slack.com',
        json: true,
        port: 443,
        path: '/api/chat.postMessage',
        method: 'POST',
        followRedirect: true,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Content-Length': ''
        }
    };
    createSlackPost(reqObject,reqOptions, theResponse);
};

function createSlackPost (reqObject, reqOptions, theResponse){
    var options = reqOptions;
    var requestObject = reqObject;
    requestObject['token'] = getKey('slack');
    var params = JSON.stringify(requestObject);
    console.log('params: ', JSON.stringify(params));
    console.log('options: ', JSON.stringify(options));
    console.log(params.length);
    options['headers']['Content-Length'] = params.length;
    var httpReq = https.request(options, function (response) {
        console.log("statusCode: ", response.statusCode);
        console.log('headers: ', response.headers);
        var str = '';
        response.on('data', function(chunk) {
//      response.on('data', function(data) {
//            str += data;
            str += chunk;
            console.log('data received: ');
        });
        response.on('end', function () {
            console.log('hit request end');
            console.log(str);
            console.log(response.statusCode);
            theResponse.write('<!DOCTYPE html><head></head><body>');
            theResponse.write(str);
            theResponse.write('</body></html>');
            theResponse.end();
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(params);
    httpReq.end();
};

function createTWPMTask (reqObject, reqOptions, theResponse) {
    var options = reqOptions;
    console.log(JSON.stringify(options));
    var twpmKey = getKey('twpm');
    var buff = new Buffer(twpmKey + ':X');
    var authStr = buff.toString('base64');
    console.log('encrypted: ' + authStr);
    console.log('unencrypted: ' + new Buffer(authStr, 'base64').toString());
    options['headers']['Authorization'] = 'Basic ' + authStr;
    var params = JSON.stringify(reqObject);
    options['headers']['Content-Length'] = params.length;
    console.log(JSON.stringify(options));
    console.log('should be params: ' + params);
    var httpReq = http.request(options, function (response) {
    	var str = '';
    	response.on('data', function(chunk) {
//    	response.on('data', function(data) {
//            str += data;
    	    str += chunk;
            console.log('data received: ');
    	});
    	response.on('end', function () {
            console.log('hit request end');
            console.log(str);
            console.log(response.statusCode);
            theResponse.write('<!DOCTYPE html><head></head><body>');
            theResponse.write(str);
            theResponse.write('</body></html>');
            theResponse.end();
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(params);
    httpReq.end();
};

app.get('/test', function (req, res) {
    testSlack(res);
    /*var taskObject = {'todo-item': {
      	'content': 'test task',
        'description': 'test description',
        'responsible-party-id': '86917',
        'start-date': '20140901',
        'due-date': '20140902',
        'estimated-minutes': '99',
        'creator-id': '82200',
        'responsible-party-ids': '86917'
        }
    };
    var taskOptions = {
    	host: 'clients.pint.com',
//    	host: 'requestb.in',
        json: true,
    	path: '/tasklists/562384/tasks.json',
//    	path: '/116rwi21',
    	method: 'POST',
        followRedirect: true,
    	headers: {
    	    'Accept': 'application/json',
    	    'Content-Type': 'application/json',
            'Content-Length': '',
    	    'Authorization': ''
        }
    };
    res.writeHead(200,{'Content-Type': 'text/html'});
    //createTWPMTask(taskObject, taskOptions, res);
    getAhaFeature('WEB3-59', res);
    */
});

app.post('/hookcatch', function (req, res) { 
    console.log('*****');
    console.log('initial url: ' + req.url);
    console.log('req method: ' + req.method);
    var body = '';
//    req.headers['Content-Type'] = 'text/plain';
    req.on('data', function(chunk) {
	    body += chunk;
    });
    for(key in req.headers) {
        console.log(key + ': ' + req.headers[key]);
    };
    console.log('body: \n' + req.body);
    console.log('querystring: ' + req.query);
    if(req.query['q'] === 'aha') {
        var wholeBody = JSON.parse(req.body);
        console.log(wholeBody);
        res.writeHead(200,{'Content-Type': 'text/html'});
	    if(wholeBody['audit']['auditable_type'] === 'feature') {
            if(wholeBody['audit']['audit_action'] === 'create') {
                for (i=0;i<wholeBody['audit']['changes'].length;i++) {
                    if (wholeBody['audit']['changes'][i]['field_name'] === 'Reference num') {
                        var featureValue = wholeBody['audit']['changes'][i]['value'];
                    };
                };
                console.log('shold create task here');
                var taskObject = {'todo-item': {
              	'content': '',
                'description': JSON.stringify(wholeBody),
                'responsible-party-id': '86917',
/*
                'start-date': 
                 wholeBody.feature.release.start_date.replace(/-/g, ''),
                'due-date':
                 wholeBody.feature.release.release_date.replace(/-/g, ''),
*/
                'start-date': '',
                'due-date': '',
    //            'estimated-minutes': '99',
                'creator-id': '84418',
                'responsible-party-ids': '86917'
                }
                };
		for(i=0;i<wholeBody['audit']['changes'].length;i++) {
		    if(wholeBody['audit']['changes'][i]['field_name']==='Name'){
			taskObject['todo-item']['content'] = wholeBody['audit']['changes'][i]['value'];
		    };
		};
                var taskOptions = {
            	host: 'clients.pint.com',
                json: true,
            	path: '/tasklists/562384/tasks.json',
            	method: 'POST',
                followRedirect: true,
            	headers: {
            	    'Accept': 'application/json',
            	    'Content-Type': 'application/json',
                    'Content-Length': '',
            	    'Authorization': ''
                    }
                };
                getAhaFeature (featureValue, res, taskObject, taskOptions)
                //createTWPMTask (taskObject, taskOptions, res);
                //console.log('feature: ' + wholeBody.feature.name);
            }
	}
	else {
	    res.end('Webhook received');
	};
    };
    if(req.query['q'] === 'twpm') {
        var wholeBody = decodeURI(req.body);
        console.log(typeof wholeBody);
        for(key in req.query) {
            console.log(key + ': ' + req.query[key]);
        };
        var parameters = {}, temp, queries;
        queries = wholeBody.split('&');
        console.log('queries length: ' + queries.length);
        for(i=0;i<queries.length;i++) {
            temp = queries[i].split('=');
            parameters[temp[0]] = temp[1];
        };
        console.log(JSON.stringify(parameters));
        console.log('should update aha feature here');
    };

        if(req.query['q'] === 'slack') {
            testSlack(res);
        /*
        var wholeBody = decodeURI(req.body);
        console.log(typeof wholeBody);
        for(key in req.query) {
            console.log(key + ': ' + req.query[key]);
        };
        var parameters = {}, temp, queries;
        queries = wholeBody.split('&');
        console.log('queries length: ' + queries.length);
        for(i=0;i<queries.length;i++) {
            temp = queries[i].split('=');
            parameters[temp[0]] = temp[1];
        };
        console.log(JSON.stringify(parameters));
        console.log('should update twpm feature here');
        */
    };

    req.on('end', function() {
        res.writeHead(200,{'Content-Type': 'text/html'}); 
        res.end('<!DOCTYPE html><head></head><body>'+body+'</body>');
    });
    req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
    });
    res.end();
});
// Implement per your environment
app.listen(8002); 
 
console.log('You got the server running, fishbulb.');
