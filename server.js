var fs = require('fs');
var http = require('http');
var url = require('url');
var qs = require('querystring');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

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

function getTWPMKey() {
    var key = fs.readFileSync('./teamwork_key.txt', 'utf-8', function (err, data) {
        if (err) {
            return console.log(err);
        };
        return data;
    });
    return key.replace(/^\s+|\s+$/g, '');
};

function createTWPMTask (reqObject) {
    var passKey = getTWPMKey();
    console.log(passKey);
    var buff = new Buffer(passKey + ':X');
    var authStr = buff.toString('base64');
    console.log('encrypted: ' + authStr);
    console.log(JSON.stringify(reqObject));
    var parameters = JSON.stringify({'todo-item': {
      	'content': reqObject.todo-item.name,
        'description': reqObject.todo-item.body,
        'responsible-party-id': reqObject.todo-item.assigned_to_id,
        'start-date': reqObject.todo-item.start_date,
        'due-date': reqObject.todo-item.due_date,
        'estimated-minutes': reqObject.todo-item.time,
        'creator-id': reqObject.todo-item.creator_id,
        'responsible-party-ids': reqObject.todo-item.other_assigned_ids
/*
        'responsible-party-id': '86917',
        'start-date': '20140909',
        'due-date': '20140910',
        'estimated-minutes': '99',
        'creator-id': '84418',
        'responsible-party-ids': '86917'
*/
	}});
    console.log(parameters);
    var options = {
	host: 'clients.pint.com',
//	host: 'requestb.in',
	path: '/tasklists/354907/tasks.json',
//	path: '/qooc93qo',
	method: 'POST',
	headers: {
	    'Accept': 'application/json',
	    'Content-Type': 'application/json',
        'User-Agent': 'pint_integration',
	    'Authorization': 'Basic ' + authStr
        /*'Content-Length': parameters.length*/
        }
    };
    var httpReq = http.request(options, function(response) {
        console.log('STATUS: ' + response.statusCode);
        console.log('HEADERS: ' + JSON.stringify(response.headers));
        response.setEncoding('utf8');
        var body = '';
        response.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            body += chunk;
        });
    });
    httpReq.on('error', function(e) {
        console.log('request error: ' + e.message);
    });
    httpReq.write(parameters);
    httpReq.end();
};

app.get('/testfile', function (req, res) {
        var params = {'todo-item': {
      	'name': 'New Test Task',
        'body': 'This is the test description',
        'assigned_to_id': '86917',
        'start_date': '20140909',
        'due_date': '20140910',
        'time': '99',
        'creator_id': '84418',
        'other_assigned_ids': '86917'
    }};
    createTWPMTask(params);
    res.end("<!DOCTYPE html><head></head><body>Req Sent</body></html>");
});

app.get('/test', function (req, res) {
    console.log(getTWPMKey());
    console.log('inbound header: ' + req.header['user-agent']);
    var data = qs.stringify({
	username: getTWPMKey(),
	password: 'X'
    });
    var buff = new Buffer(getTWPMKey() + ':X');
    var authStr = buff.toString('base64');
    console.log('encrypted: ' + authStr);
    console.log('unencrypted: ' + new Buffer(authStr, 'base64').toString());
    var params = JSON.stringify({'todo-item': {
      	'content': 'test task',
        'description': 'test description',
        'responsible-party-id': '86917',
        'start-date': '20140901',
        'due-date': '20140902',
        'estimated-minutes': '99',
        'creator-id': '82200',
        'responsible-party-ids': '86917'
	}});
    var options = {
	host: 'clients.pint.com',
//	host: 'requestb.in',
	path: '/tasklists/354907/tasks.json',
//	path: '/qooc93qo',
	method: 'POST',
	headers: {
	    'Accept': 'application/json',
	    'Content-Type': 'application/json',
        'User-Agent': 'pint_integration_middleware1.0',
	    'Authorization': 'Basic ' + authStr,
        'Content-Length': params.length
        }
    };
    var httpReq = http.request(options, function (response) {
    	var str = '';
    	response.on('data', function(chunk) {
//    	response.on('data', function(data) {
//            str += data;
    	    str += chunk;
    	});
    	response.on('end', function () {
            var responseJSON = JSON.parse(str);
            res.writeHead(200,{'Content-Type': 'text/html'}); 
            res.end('<!DOCTYPE html><head></head><body>'+str+'</body>');
    	});
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(params);
    httpReq.end();
//    console.log('response: ' + responseJSON);
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
        if(wholeBody['event'] === 'create_feature') {
            console.log('shold create task here');
            console.log('feature: ' + wholeBody.feature.name);
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
    req.on('end', function() {
        res.writeHead(200,{'Content-Type': 'text/html'}); 
        res.end('<!DOCTYPE html><head></head><body>'+body+'</body>');
    });
    req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
    });
    res.end();
});

app.listen(8002); 
 
console.log('You got the server running, fishbulb.');
