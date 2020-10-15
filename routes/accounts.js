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
var Dataprod = require('../models/dataprod')
var Elprod = require('../models/elprod')
var NumLookup = require('../modules/locnumberlookup')
var Epins = require('../models/epin');
var EpinProduct = require('../models/epinproduct');
var EpinOrder = require('../models/epinorder')
var NumLookup = require('../modules/locnumberlookup')
var multer  = require('multer')
var crypto = require('crypto')
var mime = require('mime')
var csv = require('fast-csv')
var fs = require('fs')
var offset = require('timezone-name-offsets');
var DateWithOffset = require('date-with-offset')
var e4n = require('excel4node')
var stream = require('stream')
function pad(num) {
      var norm = Math.abs(Math.floor(num));
      return (norm < 10 ? '0' : '') + norm;
    };
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
var storageCsv = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp/import/')
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
var uplPin = multer({storage : storageCsv});
//Get Accounts
router.get('/', function (req, res) {
    if (req.user.account_type == 'agent') {
        res.sendStatus(403);
    } else {
        Account.find({_id : {$in : req.user.child}}, {_id : true, account_name : true, active : true, type : true, legal_type : true, numeric_id : true, wallets : true, parent : true, profit_map : true, test_mode : true, createdAt : true, updatedAt : true}).exec()
    .then(function (accounts) {

        var resp = {};
        resp.count = accounts.length;
       var accs = [];
        accounts.forEach(function (fr) {
            var o = fr.toObject();
            o.parent_name = req.user.rwnames[fr.parent];
            accs.push(o);
        })
        resp.accounts = accs;
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
                    if ((key == 'parent') || (key == 'type') || (key == 'currency') || (key == 'wallets') || (key == 'profit_map') || (key == 'permitted_apis'))
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
    Account.findOne({_id : req.user.main_account}, {profit_pct : false, permitted_apis : false})
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
router.post('/me/pins/rate', function (req, res) {
    co(function* () {
        var type = req.body.type;
        var cur = req.body.currency;
        if (req.body.type == 'flexi') {
            res.json({
                type : 'flexi',
                currency : req.body.currency,
                rate : 1
            })
        } else {
            switch (req.body.currency) {
                                case "NGN":
                                    var iso = "NG";
                                    break;
                                case "GHS":
                                    var iso = "GH";
                                    break;
                                case "BDT":
                                    var iso = "BD";
                                    break;
                                case "INR":
                                    var iso = "IN";
                                    break;
                                case "UGX":
                                    var iso = "UG";
                                    break;
                                case "ZMW":
                                    var iso = "ZW"
                                    break;
                                default:
                                    var iso = "ALL"
                                    break;
                            }
                            var prof = yield NumLookup.getProfits(req.user.main_account, iso, 'ALL');
                            var agentProfit = (prof.agentProfit + 100) / 100;
                        var resProfit = (prof.resProfit + 100) / 100;
                        var wholeProfit = (prof.wProfit + 100) / 100;
                        console.log('ProfitDEC', wholeProfit, resProfit, agentProfit)
                        var amt = (1 * agentProfit * resProfit * wholeProfit);
                        res.json({
                            type : 'fixed',
                            currency : req.body.currency,
                            rate : amt
                        })
        }
    })
})
router.post('/me/pins', function (req, res) {
           return new Promise(function (resolve,reject) {
               var bz=[];
                              function *genPin(bar, i) {
                                  var seq = i + 1;
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
                                    p.seq = String(bar.numseq) + '-' + seq;
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
				numseq : randomIntFromInterval(11111111, 99999999),
                            valid : true,
                            issuer : req.user.main_account
                        }
                        console.log('BATCH :', batch)
                        if (batch.type == 'flexi') {
                             var o = {
                            amount : batch.count * batch.value,
                            currency : b.currency,
                            description : "Purchase of " + batch.count + " x " + batch.value + " " + batch.currency + " PINS"
                        }
                    } else {
                        
                        var amt = batch.value * batch.count 
                        var o = {
                            amount : amt,
                            currency : b.currency,
                            description : "Purchase of " + batch.count + " x " + batch.value + " " + batch.currency + " PINS"
                        }
                        }
                       
                        var resu = yield Finance.arbCharge(req.user.main_account, o);
                        if (resu !== null) {
                            batch.issued = new Date()
                            var ba = new Pinbatch(batch);
                            var bar = yield ba.save();
                            
                            if (bar !== null) {
                                for (var a=0; a < bar.count; a++) {
                                   // console.log(bar._id, bar.currency, a);
                                   yield genPin(bar, a)
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
  req.body = JSON.parse(new Buffer(req.query.filter, 'base64').toString('ascii'));
  console.log('BODY', req.body)
        if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
       var ob = { account : {$in : req.user.child}}
        
    } else if (req.user.account_type == 'agent') {
        var ob = { account : req.user.main_account }
    }
    if ((req.body.date_from !== '') && (req.body.date_to !== '') ) {
        if ('undefined' !== typeof req.body.timezone) {
              if (req.body.timezone !== '') {
            var off = offset[req.body.timezone];
            res.locals.offset = off;
            console.log('OFF', off)
            
            if (off < 0) {
                //var offs = off.replace('-', '')
                var h = (parseInt(off / 60)) * 1;
                var m = (off % 60) * 1;
                var compTZ= String("-" + h + ":" + m);
            } else {
                var h = parseInt(off / 60);
                var m = off % 60;
                var compTZ= String("+" + pad(h) + ":" + pad(m));
            }
            
        } else {
            res.locals.offset = 0;
            var compTZ = "Z"
        }
    } else {
        res.locals.offset = 0;
            var compTZ = "Z"
        }
      
        if (req.body.time_from == '') {
            req.body.time_from = "2017-01-01T00:01:00.000Z"
        }
        if (req.body.time_to == '') {
            req.body.time_to = "2017-01-01T23:59:59.000Z"
        }
        var dfr = req.body.date_from.split("T")[0];
        var tfr = req.body.time_from.split("T")[1].split("Z")[0]
        var dto = req.body.date_to.split("T")[0];
        var tto = req.body.time_to.split("T")[1].split("Z")[0];
        console.log('TFR', dfr + 'T' + tfr + compTZ)
        var time_from = new Date(dfr + 'T' + tfr + compTZ);
        var time_to = new Date(dto + 'T' + tto + compTZ);
        ob.time = {$lte : time_to, $gte : time_from}
    }
        var str = Transaction.find(ob).sort({time : -1}).batchSize(1000000000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=transactions.csv'
            });
            var st="Time,Account,Type,Amount,Currency,Balance After, Wallet ID,Description,Source\n";
            res.write(st);
		str.on("data", function (d) {
             var mtime = new DateWithOffset(d.time, res.locals.offset || 0).toString()
                   var str = mtime + ',' + req.user.rwnames[d.account] + ',' + d.type + ',' + d.amount + ',' + d.currency + ',' + d.balance_after + ',' + d.wallet_id +',' + d.description + ',' + d.source + '\n';
                   res.write(str);
               })
               str.on("error", function (e) {
                   console.log('ERROR', e)
               })
               str.on("end", function () {
                   res.end();
               })
})
router.get('/:id/transactions.csv', c.checkReadAccess, function (req, res) {
        var str = Transaction.find({account : req.params.id}).sort({time : -1}).batchSize(1000000000).cursor();
		res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=transactions.csv'
            });
            var st="Time,Account,Type,Amount,Currency,Balance After, Wallet ID,Description,Source\n";
            res.write(st);
		str.on("data", function (d) {
                   var str = d.time + ',' + req.user.rwnames[d.account] + ',' + d.type + ',' + d.amount + ',' + d.currency + ',' + d.balance_after + ',' + d.wallet_id +',' + d.description + ',' + d.source + '\n';
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
               var filename = req.params.batch + '.txt';
               res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=' + filename
            });
               var st = "#,Type,Batch ID,Serial,Code,Value,Currency,Valid,Valid From, Valid To\n";
            res.write(st);
               str.on("data", function (d) {
                   var stri = d.seq + ',' + ba.type + ',' +  d.batch + ',"' + d.serial + '","' + d.code + '",' + d.value + ',' + d.currency + ',' + d.valid + ',' + d.valid_from + ',' + d.valid_to + '\n';
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
router.get('/me/price.xls', (req,res) => {
    co(function* () {
        var wb = new e4n.Workbook();
        var ats = wb.addWorksheet('Airtime Pricelist');
        var dts = wb.addWorksheet('Data Pricelist');
        var ets = wb.addWorksheet('BillPay - Electricity');
        var li = yield Baseprod.find({apid : {$in : req.reseller.permitted_apis}}).sort({country : 1, name : 1}).exec();
        var di = yield Dataprod.find({apid : {$in : req.reseller.permitted_apis}}).sort({country : 1, name : 1}).exec();
        var ei = yield Elprod.find({apid : {$in : req.reseller.permitted_apis}}).sort({country : 1, name : 1}).exec();
        var style = wb.createStyle({
            font: {
                color: '#000000',
                size: 10
            }
        });
        ats.cell(1, 1).string('SKU').style(style);
         ats.cell(1,2).string('Country').style(style);
         ats.cell(1,3).string('Operator').style(style);
         ats.cell(1,4).string('Min Denomination').style(style);
         ats.cell(1,5).string('Max Denomination').style(style);
         ats.cell(1,6).string('Topup Currency').style(style);
         ats.cell(1,7).string('Step').style(style);
         ats.cell(1,8).string('FX Rate').style(style);
         ats.cell(1,9).string('Currency').style(style);
         ats.cell(1,10).string('Price').style(style);
         
         dts.cell(1,1).string('SKU').style(style);
         dts.cell(1,2).string('Country').style(style);
        dts.cell(1,3).string('Operator').style(style);
        dts.cell(1,4).string('Data Amount').style(style);
        dts.cell(1,5).string('Topup Price').style(style);
        dts.cell(1,6).string('Topup Currency').style(style);
        
        ets.cell(1, 1).string('SKU').style(style);
        ets.cell(1,2).string('Country').style(style);
        ets.cell(1,3).string('Operator').style(style);
        ets.cell(1,4).string('Min Denomination').style(style);
        ets.cell(1,5).string('Max Denomination').style(style);
        ets.cell(1,6).string('Topup Currency').style(style);
        ets.cell(1,7).string('Step').style(style);
        ets.cell(1,8).string('FX Rate').style(style);
        ets.cell(1,9).string('Currency').style(style);
        ets.cell(1,10).string('Price').style(style);

         var y = 2;
         var z= 2;
         var k = 2;
         console.log(req.reseller.permitted_apis)
        for (var i = 0 ; i < li.length; i++) {
            var d = li[i];
           
            var prof = yield NumLookup.getProfits(req.user.main_account, d.iso, d.acloperId);
            var agentProfit = (prof.agentProfit + 100) / 100;
            var resProfit = (prof.resProfit + 100) / 100;
            var wholeProfit = (prof.wProfit + 100) / 100;
            if (req.user.currencies.contains(d.currency)) {
                if (d.fx_rate == '-') {
                    
                    var pr = (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                    var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                    var pra = pr;
                    var rat = d.fx_rate;
                } else {
                    var loclist = ['NGN', 'GHS', 'BDT']
                    if (loclist.contains(d.currency)) {
                        var pr = (parseFloat(1) * agentProfit * resProfit * wholeProfit).toFixed(2);
                    
                    } else {
                      // var pr = (parseFloat(d.fx_rate) * agentProfit * resProfit * wholeProfit).toFixed(2); 
                       var pr =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                    }
                    
                 //   var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.currency + ',' + d.price + '\n';
                 var pra = d.price;
                 var rat = pr;
                }
            } else {
                 if (req.user.currency !== d.currency) {
                     /*
                      var rate = yield Rate.findOne({source : txcur, destination : Parent.wallets[i].currency}).exec();
                    var rateRev = yield Rate.findOne({source : Parent.wallets[i].currency, destination : txcur}).exec();
                    var rateFromUSD = yield Rate.findOne({source : 'USD', destination : Parent.wallets[i].currency}).exec();
                    var rateToUSD = yield Rate.findOne({source : 'USD', destination : txcur}).exec();
                    */
                var rate = yield Rate.findOne({source : d.currency, destination : req.user.currency}).exec();
                var rateRev = yield Rate.findOne({source : req.user.currency, destination  : d.currency}).exec();
                var rateFromUSD = yield Rate.findOne({source : 'USD', destination : req.user.currency}).exec();
                var rateToUSD = yield Rate.findOne({source : 'USD', destination : d.currency}).exec();

                var needsFX = true;
            } else {
                var needsFX = false;
            }
            if (d.fx_rate == '-') {
                var pr =   (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                if (needsFX) {
                    if (rate !== null) {
                        pr = (pr * rate.rate).toFixed(2);
                    } else if (rateRev !== null) {
                        pr = (pr / rateRev.rate).toFixed(2);
                    } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                        var s1 = (pr / rateToUSD.rate);
                        pr = (s1 * rateFromUSD.rate);
                    }
                    
                    d.currency = req.user.currency
                }
          //      var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',-,' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
          var pra = pr;
          var rat = d.fx_rate;
            } else {
               var ra =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                        if (needsFX) {
                    if (rate !== null) {
                        ra = (ra / rate.rate).toFixed(2);
                    } else if (rateRev !== null) {
                        ra = (ra * rateRev.rate).toFixed(2);
                    } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                        var s1 = (ra * rateToUSD.rate);
                        ra = (s1 / rateFromUSD.rate).toFixed(2);
                    }
                    
                    d.currency = req.user.currency
                } 
             //  var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
             var pra = d.price;
             var rat = ra;
            }
            }
           
            var apiID = d.sku.split('-')[0];
         //  if (req.reseller.permitted_apis.contains(apiID)) {
            console.log('got line', y);
            ats.cell(y, 1).string(d.sku).style(style);
             ats.cell(y,2).string(d.country).style(style);
            ats.cell(y,3).string(d.name).style(style);
            ats.cell(y,4).string(d.min_denomination).style(style);
             ats.cell(y,5).string(d.max_denomination).style(style);
             ats.cell(y,6).string(d.topup_currency).style(style);
            ats.cell(y,7).string(String(d.step) || '-').style(style);
             ats.cell(y,8).string(rat).style(style);
             ats.cell(y,9).string(d.currency).style(style);
             ats.cell(y,10).string(pra).style(style);
             y++;
       //    }
            

        }
        for (var ii = 0 ; ii < di.length; ii++) {
            var dx = di[ii];
            var prof = yield NumLookup.getProfits(req.user.main_account, dx.iso, dx.acloperId);
            var agentProfit = (prof.agentProfit + 100) / 100;
            var resProfit = (prof.resProfit + 100) / 100;
            var wholeProfit = (prof.wProfit + 100) / 100;
            if (req.user.currencies.contains(dx.topup_currency)) {
               
                var pr = (parseFloat(dx.topup_price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                dts.cell(z, 1).string(dx.sku).style(style);
                dts.cell(z, 2).string(dx.country).style(style);
                dts.cell(z, 3).string(dx.name).style(style);
                dts.cell(z, 4).string(String(dx.data_amount) + 'MB').style(style);
                dts.cell(z, 5).string(pr).style(style);
                dts.cell(z, 6).string(dx.topup_currency).style(style);
                z++;
            } else {
                var rate = yield Rate.findOne({source : dx.topup_currency, destination : req.user.currency}).exec();
                var rateRev = yield Rate.findOne({source : req.user.currency, destination  : dx.topup_currency}).exec();
                var rateFromUSD = yield Rate.findOne({source : 'USD', destination : req.user.currency}).exec();
                var rateToUSD = yield Rate.findOne({source : 'USD', destination : dx.topup_currency}).exec();
                var pr =   (parseFloat(dx.topup_price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                    if (rate !== null) {
                        pr = (pr * rate.rate).toFixed(2);
                    } else if (rateRev !== null) {
                        pr = (pr / rateRev.rate).toFixed(2);
                    } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                        var s1 = (pr / rateToUSD.rate);
                        pr = (s1 * rateFromUSD.rate);
                    }
                    
                    dx.topup_currency = req.user.currency
                
          //      var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',-,' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
          var pra = pr;
        
          dts.cell(z, 1).string(dx.sku).style(style);
          dts.cell(z, 2).string(dx.country).style(style);
          dts.cell(z, 3).string(dx.name).style(style);
          dts.cell(z, 4).string(String(dx.data_amount) + 'MB').style(style);
          dts.cell(z, 5).string(pra).style(style);
          dts.cell(z, 6).string(dx.topup_currency).style(style);
          z++;
            }

        }
        for (var xi = 0; xi < ei.length; xi++) {
            var dy = ei[xi];
            var prof = yield NumLookup.getProfits(req.user.main_account, dy.iso, dy.acloperId);
            var agentProfit = (prof.agentProfit + 100) / 100;
            var resProfit = (prof.resProfit + 100) / 100;
            var wholeProfit = (prof.wProfit + 100) / 100;
            if (req.user.currencies.contains(dy.topup_currency)) {
                var loclist = ['NGN', 'GHS', 'BDT']
                if (loclist.contains(dy.topup_currency)) {
                    var pr = (parseFloat(1) * agentProfit * resProfit * wholeProfit).toFixed(2);
                
                } else {
                  // var pr = (parseFloat(d.fx_rate) * agentProfit * resProfit * wholeProfit).toFixed(2); 
                   var pr =  (dy.fx_rate - ((parseFloat(dy.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(dy.fx_rate) * prof.resProfit) / 100) - ((parseFloat(dy.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                }
                
             //   var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.currency + ',' + d.price + '\n';
             var pra = dy.price;
             var rat = pr;
             ets.cell(k, 1).string(dy.sku).style(style);
             ets.cell(k,2).string(dy.country).style(style);
            ets.cell(k,3).string(dy.name).style(style);
            ets.cell(k,4).string(dy.min_denomination).style(style);
             ets.cell(k,5).string(dy.max_denomination).style(style);
             ets.cell(k,6).string(dy.topup_currency).style(style);
            ets.cell(k,7).string(String(dy.step) || '-').style(style);
             ets.cell(k,8).string(rat).style(style);
             ets.cell(k,9).string(dy.currency).style(style);
             ets.cell(k,10).string(pra).style(style);
             k++;
            } else {
                var rate = yield Rate.findOne({source : dy.currency, destination : req.user.currency}).exec();
                var rateRev = yield Rate.findOne({source : req.user.currency, destination  : dy.currency}).exec();
                var rateFromUSD = yield Rate.findOne({source : 'USD', destination : req.user.currency}).exec();
                var rateToUSD = yield Rate.findOne({source : 'USD', destination : dy.currency}).exec();
                var ra =  (dy.fx_rate - ((parseFloat(dy.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(dy.fx_rate) * prof.resProfit) / 100) - ((parseFloat(dy.fx_rate) * prof.wProfit) / 100)).toFixed(2)
              
            if (rate !== null) {
                ra = (ra / rate.rate).toFixed(2);
            } else if (rateRev !== null) {
                ra = (ra * rateRev.rate).toFixed(2);
            } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                var s1 = (ra * rateToUSD.rate);
                ra = (s1 / rateFromUSD.rate).toFixed(2);
            }
            
            dy.currency = req.user.currency
        
     //  var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
     var pra = dy.price;
     var rat = ra;
     ets.cell(k, 1).string(dy.sku).style(style);
     ets.cell(k,2).string(dy.country).style(style);
    ets.cell(k,3).string(dy.name).style(style);
    ets.cell(k,4).string(dy.min_denomination).style(style);
     ets.cell(k,5).string(dy.max_denomination).style(style);
     ets.cell(k,6).string(dy.topup_currency).style(style);
    ets.cell(k,7).string(String(dy.step) || '-').style(style);
     ets.cell(k,8).string(rat).style(style);
     ets.cell(k,9).string(dy.topup_currency).style(style);
     ets.cell(k,10).string(pra).style(style);
     k++;
            }
        }
        var bufferStream = new stream.PassThrough();
        var xa = yield wb.writeToBuffer()
        bufferStream.end(xa);
        bufferStream.pipe(res);
    })
    .catch(function (err) {
        console.log(err);
        res.sendStatus(500)
    })
})
router.get('/me/pricelist.csv', function (req, res) {
       var str = Baseprod.find().sort({country : 1, name : 1}).batchSize(10000).cursor();
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
                        if (req.user.currencies.contains(d.currency)) {
                            if (d.fx_rate == '-') {
                                
                                var pr = (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                            } else {
                                var loclist = ['NGN', 'GHS', 'BDT']
                                if (loclist.contains(d.currency)) {
                                    var pr = (parseFloat(1) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                
                                } else {
                                  // var pr = (parseFloat(d.fx_rate) * agentProfit * resProfit * wholeProfit).toFixed(2); 
                                   var pr =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                                }
                                
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.currency + ',' + d.price + '\n';
                            }
                        } else {
                             if (req.user.currency !== d.currency) {
                                 /*
                                  var rate = yield Rate.findOne({source : txcur, destination : Parent.wallets[i].currency}).exec();
                                var rateRev = yield Rate.findOne({source : Parent.wallets[i].currency, destination : txcur}).exec();
                                var rateFromUSD = yield Rate.findOne({source : 'USD', destination : Parent.wallets[i].currency}).exec();
                                var rateToUSD = yield Rate.findOne({source : 'USD', destination : txcur}).exec();
                                */
                            var rate = yield Rate.findOne({source : d.currency, destination : req.user.currency}).exec();
                            var rateRev = yield Rate.findOne({source : req.user.currency, destination  : d.currency}).exec();
                            var rateFromUSD = yield Rate.findOne({source : 'USD', destination : req.user.currency}).exec();
                            var rateToUSD = yield Rate.findOne({source : 'USD', destination : d.currency}).exec();

                            var needsFX = true;
                        } else {
                            var needsFX = false;
                        }
                        if (d.fx_rate == '-') {
                            var pr =   (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                            if (needsFX) {
                                if (rate !== null) {
                                    pr = (pr * rate.rate).toFixed(2);
                                } else if (rateRev !== null) {
                                    pr = (pr / rateRev.rate).toFixed(2);
                                } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                                    var s1 = (pr / rateToUSD.rate);
                                    pr = (s1 * rateFromUSD.rate);
                                }
                                
                                d.currency = req.user.currency
                            }
                            var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',-,' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                        } else {
                           var ra =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                                    if (needsFX) {
                                if (rate !== null) {
                                    ra = (ra / rate.rate).toFixed(2);
                                } else if (rateRev !== null) {
                                    ra = (ra * rateRev.rate).toFixed(2);
                                } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                                    var s1 = (ra * rateToUSD.rate);
                                    ra = (s1 / rateFromUSD.rate).toFixed(2);
                                }
                                
                                d.currency = req.user.currency
                            } 
                           var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
                        }
                        }
                       
                        var apiID = st.split(',')[0].split('-')[0];
                       if (req.reseller.permitted_apis.contains(apiID)) {
                            return st;
                       }
}, { objectMode: true, parallel: 3 });
    var st = "SKU,Country,Operator Name,Min Denom.,Max Denom,Local Currency, Denom. Step,Rate,Currency,Price\n";
            res.write(st);
    str.pipe(ms).pipe(res);
})
router.get('/:id/pricelist.csv', c.checkReadAccess, function (req, res) {
        var str = Baseprod.find().sort({country : 1, name : 1}).batchSize(100000).cursor();
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
                        var acc = yield Account.findOne({_id : req.params.id}).exec();
                        var u;
                        var cur = [];
                        acc.wallets.forEach(function (e) {
                            if (e.primary == true) {
                                u = e;
                            }
                                cur.push(e)
                        })
                        if (cur.contains(d.currency)) {
                            if (d.fx_rate == '-') {
                                
                                var pr = (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                            } else {
                                var loclist = ['NGN', 'GHS', 'BDT']
                                if (loclist.contains(d.currency)) {
                                    var pr = (parseFloat(1) * agentProfit * resProfit * wholeProfit).toFixed(2);
                                
                                } else {
                                  // var pr = (parseFloat(d.fx_rate) * agentProfit * resProfit * wholeProfit).toFixed(2); 
                                   var pr =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                                }
                                
                                var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + pr + ',' + d.currency + ',' + d.price + '\n';
                            }
                        } else {
                             if (u.currency !== d.currency) {
                                 /*
                                  var rate = yield Rate.findOne({source : txcur, destination : Parent.wallets[i].currency}).exec();
                                var rateRev = yield Rate.findOne({source : Parent.wallets[i].currency, destination : txcur}).exec();
                                var rateFromUSD = yield Rate.findOne({source : 'USD', destination : Parent.wallets[i].currency}).exec();
                                var rateToUSD = yield Rate.findOne({source : 'USD', destination : txcur}).exec();
                                */
                            var rate = yield Rate.findOne({source : d.currency, destination : u.currency}).exec();
                            var rateRev = yield Rate.findOne({source : u.currency, destination  : d.currency}).exec();
                            var rateFromUSD = yield Rate.findOne({source : 'USD', destination : u.currency}).exec();
                            var rateToUSD = yield Rate.findOne({source : 'USD', destination : d.currency}).exec();

                            var needsFX = true;
                        } else {
                            var needsFX = false;
                        }
                        if (d.fx_rate == '-') {
                            var pr =   (parseFloat(d.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                            if (needsFX) {
                                if (rate !== null) {
                                    pr = (pr * rate.rate).toFixed(2);
                                } else if (rateRev !== null) {
                                    pr = (pr / rateRev.rate).toFixed(2);
                                } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                                    var s1 = (pr / rateToUSD.rate);
                                    pr = (s1 * rateFromUSD.rate);
                                }
                                
                                d.currency = u.currency
                            }
                            var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',-,' + d.fx_rate + ',' + d.currency + ',' + pr + '\n';
                        } else {
                           var ra =  (d.fx_rate - ((parseFloat(d.fx_rate) * prof.agentProfit) / 100) - ((parseFloat(d.fx_rate) * prof.resProfit) / 100) - ((parseFloat(d.fx_rate) * prof.wProfit) / 100)).toFixed(2)
                                    if (needsFX) {
                                if (rate !== null) {
                                    ra = (ra / rate.rate).toFixed(2);
                                } else if (rateRev !== null) {
                                    ra = (ra * rateRev.rate).toFixed(2);
                                } else if ( (rateFromUSD !== null) && (rateToUSD !== null) ) {
                                    var s1 = (ra * rateToUSD.rate);
                                    ra = (s1 / rateFromUSD.rate).toFixed(2);
                                }
                                
                                d.currency = u.currency
                            } 
                           var st = d.sku + ',' + d.country + ',' + d.name + ',' + d.min_denomination + ',' + d.max_denomination + ',' + d.topup_currency + ',' + d.step + ',' + ra + ',' + d.currency + ',' + d.price + '\n';
                        }
                        }
                       
                        var apiID = st.split(',')[0].split('-')[0];
                       if (req.reseller.permitted_apis.contains(apiID)) {
                            return st;
                       }
}, { objectMode: true, parallel: 3 });
    var st = "SKU,Country,Operator Name,Min Denom.,Max Denom,Local Currency, Denom. Step,Rate,Currency,Price\n";
            res.write(st);
    str.pipe(ms).pipe(res);
})
/* EPINS */

router.get('/me/epins', function (req, res) {
if (req.reseller.epin_enabled) {
//epin enabled 
co(function* ( ) {
    if (req.user.account_type == 'wholesaler') {
        var ep = yield EpinProduct.find({owner : req.reseller._id}).exec();
    var re = [];
    for (var i = 0; i < ep.length; i++) {
        console.log(i, ep[i])
        var rec = ep[i].toObject()
        var cod = rec.iso.toUpperCase() + ':' + rec.operator_id;
        console.log('COD', cod)
        var opr = yield ProvHelper.findOne({code : cod}).exec();
        rec.country = opr.country;
        rec.operator_name = opr.operator_name
        var usedCount = yield Epins.find({sku : rec.sku, allocated_to : {$exists : true}}).count().exec();
        rec.used = usedCount;
        re.push(rec);
    }
    var r = {};
    r.count = re.length;
    r.batches = re;
    res.json(r);
} else {
        var ep = yield EpinProduct.find({owner : req.reseller._id}).exec();
    var re = [];
    for (var i = 0; i < ep.length; i++) {
        console.log(i, ep[i])
        var rec = ep[i].toObject()
        var cod = rec.iso.toUpperCase() + ':' + rec.operator_id;
        console.log('COD', cod)
        var opr = yield ProvHelper.findOne({code : cod}).exec();
        rec.country = opr.country;
        rec.operator_name = opr.operator_name
        var usedCount = yield Epins.find({sku : rec.sku, allocated_to : {$exists : true}}).count().exec();
        rec.instock = rec.count - usedCount;
        var prof = yield NumLookup.getProfits(req.user.main_account, rec.iso, rec.operator_id);
        var agentProfit = (prof.agentProfit + 100) / 100;
        var resProfit = (prof.resProfit + 100) / 100;
        delete rec.count;
        rec.price = (parseInt(rec.denomination) * resProfit * agentProfit).toFixed(2); 

        re.push(rec);
    }
    var r = {};
    r.count = re.length;
    r.batches = re;
    res.json(r);
    }
    
    /*
    EpinProduct.find({owner : req.reseller._id})
    .then(function (ba) {
        var bo = ba.toObject();

        var r = {};
        r.count = ba.length;
        r.batches = ba;
        res.json(r)
    })
    .catch(function (err) {
        console.error(err);
        res.status(err.status || 500).send(err);
    })
    */
})
.catch(function (err) {
    console.log(err)
})

} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})

router.get('/me/epins/:batch.txt', function (req, res) {
if (req.reseller.epin_enabled) {
EpinOrder.findOne({_id : req.params.batch, account : req.user.main_account})
    .then(function (ep) {
        res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=' + req.params.batch + '.txt'
            });
            var head = "Order ID, SKU, Denomination, Country, Operator Name, Operator ID, Serial, PIN Code, Expiry Date\n";
            res.write(head);
            ep.pins.forEach(function (e) {
                var line = ep.order_id + ',' + e.sku + ',' + ep.denomination + ',' + e.country + ',' + e.operator_name + ',' + e.operator_id + ',' + e.serial + ',' + e.code + ',' + e.valid_to + '\n';
                res.write(line);
            })
            res.end();
    })
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
router.get('/me/epins/orders', function (req, res) {
if (req.reseller.epin_enabled) {
if (req.user.account_type !== 'wholesaler') {
    co(function* () {
        var orders = yield EpinOrder.find({account : req.user.main_account}, {pins : false}).exec();
        var recs = [];
        for (var i = 0; i < orders.length; i++) {
            var rec = orders[i].toObject();
            var cod = rec.iso.toUpperCase() + ':' + rec.operator_id;
            var opr = yield ProvHelper.findOne({code : cod}).exec();
            rec.country = opr.country;
            rec.operator_name = opr.operator_name;
            recs.push(rec);
        }
        var r = {};
        r.count = recs.length;
        r.orders = recs;
        res.json(r);
    })
    .catch(function (err) {
        console.error(err);
        res.status(err.status || 500).send(err);
    })
} else {
    co(function* () {
        var orders = yield EpinOrder.find({account : {$in : req.user.rwaccess}}, {pins : false}).exec();
        var recs = [];
        for (var i = 0; i < orders.length; i++) {
            var rec = orders[i].toObject();
            var cod = rec.iso.toUpperCase() + ':' + rec.operator_id;
            var opr = yield ProvHelper.findOne({code : cod}).exec();
            rec.country = opr.country;
            rec.operator_name = opr.operator_name;
            rec.account_name = req.user.rwnames[rec.account];
            recs.push(rec);
        }
        var r = {};
        r.count = recs.length;
        r.orders = recs;
        res.json(r);
    })
     .catch(function (err) {
        console.error(err);
        res.status(err.status || 500).send(err);
    })
}
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
/* IMPORT EPIN TO DB */
router.post('/me/epins/import', uplPin.single('file'), function (req, res) {
if (req.reseller.epin_enabled) {
console.log(req.body);
console.log('GOT PINS : ', req.file.path);
var seq = 1;
EpinProduct.findOne({iso : req.body.iso, operator_id : req.body.operator_id, denomination : req.body.value, owner : req.user.main_account})
.then(function (epr) {
    if (epr !== null) {
        return epr;
    } else {
        var ba = {
            owner : req.user.main_account,
            count : 0,
            iso : req.body.iso,
            operator_id : req.body.operator_id,
            denomination : req.body.value,
            sku : req.body.iso.toUpperCase() + '-' + req.body.operator_id + '-' + req.body.value
        }
        var bx = new EpinProduct(ba);
        return bx.save();
    }
})
.then(function (smth) {
    res.locals.count = 0;
    res.locals.smth = smth;
    console.log('SMTH IS ', smth)
    fs.createReadStream(req.file.path)
    .pipe(csv({quote : null}))
    .on('data', function (data) {
       if ((data.length > 2) || (data[0].length > 30)) {
            var o = {};
        switch (req.body.iso) {
    case "ng":
        //we have nigerian pin 
        o.currency = "NGN";
        o.country = "Nigeria"
        o.iso = "ng"
        o.operator_id = req.body.operator_id;
        o.sku = o.iso.toUpperCase() + '-' + o.operator_id + '-' + req.body.value
        switch (req.body.operator_id) {
            case "1":
            //Airtel
            o.serial = data[1];
            o.code = data[0];
            o.value = (parseInt(data[2]) / 100);
            o.operator_name = 'Airtel';
            o.issued = new Date()
            o.valid_to = moment(data[4], 'DD/MM/YYYY');
            o.valid = true;
            o.owner = req.user.main_account;
            
                break;
            case "2":
            //Etisalat
            o.serial = data[1];
            o.code = data[0];
            o.value = (parseInt(data[2]) / 100);
            o.operator_name = 'Etisalat';
            o.issued = new Date()
            o.valid_to = moment(data[4], 'YYYYMMDD');
            o.valid = true;
            o.owner = req.user.main_account;
                break;
            case "5":
            //MTN
            var str = data[0]
            o.serial = str.substring(0, 16)
            o.code = str.substring(16, 33).substring(0,17)
            o.value = parseInt(str.substring(33))
            o.operator_name = 'MTN';
            o.issued = new Date()
            o.valid_to = moment().add(10, 'years');
            o.valid = true;
            o.owner = req.user.main_account;
                break;
            case "6":
            //Globacom
            
            o.serial = data[4].match( /"(.*?)"/ )[1]
            o.code = String(data[3].match( /"(.*?)"/ )[1]) + String(data[2].match( /"(.*?)"/ )[1])
            o.value = data[5].match( /"(.*?)"/ )[1]
            o.operator_name = 'Globacom';
            o.issued = new Date()
            o.valid_to = moment(data[1].match( /"(.*?)"/ )[1], 'DD/MM/YYYY')
            o.valid = true;
            o.owner = req.user.main_account;
                break;
            default:
                //error
                break;

        }
    default:
        break;
}
var r = new Epins(o);
    r.save()
    EpinProduct.findOneAndUpdate({_id : smth._id}, {$inc : {count : 1}}).exec()
    res.locals.count++
       }
})
.on('end', function (data) {
    console.log('DAAATA', data)
    console.log('count', res.locals.count)
    res.json({count : res.locals.count})
})
})
.catch(function (err) {
    res.status(err.stats || 500).send(err)
})
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
/* IMPORT EPIN TO DB */
router.post('/me/epins/buy', function (req, res) {
if (req.reseller.epin_enabled) {
if (req.user.account_type !== 'wholesaler') {

co(function* () {
    var qty = parseInt(req.body.quantity)
    //check instock 
    var level = yield Epins.find({sku : req.body.sku, allocated_to : {$exists : false}}).count().exec();
    if (level > qty) {
        //stock is ok
        var Acc = yield Account.findOne({_id : req.user.main_account}).exec();
        if (Acc !== null) {
            var canPurchase = false;
            var prod = yield EpinProduct.findOne({sku : req.body.sku}).exec();
            var prof = yield NumLookup.getProfits(req.user.main_account, prod.iso, prod.operator_id);
            var agentProfit = (prof.agentProfit + 100) / 100;
            var resProfit = (prof.resProfit + 100) / 100;
            var pricePerOne = (parseInt(prod.denomination) * resProfit * agentProfit).toFixed(2); 
            var priceTotal = pricePerOne * qty;
            var mywal = null;
            Acc.wallets.forEach(function (wa) {
                if (wa.currency == 'XTK') {
                    if (wa.balance >= priceTotal) {
                        wa.balance = wa.balance - priceTotal;
                        canPurchase = true;
                        mywal = wa;
                    }
                }
            })
            if (canPurchase) {
                //create transaction 
                var tx = new Transaction();
                tx.time = new Date()
                tx.account = req.user.main_account;
                tx.type = 'deb';
                tx.wallet_id = mywal.wallet_id;
                tx.balance_after = mywal.balance;
                tx.amount = priceTotal;
                tx.currency = 'XTK';
                tx.description = 'Purchase of ' + qty + ' x ' + req.body.sku;
                tx.source = 'ePin purchase'
                var xx=  yield tx.save();
                var xyx = yield Acc.save();
                //update pins
                var pinbuf = [];
                var pins = yield Epins.find({sku : req.body.sku, allocated_to : {$exists : false}}).limit(qty).exec();
                for (var i = 0; i < pins.length; i++) {
                    var pi = pins[i];
                    var pz = pi.toObject();
                    pinbuf.push(pz);
                    var rezz = Epins.findOneAndUpdate({_id : pi._id}, {$set : {allocated_to : req.user.main_account}}).exec();

                }
                //create order 
                var ord = new EpinOrder();
                ord.owner = req.reseller._id;
                ord.account = req.user.main_account;
                ord.order_id = 'EPN-' + randomIntFromInterval(11111111,99999999);
                ord.time = new Date();
                ord.count = pinbuf.length;
                ord.denomination = prod.denomination;
                ord.iso = prod.iso;
                ord.operator_id = prod.operator_id;
                ord.sku = prod.sku;
                ord.pins = pinbuf;
                ord.related_transaction = xx._id;
                var zxx = yield ord.save();
                res.json(zxx);

            } else {
                var err = {};
                err.status = 402;
                err.message = "Sorry, you dont have enough funds to make this transaction!"
                err.code = "INSUFICIENT_FUNDS"
                throw err;
            }
        } else {
            res.sendStatus(401);
        }
    } else {
        var err = {}
        err.status = 500;
        err.message = "Sorry, We dont have enough stock to fulfill this order"
        err.code = "INSUFICIENT_STOCK"
        throw err;
    }
})
.catch(function (err) {
        console.error(err);
        res.status(err.status || 500).send(err);
    })
} else {
     var err = {};
    err.status = 403;
    err.message = "Sorry, you dont have access to this method"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
router.post('/:id/epins/topup', c.checkWriteAccess, function (req, res) {
if (req.reseller.epin_enabled) {
if (req.user.account_type == 'wholesaler') {
co(function* () {
    var Acc = yield Account.findOne({_id : req.params.id}).exec();
    if (Acc !== null) {
        var curok = false;
        var mywal = null;
        Acc.wallets.forEach(function (w) {
            if (w.currency == 'XTK') {
                curok = true;
                w.balance += parseFloat(req.body.amount);
                mywal = w;
            }
        })
        if (curok) {
            
        } else {
            //does not exist
            var newW = {
                wallet_name : 'ePIN balance',
                currency : 'XTK',
                wallet_id : 'XTK' + randomIntFromInterval(11111111,99999999),
                balance : parseFloat(req.body.amount),
                virtual : true,
                primary : false,
                parent : null
            }
            mywal = newW;
            Acc.wallets.push(newW);
            curok = true;
        }
        if (curok) {
            //log TX 
            var tx = new Transaction();
            tx.time = new Date();
            tx.account = req.params.id;
            tx.type = 'crd';
            tx.wallet_id = mywal.wallet_id;
            tx.balance_after = mywal.balance;
            tx.amount = parseFloat(req.body.amount)
            tx.currency = 'XTK'
            tx.description = 'Account top-up'
            tx.source = 'System'
            var z = yield Acc.save();
            var x = yield tx.save();
            res.sendStatus(200)
        }
    } else {
        res.sendStatus(404);
    }
})
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, you dont have access to this method"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
router.get('/me/epins/:iso', function(req, res) {
if (req.reseller.features_enabled.contains('epin')) {

} else {
    var err = {};
    err.status = 403;
    err.message = "Sorry, this feature is not activated on this account"
    err.code = "ENO_ACCESS"
    res.status(err.status).send(err);
}
})
/* EPINS */
router.get('/:id', c.checkReadAccess, function (req, res) {
    if (req.user.main_account == req.params.id) {
        Account.findOne({_id : req.params.id}, {profit_map : false, permitted_apis : false}).exec()
        .then(function (acc) {
            res.json(acc);
        })
        .catch(function (err) {
            err.status = 500;
            err.code = 'EDB_ERROR';
            throw err;
        })
    } else {
        Account.findOne({_id : req.params.id}, {permitted_apis : false}).exec()
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
            var save = false;
            acc.wallets.forEach(function (wa) {
                if (res.locals.setToPrimary) {

                    if (wa._id == req.params.wallet) {
                        if (wa.virtual !== true) {
                            wa.primary = true;
                            save = true;
                        }
                        
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
            if (save) {
                return acc.save();
            } else {
                return acc;
            }
            
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
				 if ((e.profit_pct > 0) && (e.profit_pct < 100)) {
                            allBackupValue = e.profit_pct;
                                } else {
                               allBackupValue = 0;
                                }

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
				if ((e.profit_pct > 0) && (e.profit_pct < 100)) { 
                            o.profit_pct = e.profit_pct;
				} else {
				o.profit_pct = 0;
				}
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
               var forbiddenKeys = ['audit', 'rwaccess', 'wallets','roaccess', '_id', 'hasSystemAccess', 'createdAt', 'updatedAt', '__v', 'parent', 'profit_map', 'acl', 'permitted_apis'];
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
                User.find({main_account : req.params.id}).remove().exec();
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
                    if ((key == 'parent') || (key == 'type') || (key == 'balance') || (key == 'wallets') || (key == 'currency') || (key == 'profit_map') || (key == 'permitted_apis'))
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
router.get('/:id/transactions/page/:page', c.checkReadAccess, function (req, res) {
    var opts = {page : req.params.page, limit : 100, sort : {time : -1}};
    
    Transaction.paginate({account : req.params.id}, opts)
        .then(function (f) {
             var o = {};
            o.count = f.total;
            o.pages = f.pages;
            o.page = f.page;
            o.limit = f.limit;
            o.docs = f.docs;
            res.json(o);
        })
        .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.json(err.status, err);
                    });
})

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
            if ((key == '_id') || (key == 'updatedAt') || (key == 'createdAt') || (key == 'last_login') || (key == 'username') || (key == 'avatar') || (key == 'reseller_id') || (key == 'password'))
                continue;
            u[key] = req.body[key];
        }
         if (req.body.password) {
	console.log('GOT PASS', req.body[key], authc(req.body[key]))        
        u.password = authc(req.body.password);
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
router.get('/:id/topuplog/page/:page', c.checkReadAccess, function (req, res) {
    var opts = {page : req.params.page, limit : 100, sort : {time : -1}, select : {vnd_sim:false,app_host:false,response_debug : false, request_debug : false}};
    console.log( req.params.id);
    Topuplog.paginate({account : req.params.id}, opts)
        .then(function (f) {
             var o = {};
            o.count = f.total;
            o.pages = f.pages;
            o.page = f.page;
            o.limit = f.limit;
            o.docs = f.docs;
            res.json(o);
            console.log(o.docs);
        })
        .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(new Error(err.message));
                    res.json(err.status, err);
                    });
})

module.exports = router;

