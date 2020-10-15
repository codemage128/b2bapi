require('dotenv').config();
var BatchJob = require('./models/batchjob')
var Account = require('./models/account')
var Transaction = require('./models/transaction')
var TopupLog = require('./models/topuplog')
var Operator = require('./models/operator')
var Product = require('./models/product')
var Provider = require('./models/provider')
var User = require('./models/user');
var Rate = require('./models/rate')
var Prefix = require('./models/prefix')
var co = require('co');
var cs = require('co-stream');
var parallel = require('co-parallel')
var NumLookup = require('./modules/locnumberlookup')
var Baseprod = require('./models/baseprod')
var ApplyAcl = require('./modules/applyacl')
var Finance = require('./modules/finance')
var s = require('./modules/soapclient');
var os = require("os");
var hostname = os.hostname();
var uuid = require('uuid')
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

var fixProcessing = function () {
    co(function* () {
        var x = yield BatchJob.find({state : 'processing'}).exec();
        if (x.length > 0) {
            for (var i = 0; i < x.length; i++) {
                var o = x[i];
                var ba = yield BatchJob.findOne({_id : o._id}).exec();

                if (ba !== null) {
                    console.log('JOB', ba._id, ba.jobs.length, ba.results.length);
                    if (ba.jobs.length == ba.results.length) {
                    ba.state = 'fin';
                }
                var z = yield ba.save();
            }
        }
    } else {
        console.log('NO JOB Processing', new Date())
    }
    })
}
var checkTask = function () {
    var j;
    //function check db for jobs and launches them
    BatchJob.findOne({state : 'new'})
        .then(function (job) {
            if (job !== null) {
                        function initProcess (msisdn) {
              return new Promise(function (resolve, reject) {
                  var temp = {}
        var ms = msisdn.replace(/^0+/, '');
        temp.ms = ms;
    var cselect = [];
    if (ms.substring(0,1) == '1') {
        var comp = ms.substring(0, 4)
        Operator.findOne({country_code : comp}, function (err, data) {
            if (err) {
                reject (err)
            } else {
                if (data !== null) {
                    resolve(data)
                } else {
                    Operator.findOne({country_code : comp.substring(0,1)}, function (err, dat2) {
                    if (err) {
                        reject(err)
                    } else {
                        if (dat2 !== null) {
                            resolve(dat2)
                        } else {
                            reject(404)
                        }
                    }
                })
                }
            }
        })
        
    } else {
        var comp = ms.substring(0, 3);
        var cselect = [];
        Operator.findOne({country_code : comp}, function (err, dat) {
            if (err) {
                reject(err)
            } else {
                if (dat !== null) {
                    resolve(dat)
                } else {
                    Operator.findOne({country_code : comp.substring(0, 2)}, function (err, dat2) {
                        if (err) {
                            reject(err)
                        } else {
                            if (dat2 !== null) {
                                resolve(dat2)
                            } else {
                                Operator.findOne({country_code : comp.substring(0,1)}, function (err, dat3) {
                                    if (err) {
                                        reject(err)
                                    } else {
                                        if (dat3 !== null) {
                                            resolve(dat3);
                                        } else {
                                            reject(404)
                                        }
                                    }
                                })
                            }
                        }
                    })
                }
            }
        })
    }
})
        }
function *processNumber(obj) {
    console.log('Processing', obj)
    var ms = obj.msisdn.replace(/^0+/, '');
    var j = yield BatchJob.findOne({'jobs._id' : obj._id}).exec();
    j.jobs.forEach(function (jo) {
        if (jo._id == obj._id) {
            jo.state = 'processing'
        }
    })
   var xxa =  yield j.save();
    var data = yield initProcess(ms);
    var temp = {}
    var req = {};
    var res = {};
    res.locals = {};
    req.user = {};
    req.body = obj;
     res.locals.pArr = req.body.product_id.split('-')
    var success = true;
    var errors = [];
    res.locals.txstart = new Date().getTime();
    res.locals.ms = ms;
    var prod = yield Baseprod.findOne({sku : obj.product_id}).exec();
    res.locals.prod = prod;
    if (prod == null) {
        success = false;
        var err = {}
        err.code = "INVALID_PRODUCT"
        err.status = 500;
        err.message = "Product ID you have supplied is not correct";
        errors.push(err);
    }
    if (!success) {
        var r = {
            success : success,
            errors : errors
        }
        return r;
    }
    req.user.currencies = [];
    var Acc = yield Account.findOne({_id : j.account}).exec();
    var uux = yield User.findOne({main_account : Acc._id}).exec();

    Acc.wallets.forEach(function (d) {
        req.user.currencies.push(d.currency);
        if (d.primary === true) {
            req.user.currency = d.currency;
        }
    })
    req.user.test_mode = Acc.test_mode;
    var prof = yield NumLookup.getProfits(Acc._id, prod.iso, prod.acloperId);
    res.locals.profitMap = prof;
    var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
    if (req.user.currencies.contains(res.locals.prod.topup_currency)) {
        //we can use local currency
        var useLocalCurrency = true;
    } else {
        var useLocalCurrency = false;
    }

    if (res.locals.pArr[2] == 'OR') {
        var myrate = (res.locals.prod.fx_rate - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.wProfit) / 100))
        //we have open range
        if (useLocalCurrency) {
            //denom + profit 
                         var localOps = ['MFIN', 'SSLW', 'ETRX']
                         if (localOps.contains(res.locals.pArr[0])) {
                                 var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                            console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                            console.log('PEERC', perc)
                            
                            var price = (parseFloat(req.body.denomination) * parseFloat(perc));
                         } else {
                                 var price = parseFloat(req.body.denomination) / myrate;
                         }
                        //var price = (parseFloat(req.body.denomination) * agentProfit * resProfit * wholeProfit).toFixed(2);
                        var bpr = parseFloat(req.body.denomination) / myrate;
                        var fa = {
                            amount : price,
                            currency : res.locals.prod.topup_currency,
                            msisdn : res.locals.ms,
                            topAmt : req.body.denomination,
                            topCur : res.locals.prod.topup_currency
                        }
                        var ba = {
                            amount : bpr,
                            currency : res.locals.prod.currency
                        }

        } else {
            var bpr = parseFloat(req.body.denomination) / myrate
                        var fa = {
                            amount : bpr,
                            currency : res.locals.prod.currency,
                            msisdn : res.locals.ms,
                            topAmt : req.body.denomination,
                            topCur : res.locals.prod.topup_currency
                        }
                        var ba = null;
        }

        

    } else {
        //its fixed
        //try to make transaction ?
        if (useLocalCurrency) {


             var localOps = ['MFIN', 'SSLW', 'ETRX']
             if (localOps.contains(res.locals.pArr[0])) {
                            var price = (parseFloat(res.locals.prod.min_denomination) * agentProfit * resProfit * wholeProfit);
                        } else {
                            var price = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit);
                        } 
            var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit)
             var fa = {
            amount : price,
            currency : res.locals.prod.topup_currency,
            msisdn : res.locals.ms,
            topAmt : res.locals.prod.min_denomination,
            topCur : res.locals.prod.topup_currency
        }
        var ba = {
            amount : bprice,
            currency : res.locals.prod.currency
        }
        
    } else {
        var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit)
            var fa = {
                amount : bprice,
                currency : res.locals.prod.currency,
                msisdn : res.locals.ms,
                topAmt : res.locals.prod.min_denomination,
                topCur : res.locals.prod.topup_currency
            }
            var ba = null;
        }
       
    }
     if (!req.user.test_mode) {
            var sd = yield Finance.charge(Acc._id, fa, ba);
            res.locals.txOrig = sd;
           
         var tl = new TopupLog();
                                            tl.product_id = req.body.product_id;
                                            tl.account = Acc._id;
                                            tl.time = new Date();
                                            tl.target = res.locals.ms;
                                            if (res.locals.pArr[2] == 'OR') {
                                                tl.topup_amount = req.body.denomination;
                                            } else {
                                                tl.topup_amount = res.locals.prod.min_denomination;
                                            }
                                            
                                            tl.topup_currency = res.locals.prod.topup_currency;
                                            tl.paid_amount = sd.amount;
                                            tl.paid_currency = sd.currency;
                                            tl.country = res.locals.prod.country;
                                            tl.customer_reference = req.body.customer_reference || null;
                                            tl.operator_name = res.locals.prod.name;
                                            tl.channel = 'api'
                                            tl.type = 'topup';
                                            tl.app_host = hostname;
                                            tl.client_apireqbody = JSON.stringify(req.body);
                                            tl.operator_reference = uuid.v1();
                                            tl.test = req.user.test_mode;
                                            tl.related_transactions = [];
                                            tl.related_transactions.push(sd._id);
                                            var tt = yield tl.save();
                                            res.locals.tl = tt;
            console.log('TLL', tt);
            var o = {
                msisdn : res.locals.ms,
                reference : tt.operator_reference,
                operatorId : res.locals.prod.operator_id,
                denomination : parseInt(req.body.denomination),
                reseller_id : uux.reseller_id
            }

                if (process.env.MOCK_MODE == 'false') {

             //Nigeria MTN to direct API
            
             if ((res.locals.pArr[0] == 'MFIN') && (res.locals.pArr[1] == '5')) {
                o.pref_api = 'NGMT'
                var apid = 'NGXX'
             } else if ((res.locals.pArr[0] == 'MFIN') && (res.locals.pArr[1] == '1')) {
                 o.pref_api = 'NGAT'
                 var apid = 'NGXX'
             } else if ((res.locals.pArr[0] == 'MFIN') && (res.locals.pArr[1] == '2')) {
                 o.pref_api = 'NGET';
                 var apid = 'NGXX'
             } else if ((res.locals.pArr[0] == 'MFIN') && (res.locals.pArr[1] == '6')) {
                 o.pref_api = 'NGGL'
                 var apid = 'NGXX'
             } else {
                 var apid = res.locals.pArr[0]
             }
             
             //var apid = res.locals.pArr[0];
             
             var def = yield s.topup(apid, o);
        } else {
            var ttt = {
               success : true,
               resp_debug : 'ttest',
               req_debug : 'ttest',
               pin_based : false,
               responseCode : 'RECHARGE_COMPLETE'
           }
           var def =  ttt;
        }
           
           //var def = ttt;
           res.locals.def = def;
           if (def.success) {
            //we have completed this shit
            
            var com = Finance.applyCommission(req.user.main_account, res.locals.tl._id, res.locals.profitMap);
               var txfin = new Date().getTime();
               var tf = yield TopupLog.findOne({_id : tt._id}).exec();
               tf.success = def.success;
               tf.response_debug = res.locals.def.resp_debug;
        tf.request_debug = res.locals.def.req_debug;
        tf.completed_in = txfin - res.locals.txstart;
        tf.api_transactionid = res.locals.def.operator_transactionid
        var o = {};
        tf.code = "RECHARGE_COMPLETE";
                    tf.message = "Operation Successful";
                    o.status = 201;
                                                        o.message = 'Operation Successful, Recharge created, Reference : ' + tf.operator_reference
                                                        o.reference = tf.operator_reference
                                                        o.code = 'RECHARGE_COMPLETE'
                                                                  //porting patch
                            var ngo = {
                                'NGMT' : 'MTN',
                                'NGAT' : 'Airtel',
                                'NGET' : '9mobile',
                                'NGGL' : 'Globacom'
                            }
                            if ('undefined' !== typeof def.ported) {
                                if (def.ported == true) {
                                    
                                    var op = ngo[def.ported_from] + '-> ' + ngo[def.ported_to];
                                        console.log('NUMBER IS PORTED', op)
                                    tf.operator_name = op;
                                }
                            }
                                                        if (def.pin_based) {
                                                            o.pin_based = true;
                                                            o.pin_option1 = def.pin_option1;
                                                            o.pin_option2 = def.pin_option2;
                                                            o.pin_option3 = def.pin_option3;
                                                            o.pin_code = def.pin_code;
                                                            o.pin_serial = def.pin_serial;
                                                            o.pin_ivr = def.pin_ivr;
                                                            o.pin_validity = def.pin_validity;
                                                            o.pin_value = def.pin_value;
                                                        } else {
                                                            o.pin_based =  false;
                                                        }
                                                        tf.client_apiresponse = JSON.stringify(o);
                                                        var fin = yield tf.save()
                                                        
                                                    
        } else {
            var ref =  yield Finance.refund(res.locals.tl._id);
            var tf = yield TopupLog.findOne({_id : tt._id}).exec();
            res.locals.eo = {};
             var txfin = new Date().getTime();
        tf.success = res.locals.def.success;
        console.log('DEF', def)
        tf.api_transactionid = res.locals.def.operator_transactionid
        tf.response_debug = res.locals.def.resp_debug;
        tf.request_debug = res.locals.def.req_debug;
        tf.completed_in = txfin - res.locals.txstart;
            switch (def.responseCode) {
                        case "UNKOWN_OPERATOR":
                        res.locals.eo.status = 416;
                        res.locals.eo.message = 'Unknown Operator';
                        res.locals.eo.code = def.responseCode;
                        break;
                        case "MSISDN_NOT_PREPAID":
                        res.locals.eo.status = 415;
                        res.locals.eo.message = 'The number is not prepaid';
                        res.locals.eo.code = def.responseCode;
                        break;
                        case "MSISDN_BARRED":
                        res.locals.eo.status = 423;
                        res.locals.eo.message = 'MSISDN is barred';
                        res.locals.eo.code = def.responseCode;
                        break;
                        case "MSISDN_INVALID":
                        res.locals.eo.status = 427;
                        res.locals.eo.message = "MSISDN is not Valid";
                        res.locals.eo.code = def.responseCode;
                                                case "UNSUPPORTED_DENOMINATION":
                        res.locals.eo.status = 429;
                        res.locals.eo.message = "Denomination is not supported";
                        res.locals.eo.code = def.responseCode;
                        case "OPERATOR_FAILURE":
                        res.locals.eo.status = 503;
                        res.locals.eo.message = 'Operator Error';
                        res.locals.eo.code = def.responseCode;
                        break;
                        case "MAX_TOPUP_REACHED":
                        res.locals.eo.status = 429;
                        res.locals.eo.message = 'Recipient reached maximum topup amount'
                        res.locals.eo.code = def.responseCode;
                        break;
                        default:
                        res.locals.eo.status = 500;
                        res.locals.eo.message = 'Recharge Failed';
                        res.locals.eo.code = 'RECHARGE_FAILED';
                        break;
                    }
                    tf.code = res.locals.eo.code;
                    tf.message = res.locals.eo.message;
                    o.status = res.locals.eo.status;
                    o.code = res.locals.eo.code;
                    o.message = res.locals.eo.message;
                    o.reference = null;
                    tf.client_apiresponse = JSON.stringify(o);
                    var fin = yield tf.save();
                    
        }

           //return ttt;
        } else {
             var o = {};
                                                        o.status = 201;
                                                        o.message = 'Operation Successful (TEST!!), Recharge created, Reference : ' + uuid.v1();
                                                        o.reference = uuid.v1();
                                                        o.code = 'RECHARGE_COMPLETE'
                                                        o.pin_based = false;
        }
        if (fin) {
                        var Jo = yield BatchJob.findOne({_id : j._id}).exec();
                        var JR = {
                            number : res.locals.ms,
                            product_id : req.body.product_id,
                            time : new Date(),
                            success : def.success,
                            code : o.code,
                            message : o.message,
                            topuplog : tf._id,
                            reference : o.reference,
                            jobid : obj._id,
                            country : prod.country,
                            operator_name : prod.name,
                            pin_based : o.pin_based
                        }
                        if (o.pin_based) {
                            JR.pin_option1 = o.pin_option1
                            JR.pin_option2 = o.pin_option2
                            JR.pin_option3 = o.pin_option3
                            JR.pin_code = o.pin_code
                            JR.pin_serial = o.pin_serial
                            JR.pin_ivr = o.pin_ivr
                            JR.pin_validity = pin_validity
                            JR.pin_value = pin_value

                        }
                        Jo.results.push(JR);
                        Jo.jobs.forEach(function (JA) {
                            if (JA._id == obj._id) {
                                JA.state = 'fin'
                            }
                        })

                        var fzz = yield Jo.save();
                        return o;
                    }
}
                co(function *() {
                    var Jx = yield BatchJob.findOne({_id : job._id}).exec();
                        Jx.state = 'processing';
                        var Jz = yield Jx.save();
                   var ra =  Jz.jobs.map(processNumber);
                    var re = yield parallel(ra);
                    console.log('RERERE', re);
                    if (re.length == Jz.jobs.length) {
                        Jaz = yield BatchJob.findOne({_id : job._id}).exec();
                        Jaz.status = 'fin';
                        var xyx = yield Jaz.save();
                    }
                })
                .catch(function (err) {
                    console.log(err)
                })
            } else {
                console.log('NO JOBS : ', new Date().toISOString());
            }
                /*
            if (job !== null) {
                //launch all jobs
                j = job;
                var iter = [];
                if (job.numbers.length > 0) {
                    job.numbers.map(function (number, i) {
                        iter[i] = execTopup(number, job);
                    });
        Promise.all(iter).then(function (data) {
            BatchJobs.update({_id : j._id}, {$set : {state : 'fin'}}).exec();
           
        })
                }
            } else {
                console.log('NO JOBS : ', new Date().toISOString());
            }
            */
        })
}
setInterval(checkTask, 5000);
setInterval(fixProcessing, 10000);
