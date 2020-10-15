require('dotenv').config()
var s = require('./modules/soapclient');
var Provider = require('./models/provider')
//do the maaagic
Provider.find({}, function(err, prov) {
    if (err) {
        throw err;
    }
        prov.forEach(function (line) {
	if (line.provider_code !== 'MFIN') {
            console.log('Updating ', line.provider_code, ' on ', new Date().toISOString());
            s.getBalance(line.provider_code)
                .then(function(bal) {
                    Provider.update({_id : line._id}, {$set : {balance : bal.balance}}).exec();
                    console.log('Done updating ', line.provider_code, ' on ', new Date().toISOString(), 'Balance : ', bal.balance);

                })
                .catch(function (err) {
                 console.error('Cannot update balance :((((')
                })
	}
        })
    })
    setTimeout(function () {
        process.exit(0)
    }, 120000)
    
