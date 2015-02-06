var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var qs = require('querystring');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var tls = require('tls');
tls.checkServerIdentity = function (host, cert) {
    return undefined;
};
//var config = require('./config.json');

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

function getMap(featureID, service) {
    var theData = fs.readFileSync('./map.json', 'utf-8', function (err, data) {
        if (err) {
            return console.log(err);
        };
        return data;
    });
    //theData = theData.replace(/^\s+|\s+$/g, '');
    console.log(theData);
    var theJSON = JSON.parse(theData);
    console.log(theJSON);
    var theMapID = theJSON[service][featureID]
    try {
        var key = theJSON['map'][theMapID][service];
    }
    catch(e) {
        var key = undefined;
    }
    //key = key.replace(/^\s+|\s+$/g, '');
    return key;
}

function addMap(featureID, service, mapToID) {
    var theData = fs.readFileSync('./map.json', 'utf-8', function (err, data) {
        if (err) {
            return console.log(err);
        };
        return data;
    });
    //theData = theData.replace(/^\s+|\s+$/g, '');
    console.log(theData);
    var theJSON = JSON.parse(theData);
    console.log(theJSON);
    console.log('adding ahaID: ' + featureID);
    var idString = uuid.v4();
    while (theJSON[idString] !== undefined) {
        idString = uuid.v4();
    };
    if(service === 'aha') {
        theJSON['map'][idString] = {"aha": featureID, "twpm": mapToID};
        theJSON['aha'][featureID] = idString;
        theJSON['twpm'][mapToID] = idString;
    };
    if(service === 'twpm') {
        theJSON['map'][idString] = {"twpm": featureID, "aha": mapToID};
        theJSON['aha'][mapToID] = idString;
        theJSON['twpm'][featureID] = idString;
    };
    fs.writeFile('./map.json', JSON.stringify(theJSON,undefined,2), function (err) {
        if(err) throw err;
    });
    return theJSON[service];
}

function getKey(service) {
    var theData = fs.readFileSync('./config.json', 'utf-8', function (err, data) {
        if (err) {
            return console.log(err);
        };
        return data;
    });
    //theData = theData.replace(/^\s+|\s+$/g, '');
    console.log(theData);
    console.log(typeof theData);
    var theJSON = JSON.parse(theData);
    console.log(theJSON);
    var key = theJSON[service];
    console.log(key);
    return key
    //return config[service];
};

function getTwpmTask (taskID, theResponse) {
    var twpmKey = getKey('twpm');
    var buff = new Buffer(twpmKey + ':X');
    var authStr = buff.toString('base64');
    var options = {
        host: 'clients.pint.com',
        json: true,
        path: '/tasks/taskID.json',
        method: 'GET',
        followRedirect: true,
        checkServerIdentity: tls.checkServerIdentity(),
        headers: {}
    };
    options['headers']['Authorization'] = 'Basic ' + authStr;
    var httpReq = https.request(options, function (response) {
        var str = '';
        response.on('data', function(chunk) {
            str += chunk;
        });
        response.on('end', function () {
            theResponse.write('<!DOCTYPE html><head></head><body>');
            theResponse.write(str);
            theResponse.write('</body></html>');
            theResponse.end();
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.end();
}

function getAhaFeature (featureID, baseURL) {
    var ahaKey = getKey('aha');
    console.log('featureID1: ' + featureID);
    var buff = new Buffer(ahaKey);
    var authStr = buff.toString('base64');
    //console.log(authStr);
    var options = {
        host: baseURL,
        path: '/api/v1/features/' + featureID,
        port: 443,
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
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
            console.log('aha response: ' + JSON.stringify(str));
            var ahaResp = JSON.parse(str);
            var featureID = ahaResp['feature']['reference_num'];
            var ahaTwpmMap = getMap(featureID, 'aha');
            if(typeof ahaTwpmMap === 'undefined') {
                var reqObject = {'todo-item': {
                    'content': ahaResp['feature']['name'],
                    'description': ahaResp['feature']['description']['body'].replace(/(<([^>]+)>)/ig,""),
                    'responsible-party-id': '86917',
                    'start-date': '',
                    'due-date': '',
        //            'estimated-minutes': '99',
                    'creator-id': '84418',
                    'responsible-party-ids': '86917'
                    }
                };
                if(featureID.indexOf('ZINGCHART') >= 0) {
                    reqObject['todo-item']['content'] = 'PINT - ZingChart Development: ' + reqObject['todo-item']['content'];
                    var taskListID = 598932;
                };
                if(featureID.indexOf('ZINGGRID') >= 0) {
                    reqObject['todo-item']['content'] = 'ZingGrid Development: ' + reqObject['todo-item']['content'];
                    var taskListID = 598933;
                };
                if(featureID.indexOf('LF') >= 0) {
                    reqObject['todo-item']['content'] = 'WebSystems3 - Mobile Commerce Enhancement: ' + reqObject['todo-item']['content'];
                    var taskListID = 598940;
                };
                console.log('featureID3: ' + featureID);
                var twpmID = createTWPMTask(taskListID, featureID, reqObject ,function(ahaID, respTaskID, func) {

                    console.log('key: ' + ahaID + ', value:' + respTaskID);
                    console.log('featureID: ' + featureID);
                    func(ahaID, 'aha', respTaskID);
                });
            };
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.end();
}

function getAhaComment(commentID, baseURL) {
    var ahaKey = getKey('aha');
    console.log('featureID1: ' + featureID);
    var buff = new Buffer(ahaKey);
    var authStr = buff.toString('base64');
    //console.log(authStr);
    var options = {
        host: baseURL,
        path: '/api/v1/comments/' + featureID,
        port: 443,
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
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
            console.log(str);
        });
    });
};

function postAhaComment(featureID, baseURL, reqObject) {
    var ahaKey = getKey('aha');
    console.log('featureID1: ' + featureID);
    var buff = new Buffer(ahaKey);
    var authStr = buff.toString('base64');
    //console.log(authStr);
    var options = {
        host: baseURL,
        path: '/api/v1/features/' + featureID + '/comments',
        port: 443,
        method: 'POST',
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
            'Content-Length': JSON.stringify(reqObject).length,
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
            console.log('twpm response: ' + JSON.stringify(str));
            var ahaResp = JSON.parse(str);
            /*var ahaTwpmMap = getMap(featureID, 'aha');
            var newObject = {'comment': {
                'body': reqObject['body'],
                'user': {'email': 'tpowell@pint.com'}
                }
            };
            */
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(JSON.stringify(reqObject));
    httpReq.end();
}

function testSlack (theResponse) {
    var attachJson = JSON.parse('[{"pretext": "pre-hello","text":"text-world"}]');
    var reqObject = {
        token: '',
        channel: 'metester',
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
            /*'Accept': 'application/json',
            'Content-Type': 'application/json',*/
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': ''
        }
    };
    createSlackPost(reqObject,reqOptions, theResponse);
};

function createSlackPost (reqObject, reqOptions, theResponse){
    var options = reqOptions;
    var requestObject = reqObject;
    //requestObject['token'] = getKey('slack');
    //var params = JSON.stringify(requestObject);
    var params = 'token=' + getKey('slack');
    for(i in requestObject) {
        params += '&' + i + '=' + requestObject[i]; 
    }
    console.log('params: ', params);
    console.log(params.length);
    options['headers']['Content-Length'] = params.length;
    console.log('options: ', JSON.stringify(options));
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
    console.log('request body: ' + httpReq.body);
    httpReq.end();
};

function createTWPMTask (taskListID, theRequest, reqObject, callback2) {
    var options = {
                host: 'clients.pint.com',
                json: true,
                path: '/tasklists/' + taskListID + '/tasks.json',
                method: 'POST',
                followRedirect: true,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': '',
                    'Authorization': ''
                    }
                };
    console.log('options' + JSON.stringify(options));
    console.log('theRequestID: ' + theRequest);
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
    	    str += chunk;
            console.log('data received: ');
    	});
    	response.on('end', function () {
            console.log('hit request end');
            console.log('tw response: ' + str);
            console.log(response.statusCode);
            var twpmJson = JSON.parse(str);
            callback2(theRequest, twpmJson['id'], addMap);
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(params);
    httpReq.end();
};

function getTwpmComment(commentID, callback) {
    console.log('in getTwpmComment');
    var options = {
                host: 'clients.pint.com',
                json: true,
                path: '/comments/' + commentID + '.json',
                method: 'GET',
                followRedirect: true,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': '',
                    'Authorization': ''
                    }
                };
    console.log('options' + JSON.stringify(options));
    var twpmKey = getKey('twpm');
    var buff = new Buffer(twpmKey + ':X');
    var authStr = buff.toString('base64');
    console.log('encrypted: ' + authStr);
    console.log('unencrypted: ' + new Buffer(authStr, 'base64').toString());
    options['headers']['Authorization'] = 'Basic ' + authStr;
    var httpReq = http.request(options, function (response) {
    var str = '';
    response.on('data', function(chunk) {
            str += chunk;
            console.log('data received: ');
        });
        response.on('end', function () {
            console.log('hit request end');
            console.log('tw response: ' + str);
            console.log(response.statusCode);
            var twpmJson = JSON.parse(str);
            callback(twpmJson['commentable-id'], 'pint.aha.io', twpmJson);
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.end();
};

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
    }
	else {
	    res.end('Webhook received');
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
    };
    if(req.query['q'] === 'test') {
        var inboundJson = JSON.parse(req.body);
        console.log(JSON.stringify(inboundJson));
        if(req.query['s'] === 'twpm') {
            //getTwpmTask(3317039, res);
            getTwpmComment(1352164);
        };
        if(req.query['s'] === 'aha') {
            var auditUrl = inboundJson['audit']['auditable_url'];
            if(typeof auditUrl !== 'undefined') {
                console.log(auditUrl);
                var pathList = url.parse(auditUrl).pathname.split('/');
                console.log(JSON.stringify(pathList));
                console.log(pathList[pathList.length - 1]);
                if(inboundJson['audit']['auditable_type'] === 'feature') {
                    getAhaFeature(pathList[pathList.length - 1], inboundJson['audit']);
                };
                if(inboundJson['audit']['auditable_type'] === 'comment') {
                    getAhaComment(pathList[pathList.length - 1], inboundJson['audit']['auditable_id']);
                };
            };
        };
        if(req.query['s'] === 'slack') {
            testSlack(res);
        };
    }

    req.on('end', function() {
        res.writeHead(200,{'Content-Type': 'text/html'}); 
        res.end('<!DOCTYPE html><head></head><body>Request Received</body>');
    });
    req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
    });
    res.end();
});

app.get('/test', function (req, res) {
    var body = '';
    req.on('data', function(chunk) {
        body += chunk;
    });
    var reqBody = JSON.parse(req.body);
    if(req.query['q'] === 'twpm') {
        //getTwpmTask(3317039, res);
        getTwpmComment(1352164, getTwpmComment);
    };
    if(req.query['q'] === 'aha') {
        console.log('hit it');
        var testJson = {"event":"audit",
            "audit":{
                "id":"6109944855961868591",
                "audit_action":"create",
                "created_at":"2015-01-30T01:46:33Z",
                "interesting":true,
                "user":{
                    "id":"5961857441598602203",
                    "name":"Thomas Powell",
                    "email":"tpowell@pint.com"
                },
                "auditable_type":"feature",
                "auditable_id":"6109944855963418085",
                "description":"added feature ZINGCHART-3 Pictograph Module",
                "auditable_url":"https://pint.aha.io:443/features/ZINGCHART-3",
                "changes":[
                    {"field_name":"Release","value":"ZINGCHART-R-10 Parking Lot"},
                    {"field_name":"Reference num","value":"ZINGCHART-3"},
                    {"field_name":"Created by user","value":"Thomas Powell"},
                    {"field_name":"Rank","value":1},
                    {"field_name":"Name","value":"Pictograph Module"},
                    {"field_name":"Type","value":"New"},
                    {"field_name":"Score","value":0},
                    {"field_name":"Assigned to user","value":"Default assignee"},
                    {"field_name":"Show feature remaining estimate","value":true},
                    {"field_name":"Workflow status","value":"Under consideration"},
                    {"field_name":"Type","value":"New"}
                ]
            }
        };
        console.log(JSON.stringify(testJson));
        var auditUrl = testJson['audit'];
        if(req.query['company'] === 'pint') {
            //getAhaFeature('ZINGCHART-23', 'pint.aha.io');
            //postAhaComment('ZINGCHART-130', 'pint.aha.io', testObject);
            getAhaComment('6112813352982662954', 'pint.aha.io');
        }
        if(req.query['company'] === 'coopervision') {
            getAhaFeature('LF-78', 'websystem3.aha.io');
        }
    };
    if(req.query['q'] === 'slack') {
        testSlack(res);
    };
    req.on('end', function() {
        res.writeHead(200,{'Content-Type': 'text/html'});
        res.end('<!DOCTYPE html><head></head><body>Request Received</body>');
    });
});
// Implement per your environment
app.listen(80); 
 
console.log('You got the server running, fishbulb.');
