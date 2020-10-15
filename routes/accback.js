/* 
* /v1/accounts - module
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : accounts.js
*/ 

var express = require('express');
var User = require('../models/user');
var Account = require('../models/account');
var Apiacc = require('../models/apiaccount');
var Operator = require('../models/operator');
var Pinbatch = require('../models/pinbatch');
var Pindb = require('../models/pindb');
var Product = require('../models/product');
var Ticket = require('../models/ticket');
var Ticketmsg = require('../models/ticketmsg');
var Topuplog = require('../models/topuplog');
var Transaction = require('../models/transaction');
var CountryHelper = require('../models/countryhelper')
var ProvHelper = require('../models/provhelper')
var Rate = require('../models/rate')
var Acl = require('../models/acl')
var ProfitMap = require('../models/profitmap')
var jwt = require('jwt-simple');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var moment = require('moment');
var router = express.Router();
var authc = require('../modules/auth');
var oid = require('mongoose').Types.ObjectId;
var c = require('../modules/checks');
var authc = require('../modules/auth');
var Finance = require('../modules/finance')
var co = require('co');
var cs = require('co-stream');
var parallel = require('co-parallel')
var Baseprod = require('../models/baseprod')
var NumLookup = require('../modules/locnumberlookup')
var multer  = require('multer')
var crypto = require('crypto')
var mime = require('mime')
var csv = require('fast-csv')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/')
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
    });
  }
})
function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
var upload = multer({ storage: storage })
//Get Accounts
router.get('/', function (req, res) {
    if (req.user.account_type == 'agent') {
        res.sendStatus(403);
    } else {
        Account.find({_id : {$in : req.user.child}}, {_id : true, account_name : true, active : true, type : true, legal_type : true, numeric_id : true, wallets : true, parent : true, profit_map : true, test_mode : true}).exec()
    .then(function (accounts) {
        var resp = {};
        resp.count = accounts.length;
        resp.accounts = [];
        accounts.forEach(function (o) {
            resp.accounts.push(o);
        });
        res.json(resp);
    })
    .catch(function (err) {
        err.code = 'EDB_ERROR';
        err.status = 500;
        throw err;
    })
    }
    
});
//Create Account
router.post('/', function (req, res) {
    //check for mandatory fields
    if (!req.body.account_name || !req.body.legal_type) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
    }
    Account.findOne({_id : req.user.main_account}).exec()
    .then(function (acc) {
        var perm = [];
        res.locals.cur = req.body.currency || acc.currency;
        if (acc.type == 'agent') {
            var err = {};
                    err.code = 'ENO_ACCESS';
                    err.message = 'This method is not allowed for you!';
                    err.status = 405;
                    throw err;
        } else if (acc.type == 'reseller') {
            
            //can create end users 
            perm.push('agent');
            return perm;
        } else if (acc.type == 'wholesaler') {
            perm.push('agent', 'reseller');
            return perm;
        } else {
            return [];
        }
    })
    .then(function (perm) {
       res.locals.perm = perm;
       if (res.locals.cur !== 'USD') {
            return Rate.findOne({destination : res.locals.cur, source : 'USD'}).exec();
       } else {
           return true;
       }
       
    })
    .then(function (accheck) {
        if (accheck == null) {
            var err = {};
            err.message = 'This currency is not supported';
            err.status = 409;
            throw err;
        } else {
            var bodycheck;
            var parent;
            var manager;
            var legal = ['individual', 'company'];
            //creating account
           if (res.locals.perm.contains(req.body.type)) {
               bodycheck = req.body.type;
           } else {
               bodycheck = 'agent';
           }
                parent = new oid(req.user.main_account);
            if (legal.contains(req.body.legal_type)) {

            } else {
                var err = {};
                    err.code = 'EUNSUP_ELEMENT_VALUE';
                    err.message = 'We dont support such legal_type';
                    err.status = 405;
                    throw err;
            }
            var ac = new Account();
                ac.account_name = req.body.account_name;
                ac.type = bodycheck;
                ac.parent = parent;
                ac.numeric_id = randomIntFromInterval(10000000,99999999)
                var wa = {
                    wallet_name : res.locals.cur + " Wallet",
                    wallet_id : res.locals.cur + randomIntFromInterval(10000000, 99999999),
                    primary : true,
                    currency : res.locals.cur,
                    balance : 0,
                    active : true,
                    virtual : false,
                    parent_wallet : null
                }
                ac.wallets.push(wa);
                //ac.balance = 0;
                //ac.currency = req.user.currency;
                var pct;
                  if (req.body.profit_pct) {
               p = parseFloat(req.body.profit_pct);
               if ((p >= 0) && (p <= 100)) {
                   pct = p;
               }
           } else {
               pct = 0;
           }
                res.locals.pct = pct;
                ac.active = true;
                ac.sms_cost = 0.1;
                ac.canEditOwnAcl = req.body.canEditOwnAcl || true;
		        ac.test_mode = req.body.test_mode || false;
                for (var key in req.body) {
                    if ((key == 'parent') || (key == 'type') || (key == 'currency') || (key == 'wallets') || (key == 'profit_map'))
                        continue;
                    ac[key] = req.body[key];
                }
                console.log('ACC', ac);
                return ac.save();

        }
    })
    .then(function (a) {
        //create profitmap
        res.locals.a = a;
        var pmap = {
            active : true,
            time : new Date(),
            maps : [
                {
                    code : 'ALL:ALL',
                    profit_pct : res.locals.pct || 0,
                    active : true,
                    time : new Date()
                }
            ]
        }
        var pm = new ProfitMap(pmap)
        return pm.save();
    })
    .then(function (pm) {
        res.locals.pm = pm;
        return Account.findOne({_id : res.locals.a._id}).exec();
    })
    .then(function (pa) {
        pa.profit_map = res.locals.pm._id;
        return pa.save();
    })
    .then(function (pz) {
        res.status(201).send(pz);
    })
    .catch(function (err) {
        console.log(new Error(err.message));
        res.status(err.status || 500).send(err)
    })
});
router.all('/', function (req, res) {
    var err = {};
    err.message = 'Unsupported method';
    err.status = 405;
    err.code = 'EUNSUP_METHOD';
    throw err;
});
/*
//Get Account
router.post('/search', function (req, res) {
    var name = req.body.searchterm;
    console.log(name)
    Account.find({account_name : new RegExp(name, 'i')})
        .then(function (re) {
            var r = {};
            r.count = re.length;
            r.data = re;
            res.json(r);
        })
        .catch(function (err) {
        res.status = err.status || 500;
        console.log(new Error(err.message));
        res.json(err.status, err);
    })
})
*/
router.get('/all', c.checkReadAccess, function (req, res) {
    Account.find({_id : {$in : req.user.child}}, {_id : true, account_name : true, active : true, type : true, legal_type : true, numeric_id : true}).exec()
    .then(function (accounts) {
        var resp = {};
        resp.count = accounts.length;
        resp.accounts = [];
        accounts.forEach(function (o) {
            resp.accounts.push(o);
        });
        res.json(resp);
    })
    .catch(function (err) {
        err.code = 'EDB_ERROR';
        err.status = 500;
        throw err;
    })
});
router.get('/me', function (req,res) {
    Account.findOne({_id : req.user.main_account}, {profit_pct : false, reserved_balance : false})
        .then(function (acc) {
            acc.balance = acc.balance.toFixed(2)
            res.json(acc)
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
})
router.get('/me/parent', function (req, res) {
    Account.findOne({_id : req.user.main_account}).exec()
        .then(function (acc) {
            return Account.findOne({_id : acc.parent}).exec();
        })
        .then(function (p) {
            var pobj = {};
            pobj._id = p._id;
            pobj.account_name = p.account_name;
            pobj.phone = p.phone;
            pobj.address = p.address;
            pobj.legal_type = p.legal_type;
            pobj.invoice_logo = p.invoice_logo;
            pobj.email = p.email;
            res.json(pobj);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
});
router.get('/me/pins', function (req, res) {
    Pinbatch.find({allocated_to : {$in : req.user.rwaccess}}).sort({createdAt : -1})
        .then(function (pb) {
            var r = {};
            r.count = pb.length;
            r.batches = pb;
            res.json(r);
        }).catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })

})

router.post('/me/pins', function (req, res) {
           return new Promise(function (resolve,reject) {
               var bz=[];
                              function *genPin(bar) {
                     var p1 = randomIntFromInterval(11111111, 99999999);
                                    var p2 = randomIntFromInterval(11111111, 99999999);
                                    var p3 = randomIntFromInterval(11111111, 99999999);
                                    var p4 = randomIntFromInterval(11111111, 99999999);
                                    var serial = String(p1) + String(p2);
                                    var pin = String(p3) + String(p4);
                                  //  console.log('serial :', serial, ' pin :', pin, ' batch :', bar._id);
                                    var p = new Pindb();
                                    p.valid = true;
                                    p.batch = bar._id;
                                    p.valid_from = bar.valid_from;
                                    p.valid_to = bar.valid_to;
                                    p.serial = serial;
                                    p.code = pin;
                                    p.issued = new Date();
                                    p.value = bar.value;
                                    p.currency = bar.currency;
                                    var xy = yield p.save();
                                    return xy;
               }
               function *processBatch(b) {
                   var valid_to = moment().add(1, 'year').toDate();
                     var batch = {
                            name : b.name || '',
                            count : b.count || 0,
                            value : b.value || 0,
                            currency : b.currency,
                            valid_from : b.valid_from || new Date(),
                            valid_to : b.valid_to || valid_to,
                            description : b.description || '',
                            allocated_to : b.allocated_to || req.user.main_account,
                            type : b.type,
                            valid : true,
                            issuer : req.user.main_account
                        }
                        console.log('BATCH :', batch)
                        var o = {
                            amount : batch.count * batch.value,
                            currency : b.currency,
                            description : "Purchase of " + batch.count + " x " + batch.value + " " + batch.currency + " PINS"
                        }
                        var resu = yield Finance.arbCharge(req.user.main_account, o);
                        if (resu !== null) {
                            batch.issued = new Date()
                            var ba = new Pinbatch(batch);
                            var bar = yield ba.save();
                            
                            if (bar !== null) {
                                for (var a=0; a < bar.count; a++) {
                                   // console.log(bar._id, bar.currency, a);
                                   yield genPin(bar)
                                }
                                return bar;
                                
                            } else {
                                var err = {};
                                err.code = "EDB_ERROR";
                                err.message = "Transaction cannot continue, please contact support"
                                err.status = 500;
                                return err;
                            }
                        } else {
                            var err = {};
                            err.code = "EDB_ERROR";
                            err.message = "Transaction cannot continue, please contact support"
                            err.status = 500;
                             return err;
                        }

               }

                co(function *() {
                  var rep = req.body.batches.map(processBatch);
                  var re = yield parallel(rep);
                  resolve(re);
                })
                .catch(function (err) {
                    console.log(err);
                  res.status(err.status || 500).send(err);
                })
           
    })
    .then(function (r) {
        res.json(r);
    })
    .catch(function (err) {
        console.error(err);
        res.status(err.status || 500).send(err);
    })
})
/*
router.post('/pins', function (req, res) {
    if (!req.body.name || !req.body.count || !req.body.value || !req.body.currency || !req.body.valid_from || !req.body.valid_to ) {
        var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
    } else {
        var pb = new Pinbatch();
        pb.name = req.body.name;
        pb.count = req.body.count;
        pb.value = req.body.value;
        pb.currency = req.body.currency;
        pb.valid_from = req.body.valid_from;
        pb.valid = true;
        pb.valid_to = req.body.valid_to;
        pb.description = req.body.description;
        pb.allocated_to = req.body.allocated_to;
        pb.type = req.body.type;
        pb.issuer = req.user._id;
        pb.save(function (err, repl) {
            if (err) {
                throw err;
            } else {
                for (i=1;i<pb.count;i++) {
                    var p1 = randomIntFromInterval(11111111, 99999999);
                    var p2 = randomIntFromInterval(11111111, 99999999);
                    var p3 = randomIntFromInterval(11111111, 99999999);
                    var p4 = randomIntFromInterval(11111111, 99999999);
                    var serial = String(p1) + String(p2);
                    var pin = String(p3) + String(p4);
                    console.log('serial :', serial, ' pin :', pin, ' batch :', repl._id);
                    var p = new Pin();
                    p.valid = true;
                    p.batch = repl._id;
                    p.valid_from = repl.valid_from;
                    p.valid_to = repl.valid_to;
                    p.serial = serial;
                    p.code = pin;
                    p.issued = new Date();
                    p.value = repl.value;
                    p.currency = repl.currency;
                    p.save();
                }
                res.sendStatus(200);
            }
        });
    }
})
*/
router.get('/me/transactions.csv', function (req, res) {
        var str = Transaction.find({account : req.user.main_account}).sort({time : -1}).batchSize(10000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=transactions.csv'
            });
		str.on("data", function (d) {
                   var str = d.time + ',' + d.account + ',' + d.type + ',' + d.amount + ',' + d.currency + ',' + d.description + ',' + d.source + '\n';
                   res.write(str);
               })
               str.on("end", function () {
                   res.end();
               })
})
router.get('/:id/transactions.csv', c.checkReadAccess, function (req, res) {
        var str = Transaction.find({account : req.params.id}).sort({time : -1}).batchSize(10000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=transactions.csv'
            });
		str.on("data", function (d) {
                   var str = d.time + ',' + d.account + ',' + d.type + ',' + d.amount + ',' + d.currency + ',' + d.description + ',' + d.source + '\n';
                   res.write(str);
               })
               str.on("end", function () {
                   res.end();
               })
})
router.get('/me/pins/:batch.csv', function (req, res) {
    Pinbatch.findOne({_id : req.params.batch})
        .then(function (ba) {
                console.log('got it')
               var str = Pindb.find({batch : ba._id}).batchSize(10000).cursor();
               var filename = req.params.batch + '.csv';
               res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=' + filename
            });
               var st = "Type,Batch ID,Serial,Code,Value,Currency,Valid,Valid From, Valid To\n";
            res.write(st);
               str.on("data", function (d) {
                   var stri = ba.type + ',' +  d.batch + ',' + d.serial + ',' + d.code + ',' + d.value + ',' + d.currency + ',' + d.valid + ',' + d.valid_from + ',' + d.valid_to + '\n';
                   res.write(stri);
               })
               str.on("end", function () {
                   res.end();
               })
                
            
        })
        .catch(function (err) {
            throw err;
        })
})
router.get('/me/pricelist.csv', function (req, res) {
       var str = Baseprod.find().sort({time : -1}).batchSize(10000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=pricelist.csv'
            });
            var ms = cs.map(function *(d) {
                        var prof = yield NumLookup.getProfits(req.user.main_account, d.iso, d.acloperId);
                        var agentProfit = (prof.agentProfit + 100) / 100;
                        var resProfit = (prof.resProfit + 100) / 100;
                        var wholeProfit = (prof.wProfit + 100) / 100;
                        if (req.user.currencies.contains(d.topup_currency)) {
                            if (d.fx_rate == '-') {
                                var pr = (parseFloat(d.min_denomination) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.topup_currency + ',' + pr + '\n';
                            } else {
                                var pr = (parseFloat(1.00) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.topup_currency + ',' + d.price + '\n';
                            }
                        } else {
                             if (req.user.currency !== d.currency) {
                            var rate = yield Rate.findOne({source : d.currency, destination : req.user.currency}).exec();
                            var needsFX = true;
                        } else {
                            var needsFX = false;
                        }
                        if (d.fx_rate == '-') {
                            var pr =   (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                            if (needsFX) {
                                pr = (pr * rate.rate).toFixed(2);
                                d.currency = req.user.currency
                            }
                            var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                        } else {
                           var ra =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                           if (needsFX) {
                               ra = (parseFloat(ra) * rate.rate).toFixed(2);
                               d.currency = req.user.currency
                           }
                           var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
                        }
                        }
                       
                        return st;
}, { objectMode: true, parallel: 3 });
    var st = "SKU,Country,Operator Name,Min Denom.,Max Denom,Local Currency, Denom. Step,Rate,Currency,Price\n";
            res.write(st);
    str.pipe(ms).pipe(res);
})
router.get('/:id/pricelist.csv', c.checkReadAccess, function (req, res) {
       var str = Baseprod.find().sort({time : -1}).batchSize(10000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=pricelist.csv'
            });
            var ms = cs.map(function *(d) {
                        var prof = yield NumLookup.getProfits(req.params.id, d.iso, d.acloperId);
                        var agentProfit = (prof.agentProfit + 100) / 100;
                        var resProfit = (prof.resProfit + 100) / 100;
                        var wholeProfit = (prof.wProfit + 100) / 100;
                        if (req.user.currencies.contains(d.topup_currency)) {
                            if (d.fx_rate == '-') {
                                var pr = (parseFloat(d.min_denomination) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.topup_currency + ',' + pr + '\n';
                            } else {
                                var pr = (parseFloat(1.00) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.topup_currency + ',' + d.price + '\n';
                            }
                        } else {
                             if (req.user.currency !== d.currency) {
                            var rate = yield Rate.findOne({source : d.currency, destination : req.user.currency}).exec();
                            var needsFX = true;
                        } else {
                            var needsFX = false;
                        }
                        if (d.fx_rate == '-') {
                            var pr =   (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                            if (needsFX) {
                                pr = (pr * rate.rate).toFixed(2);
                                d.currency = req.user.currency
                            }
                            var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                        } else {
                           var ra =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                           if (needsFX) {
                               ra = (parseFloat(ra) * rate.rate).toFixed(2);
                               d.currency = req.user.currency
                           }
                           var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
                        }
                        }
                       
                        return st;
}, { objectMode: true, parallel: 3 });
    var st = "SKU,Country,Operator Name,Min Denom.,Max Denom,Local Currency, Denom. Step,Rate,Currency,Price\n";
            res.write(st);
    str.pipe(ms).pipe(res);
})
router.get('/:id', c.checkReadAccess, function (req, res) {
    if (req.user.main_account == req.params.id) {
        Account.findOne({_id : req.params.id}, {profit_pct : false, reserved_balance : false}).exec()
        .then(function (acc) {
            res.json(acc);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
    } else {
        Account.findOne({_id : req.params.id}, {reserved_balance : false}).exec()
        .then(function (acc) {
            res.json(acc);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
    }
        
});
router.get('/:id/wallets', c.checkReadAccess, function (req, res) {
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            var re = {};
            re.count = acc.wallets.length;
            re.wallets = acc.wallets;
            res.json(re);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
})
router.get('/:id/wallets/:wallet', c.checkReadAccess, function (req, res) {
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            res.json(acc.wallets.id(req.params.wallet));
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
})
router.post('/:id/wallets', c.checkWriteAccess, function (req, res) {
    if (!req.body.currency) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
            }
            Account.findOne({_id : req.params.id})
                .then(function (acc) {
                    //check for wallet existence
                    acc.wallets.forEach(function (wa) {
                        if (wa.currency == req.body.currency) {
                            var err = {};
                            err.code = "DUPLICATE_WALLET"
                            err.message = "Wallet of this currency already exists!"
                            err.status = 403;
                            throw err;
                        }
                    })
                    return Rate.findOne({destination : req.body.currency, source : "USD"}).exec()
                })
                .then(function (ra) {
                    if (ra !== null) {
                        return Account.findOne({_id : req.params.id}).exec();
                    } else {
                        var err = {};
                        err.code = "UNSUPORTED_CURRENCY"
                        err.message = "Sorry, this currency is not yet supported, please contact support";
                        err.status = 403;
                        throw err;
                    }
                })
                .then(function (ac) {
                    var myWalletId = randomIntFromInterval(10000000,99999999);
                    var wa = {
                        wallet_name : req.body.wallet_name || req.body.currency + ' Wallet',
                        wallet_id : req.body.currency + myWalletId,
                        balance : 0,
                        primary : false,
                        virtual : false,
                        primary_wallet : null,
                        currency : req.body.currency,
                        active : true
                    }
                    ac.wallets.push(wa);
                    return ac.save();
                })
                .then(function (sav) {
                    sav.wallets.forEach(function (wa) {
                        if (wa.currency == req.body.currency) {
                            res.status(201).send(wa);
                        }
                    })
                })
                 .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.put('/:id/wallets/:wallet', c.checkWriteAccess, function (req, res) {
    if (req.body.primary) {
        res.locals.setToPrimary = true;
    } else {
        res.locals.setToPrimary = false;
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            acc.wallets.forEach(function (wa) {
                if (res.locals.setToPrimary) {
                    if (wa._id == req.params.wallet) {
                        wa.primary = true;
                    } else {
                        wa.primary = false;
                    }
                } else {

                }
                if (req.body.wallet_name) {
                    if (wa._id == req.params.wallet) {
                        wa.wallet_name = req.body.wallet_name;
                    }
                }
            })
            return acc.save();
        })
        .then(function (sav) {
            sav.wallets.forEach(function (wa) {
                if (wa._id == req.params.wallet) {
                    res.status(200).send(wa);
                }
            })
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl', c.checkReadAccess, function (req, res) {
    if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.status = 404;
                err.code = "ACL_NOT_DEFINED"
                err.message = "ACL is not Defined"
                throw err;
            }
        })
        .then(function (acl) {
            res.json(acl);
        })
        .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.post('/:id/acl', c.checkWriteAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (!req.body.type || !req.body.allow || !req.body.block) {
                var err = {};
                err.code = "EMISSING_REQUIRED"
                err.message = "Missing required fields"
                err.status = 500
                throw err;
            } else {
                if ( (req.body.allow.constructor === Array) && (req.body.block.constructor === Array)  ) {
                    var ac = new Acl();
                    ac.type = req.body.type;
                    ac.active = req.body.active || true;
                    ac.time = new Date()
                    req.body.allow.forEach(function (al) {
                        var o = {}
                        o.code = al.code
                        o.active = al.active || true;
                        o.time = new Date()
                        ac.allow.push(o);
                    })
                    req.body.block.forEach(function (bl) {
                        var o = {}
                        o.code = bl.code
                        o.active = bl.active || true;
                        o.time = new Date()
                        ac.block.push(o);
                    })
                    return ac.save();

                } else {
                    var err = {}
                    err.code = "TYPE_ERROR"
                    err.message = "Allow / Block must be arrays"
                    err.status = 500
                    throw err;
                }
            }
        })
        .then(function (acl) {
            res.locals.acl = acl;
            return Account.findOne({_id : req.params.id}).exec();
        })
        .then(function (acc) {
            acc.acl = res.locals.acl._id;
            return acc.save();
        })
        .then(function (sa) {
            res.status(201).send(res.locals.acl);
        })
        .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.put('/:id/acl', c.checkWriteAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                if (req.body.type) {
                    var validop = ['restrictive', 'permissive'];
                    if (validop.contains(req.body.type)) {
                        acl.type = req.body.type;
                    }
                }
                if ('undefined' !== typeof req.body.active) {
                    acl.active = req.body.active;
                }
                if (req.body.block) {
                    if (req.body.block.constructor === Array) {
                        //remove old shtuff
                        var i = acl.block.length;
                        while (i--) {
                            var me = acl.block[i];
                            acl.block.remove(me);
                        }
                        req.body.block.forEach(function (it) {
                            var o = {
                                code : it.code,
                                active : it.active || true,
                                time : new Date()
                            }
                            acl.block.push(o)
                        })
                    }
                }
                if (req.body.allow) {
                    if (req.body.allow.constructor === Array) {
                        //remove old shtuff
                        var i = acl.allow.length;
                        while (i--) {
                            var me = acl.allow[i]
                            acl.allow.remove(me)
                        }
                        req.body.allow.forEach(function (it) {
                            var o = {
                                code : it.code,
                                active : it.active || true,
                                time : new Date()
                            }
                            acl.allow.push(o)
                        })
                    }
                }
                return acl.save();
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
        .then(function (ac) {
            res.json(ac);
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl/block', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                res.json(acl.block);
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})

router.get('/:id/acl/allow', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                res.json(acl.allow);
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl/allow/:entry', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                acl.allow.forEach(function (li) {
                    if (li._id == req.params.entry) {
                        res.json(li);
                    }
                })
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl/block/:entry', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                acl.block.forEach(function (li) {
                    if (li._id == req.params.entry) {
                        res.json(li);
                    }
                })
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.post('/:id/acl/allow/', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    if (!req.body.code) {
        var err = {}
        err.code = "EMISSING_REQUIRED"
        err.message = "Missing required parameters"
        err.status = 500
        throw err;
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                acl.allow.forEach(function (li) {
                    if (li.code == req.body.code) {
                        var err = {}
                        err.code = "ERULE_EXISTS"
                        err.message = "The rule already exists"
                        err.status = 500
                        throw err
                    }
                })
                acl.block.forEach(function (li) {
                    if (li.code == req.body.code) {
                        var err = {}
                        err.code = "ERULE_CONFLICT"
                        err.message = "There is a conflicting rule, please remove it first [BLOCK] : " + li._id
                        err.status = 500
                        throw err
                    }
                })
                var rule = {
                    code : req.body.code,
                    active : req.body.active || true,
                    time : new Date()
                }
                acl.allow.push(rule);
                return acl.save();
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
        .then(function (sav) {
            res.json(sav.allow);
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.post('/:id/acl/block/', c.checkReadAccess, function (req, res) {
        if (req.user.main_account == req.params.id) {
        if (!req.user.canEditOwnAcl) {
            var err = {};
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
    }
    if (!req.body.code) {
        var err = {}
        err.code = "EMISSING_REQUIRED"
        err.message = "Missing required parameters"
        err.status = 500
        throw err;
    }
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            if (acc.acl) {
                return Acl.findOne({_id : acc.acl}).exec()
            } else {
                var err = {}
                err.code = "ACL_NOT_DEFINED"
                err.message = "Sorry. ACL is not defined"
                err.status = 404;
                throw err;
            }
            
        })
        .then(function (acl) {
            if (acl !== null) {
                acl.block.forEach(function (li) {
                    if (li.code == req.body.code) {
                        var err = {}
                        err.code = "ERULE_EXISTS"
                        err.message = "The rule already exists"
                        err.status = 500
                        throw err
                    }
                })
                acl.allow.forEach(function (li) {
                    if (li.code == req.body.code) {
                        var err = {}
                        err.code = "ERULE_CONFLICT"
                        err.message = "There is a conflicting rule, please remove it first [ALLOW] : " + li._id
                        err.status = 500
                        throw err
                    }
                })
                var rule = {
                    code : req.body.code,
                    active : req.body.active || true,
                    time : new Date()
                }
                acl.block.push(rule);
                return acl.save();
            } else {
                var err = {};
                err.code = "ACL_NOT_EXIST";
                err.message = "ACL does not exist or has been deleted"
                err.status = 404;
                throw err;
            }
        })
        .then(function (sav) {
            res.json(sav.block);
        })
         .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl/countries', c.checkReadAccess, function (req, res) {
    CountryHelper.find()
        .then(function (c) {
            res.json(c)
        })
        .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/acl/countries/:country', c.checkReadAccess, function (req, res) {
    ProvHelper.find({iso : req.params.country})
        .then(function (c) {
            res.json(c)
        })
        .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/:id/profitmap', c.checkReadAccess, function (req, res) {
    if (req.params.id == req.user.main_account) {
        var err = {};
        err.code ="ENO_ACCESS"
        err.message = "Sorry, you don't have acces to this method"
        err.status = 403;
        throw err;
    } else {
        Account.findOne({_id : req.params.id})
            .then(function (acc) {
                if (acc.profit_map) {
                    return ProfitMap.findOne({_id : acc.profit_map}).exec();
                } else {
                    var err= {}
                    err.code = "PROFITMAP_UNDEFINED"
                    err.message = "Sorry, Profit Map for this account is not defined"
                    err.status = 404;
                    throw err;
                }
            })
            .then(function (pmap) {
                res.json(pmap)
            })
            .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
    }
})
router.put('/:id/profitmap', c.checkWriteAccess, function (req, res) {
    if (req.params.id == req.user.main_account) {
        var err = {};
        err.code ="ENO_ACCESS"
        err.message = "Sorry, you don't have acces to this method"
        err.status = 403;
        throw err;
    } else { 
        Account.findOne({_id : req.params.id})
            .then(function (acc) {
                if (acc.profit_map) {
                    return ProfitMap.findOne({_id : acc.profit_map}).exec()
                } else {
                    var err= {}
                    err.code = "PROFITMAP_UNDEFINED"
                    err.message = "Sorry, Profit Map for this account is not defined"
                    err.status = 404;
                    throw err;
                }
            })
            .then(function (pmap) {
                if ('undefined' !== typeof req.body.active) {
                    pmap.active = req.body.active || true;
                }
                if ('undefined' !== typeof req.body.maps) {
                    if (req.body.maps.constructor === Array) {
                        var allBackupValue;
                        var allNeedFromBackup = true;
                        //get backup
                        pmap.maps.forEach(function (e) {
                            if (e.code == 'ALL:ALL') {
                                allBackupValue = e.profit_pct;
                            }
                        })
                         var i = pmap.maps.length;
                        while (i--) {
                            var me = pmap.maps[i]
                            pmap.maps.remove(me)
                        }
                        req.body.maps.forEach(function (e) {
                            var o = {}
                            o.code = e.code;
                            o.profit_pct = e.profit_pct;
                            o.time = new Date(),
                            o.active = e.active || true;
                            pmap.maps.push(o)
                            if (e.code == 'ALL:ALL') {
                                allNeedFromBackup = false;
                            }
                        })
                        if (allNeedFromBackup) {
                            var o = {}
                            o.code = 'ALL:ALL';
                            o.profit_pct = allBackupValue;
                            o.time = new Date()
                            o.active = true;
                            pmap.maps.push(o);
                        }

                    }
                }
                return pmap.save();
            })
            .then(function (pm) {
                res.json(pm);
            })
            .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
}
})
router.get('/:id/parent', c.checkReadAccess, function (req, res) {
    Account.findOne({_id : req.params.id}).exec()
        .then(function (acc) {
            return Account.findOne({_id : acc.parent}).exec();
        })
        .then(function (p) {
            var pobj = {};
            pobj._id = p._id;
            pobj.account_name = p.account_name;
            pobj.phone = p.phone;
            pobj.address = p.address;
            pobj.legal_type = p.legal_type;
            pobj.invoice_logo = p.invoice_logo;
            pobj.email = p.email;
            res.json(pobj);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
});
router.post('/:id/logoupload', c.checkWriteAccess, upload.single('userPhoto'), function (req, res) {
    Account.findOne({_id : req.params.id}).exec()
        .then(function (acc) {
            if (acc !== null) {
                acc.whitelabel_opts.portal_logo = req.file.filename;
                return acc.save();
            } else {
                res.sendStatus(404);
            }
        })
        .then(function (resp) {
            res.sendStatus(201);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
});
//Edit Account
router.put('/:id', c.checkWriteAccess, function(req, res) {
        Account.findOne({_id : req.params.id}).exec()
        .then(function (acc) {
           for (var key in req.body) {
               var forbiddenKeys = ['audit', 'rwaccess', 'wallets','roaccess', '_id', 'hasSystemAccess', 'createdAt', 'updatedAt', '__v', 'parent', 'profit_map', 'acl'];
               if (forbiddenKeys.contains(key))
                    continue;
               acc[key] = req.body[key];
           }
            return acc.save();
        })
        .then(function (smth) {
            res.json(smth);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        });
});
//Delete Account
router.delete('/:id', c.checkWriteAccess, function (req, res) {
    //check if we have rights...
        Account.find({parent : req.params.id}).exec()
        .then(function (acc) {
            if (acc.length > 0) {
                res.sendStatus(405);
            } else {
                //noooothing
                Account.find({_id : req.params.id}).remove().exec();
                res.sendStatus(204);
            }
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
router.all('/:id', function (req, res) {
    var err = {};
    err.message = 'Unsupported method';
    err.status = 405;
    err.code = 'EUNSUP_METHOD';
    throw err;
});
//GET Child Accounts

//Create Child Account
router.post('/:id/accounts', c.checkWriteAccess, function (req, res) {
    //check for mandatory fields
    if (!req.body.account_name || !req.body.legal_type) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
    }
    Account.findOne({_id : req.params.id}).exec()
    .then(function (acc) {
        var perm = [];
        if (acc.type == 'agent') {
            var err = {};
                    err.code = 'ENO_ACCESS';
                    err.message = 'This method is not allowed for you!';
                    err.status = 405;
                    throw err;
        } else if (acc.type == 'reseller') {
            //can create end users 
            res.locals.cur = req.body.currency || acc.currency;
            perm.push('agent');
            return perm;
        }else if (acc.type == 'wholesaler') {
            res.locals.cur = req.body.currency || acc.currency;
            perm.push('agent', 'reseller');
            return perm;
        } else {
            return [];
        }
    })
    .then(function (perm) {
       res.locals.perm = perm;
       if (res.locals.cur !== 'USD') {
        return Rate.findOne({source : res.locals.cur, destination : 'USD'}).exec();
       } else {
           return true;
       }
       
    })
    .then(function (accheck) {
        if (accheck == null) {
            var err = {};
            err.message = 'This currency is not supported';
            err.status = 409;
            throw err;
        } else {
            var bodycheck;
            var parent;
            var manager;
            var legal = ['individual', 'company'];
            //creating account

            if (req.body.type ) {
                if (res.locals.perm.contains(req.body.type)) {
                    bodycheck = req.body.type;
                } else {
                    var err = {};
                    err.code = 'ENO_ACCESS';
                    err.message = 'You dont have permission to create this entity type!';
                    err.status = 403;
                    throw err;
                }
            } else {
                bodycheck = 'agent';
            }
                parent = new oid(req.params.id);
            if (legal.contains(req.body.legal_type)) {

            } else {
                var err = {};
                    err.code = 'EUNSUP_ELEMENT_VALUE';
                    err.message = 'We dont support such legal_type';
                    err.status = 405;
                    throw err;
            }
            var ac = new Account();
                ac.account_name = req.body.account_name;
                ac.numeric_id = randomIntFromInterval(10000000,99999999)
                ac.type = bodycheck;
               // ac.balance = 0;
                ac.reserved_balance = 0;
                //ac.currency = req.user.currency;
                ac.test_mode = req.body.test_mode || false;
                ac.canEditOwnAcl = req.body.canEditOwnAcl || true;
                var pct;
                  if (req.body.profit_pct) {
               p = parseFloat(req.body.profit_pct);
               if ((p >= 0) && (p <= 100)) {
                   pct = p;
               }
           } else {
               pct = 0;
           }
           res.locals.pct = pct;
                var wa = {
                    wallet_name : res.locals.cur + " Wallet",
                    wallet_id : res.locals.cur + randomIntFromInterval(10000000, 99999999),
                    primary : true,
                    currency : res.locals.cur,
                    balance : 0,
                    active : true,
                    virtual : false,
                    parent_wallet : null
                }
                ac.wallets.push(wa);
                ac.parent = parent;
                ac.active = true;
                ac.sms_cost = 0.1;
                for (var key in req.body) {
                    if ((key == 'parent') || (key == 'type') || (key == 'balance') || (key == 'wallets') || (key == 'currency') || (key == 'profit_map'))
                        continue;
                    ac[key] = req.body[key];
                }
                return ac.save();

        }
    })
    .then(function (a) {
        res.locals.a = a;
        var pma = {
            time : new Date(),
            active : true,
            maps : [
                {
                    code : 'ALL:ALL',
                    time : new Date(),
                    active : true,
                    profit_pct : res.locals.pct || 0
                }
            ]
        }
        var pm = new ProfitMap(pma);
        return pm.save();
       
    })
    .then(function (pmx) {
        res.locals.pmx = pmx;
        return Account.findOne({_id : res.locals.a._id}).exec()
    })
    .then(function (acc) {
        acc.profit_map = res.locals.pmx._id;
        return acc.save();
    })
    .then(function (x) {
        res.status(201).send(x);
    })
    .catch(function (err) {
        res.status = err.status || 500;
        console.log(new Error(err.message));
        res.json(err.status, err);
    })
    
});

//GET Active / Inactive child accounts 
router.get('/:id/accounts', c.checkReadAccess, function (req, res) {
        var mod;
       
        Account.find({parent : req.params.id}, {_id : true, account_name : true, active : true, type : true, legal_type : true, manager : true}).exec()
        .then(function (l) {
            var re = {};
            re.count = l.length;
            re.accounts = l;
            res.json(re);
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
router.all('/:id/accounts/:modifier', function (req, res) {
    var err = {};
    err.message = 'Unsupported method';
    err.status = 405;
    err.code = 'EUNSUP_METHOD';
    throw err;
});
//GET RWaccess users 
router.get('/:id/rwaccess', c.checkReadAccess, function (req, res) { 
        Account.findOne({_id : req.params.id}, {rwaccess : true}).exec()
        .then(function (rw) {
            var resp = {};
            resp.count = rw.rwaccess.length;
            resp.rwaccess = rw.rwaccess;
            res.json(resp);
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
//EDIT RWaccess
router.put('/:id/rwaccess', c.checkWriteAccess, function (req, res) {
        Account.findOne({_id : req.params.id}).exec()
        .then(function (a) {
            a.rwaccess = [];
            req.body.rwaccess.forEach(function (o) {
                a.rwaccess.push(new oid(o));
            });
            return a.save();
        })
        .then(function (rw) {
            var resp = {};
            resp.count = rw.rwaccess.length;
            resp.rwaccess = rw.rwaccess;
            res.json(resp);
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
router.all('/:id/rwaccess', function (req, res) {
    var err = {};
    err.message = 'Unsupported method';
    err.status = 405;
    err.code = 'EUNSUP_METHOD';
    throw err;
});
//GET ROaccess

router.get('/:id/roaccess', c.checkReadAccess, function (req, res) { 
        Account.findOne({_id : req.params.id}, {roaccess : true}).exec()
        .then(function (rw) {
            var resp = {};
            resp.count = rw.roaccess.length;
            resp.roaccess = rw.roaccess;
            res.json(resp);
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
//EDIT ROaccess
router.put('/:id/roaccess', c.checkWriteAccess, function (req, res) {
        Account.findOne({_id : req.params.id}).exec()
        .then(function (a) {
            a.roaccess = [];
            req.body.roaccess.forEach(function (o) {
                a.roaccess.push(new oid(o));
            });
            return a.save();
        })
        .then(function (rw) {
            var resp = {};
            resp.count = rw.roaccess.length;
            resp.roaccess = rw.roaccess;
            res.json(resp);
        })
        .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
        });
});
router.all('/:id/rwaccess', function (req, res) {
    var err = {};
    err.message = 'Unsupported method';
    err.status = 405;
    err.code = 'EUNSUP_METHOD';
    throw err;
});
/*
router.get('/:id/products', c.checkReadAccess, function (req, res) {
   
        Product.find({account : req.params.id}).exec()
   .then(function (pack) {
       var p = {};
       p.count = pack.length;
       p.packages = [];
       pack.forEach(function (pa) {
           delete pa.package_items;
           p.packages.push(pa);
       });
       res.json(p);
   })
   .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
   });
   
});
*/
/*
router.post('/:id/topup', c.checkWriteAccess, function (req, res) {
    
        var a = parseFloat(req.body.amount)
            //log tx
            //and then update db
            Account.findOne({_id : req.user.main_account})
                .then(function (acc) {
                    if (acc.type == 'agent') {
                        var err = {};
                        err.code = 'ENO_ACCESS';
                        err.status = 403;
                        throw err;
                    } else {
                        if (parseFloat(req.body.amount) > acc.balance) {
                             var err = {};
                    err.code = 'PAYMENT_REQUIRED';
                    err.message = 'You dont have enough funds!';
                    err.status = 402;
                    throw err;
                        } else {
                            acc.balance = acc.balance - parseFloat(req.body.amount);
                            console.log('NEW BALANCE DEBIT :', acc.balance);
                            return acc.save();
                        }
                    }
                })
                .then(function (aa) {
                    console.log('AA :', aa);
                    var t1 = new Transaction();
                    t1.source = 'System top-up';
                    t1.account = aa._id;
                    t1.amount = parseFloat(req.body.amount);
                    t1.currency = aa.currency;
                    t1.description = req.body.description;
                    t1.time = new Date();
                    t1.type = 'deb';
                    return t1.save();
                })
                .then(function (t) {
                    return Account.findOne({_id : req.params.id}).exec();
                })
                .then(function (az) {
                    console.log('AZZ :', az);
                    console.log('OLD BALANCE CREDIT :', az.balance);
                    az.balance = az.balance + parseFloat(req.body.amount);
                    console.log('NEW BALANCE CREDIT :', az.balance);
                    return az.save();
                })
                .then(function (ax) {
                    var t1 = new Transaction();
                    t1.source = 'System top-up';
                    t1.account = ax._id;
                    t1.amount = parseFloat(req.body.amount);
                    t1.currency = ax.currency;
                    t1.description = req.body.description;
                    t1.time = new Date();
                    t1.type = 'crd';
                    return t1.save();

                })
                .then(function (zz) {
                    res.sendStatus(200);
                })
                 .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.status(err.status).send(err);
                    });
   
})
*/
//items
router.get('/:id/transactions', c.checkReadAccess, function (req, res) {
   
        Transaction.find({account : req.params.id}).sort({time : -1}).limit(200).exec()
   .then(function (pack) {
       var p = {};
       p.count = pack.length;
       p.transactions = pack;
       
       res.json(p);
   })
   .catch(function (err) {
            err.code = 'EDB_ERROR';
            err.status = 500;
            throw err;
   });
   
});

router.post('/:id/users', c.checkWriteAccess, function (req, res) {
    Account.findOne({_id : req.params.id})
        .then(function (acc) {
            res.locals.acc = acc;
            if (acc.type == 'wholesaler') {
                res.locals.needwholesaler = false;
                return acc;
            } else if (acc.type == 'reseller') {
                res.locals.needwholesaler = false;
                
                return acc;
            } else if (acc.type == 'agent') {
                //you cannot create agent of an agent
               res.locals.needwholesaler = true;
               return Account.findOne({_id : acc.parent}).exec();
            }
        })
        .then(function (rere) {
             if (rere.type == 'wholesaler') {
                    res.locals.wholesaler = rere._id;
                } else if (rere.type == 'reseller') {
                    res.locals.wholesaler = rere.parent;
                }
                return rere;
        })
        .then(function (bcc) {
             var ra = {};
    for (var key in req.body) {
                    if ((key == 'password') || (key == 'main_account') || (key == 'access_type'))
                        continue;
                    ra[key] = req.body[key];   
                }
                ra.password = authc(req.body.password);
                ra.main_account = req.params.id;
                ra.active = true;
                ra.reseller_id = res.locals.wholesaler;
                var u = new User(ra);
                return u.save();
              
        })
        .then(function (us) {
            res.locals.r = us._id;
                   return Account.findOne({_id : req.params.id}).exec()
        })
        .then(function (acc2) {
                        acc2.rwaccess.push(res.locals.r);
                        return acc2.save();
                    })
                    .then(function (e) {
                        res.sendStatus(200);
                    })
                    .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.json(err.status, err);
                    });
   
});
router.get('/:id/users', c.checkReadAccess, function (req, res) {
    User.find({main_account : req.params.id}, {password : false})
    .then(function (u) {
        console.log(u);
        var r = {};
        r.count = u.length;
        r.users = [];
        u.forEach(function (a) {
            r.users.push(a);
        });
        res.json(r);
    })
    .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.json(err.status, err);
                    });
})
router.get('/:id/users/:uid', c.checkReadAccess, function (req, res) {
    User.findOne({_id : req.params.uid}, {password : false})
    .then(function (u) {
        res.json(u);
    })
    .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.json(err.status, err);
                    });
});
router.put('/:id/users/:uid', c.checkWriteAccess, function(req, res) {
    User.findOne({_id : req.params.uid})
    .then(function (u) {
        for (key in req.body) {
            if ((key == '_id') || (key == 'updatedAt') || (key == 'createdAt') || (key == 'last_login') || (key == 'username') || (key == 'avatar') || (key == 'reseller_id'))
                continue;
            if (key == 'password') {
                u[key] = authc(req.body[key]);
            }
                
            u[key] = req.body[key];
        }
        return u.save();
    })
    .then(function (uz) {
        var no = {};
        delete uz.password;
        res.json(uz);
    })
    .catch(function (err) {
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
});
router.post('/:id/users/:uid/avatar', c.checkWriteAccess, upload.single('userPhoto'), function (req, res) {
    User.findOne({main_account : req.params.id, _id : req.params.uid}).exec()
        .then(function (acc) {
            if (acc !== null) {
                acc.avatar = req.file.filename;
                return acc.save();
            } else {
                res.sendStatus(404);
            }
        })
        .then(function (resp) {
            res.sendStatus(201);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
});
router.delete('/:id/users/:uid', c.checkWriteAccess, function (req, res) {
    //revoke access
    Account.findOne({_id : req.params.id})
        .then(function (a) {
            delete a.rwaccess[req.params.uid];
            delete a.roaccess[req.params.uid];
            return a.save();
        })
        .then(function (u) {
            User.findOne({_id : req.params.uid}).remove().exec();
            res.sendStatus(204);
        })
})
router.post('/:id/funds_transfer', c.checkWriteAccess, function (req, res) {
    if (!req.body.source || !req.body.destination || !req.body.amount) {
         var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
    } else {
         Account.findOne({_id : req.params.id, 'wallets.wallet_id' : req.body.source})
        .then(function (acc) {
            return Account.findOne({_id : {$in : req.user.rwaccess}, 'wallets.wallet_id' : req.body.destination}).exec();
        })
        .then(function (baa) {
            if (baa !== null) {
                //ok 
                var o = {
                    amount : req.body.amount,
                    description : req.body.description || '',
                }
                return Finance.transferFunds(req.body.source, req.body.destination, o);
            } else {
                var err = {};
                err.message = "You cannot make transfer to this destination wallet";
                err.status = 403;
                err.code = "ENO_ACCESS"
                throw err;
            }
        })
        .then(function (fin) {
            res.sendStatus(200);
        })
            .catch(function (err) {
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
    }
   
})
module.exports = router;
