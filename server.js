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

function createTWPMTask (reqObject, reqOptions) {
    var options = reqOptions;
    console.log(JSON.stringify(options));
    var twpmKey = getTWPMKey();
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
            console.log(response.headers);
            console.log(response.statusCode);
        });
        response.on('error', function(e) {
            console.log('ERROR: ' + e.message);
        });
    });
    httpReq.write(params);
    httpReq.end();
};

app.get('/test', function (req, res) {
    var taskObject = {'todo-item': {
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
//    var responseStr = createTWPMTask(taskObject, taskOptions);
//    console.log('undefined string?: ' + responseStr);
    res.writeHead(200,{'Content-Type': 'text/html'}); 
    res.end('<!DOCTYPE html><head></head><body>'+'nothing here'+'</body>');
    createTWPMTask(taskObject, taskOptions);
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
