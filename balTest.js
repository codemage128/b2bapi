require('dotenv').config()
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var s = require('./modules/soapclient');
var Provider = require('./models/provider')
var obj = {
    msisdn : "2348062755053",
    denomination : "50",
    pref_api : "NGET",
	reseller_id : "583b2a24175c36323072577e",
	data : false
}
Array.prototype.contains = function ( needle ) {
   for (i in this) {
      if (this[i] == needle) return true;
   }
   return false;
}
Array.prototype.getIndex = function ( needle ) {
   for (i in this) {
      if (this[i] == needle) return i;
   }
   return false;
}
//s.getBalance('NGAT')
s.topup('NGXX', obj)
	.then(function (a) {
		console.log(a)
	})
//do the maaagic
/*
Provider.find({}, function(err, prov) {
    if (err) {
        throw err;
    }
        prov.forEach(function (line) {
            console.log('Updating ', line.provider_code, ' on ', new Date().toISOString());
            s.getBalance(line.provider_code)
                .then(function(bal) {
                    Provider.update({_id : line._id}, {$set : {balance : bal.balance}});
                    console.log('Done updating ', line.provider_code, ' on ', new Date().toISOString());

                })
                .catch(function (err) {
                 console.error('Cannot update balance :((((')
                })
        })
    })
    setTimeout(function () {
        process.exit(0)
    }, 120000)
    */
