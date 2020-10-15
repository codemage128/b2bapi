require('dotenv').config()
var s = require('./modules/soapclient');
console.log('START ', new Date().toISOString());
var obj = {
	msisdn : "2348137898115",
	denomination : "2",
	operatorId : "5"
}

var t = function (oper) {
return new Promise(function (resolve,reject) {
	s.getBalance(oper)
		.then(function (res) {
			resolve(res.balance);
		})
		.catch(function (err) {
			reject(err);
		})
})
.then(function (r) {
	console.log(r);
                console.log('END TIME ', new Date().toISOString());
})
.catch(function (err) {
	console.log('END TIME ERROR', new Date().toISOString());
                console.err(err);
})
}	
for (i=0;i <= process.argv[3]; i++) {
	console.log('Iteration ', i);
	t(process.argv[2]);
}
