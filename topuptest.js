require('dotenv').config()
var s = require('./modules/soapclient');
console.log('START ', new Date().toISOString());
var obj = {
	msisdn : "22664080255",
	denomination : 2000,
	operatorId : "BF_OR"
}
	
s.topup('TRLO', obj)
	.then(function (r) {
		console.log(r);
		console.log('END TIME ', new Date().toISOString());
	})
	.catch(function (err) {
		console.log('END TIME ERROR', new Date().toISOString());
		console.log(err);
	})

