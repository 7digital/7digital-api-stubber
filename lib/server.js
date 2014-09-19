'use strict';

var fs = require('fs');
var path = require('path');
var port = process.env.PORT || 9876;
var rewriteRules = require('./rewrite-rules');
var express = require('express');
var server = express();
var httpServer = require('httpolyglot').createServer({
		key: fs.readFileSync(path.join(__dirname, '..', 'cert', 'server.key')),
		cert: fs.readFileSync(path.join(__dirname, '..', 'cert',
			'server.cert'))
	}, server);
var bodyParser = require('body-parser');

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(function addDefaultHeaders(req, res, next) {
	res.header('Accept-Ranges',	'bytes');
	res.header('Content-Type', 'text/xml; charset=utf-8');
	res.header('X-RateLimit-Current', '37');
	res.header('X-RateLimit-Limit', '4000');
	res.header('X-RateLimit-Reset', '46968');
	res.header('x-7dig', 'localhost');
	return next();
});

rewriteRules.setup(server);

httpServer.listen(port, function serverListening() {
	console.log('Server listening on %s', port);
	if (process.send) {
		//Let parent processes know the stub is ready to go
		process.send({ ready: true });
	}
});

process.on('message', function (message) {
	var config;

	if (message.rules) {
		rewriteRules.addRules(message);
		rewriteRules.resetRoutes(server);
		rewriteRules.sendRules({}, {
			send: function (rules) {
				config = rules;
			}
		});

		process.send(config);
	}
});

function die() {
	httpServer.close(function () {
		process.exit(0);
	});
}

process.on('SIGTERM', die);
process.on('SIGINT', die);
