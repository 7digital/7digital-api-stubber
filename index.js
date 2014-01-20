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

function stub() {
	var messages = [].slice.call(arguments);

	return {
		run: function (cb) {
			var apiStub = cp.fork(path.join(__dirname, '..', 'api-stub',
				'server.js'), [], { silent: true }),
				acknowledgements = 0;

			apiStub.stderr.pipe(process.stderr);

			messages.forEach(function (message) {
				apiStub.send(message);
			}, apiStub);

			apiStub.on('message', function (message) {
				function killIfConnected() {
					if (apiStub && apiStub.connected === true) {
						return apiStub.kill();
					}
				}
				if (message.rules) {
					++acknowledgements;
					if (acknowledgements === messages.length) {
						cb(killIfConnected);
					}
				}
			});
		}
	};
}

module.exports.stub = stub;
module.exports.aCallTo = aCallTo;
