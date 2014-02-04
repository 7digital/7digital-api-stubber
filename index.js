var querystring = require('querystring');
var path = require('path');
var cp = require('child_process');
var Request = require('7digital-api/lib/request');

function getApiUrl(ctx) {
	if (ctx.params) {
		return ctx.apiInstance.api.formatPath(ctx.apiInstance.resourceName,
			ctx.apiInstance[ctx.apiMethod].action) + '?' +
			querystring.stringify(ctx.params);
	}

	return ctx.apiInstance.api.formatPath(ctx.apiInstance.resourceName,
			ctx.apiInstance[ctx.apiMethod].action);
}

function createMessage(ctx, ruleType, ruleDetails) {
	if (!ruleDetails) { throw new Error('Missing ruleDetails'); }

	var url = getApiUrl(ctx);
	var message = { rules: { urls: {} } };
	var rule= {};
	rule[ruleType] = ruleDetails;
	message.rules.urls[url] = rule;

	return message;
}

function aCallTo(apiInstance, apiMethod) {
	var ctx = {
		apiInstance: apiInstance,
		apiMethod: apiMethod,
	};

	return {

		// Helper to build up the url
		withTheFollowingParameters: function withTheFollowingParameters(p) {
			ctx.params = p;
			return this;
		},
		// Terminator which returns the message to send to the stub
		respondsWithFile: function respondsWithFile(path) {
			return createMessage(ctx, 'serveFile', path);
		},
		respondsWithErrorCode: function respondsWithErrorCode(statusCode) {
			return createMessage(ctx, 'returnError', statusCode);
		},
		rewritesTo: function rewritesTo(destination) {
			return createMessage(ctx, 'rewriteTo', destination);
		}
	};
}

function listeningOn(port) {
	return +port;
}

function configure(args) {
	var port = args.filter(function (message) {
		return typeof message === 'number';
	})[0];
	var messages = args.filter(function (message) {
		return typeof message !== 'number';
	});
	port = port || 3000;

	return { messages: messages, port: port };
}

function stub() {
	var args = [].slice.call(arguments);

	return {
		run: function (cb) {
			var config = configure(args);
			var options = { env: { PORT: config.port }, silent: true };
			var apiStub = cp.fork(path.join(__dirname, '..', 'api-stub',
				'server.js'), [], options),
				acknowledgements = 0;

			function killIfConnected() {
				if (apiStub && apiStub.connected === true) {
					return apiStub.kill('SIGKILL');
				}
			}

			apiStub.stderr.pipe(process.stderr);

			if (config.messages.length === 0) {
				return apiStub.on('message', function (message) {
					if (message.ready === true) {
						return cb(killIfConnected);
					}
				});
			}

			config.messages.forEach(function (message) {
				apiStub.send(message);
			}, apiStub);

			apiStub.on('message', function (message) {
				if (message.rules) {
					++acknowledgements;
					if (acknowledgements === config.messages.length) {
						cb(killIfConnected);
					}
				}
			});
		}
	};
}

module.exports.stub = stub;
module.exports.aCallTo = aCallTo;
module.exports.listeningOn = listeningOn;
