var express = require('express');
var router = express.Router();
var winston = require('winston');
var offset = require('timezone-name-offsets');
var DateWithOffset = require('date-with-offset')
const excel = require('node-excel-export');
var User = require('../models/user');
var Operator = require('../models/operator');
var Provider = require('../models/provider');
var Transaction = require('../models/transaction')
var Pinbatch = require('../models/pinbatch')
var Pin = require('../models/pindb')
var TriangloPrice = require('../models/triangloprice')
var Rate = require('../models/rate')
var Withdrawals = require('../models/withdrawal')
var Account = require('../models/account')
var Prefix = require('../models/prefix')
var TopupLog = require('../models/topuplog')
var Ticket = require('../models/ticket')
var TicketMsg = require('../models/ticketmsg')
var BatchJob = require('../models/batchjob');
var BatchResult = require('../models/batchresult')
var TrtoPrices = require('../models/transfertoprice')
var TrloPrices = require('../models/triangloprice')
var Provmapping = require('../models/provmapping')
var Currency = require('../models/currency')
var CountryHelper = require('../models/countryhelper')
var ProvHelper = require('../models/provhelper')
var DailyStats = require('../models/dailystat')
var WeeklyStats = require('../models/weeklystat')
var MonthlyStats = require('../models/monthlystat')
var YearlyStats = require('../models/yearlystat')
var Setting = require('../models/setting')
var UKBLPrice = require('../models/ukblprice')
var authc = require('../modules/auth');
var moment = require('moment');
var https = require('https');
var jwt = require('jwt-simple');
var uuid = require('uuid')
var s = require('../modules/soapclient')
var sms = require('../modules/smpp')
var co = require('co');
var cs = require('co-stream');
var parallel = require('co-parallel')
var nodemailer = require('nodemailer')
var sendMailTR = require('nodemailer-sendmail-transport')
var NumLookup = require('../modules/locnumberlookup')
var Baseprod = require('../models/baseprod')
var Dataprod = require('../models/dataprod')
var Elprod = require('../models/elprod')
var c = require('../modules/checks')
var ApplyAcl = require('../modules/applyacl')
var Finance = require('../modules/finance')
var Apicred = require('../models/apicred')
var LoginLog = require('../models/loginlog')
var os = require("os");
var hostname = os.hostname();
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function pad(num) {
    var norm = Math.abs(Math.floor(num));
    return (norm < 10 ? '0' : '') + norm;
};
/* GET home page. */
router.get('/version', function (req, res, next) {
    var r = {};
    r.version = process.env.VERSION;
    r.docreference = 'https://' + req.headers.host + '/apidoc/';
    r.time = new Date();
    res.json(r)
});

router.get('/whitelabel', function (req, res) {
    res.json(req.reseller.whitelabel_opts);
})
router.get('/whitelabel_logo', function (req, res) {
    if (typeof req.reseller.whitelabel_opts.portal_logo !== undefined) {
        if (req.reseller.whitelabel_opts.portal_logo !== '') {
            res.redirect('/img/' + req.reseller.whitelabel_opts.portal_logo);
        } else {
            res.redirect('/images/palogo_big.png');
        }

    } else {
        res.redirect('/images/palogo_big.png');
    }
})
router.get('/whitelabel/main.css', function (req, res) {
    res.setHeader('content-type', 'text/css');
    var w = req.reseller.whitelabel_opts;

    if (w.color1 && w.color1 !== '') {
        res.locals.color1 = w.color1;
    } else {
        res.locals.color1 = "#222222"
    }
    if (w.color2 && w.color2 !== '') {
        res.locals.color2 = w.color2;
    } else {
        res.locals.color2 = "#394263"
    }
    if (w.color3 && w.color3 !== '') {
        res.locals.color3 = w.color3;
    } else {
        res.locals.color3 = "#222222"
    }
    if (w.color4 && w.color4 !== '') {
        res.locals.color4 = w.color4;
    } else {
        res.locals.color4 = "#e6bc15"
    }
    if (w.color5 && w.color5 !== '') {
        res.locals.color5 = w.color5;
    } else {
        res.locals.color5 = "#eaedf1"
    }
    if (w.tlevel && w.tlevel !== '') {
        res.locals.tlevel = w.tlevel;
    } else {
        res.locals.tlevel = "0.6"
    }

    var back_rval = parseInt(res.locals.color3.substr(1, 2), 16);
    var back_gval = parseInt(res.locals.color3.substr(3, 2), 16);
    var back_bval = parseInt(res.locals.color3.substr(5, 2), 16);

    var font_rval = parseInt(res.locals.color5.substr(1, 2), 16);
    var font_gval = parseInt(res.locals.color5.substr(3, 2), 16);
    var font_bval = parseInt(res.locals.color5.substr(5, 2), 16);

    // console.log(">>>", Math.abs(back_bval - font_bval) < 20);
    console.log(">>>>>", Math.abs(back_bval - font_bval), Math.abs(back_rval - font_rval), Math.abs(back_gval - font_gval), "<<<<<<<<");
    var flag = (Math.abs(back_bval - font_bval) < 45 && Math.abs(back_rval - font_rval) < 45 && Math.abs(back_gval - font_gval) < 45);

    if ((res.locals.color3 == res.locals.color5) || flag) {
        res.locals.color6 = "";
        var color3_int_val = parseInt(res.locals.color3.substr(1), 16);
        var color6_hexval = parseInt("ffffff", 16) - color3_int_val;
        res.locals.color6 = color6_hexval.toString(16);
        if (res.locals.color6.length < 6) {
            var length = res.locals.color6.length;
            for (var i = 0; i < 6 - length; i++) {
                res.locals.color6 = "0" + res.locals.color6;
            }
            ;

        }
        ;
        res.locals.color6 = "#" + res.locals.color6;
    } else {
        res.locals.color6 = w.color5;
    }

    console.log(hostname, 'LOC', res.locals);
    res.render('css', res.locals);
})
router.post('/auth', function (req, res) {
    console.log(hostname, 'boom', req.body);
//if (!req.body || !req.body.username) return res.sendStatus(500);
    var myAuth = User.findOne({active: true, username: req.body.username, reseller_id: req.reseller._id}).exec();
    myAuth.then(
        function (user) {
            console.log(hostname, 'US', user)
            if (user == null) {
                var lr = new LoginLog({
                    time: new Date(),
                    reseller_id: req.reseller._id,
                    username: req.body.username,
                    password: req.body.password,
                    success: false,
                    app_host: hostname
                });
                lr.save();
                res.sendStatus(401);
            }


            var hp = authc(req.body.password);
            if (hp === user.password) {

                var expires = moment().add(2, 'days').valueOf();
                //update user last_login field
                console.log(hostname, 'User ID  :', user._id);
                User.findOneAndUpdate({_id: user._id}, {$set: {last_login: new Date}}).exec();
                var token = jwt.encode({
                    iss: user._id,
                    exp: expires
                }, req.app.settings.jwtTokenSecret);
                var resObject = {
                    token: token,
                    expires: new Date(expires)
                };
                //return object
                var lr = new LoginLog({
                    time: new Date(),
                    reseller_id: req.reseller._id,
                    username: req.body.username,
                    password: req.body.password,
                    account: user.main_account,
                    success: true,
                    app_host: hostname,
                    token: token,
                    tok_expires: new Date(expires)
                });
                lr.save();
                res.json(resObject);
            } else {
                var lr = new LoginLog({
                    time: new Date(),
                    reseller_id: req.reseller._id,
                    username: req.body.username,
                    password: req.body.password,
                    success: false,
                    app_host: hostname,
                    account: user.main_account
                });
                lr.save();
                res.sendStatus(401);
            }
        }
    )
        .catch(function (err) {
            console.error(hostname, err);
        });
});
router.get('/reauth', function (req, res) {
    User.findOne({_id: req.user._id})
        .then(function (user) {
            if (user !== null) {
                user.last_login = new Date();
                return user.save();
            } else {
                var err = {};
                err.status = 401;
                err.code = "REAUTH_ERROR"
                err.message = "Reauthentication error, please authenticate again!";
                throw err;
            }
        })
        .then(function (us) {
            var expires = moment().add(2, 'days').valueOf();
            var token = jwt.encode({
                iss: req.user._id,
                exp: expires
            }, req.app.settings.jwtTokenSecret);
            var resObject = {
                token: token,
                expires: new Date(expires)
            };
            //return object
            res.json(resObject);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        })
})
router.get('/status', function (req, res) {
    var respObject = {};

    respObject.expires = new Date(req.user.exp).toISOString();
    respObject.token = req.headers.authorization.split(' ')[1];
    respObject._id = req.user._id;
    respObject.username = req.user.username;
    respObject.first_name = req.user.first_name;
    respObject.last_name = req.user.last_name;
    respObject.account_type = req.user.account_type;
    respObject.main_account = req.user.main_account;
    respObject.limited_pos = req.user.limited_pos;
    respObject.balance = req.user.balance;
    respObject.currency = req.user.currency;
    respObject.wallet_id = req.user.wallet_id;
    respObject.epin_enabled = req.reseller.epin_enabled;
    respObject.dashboard_enabled = req.user.dashboard_enabled;
    respObject.sms_access = req.user.sms_access;
    respObject.pos_access = req.user.pos_access;
    respObject.account_access = req.user.account_access;
    respObject.transactions_access = req.user.transactions_access;
    respObject.pins_access = req.user.pins_access;
    respObject.jobs_access = req.user.jobs_access;
    respObject.price_access = req.user.price_access;
    respObject.topuplog_access = req.user.topuplog_access;
    respObject.support_access = req.user.support_access;
    respObject.balance_access = req.user.balance_access;
    winston.log('info', respObject);
    res.json(respObject);

})

router.get('/transactions/transaction', function (req, res) {
    req.body = JSON.parse(new Buffer(req.query.filter, 'base64').toString('ascii'));
    list1 = [];
    co(function*() {
        var Li1 = yield Account.find({type: 'agent'}).exec();
        for (var i = 0; i < Li1.length; i++) {
            var r = Li1[i];
            var par = yield Account.findOne({_id: r.parent}).exec();

            list1[r._id] = par.account_name;
        }
    })
        .then(function (xaa) {
            if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
                if ('undefined' !== typeof req.body.account) {
                    if (req.body.account == "all") {
                        ob = {account: {$in: req.user.child}}
                    } else {
                        if (req.user.child.contains(req.body.account)) {
                            ob = {account: req.body.account}
                        } else {
                            ob = {account: req.user.main_account}
                        }

                    }
                } else {
                    ob = {account: {$in: req.user.child}}
                }


            } else if (req.user.account_type == 'agent') {
                ob = {account: req.user.main_account}
            }
            if ((req.body.date_from !== '')) {
                if ('undefined' !== typeof req.body.timezone) {
                    if (req.body.timezone !== '') {
                        var off = offset[req.body.timezone];
                        res.locals.offset = off;
                        console.log(hostname, 'OFF', off)

                        if (off < 0) {
                            //var offs = off.replace('-', '')
                            var h = (parseInt(off / 60)) * 1;
                            var m = (off % 60) * 1;
                            var compTZ = String("-" + pad(h) + ":" + pad(m));
                        } else {
                            var h = parseInt(off / 60);
                            var m = off % 60;
                            var compTZ = String("+" + pad(h) + ":" + pad(m));
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
                if (req.body.date_to == '') {
                    req.body.date_to = new Date().toISOString()
                }

                var dfr = req.body.date_from.split("T")[0];
                var tfr = req.body.time_from.split("T")[1].split("Z")[0]
                var dto = req.body.date_to.split("T")[0];
                var tto = req.body.time_to.split("T")[1].split("Z")[0];
                console.log(hostname, 'TFR', dfr + 'T' + tfr + compTZ)
                var time_from = new Date(dfr + 'T' + tfr + compTZ);
                var time_to = new Date(dto + 'T' + tto + compTZ);
                ob.time = {$lte: time_to, $gte: time_from}
            }

            var _key = '';
            if ('' !== req.body.type) {
                _key = 'type';
                ob[_key] = req.body.type;
            }
            if ('' !== req.body.currency) {
                _key = 'currency';
                ob[_key] = req.body.currency;
            }
            if ('' !== req.body.wallet_id) {
                _key = 'wallet_id';
                ob[_key] = req.body.wallet_id;
            }
            if ('' !== req.body.description) {
                _key = 'description';
                ob[_key] = new RegExp(req.body.description, 'i');
            }
            if ('' !== req.body.source) {
                _key = 'source';
                ob[_key] = req.body.source;
            }
            var str = Transaction.find(ob).sort({time: -1}).batchSize(1000000000000).cursor();
            if(req.query.category == 'csv')
            {
                res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=transaction.csv'
                });
                var st = "Transaction_id,Time,Account Name,Parent,Type,Wallet_id,Balance_after,Amount,Currency,Description,Source\n";
                res.write(st);
                str.on("data", function (d) {

                    var mtime = new DateWithOffset(d.time, res.locals.offset || 0).toString()
                    var str = d._id + ',' + mtime + ',' + req.user.rwnames[d.account] + ',' + list1[d.account] + ',' + d.type + ',' + d.wallet_id + ',' + d.amount + ',' + d.currency + ',' + d.description + ',' + d.source + '\n';
                    res.write(str);
                })
                str.on("end", function () {
                    res.end();
                })
            }else if(req.query.category == 'txt')
            {
                res.writeHead(200, {
                    'Content-Type': 'text',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename=transaction.txt'
                    });
                    var st = "Transaction_id,Time,Account Name,Parent,Type,Wallet_id,Balance_after,Amount,Currency,Description,Source\n";
                    res.write(st);
                    str.on("data", function (d) {
    
                        var mtime = new DateWithOffset(d.time, res.locals.offset || 0).toString()
                        var str = d._id + ',' + mtime + ',' + req.user.rwnames[d.account] + ',' + list1[d.account] + ',' + d.type + ',' + d.wallet_id + ',' + d.amount + ',' + d.currency + ',' + d.description + ',' + d.source + '\n';
                        res.write(str);
                    })
                    str.on("end", function () {
                        res.end();
                    })
            }else if(req.query.category == 'xlsx')
            {
                var styles = {
                    headerDark: {
                      fill: {
                        fgColor: {
                          rgb: 'FF000000'
                        }
                      },
                      font: {
                        color: {
                          rgb: 'FFFFFFFF'
                        },
                        sz: 11,
                        bold: true,
                        underline: true
                      }
                    },
                    cellPink: {
                      fill: {
                        fgColor: {
                          rgb: 'FFFFCCFF'
                        }
                      }
                    },
                    cellGreen: {
                      fill: {
                        fgColor: {
                          rgb: 'FF00FF00'
                        }
                      }
                    },
                    cellTime: {
                        fill: {
                            numFmt :  "dd/mm/yyyy hh:nn:ss",
                            fgColor: {
                                rgb: 'FF000000'
                              }
                        },
                        font: {
                            color: {
                              rgb: 'FFFFFFFF'
                            },
                            sz: 11,
                            bold: true,
                            underline: true
                          }
                    }
                  };
                
    
                var specification = {
                    Transaction_id: { // <- the key should match the actual data key
                      displayName: 'Transaction_id', // <- Here you specify the column header
                      headerStyle: styles.headerDark,
                      width : '30'
                    },
                    Time: {
                        displayName: 'Time',
                        headerStyle: styles.cellTime,
                        width : '30'
                    },
                    Account_Name: {
                      displayName: 'Account Name',
                      headerStyle: styles.headerDark,
                      width: '20' // <- width in chars (when the number is passed as string)
                    },
                    Parent: {
                      displayName: 'Parent',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Type: {
                      displayName: 'Type',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Wallet_id: {
                      displayName: 'Wallet_id',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Balance_after: {
                      displayName: 'Balance_after',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Amount: {
                      displayName: 'Amount',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Currency: {
                      displayName: 'Currency',
                      headerStyle: styles.headerDark,
                      width: '15' 
                    },
                    Description: {
                      displayName: 'Description',
                      headerStyle: styles.headerDark,
                      width: '50' 
                    },
                    Source: {
                      displayName: 'Source',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    }
                  }
                var dataset = [];
                str.on("data", function (d) {
                    var row = {};
                    row.Transaction_id = d._id ;
                    row.Time = new Date(d.time.getTime() + res.locals.offset * 60 * 1000 );
                    row.Account_Name = req.user.rwnames[d.account];
                    row.Parent = list1[d.account] ;
                    row.Type = d.type ;
                    row.Wallet_id = d.wallet_id;
                    row.Amount = d.amount ;
                    row.Currency = d.currency ;
                    row.Description = d.description ;
                    row.Source = d.source ;
                    dataset.push(row);
                })
                str.on("end", function () {
                    var report = excel.buildExport(
                        [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                          {
                            name: 'transaction', // <- Specify sheet name (optional)
                            specification: specification, // <- Report specification
                            data: dataset // <-- Report data
                          }
                        ]
                      );
                    res.attachment('transaction.xlsx');
                    res.send(report);
                })
            }else{

            }
        })

})

router.get('/transactions/:page', function (req, res) {
    var opts = {page: req.params.page, limit: 100, sort: {time: -1}};
    var accounts = [];
    co(function*() {
        for (var i = 0; i < req.user.child.length; i++) {
            var num = yield TopupLog.find({account: req.user.child[i] }).count().exec();
            if(num != 0)
            {
                accounts.push(req.user.child[i]);
            }
        }
    })
    .then(function (ret) {
        if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler'))
         {
               var ob = {account: {$in: accounts}};
                
        }else if(req.user.account_type == 'agent') 
        {
            var ob = {account: req.user.main_account};
        }else{

        }
        Transaction.paginate(ob, opts)
            .then(function (f) {
                var arr = []
                f.docs.forEach(function (fr) {
                    var tmp = {}
                    tmp.time = fr.time
                    tmp.account = fr.account;
                    tmp.type = fr.type;
                    tmp.wallet_id = fr.wallet_id
                    tmp.balance_after = fr.balance_after
                    tmp.amount = fr.amount;
                    tmp.currency = fr.currency;
                    tmp.description = fr.description;
                    tmp.source = fr.source;
                    tmp._id = fr._id;
                    tmp.account_name = req.user.rwnames[tmp.account];
                    arr.push(tmp)
                })
                var o = {};
                o.count = f.total;
                o.pages = f.pages;
                o.page = f.page;
                o.limit = f.limit;
                o.docs = arr;
                res.json(o);
            })
            .catch(function (err) {
                res.status = err.status || 500;
                winston.log('error', err);
                res.json(err.status, err);
            });
    })
    .catch(function (err) {
        res.status = err.status || 500;
        console.log(hostname, new Error(err.message));
        res.json(err.status, err);
    });
    
})

router.post('/transactions/:page', function (req, res) {
    var opts = {page: req.params.page, limit: 100, sort: {time: -1}};
    var ob = {};
    var accounts = [];
    co(function*() {
        for (var i = 0; i < req.user.child.length; i++) {
            var num = yield TopupLog.find({account: req.user.child[i] }).count().exec();
            if(num != 0)
            {
                accounts.push(req.user.child[i]);
            }
        }
    })
    .then(function (ret) {
        if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
            if ('undefined' !== typeof req.body.account) {
                if (req.body.account == "all") {
                    ob = {account: {$in: accounts}};
                } else {
                    if (req.user.child.contains(req.body.account)) {
                        ob = {account: req.body.account}
                    } else {
                        ob = {account: req.user.main_account}
                    }
    
                }
            } else {
                ob = {account: {$in: accounts}};
            }
    
    
        } else if (req.user.account_type == 'agent') {
            ob = {account: req.user.main_account}
        }
    
        if ((req.body.date_from !== '')) {
            if ('undefined' !== typeof req.body.timezone) {
                if (req.body.timezone !== '') {
                    var off = offset[req.body.timezone];
                    res.locals.offset = off;
                    console.log(hostname, 'OFF', off)
    
                    if (off < 0) {
                        //var offs = off.replace('-', '')
                        var h = (parseInt(off / 60)) * 1;
                        var m = (off % 60) * 1;
                        var compTZ = String("-" + pad(h) + ":" + pad(m));
                    } else {
                        var h = parseInt(off / 60);
                        var m = off % 60;
                        var compTZ = String("+" + pad(h) + ":" + pad(m));
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
            if (req.body.date_to == '') {
                req.body.date_to = new Date().toISOString()
            }
    
            var dfr = req.body.date_from.split("T")[0];
            var tfr = req.body.time_from.split("T")[1].split("Z")[0]
            var dto = req.body.date_to.split("T")[0];
            var tto = req.body.time_to.split("T")[1].split("Z")[0];
            console.log(hostname, 'TFR', dfr + 'T' + tfr + compTZ)
            var time_from = new Date(dfr + 'T' + tfr + compTZ);
            var time_to = new Date(dto + 'T' + tto + compTZ);
            ob.time = {$lte: time_to, $gte: time_from}
        }
    
        var _key = '';
        if ('' !== req.body.type) {
            _key = 'type';
            ob[_key] = req.body.type;
        }
        if ('' !== req.body.currency) {
            _key = 'currency';
            ob[_key] = req.body.currency;
        }
        if ('' !== req.body.wallet_id) {
            _key = 'wallet_id';
            ob[_key] = req.body.wallet_id;
        }
        if ('' !== req.body.description) {
            _key = 'target';
            ob[_key] = req.body.description;
        }
        if ('' !== req.body.source) {
            _key = 'source';
            ob[_key] = req.body.source;
        }
        Transaction.paginate(ob, opts)
            .then(function (f) {
                var arr = []
    
                f.docs.forEach(function (fr) {
                    var tmp = {}
                    if ('undefined' !== typeof res.locals.offset) 
                    {
                       
                        tmp.time = new DateWithOffset(fr.time, res.locals.offset || 0).toString()
                    }
                    else
                        tmp.time = fr.time
                    tmp.account = fr.account;
                    tmp.type = fr.type;
                    tmp.wallet_id = fr.wallet_id
                    tmp.balance_after = fr.balance_after
                    tmp.amount = fr.amount;
                    tmp.currency = fr.currency;
                    tmp.description = fr.description;
                    tmp.source = fr.source;
                    tmp._id = fr._id;
                    tmp.account_name = req.user.rwnames[tmp.account];
                    arr.push(tmp)
                })
                var o = {};
                o.count = f.total;
                o.pages = f.pages;
                o.page = f.page;
                o.limit = f.limit;
                o.docs = arr;
                o.filter = new Buffer(JSON.stringify(req.body)).toString('base64');
                res.json(o);
            })
            .catch(function (err) {
                res.status = err.status || 500;
                winston.log('error', err);
                res.json(err.status, err);
            });
    })
    .catch(function (err) {
        res.status = err.status || 500;
        console.log(hostname, new Error(err.message));
        res.json(err.status, err);
    });
})
router.get('/me', function (req, res) {
    Account.findOne({_id: req.user.main_account}, {profit_pct: false, reserved_balance: false})
        .then(function (acc) {
            acc.balance = acc.balance.toFixed(2)
            res.json(acc)
        })
        .catch(function (err) {
            winston.log('error', err)
        })
})
router.post('/tickets', function (req, res) {
    Account.findOne({_id: req.user.main_account})
        .then(function (acc) {
            if ((acc.type == 'reseller') || (acc.type == 'wholesaler')) {
                var tick = new Ticket();
                tick.ticket_id = randomIntFromInterval(100000000, 999999999);
                tick.source = 'web';
                tick.author = req.user._id;
                tick.priority = req.body.priority;
                tick.status = 'new';
                tick.created = new Date();
                tick.updated = new Date();
                if (req.body.message && req.body.message !== '') {
                    tick.msgcount = 1;
                } else {
                    tick.msgcount = 0;
                }
                tick.subject = req.body.subject;
                tick.support_account = acc.parent;
                tick.account = acc._id;
                var rec1 = {
                    time: new Date(),
                    operation: 'creation',
                    author: req.user._id
                }
                tick.log = [];
                tick.log.push(rec1);
                return tick.save();
            } else if (acc.type == 'agent') {
                var tick = new Ticket();
                tick.ticket_id = randomIntFromInterval(11111111, 99999999);
                tick.source = 'web';
                tick.account = acc._id;
                tick.author = req.user._id;
                if (req.body.priority && req.body.priority !== '') {
                    tick.priority = req.body.priority;
                } else {
                    tick.priority = 'low';
                }
                tick.status = 'new';
                tick.created = new Date();
                tick.updated = new Date();
                if (req.body.requester_cc) {
                    tick.requester_cc = req.body.requester_cc;
                }
                if (req.body.message && req.body.message !== '') {
                    tick.msgcount = 1;
                } else {
                    tick.msgcount = 0;
                }
                tick.subject = req.body.subject;
                tick.support_account = acc.parent;
                var rec1 = {
                    time: new Date(),
                    operation: 'creation',
                    author: req.user._id
                }
                tick.log = [];
                tick.log.push(rec1);
                return tick.save();
            }
        })
        .then(function (ticket) {
            if (req.body.message) {
                res.locals.ticket = ticket;
                var tm = new TicketMsg();
                tm.ticket = ticket._id;
                tm.source = ticket.source;
                tm.author = ticket.author;
                tm.author_name = req.user.first_name + ' ' + req.user.last_name;
                tm.message = req.body.message;
                tm.created = new Date();
                tm.author_type = 'requester';
                tm.save(function (err, tmsg) {
                    if (err) {
                        var err = {};
                        err.status = 500;
                        err.code = 'EDB_FAILURE';
                        err.message = 'Database Error';
                        throw err;
                    } else {
                        var re = {};
                        var re = res.locals.ticket;
                        re.messages = [];
                    }
                })
            } else {
                var re = {};
                var re = ticket;
                re.messages = [];
            }
            var text = 'Dear customer,\n' +
                '\n' +
                'Thank you for contacting us! This is an automated message to let you know we\'ve received your support request. Feel confident that a member of our team will respond to you as soon as possible. To provide us with more details and updates, please include the ticket ID in the subject\n' + 'line. Support tickets are handled in the order in which they are received, with the exception of issues impacting service, which are escalated. Issues affecting service must be stated clearly in the Subject line in order to be fixed promptly. To get a faster response, please do not\n' + 'send the same e-mail twice or to any of our other support email addresses.\n' +
                'Ticket details:\n' +
                '\n' +
                'Ticket ID: [tt #' + res.locals.ticket.ticket_id + ']\n' +
                'Subject: ' + res.locals.ticket.subject + '\n' +
                'Status: new\n' +
                '\n' +
                'Kind regards,\n' +
                req.reseller.account_name + ' Support Team\n';

            var text2 = 'Dear Supporter,\n' +
                '\n' +
                'You have a new ticket #' + res.locals.ticket.ticket_id + '.\n' +
                'Subject : ' + res.locals.ticket.subject + '\n' +
                'Text : ' + req.body.message +
                '\n\n\n' +
                'To view or respond to ticket, please login to the support UI at https://' + req.reseller.whitelabel_opts.portal_url + '\n' +
                '\n' +
                'Kind Regards,\n' +
                'Automated Platform Management';
            var custcc = [];
            res.locals.ticket.requester_cc.forEach(function (tr) {
                custcc.push(tr);
            })
            var transp = nodemailer.createTransport(sendMailTR({path: '/usr/sbin/sendmail'}));
            var mailOpts = {
                from: '"Support Team" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                to: req.user.username,
                cc: custcc,
                subject: '[tt #' + res.locals.ticket.ticket_id + '] AutoReply: ' + res.locals.ticket.subject,
                text: text
            }
            User.find({main_account: res.locals.ticket.support_account}, function (err, ub) {
                if (err) {
                    throw err;
                } else {
                    var to = [];
                    ub.map(function (u) {
                        to.push(u.username);
                    })
                    //var cc = 'info@primeairtime.com';
                    var cc = 'support@primeairtime.com';
                    var mailOpts2 = {
                        from: '"' + req.reseller.whitelabel_opts.portal_name + ' Platform" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                        to: to,
                        subject: 'New ticket received : [tt #' + res.locals.ticket.ticket_id + '] ' + res.locals.ticket.subject,
                        bcc: 'support@primeairtime.com',
                        text: text2
                    }
                    console.log('OP1', mailOpts);
                    console.log('OP2', mailOpts2);
                    transp.sendMail(mailOpts2, function (err, inf) {
                        if (err) {
                            console.log(err);
                        } else {
                            //res.sendStatus(200);
                        }
                    })
                }
            })
            var ml = transp.sendMail(mailOpts, function (err, inf) {
                if (err) {
                    winston.log('error', err);
                } else {
                    //res.sendStatus(200);
                }
            })
            //initial reply
            return res.locals.ticket;
        })
        .then(function (t) {
            res.status(201).send(t);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/tickets/:status/:page', function (req, res) {

    Account.findOne({_id: req.user.main_account})
        .then(function (acc) {
            if (acc.type !== 'agent') {
                var filter = {
                    account: {$in: req.user.rwaccess}
                }
                if (req.params.status == 'open') {
                    filter.status = {$in: ['new', 'open']}
                } else if (req.params.status == 'closed') {
                    filter.status = 'closed'
                } else if (req.params.status == 'all') {

                } else {
                    var err = {};
                    err.code = "UNSUPPORTED_FILTER";
                    err.message = "Sorry, we dont support this filter value."
                    err.status = 500;
                    throw err;
                }
                var opts = {page: req.params.page, limit: 100, sort: {time: -1}};
                return Ticket.paginate(filter, opts);
            } else if (acc.type == 'agent') {
                var filter = {
                    account: acc._id
                }
                if (req.params.status == 'open') {
                    filter.status = {$in: ['new', 'open']}
                } else if (req.params.status == 'closed') {
                    filter.status = 'closed'
                } else if (req.params.status == 'all') {

                } else {
                    var err = {};
                    err.code = "UNSUPPORTED_FILTER";
                    err.message = "Sorry, we dont support this filter value."
                    err.status = 500;
                    throw err;
                }
                var opts = {page: req.params.page, limit: 100, sort: {time: -1}};
                return Ticket.paginate(filter, opts);
            }
        })
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
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });

})
router.get('/tickets/stats', function (req, res) {
    co(function*() {
        var acc = yield Account.findOne({_id: req.user.main_account}).exec();
        var open = yield Ticket.find({account: {$in: req.user.rwaccess}, status: {$ne: 'closed'}}).count().exec();
        var closed = yield Ticket.find({account: {$in: req.user.rwaccess}, status: 'closed'}).count().exec();

        var resp = {
            open: open,
            closed: closed
        }
        res.json(resp);
    })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/tickets/:id', function (req, res) {
    Account.findOne({_id: req.user.main_account})
        .then(function (acc) {
            console.log('ACC', acc)
            return Ticket.findOne({_id: req.params.id, account: {$in: req.user.rwaccess}}).exec();
        })
        .then(function (t) {
            if (t !== null) {
                res.locals.ticket = t;
                return TicketMsg.find({ticket: t._id}).exec();
            } else {
                var err = {};
                err.status = 404;
                err.code = "TICKET_NOT_FOUND";
                err.message = "Sorry, we cannot find ticket with this ID";
                throw err;
            }
        })
        .then(function (tm) {
            var resp = {};
            resp.data = res.locals.ticket;
            resp.messages = tm;
            res.json(resp);
        })
})
router.put('/tickets/:id', function (req, res) {
    console.log('RBODY', req.body);
    Account.findOne({_id: req.user.main_account})
        .then(function (acc) {
            return Ticket.findOne({_id: req.params.id, account: {$in: req.user.rwaccess}}).exec();
            if (acc.type == 'reseller') {
                res.locals.mode = 'res';
            } else if (acc.type == 'agent') {
                res.locals.mode = 'us';
            } else if (acc.type == 'wholesaler') {
                res.locals.mode = 'res';
            }
        })
        .then(function (ticket) {
            console.log('TICK', ticket);
            var transp = nodemailer.createTransport(sendMailTR({path: '/usr/sbin/sendmail'}));
            res.locals.ticket = ticket;
            if (res.locals.mode == 'res') {
                for (var key in req.body) {
                    if ((key == 'message') || (key == 'created') || (key == 'account') || (key == 'msgcount') || (key == 'closeonreply') || (key == '_id') || (key == '__v') || (key == 'createdAt') || (key == 'updatedAt') || (key == 'account'))
                        continue;
                    ticket[key] = req.body[key];
                }
                if (ticket.status == 'new') {
                    ticket.status = 'open'
                }
                if (req.body.closeonreply) {
                    ticket.status = 'closed'
                }
                console.log('MESSAGE', req.body.message)
                if (req.body.message) {
                    var tm = new TicketMsg();
                    tm.ticket = ticket._id;
                    tm.source = 'web';
                    tm.author = req.user._id;
                    tm.author_name = req.user.first_name + ' ' + req.user.last_name;
                    tm.message = req.body.message;
                    tm.created = new Date();
                    tm.author_type = 'agent';
                    ticket.msgcount++;
                    console.log('TM', tm);
                    tm.save();
                    var text = 'Dear customer,\n' +
                        '\n' +
                        'A response has been received to your request: \n' +
                        'Ticket details:\n' +
                        '\n' +
                        'Ticket ID: [tt #' + res.locals.ticket.ticket_id + ']\n' +
                        'Subject: ' + res.locals.ticket.subject + '\n' +
                        'Status: ' + ticket.status + '\n' +
                        '\n' +
                        req.body.message + '\n' +
                        '\n' +
                        'Kind regards,\n' +
                        req.reseller.account_name + ' Support Team\n';
                    User.find({main_account: res.locals.ticket.account}, function (err, ra) {
                        if (err) {
                            throw err;
                        } else {
                            var to = [];
                            /*
                             ra.forEach(function (u) {
                             console.log('US', u);
                             if (u.send_notifications !== typeof undefined) {
                             if (u.send_notifications) {
                             if (u.email !== typeof undefined) {
                             if (u.email.length > 0) {
                             to.push(u.email);
                             } else {
                             to.push(u.username);
                             }
                             } else {
                             to.push(u.username);
                             }
                             }
                             } else {
                             to.push(u.username);
                             }
                             })
                             */
                            ra.forEach(function (uu) {
                                to.push(uu.username);
                            })
                            var cc = [];
                            ticket.requester_cc.forEach(function (tr) {
                                cc.push(tr)
                            })
                            ticket.agent_cc.forEach(function (tr) {
                                cc.push(tr)
                            })
                            var mailOpts = {
                                from: '"Support Team" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                                to: to,
                                cc: cc,
                                subject: '[tt #' + res.locals.ticket.ticket_id + '] An update received to your ticket ',
                                text: text
                            }
                            transp.sendMail(mailOpts, function (err, inf) {
                                if (err) {
                                    console.log('error', err);
                                } else {
                                    //res.sendStatus(200);
                                }
                            })
                        }
                    })
                    return ticket.save();
                } else {
                    return ticket.save();
                }
            } else if (res.locals.mode == 'us') {
                var tm = new TicketMsg();
                tm.ticket = ticket._id;
                tm.source = 'web';
                tm.author = req.user._id;
                tm.author_name = req.user.first_name + ' ' + req.user.last_name;
                tm.message = req.body.message;
                tm.created = new Date();
                tm.author_type = 'requester';
                ticket.msgcount++;
                tm.save();
                var cca = [];
                ticket.agent_cc.forEach(function (tr) {
                    cca.push(tr)
                })
                console.log('CCDUMP', cca)
                var text2 = 'Dear Supporter,\n' +
                    '\n' +
                    'An update has been received to a ticket #' + res.locals.ticket.ticket_id + '.\n' +
                    'Subject :' + res.locals.ticket.subject + '\n' +
                    'Text :' + req.body.message + '\n' +
                    'Status : ' + res.locals.ticket.status + '\n' +
                    '\n\n\n' +
                    'To view or respond to ticket, please login to the support UI at https://' + req.reseller.whitelabel_opts.portal_url + '\n' +
                    '\n' +
                    'Kind Regards,\n' +
                    'Automated Platform Management';
                User.find({main_account: res.locals.ticket.support_account}, function (err, rz) {
                    if (err) {
                        throw err;
                    } else {
                        var tos = [];

                        rz.forEach(function (uuz) {
                            tos.push(uuz.username);
                        })
                        var mailOpts2 = {
                            from: '"' + req.reseller.whitelabel_opts.portal_name + ' Platform" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                            to: tos,
                            subject: 'An update received to ticket : [tt #' + res.locals.ticket.ticket_id + '] ' + res.locals.ticket.subject,
                            cc: cca,
                            bcc: 'support@primeairtime.com',
                            text: text2
                        }
                        console.log('OP2', mailOpts2);
                        transp.sendMail(mailOpts2, function (err, inf) {
                            if (err) {
                                console.log('error', err);
                            } else {
                                //res.sendStatus(200);
                            }
                        })
                    }
                })
                return ticket.save();
            }
        })
        .then(function (ts) {
            res.json(ts)
        })
        .catch(function (err) {
            console.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.post('/sms/bulk', function (req, res) {
    if (req.user.account_type !== 'agent') {
        res.sendStatus(403);
    } else {
        if (req.body.numbers.constructor === Array) {
            var n = req.body.numbers;

        } else {
            var n = req.body.numbers.split(',');

        }

        if (!req.body.message) {
            var err = {};
            err.code = 'EMISSING_REQUIRED';
            err.message = 'You have not supplied required fields!';
            err.status = 418;
            throw err;
        } else {

            if (req.body.message.length < 140) {
            } else {
                var err = {};
                err.code = 'MESSAGE_TOO_LONG';
                err.message = 'Maximum supported message length is 140 characters!';
                err.status = 403;
                throw err;
            }
            res.locals.resp = [];
            return new Promise(function (resolve, reject) {

                n.map(function (line) {
                    Finance.chargeAndSendSms(req.user.main_account, line, req.body.message);
                })
                resolve();
            })
                .then(function () {
                    res.sendStatus(201);
                })
                .catch(function (err) {
                    winston.log('error', err);
                    res.status(err.status || 500).send(err);
                })

        }
    }
})
router.post('/sms/:msisdn', function (req, res) {
    if (req.user.account_type !== 'agent') {
        res.sendStatus(403);
    } else {
        var ms = req.params.msisdn.replace(/^0+/, '');

        if (!req.body.message) {
            var err = {};
            err.code = 'EMISSING_REQUIRED';
            err.message = 'You have not supplied required fields!';
            err.status = 418;
            throw err;
        } else {
            res.locals.ms = ms;
            if (req.body.message.length < 140) {
            } else {
                var err = {};
                err.code = 'MESSAGE_TOO_LONG';
                err.message = 'Maximum supported message length is 140 characters!';
                err.status = 403;
                throw err;
            }
            Account.findOne({_id: req.user.main_account})
                .then(function (acc) {
                    if (acc.test_mode == true) {
                        winston.log('info', 'TEST MODE')
                        res.locals.test = true;
                    } else {
                        res.locals.test = false;
                    }
                    if (typeof acc.sms_sender !== undefined) {
                        if (acc.sms_sender == '') {
                            var err = {};
                            err.code = 'SENDER_NOT_SET';
                            err.message = 'Sender ID Has not been set!';
                            err.status = 500;
                            throw err;
                        }
                    } else {
                        var err = {};
                        err.code = 'SENDER_NOT_SET';
                        err.message = 'Sender ID Has not been set!';
                        err.status = 500;
                        throw err;
                    }

                    return Finance.chargeAndSendSms(acc._id, res.locals.ms, req.body.message);

                })
                .then(function (sss) {
                    var r = {};
                    r.success = true;
                    r.message_id = sss;
                    res.status(201).send(r);
                })
                .catch(function (err) {
                    winston.log('error', err);
                    res.status(err.status || 500).send(err);
                });

        }
    }
})
router.get('/topup/info/:msisdn', ApplyAcl, function (req, res) {
    if (req.user.account_type !== 'agent') {
        var err = {}
        err.code = "ENO_ACCESS"
        err.message = "Sorry, you dont have access to this method"
        err.status = 403;
        throw err;
    }
    console.log('ACL', req.acl)
    return new Promise(function (resolve, reject) {
        var ms = req.params.msisdn.replace(/^0+/, '').replace(/ /g, '');
        res.locals.ms = ms;
        var cselect = [];
        if (ms.substring(0, 1) == '1') {
            var comp = ms.substring(0, 4)
            Operator.findOne({country_code: comp}, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    if (data !== null) {
                        resolve(data)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat2) {
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
            Operator.findOne({country_code: comp}, function (err, dat) {
                if (err) {
                    reject(err)
                } else {
                    if (dat !== null) {
                        resolve(dat)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 2)}, function (err, dat2) {
                            if (err) {
                                reject(err)
                            } else {
                                if (dat2 !== null) {
                                    resolve(dat2)
                                } else {
                                    Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat3) {
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
        .then(function (data) {
            // winston.log('info', 'DATA', data)
            res.locals.cinfo = data;
            var minl = parseInt(data.min_length);
            var maxl = parseInt(data.max_length);
            if ((res.locals.ms.length > maxl) || (res.locals.ms.length < minl)) {
                var err = {};
                err.status = 500;
                err.code = "MSISDN_LENGTH_ERROR";
                err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
                res.status(err.status).send(err);
                throw err;
            }
            if (data.hasLocalOper == true) {
                res.locals.workflow = 'w1';
                console.log('we have local operator', data.perfProv)
                //check if provLookup is local
                if (data.localOperatorLookup == true) {
                    winston.log('info', 'Local Lookup', res.locals.ms)
                    var pfx = res.locals.ms.substring(0, parseInt(data.prefixLength));
                    console.log('pfx', pfx)
                    return Prefix.findOne({prefix: pfx}).exec();
                } else {
                    //operator lookup is via LocNumber
                    winston.log('info', 'oper lookup via TRTO')
                    //return s.getMSISDNInfo(res.locals.ms, 'TRTO')
                    return NumLookup.lookup(res.locals.ms);
                }
            } else {
                //workflow 2
                res.locals.workflow = 'w2';
                console.log('w2')
                return NumLookup.lookup(res.locals.ms);
                //return s.getMSISDNInfo(res.locals.ms, 'TRTO')
            }
        })
        .then(function (d) {
            console.log('DD', d);
            switch (res.locals.workflow) {
                case "w1":
                    res.locals.provInfo = d;
                    res.locals.proCountry = d.iso;
                    res.locals.proOperator = d.operatorId
                    if (req.acl.type !== null) {
                        if (req.acl.type == 'restrictive') {
                            //block all
                            var canContinue = false;
                            if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.allow.contains(d.iso + ':ALL')) {
                                //allow it check for block on specific operator
                                canContinue = true;
                                if (req.acl.block.contains(d.iso + ':' + d.operatorId)) {
                                    canContinue = false;
                                }
                            }
                        } else if (req.acl.type == 'permissive') {
                            var canContinue = true;
                            if (req.acl.block.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                                canContinue = false;
                                if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                                    canContinue = true;
                                }
                            }
                        } else {
                            var canContinue = true;
                        }
                    } else {
                        var canContinue = true;
                    }
                    if (!canContinue) {
                        var err = {};
                        err.code = "ENO_ACCESS";
                        err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                        err.status = 403;
                        throw err;
                    }
                    //get balance and limits
                    return Provider.findOne({provider_code: res.locals.cinfo.perfProv}).exec();
                    break;
                case "w2":
                    res.locals.proCountry = d.iso;
                    if ((d.trl_id !== null) && d.trl_id !== '') {
                        res.locals.proOperator = d.trl_id
                    } else {
                        res.locals.proOperator = 'ALL';
                    }
                    if ((req.acl.type !== null) && ( (d.trl_id !== null) && (d.trl_id !== '')  )) {
                        if (req.acl.type == 'restrictive') {
                            //block all
                            var canContinue = false;
                            if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                                //allow it check for block on specific operator
                                canContinue = true;
                                if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id)) {
                                    canContinue = false;
                                }
                            }
                        } else if (req.acl.type == 'permissive') {
                            var canContinue = true;
                            console.log('DEBUG', d.iso.toUpperCase() + ':' + d.trl_id, d.iso.toUpperCase() + ':ALL');
                            if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.block.contains(d.iso.toUpperCase() + ':ALL')) {
                                console.log('TRRRRRUUEEEE');
                                canContinue = false;
                                if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                                    console.log('OH BUMMER')
                                    canContinue = true;
                                }
                            }
                        } else {
                            var canContinue = true;
                        }
                    } else {
                        var canContinue = true;
                    }
                    if (!canContinue) {
                        var err = {};
                        err.code = "ENO_ACCESS";
                        err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                        err.status = 403;
                        throw err;
                    }
                    res.locals.provInfo = d;
                    var myOr = [];
                    if ((d.trt_id !== '') && (d.trt_id !== null)) {
                        var o = {
                            operator_id: d.trt_id
                        }
                        myOr.push(o);
                    }
                    if ((d.trl_id !== '') && (d.trl_id !== null)) {
                        var o = {
                            operator_id: d.trl_id
                        }
                        myOr.push(o);
                    }
                    return Baseprod.find({$or: myOr}).sort({price: 1}).exec();
                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (t1dd) {
            res.locals.t1dd = t1dd;
            return NumLookup.getProfits(req.user.main_account, res.locals.proCountry, res.locals.proOperator);
        })
        .then(function (pro) {
            res.locals.profitMap = pro;
            console.log('ProfitMap', pro);
            return res.locals.t1dd;
        })
        .then(function (dd) {
            switch (res.locals.workflow) {
                case "w1":
                    var bal = parseFloat(dd.balance);
                    if (res.locals.provInfo.hasOpenRange == true) {
                        var dpct = parseFloat(bal) * 0.5;
                        var max = bal - dpct;
                        if (max > parseInt(res.locals.provInfo.openRangeMax)) {
                            var m = parseInt(res.locals.provInfo.openRangeMax);
                        } else {
                            var m = parseInt(max)
                        }
                        res.locals.openRangeData = {};
                        res.locals.openRangeData.min = parseInt(res.locals.provInfo.openRangeMin);
                        res.locals.openRangeData.max = parseInt(m);
                        res.locals.openRangeData.step = res.locals.provInfo.step;
                        res.locals.doublerate = false;
                        if (!req.user.currencies.contains(res.locals.provInfo.currency)) {
                            return Rate.findOne({
                                source: req.user.currency,
                                destination: res.locals.provInfo.currency
                            }).exec()
                        } else {
                            var o = {};
                            o.rate = 1;
                            o.source = res.locals.provInfo.currency;
                            return o;
                        }

                    }
                    break;
                case "w2":
                    return dd;

                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (za) {
            if (res.locals.workflow == 'w1') {
                if (za !== null) {
                    res.locals.rate_reverse = false;
                    return za;
                } else {
                    res.locals.rate_reverse = true;
                    return Rate.findOne({source: res.locals.provInfo.currency, destination: req.user.currency}).exec();
                }
            } else {
                return za;
            }
        })
        .then(function (zb) {
            if (res.locals.workflow == 'w1') {
                if (zb !== null) {
                    return zb;
                } else {
                    res.locals.rate_reverse = false;
                    res.locals.doublerate = true;
                    return Rate.findOne({destination: req.user.currency, source: 'USD'}).exec();
                }
            } else {
                return zb;
            }
        })
        .then(function (zx) {
            if (res.locals.workflow == 'w1') {
                if (!res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else if (res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else {
                    if (zx !== null) {
                        res.locals.toUSD = zx;
                        return Rate.findOne({source: 'USD', destination: res.locals.provInfo.currency}).exec()
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                }
            } else {
                return zx;
            }
        })
        .then(function (zx) {
            if (res.locals.workflow == 'w1') {
                if (!res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else if (res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else {
                    if (zx !== null) {
                        res.locals.fromUSD = zx;
                        return zx;
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                }
            } else {
                return zx;
            }
        })
        .then(function (f) {
            switch (res.locals.workflow) {
                case "w1":
                    if (f == null) {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                    var resp = {};
                    resp.opts = {};
                    resp.products = [];
                    resp.opts.hasOpenRange = true;
                    resp.opts.country = res.locals.cinfo.country;
                    resp.opts.operator = res.locals.provInfo.operatorName;
                    resp.opts.iso = res.locals.cinfo.iso;
                    resp.opts.canOverride = true;
                    resp.opts.msisdn = res.locals.ms;
                    res.locals.txcur = req.user.currency;
                    var line = {};
                    line.product_id = res.locals.cinfo.perfProv + '-' + res.locals.provInfo.operatorId + '-OR';
                    line.openRange = true;
                    line.openRangeMin = res.locals.openRangeData.min;
                    line.openRangeMax = res.locals.openRangeData.max;
                    line.rate = f.rate;
                    line.step = f.step;
                    line.topup_currency = res.locals.cinfo.currency;
                    line.currency = f.source;
                    if (res.locals.rate_reverse) {
                        line.rate = (1 / f.rate)
                    } else if (res.locals.doublerate) {
                        line.rate = res.locals.fromUSD.rate;
                        line.rate = line.rate / res.locals.toUSD.rate;
                        line.currency = req.user.currency;
                    }
                    var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                    var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                    var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                    var globals = ['USD', 'GBP', 'EUR']
                    if (!globals.contains(req.user.currency)) {
                        var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                        console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                        console.log('PEERC', perc)
                        line.rate = (parseFloat(line.rate) * parseFloat(perc))
                    } else {
                        var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                        console.log('PERC', percentage)
                        line.rate = (line.rate - ((parseFloat(line.rate) * percentage) / 100))
                        //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                    }


                    if (req.reseller.permitted_apis.contains(res.locals.cinfo.perfProv)) {
                        resp.products.push(line)
                    }
                    console.log('RESLOCALS', res.locals)
                    return resp;
                    break;
                case "w2":
                    var winList = f;
                    var respObject = {};
                    respObject.opts = {};
                    respObject.opts.msisdn = res.locals.ms;
                    respObject.opts.country = res.locals.provInfo.country.trim();
                    respObject.opts.operator = res.locals.provInfo.operator_name.trim();
                    respObject.opts.iso = res.locals.provInfo.iso;
                    respObject.opts.canOverride = false;
                    respObject.opts.hasOpenRange = false;
                    res.locals.txcur = "USD";
                    respObject.products = [];
                    winList.map(function (line, i) {
                        var o = {};
                        o.product_id = line.sku;

                        o.topup_currency = line.topup_currency;
                        o.currency = line.currency;
                        if (line.price == '-') {
                            //we have openRange
                            respObject.opts.hasOpenRange = true;
                            o.openRange = true;
                            o.openRangeMin = line.min_denomination;
                            o.openRangeMax = line.max_denomination;
                            o.rate = line.fx_rate;
                            o.step = line.step;
                            var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                            var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                            var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                            var locals = ['USD', 'EUR', 'GBP', 'INR'];
                            if (!locals.contains(o.currency)) {
                                o.rate = (parseFloat(o.rate) * agentProfit * resProfit * wholeProfit)
                            } else {
                                o.rate = (o.rate - ((parseFloat(o.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.wProfit) / 100))
                            }
                            //

                        } else {
                            //fixed
                            o.denomination = line.min_denomination;
                            o.openRange = false;
                            o.price = line.price;
                            var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                            var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                            var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                            o.price = (parseFloat(o.price) * agentProfit * resProfit * wholeProfit)
                        }
                        if (req.reseller.permitted_apis.contains(o.product_id.split('-')[0])) {
                            respObject.products.push(o);
                        }

                    })

                    // console.log('RESP :', respObject)
                    //res.json(respObject);
                    return respObject;
                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (r) {
            res.locals.respObject = r;
            if (res.locals.txcur !== req.user.currency) {
                console.log('CONVERSION NEEDED !!!!!!');
                res.locals.haverate = true;
                return Rate.findOne({source: req.user.currency, destination: res.locals.txcur}).exec();
            } else {
                res.locals.haverate = false;
                return r;
            }
        })
        .then(function (r) {
            if (res.locals.haverate) {
                if (r !== null) {
                    res.locals.rate_reverse = false;
                    return r;
                } else {
                    res.locals.rate_reverse = true;
                    return Rate.findOne({destination: req.user.currency, source: res.locals.txcur}).exec();
                }
            } else {
                return r;
            }
        })
        .then(function (rb) {
            if (res.locals.haverate) {
                if (!res.locals.rate_reverse) {
                    return rb;
                } else {
                    if (rb !== null) {
                        res.locals.rate_reverse = true;
                        return rb;
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY";
                        err.message = "Sorry, you cannot use this currency";
                        throw err;
                    }
                }
            } else {
                return rb;
            }
        })
        .then(function (ra) {
            if (res.locals.haverate) {
                console.log('RARA', ra)
                console.log('HAVERATE', res.locals.haverate)
                //we have rate
                //console.log('RESPOBJECT', res.locals.respObject);
                var resp = {}
                resp.opts = res.locals.respObject.opts;
                resp.products = [];
                res.locals.respObject.products.map(function (line) {
                    if (!req.user.currencies.contains(line.currency)) {
                        var l = {};
                        l.product_id = line.product_id;
                        l.currency = req.user.currency;
                        l.openRange = line.openRange;
                        l.topup_currency = line.topup_currency;
                        l.step = line.step;
                        if (line.openRange) {
                            l.openRangeMin = line.openRangeMin;
                            l.openRangeMax = line.openRangeMax;
                            if (!res.locals.rate_reverse) {
                                l.rate = (parseFloat(line.rate) * parseFloat(ra.rate))
                            } else {
                                l.rate = (parseFloat(line.rate) / parseFloat(ra.rate));
                            }

                            if (!res.locals.rate_reverse) {
                                l.currency = ra.source
                            } else {
                                l.currency = ra.destination
                            }
                        } else {
                            l.denomination = line.denomination;
                            if (!res.locals.rate_reverse) {
                                l.price = (parseFloat(line.price) / parseFloat(ra.rate))
                            } else {
                                l.price = (parseFloat(line.price) * parseFloat(ra.rate))
                            }
                            if (!res.locals.rate_reverse) {
                                l.currency = ra.source
                            } else {
                                l.currency = ra.destination
                            }

                        }
                        console.log('LINE', l)
                        resp.products.push(l);
                    } else {
                        console.log('LINE_NO_CHANGE', line)
                        resp.products.push(line);
                    }

                })
                res.json(resp);
            } else {
                res.json(ra);
            }
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})


router.post('/topup/exec/:msisdn', ApplyAcl, function (req, res) {
    return new Promise(function (resolve, reject) {
        var ms = req.params.msisdn.replace(/^0+/, '');
        res.locals.ms = ms;
        var cselect = [];
        if (ms.substring(0, 1) == '1') {
            var comp = ms.substring(0, 4)
            Operator.findOne({country_code: comp}, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    if (data !== null) {
                        resolve(data)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat2) {
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
            Operator.findOne({country_code: comp}, function (err, dat) {
                if (err) {
                    reject(err)
                } else {
                    if (dat !== null) {
                        resolve(dat)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 2)}, function (err, dat2) {
                            if (err) {
                                reject(err)
                            } else {
                                if (dat2 !== null) {
                                    resolve(dat2)
                                } else {
                                    Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat3) {
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
        .then(function (daas) {
            res.locals.daas = daas;
            res.locals.hasReference = false;
            if ('undefined' !== typeof req.body.customer_reference) {
                if (req.body.customer_reference !== '') {
                    res.locals.hasReference = true;
                    return TopupLog.find({
                        account: req.user.main_account,
                        customer_reference: req.body.customer_reference
                    }).count().exec();

                }
            } else {
                return
            }

        })
        .then(function (cmp) {
            if (res.locals.hasReference == true) {
                if (cmp !== 0) {
                    var err = {};
                    err.status = 500;
                    err.code = 'DUPLICATE_TRANSACTION'
                    err.message = 'Please ensure supplied transaction reference is unique!'
                    throw err;
                } else {
                    return res.locals.daas;
                }
            } else {
                return res.locals.daas;
            }

        })
        .then(function (dat) {
            res.locals.cinfo = dat;
            var minl = parseInt(dat.min_length);
            var maxl = parseInt(dat.max_length);
            if ((res.locals.ms.length > maxl) || (res.locals.ms.length < minl)) {
                var err = {};
                err.status = 500;
                err.code = "MSISDN_LENGTH_ERROR";
                err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
                res.status(err.status).send(err);
                throw err;
            }
            if (req.user.account_type !== 'agent') {
                var err = {};
                err.status = 403;
                err.code = "ENO_ACCESS";
                err.message = "Sorry, you cannot perform this action";
                throw err;
            } else {
                //check for fields
                if (!req.body.product_id || !req.body.denomination) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
                }
                if (!req.reseller.permitted_apis.contains(req.body.product_id.split('-')[0])) {
                    var err = {};
                    err.code = 'ENO_ACCESS';
                    err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                    err.status = 403;
                    throw err;
                }
                var ms = req.params.msisdn.replace(/^0+/, '');
                res.locals.txstart = new Date().getTime()
                res.locals.ms = ms;
                var pArr = req.body.product_id.split('-');
                res.locals.pArr = pArr;
                if (pArr[0].length == 4) {
                    //resolve(Provider.findOne({provider_code : String(pArr[0])}).exec() )
                    console.log(hostname, 'BODY-DEBUG', req.body)
                    return Baseprod.findOne({sku: req.body.product_id});
                } else {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
                }

            }
        })
        .then(function (d) {
            if (d == null) {
                var err = {};
                err.code = "INVALID_PRODUCT";
                err.message = "The Product ID is not valid"
                err.status = 500;
                throw err;
            }
            var prod = d;
            //checking ACL
            if ((req.acl.type !== null) && (prod.iso !== null)) {
                if (req.acl.type == 'restrictive') {
                    //block all
                    var canContinue = false;
                    if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                        //allow it check for block on specific operator
                        canContinue = true;
                        if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperId)) {
                            canContinue = false;
                        }
                    }
                } else if (req.acl.type == 'permissive') {
                    var canContinue = true;

                    //console.log('DEBUG', prod.iso.toUpperCase() + ':' + prod.acloperId, prod.iso.toUpperCase() + ':ALL');
                    console.log(hostname, 'PROD', prod.acloperId);
                    if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.block.contains(prod.iso.toUpperCase() + ':ALL')) {
                        canContinue = false;
                        if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                            canContinue = true;
                        }
                    }
                } else {
                    var canContinue = true;
                }
            } else {
                var canContinue = true;
            }
            if (!canContinue) {
                var err = {};
                err.code = "ENO_ACCESS";
                err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                err.status = 403;
                throw err;
            }
            res.locals.prod = prod;
            //get profitMap
            return NumLookup.getProfits(req.user.main_account, prod.iso, prod.acloperId);
        })
        .then(function (prof) {
            res.locals.profitMap = prof;
            console.log(hostname, 'ProfitMap', res.locals.profitMap);

            console.log(hostname, 'PRODDDD', res.locals.prod);
            //now we have profits, lets check if we can use local balance to make tx
            var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
            var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
            var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;

            if (req.user.currencies.contains(res.locals.prod.topup_currency)) {
                //we can use local currency
                var excl = ['GBP', 'EUR', 'USD', 'ZAR', 'UGX']
                if (excl.contains(res.locals.prod.topup_currency)) {
                    var useLocalCurrency = false;
                } else {
                    var useLocalCurrency = true;
                }
            } else {
                var useLocalCurrency = false;
            }

            if (res.locals.pArr[2] == 'OR') {
                var myrate = (res.locals.prod.fx_rate - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.wProfit) / 100))
                //we have open range
                if (useLocalCurrency) {
                    //denom + profit
                    var localOps = ['MFIN', 'SSLW', 'ETRX', 'TRLO', 'TRTL']
                    if (localOps.contains(res.locals.pArr[0])) {
                        var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;

                        var price = (parseFloat(req.body.denomination) * parseFloat(perc));
                    } else {
                        var price = parseFloat(req.body.denomination) / myrate;
                    }
                    var bpr = parseFloat(req.body.denomination) / myrate;
                    var fa = {
                        amount: price,
                        currency: res.locals.prod.topup_currency,
                        msisdn: res.locals.ms,
                        topAmt: req.body.denomination,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = {
                        amount: bpr,
                        currency: res.locals.prod.currency
                    }

                } else {
                    var bpr = parseFloat(req.body.denomination) / myrate
                    var fa = {
                        amount: bpr,
                        currency: res.locals.prod.currency,
                        msisdn: res.locals.ms,
                        topAmt: req.body.denomination,
                        topCur: res.locals.prod.topup_currency
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

                    var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit);
                    var fa = {
                        amount: price,
                        currency: res.locals.prod.topup_currency,
                        msisdn: res.locals.ms,
                        topAmt: res.locals.prod.min_denomination,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = {
                        amount: bprice,
                        currency: res.locals.prod.currency
                    }

                } else {
                    var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit);
                    var fa = {
                        amount: bprice,
                        currency: res.locals.prod.currency,
                        msisdn: res.locals.ms,
                        topAmt: res.locals.prod.min_denomination,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = null;
                }

            }
            if (!req.user.test_mode) {
                console.log(hostname, 'PROD', res.locals.prod, 'FA', fa)
                return Finance.charge(req.user.main_account, fa, ba);
            } else {
                var z = {}
                return z;
            }
        })
        .then(function (sd) {
            if (!req.user.test_mode) {
                if (sd._id !== null) {
                    //we have tx
                    res.locals.txOrig = sd;
                    var tl = new TopupLog();
                    tl.product_id = req.body.product_id;
                    tl.account = req.user.main_account;

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
                    tl.customer_reference = req.body.customer_reference || null;
                    tl.country = res.locals.prod.country;
                    tl.operator_name = res.locals.prod.name;
                    tl.channel = req.user.channel || 'api';
                    tl.type = 'topup';
                    tl.app_host = hostname;
                    tl.client_apireqbody = JSON.stringify(req.body);
                    tl.operator_reference = uuid.v1();
                    tl.test = req.user.test_mode;
                    tl.related_transactions = [];
                    tl.related_transactions.push(sd._id);
                    return tl.save();

                } else {
                    var err = {}
                    err.code = "ETX_FAILED";
                    err.message = "Transaction failed, please try again";
                    err.status = 500;
                }
            } else {
                return true;
            }

        })
        .then(function (tt) {
            if (!req.user.test_mode) {
                if (tt._id !== null) {
                    /*
                     o.msisdn = res.locals.ms;
                     o.denomination = req.body.denomination;
                     o.operatorId = res.locals.provInfo.operatorId;
                     o.reference = ss.operator_reference;
                     */
                    res.locals.tl = tt;
                    console.log(hostname, 'TLL', tt);
                    var o = {
                        msisdn: res.locals.ms,
                        reference: tt.operator_reference,
                        operatorId: res.locals.prod.operator_id,
                        denomination: req.body.denomination,
                        reseller_id: req.reseller._id
                    }
                    //Mobifin Etisalat Patch

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
                        } else if ((res.locals.pArr[0] == 'TRTL')) {
                            o.skuid = res.locals.prod.skuid;
                            o.currency = res.locals.prod.topup_currency;
                            var apid = 'TRTL'
                        }

                        else {
                            var apid = res.locals.pArr[0]
                        }

                        //var apid = res.locals.pArr[0];
                        return s.topup(apid, o);
                    } else {
                        var ttt = {
                            success: true,
                            resp_debug: 'ttest',
                            req_debug: 'ttest',
                            pin_based: false,
                            responseCode: 'RECHARGE_COMPLETE'
                        }
                        return ttt;
                    }

                    /*

                     */
                } else {
                    var err = {}
                    err.code = "ETX_FAILED";
                    err.message = "Transaction failed, please try again";
                    err.status = 500;
                }
            } else {
                return true;
            }

        })
        .then(function (def) {
            if (!req.user.test_mode) {
                res.locals.def = def;
                if (def.success) {
                    //we have completed this shit

                    return Finance.applyCommission(req.user.main_account, res.locals.tl._id, res.locals.profitMap);
                } else {
                    return Finance.refund(res.locals.tl._id);
                }
            } else {
                var o = {};
                o.status = 201;
                o.message = 'Operation Successful (TEST!!), Recharge created, Reference : ' + uuid.v1();
                o.reference = uuid.v1();
                o.code = 'RECHARGE_COMPLETE'
                o.pin_based = false;
                res.status(o.status).send(o) //TEMP
            }
        })
        .then(function (t) {
            console.log(hostname, 'T', t);
            if (!req.user.test_mode) {
                if (t !== null) {
                    return TopupLog.findOne({_id: t._id}).exec();
                } else {
                    var err = {}
                    err.code = "EDB_FAILURE"
                    err.message = "There seems something wrong with TopupLog update process, please contact support (however transaction was finished successfully)"
                    err.status = 500;
                    throw err;
                }
            }
        })
        .then(function (tf) {
            var def = res.locals.def;
            if (tf !== null) {
                var txfin = new Date().getTime();
                tf.success = res.locals.def.success;
                //2.0.3 - Adding PIN info to topuplog
                tf.api_transactionid = res.locals.def.operator_transactionid
                tf.response_debug = res.locals.def.resp_debug;
                tf.request_debug = res.locals.def.req_debug;
                tf.completed_in = txfin - res.locals.txstart;
                tf.pin_based = def.pin_based;
                tf.vnd_sim = def.vnd_sim;
                if (def.pin_based) {
                    tf.pin_option1 = def.pin_option1;
                    tf.pin_option2 = def.pin_option2;
                    tf.pin_option3 = def.pin_option3;
                    tf.pin_code = def.pin_code;
                    tf.pin_serial = def.pin_serial;
                    tf.pin_ivr = def.pin_ivr;
                    tf.pin_validity = def.pin_validity;
                    tf.pin_value = def.pin_value;
                }
                var o = {};
                if (res.locals.def.success === true) {
                    tf.code = "RECHARGE_COMPLETE";
                    tf.message = "Operation Successful";
                    if (def.success === true) {
                        o.status = 201;
                        o.message = 'Operation Successful, Recharge created, Reference : ' + tf.operator_reference
                        o.reference = tf.operator_reference
                        o.code = 'RECHARGE_COMPLETE'
                        //porting patch
                        var ngo = {
                            'NGMT': 'MTN',
                            'NGAT': 'Airtel',
                            'NGET': '9mobile',
                            'NGGL': 'Globacom',
                            'MTN' : 'MTN',
                            'GLO' : 'Globacom',
                            'EXPRESSO' : 'Expresso',
                            'TIGO' : 'Tigo',
                            'AIRTEL' : 'Airtel',
                            'VODAFONE' : 'Vodafone'
                        }
                        if ('undefined' !== typeof def.ported) {
                            if (def.ported == true) {

                                var op = ngo[def.ported_from] + '-> ' + ngo[def.ported_to];
                                console.log('NUMBER IS PORTED', op)
                                tf.operator_name = op;
                            }
                        }
                        o.paid_amount = tf.paid_amount
                        o.paid_currency = tf.paid_currency
                        o.topup_amount = tf.topup_amount
                        o.topup_currency = tf.topup_currency

                        o.target = tf.target
                        o.product_id = tf.product_id
                        o.time = new Date()
                        o.country = tf.country
                        o.operator_name = tf.operator_name
                        o.completed_in = tf.completed_in
                        o.customer_reference = tf.customer_reference
                        o.api_transactionid = tf.api_transactionid
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
                            o.pin_based = false;
                        }

                    }
                } else {
                    res.locals.eo = {};
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
                            break;
                        case "UNSUPPORTED_DENOMINATION":
                            res.locals.eo.status = 429;
                            res.locals.eo.message = "Denomination is not supported";
                            res.locals.eo.code = def.responseCode;
                            break;
                        case "FRAUD_PREVENTION":
                            res.locals.eo.status = 551;
                            res.locals.eo.message = "Operator Side Fraud Prevention activated, please wait 90 seconds or more to try this transaction again"
                            res.locals.eo.code = def.responseCode;
                            break;
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
                    tf.api_transactionid = res.locals.def.operator_transactionid
                    o.status = res.locals.eo.status;
                    o.code = res.locals.eo.code;
                    o.message = res.locals.eo.message;
                    o.reference = null;
                    o.customer_reference = tf.customer_reference;
                }

                tf.client_apiresponse = JSON.stringify(o);
                res.locals.ooo = o;
                return tf.save();

            } else {
                var err = {}
                err.code = "EDB_FAILURE"
                err.message = "There seems something wrong with TopupLog (id does not match) update process, please contact support (however transaction was finished successfully)"
                err.status = 500;
                throw err;
            }
        })
        .then(function (txx) {
            if (!req.user.test_mode) {
                res.locals.tf = txx;
                if ('undefined' !== typeof req.body.send_sms) {
                    if ((req.body.send_sms === true) && (req.body.sms_text !== '')) {
                        //sms.send(sav.sms_sender, res.locals.ms, req.body.sms_text);
                        if (res.locals.def.success === true) {
                            return Finance.chargeAndSendSms(req.user.main_account, res.locals.ms, req.body.sms_text);
                        } else {
                            return txx;
                        }
                    } else {
                        return txx;
                    }
                } else {
                    return txx;
                }
            }

        })
        .then(function (txb) {
            if (!req.user.test_mode) {
                if ('undefined' !== typeof req.body.send_sms) {
                    if ((req.body.send_sms === true) && (req.body.sms_text !== '')) {
                        console.log(hostname, 'TXB', txb);
                        if (res.locals.def.success === true) {
                            return res.locals.tf;
                        } else {
                            return txb;
                        }

                    } else {
                        return txb;
                    }
                } else {
                    return txb;
                }
            }
        })
        .then(function (ta) {
            var def = res.locals.def;
            var o = res.locals.ooo;
            /*
             var o = {};
             if (def.success === true) {
             o.status = 201;
             o.message = 'Operation Successful, Recharge created, Reference : ' + ta.operator_reference
             o.reference = ta.operator_reference
             o.code = 'RECHARGE_COMPLETE'
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
             } else {
             o.status = res.locals.eo.status;
             o.message = res.locals.eo.message;
             o.reference = null;
             o.code = res.locals.eo.code;
             }
             */
            res.status(o.status).send(o)
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });

})
router.get('/topup/log/page/:page', function (req, res) {
    list1 = [];
    co(function*() {
        var Li1 = yield Account.find({type: 'agent'}).exec();
        for (var i = 0; i < Li1.length; i++) {
            var r = Li1[i];
            var par = yield Account.findOne({_id: r.parent}).exec();

            list1[r._id] = par.account_name;
        }
    })
        .then(function (xaa) {
            var ob2 = {};
            if (req.query.fields) {
                var li = req.query.fields.split(',');
                li.forEach((l) => {
                        ob2[l] = true;
                })
            }
            var opts = {page: req.params.page, limit: 100, sort: {time: -1}, select: ob2};
            if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
                {
                    var accounts = [];
                    var ob = {};
                    co(function*() {
                        for (var i = 0; i < req.user.child.length; i++) {
                            var num = yield TopupLog.find({account: req.user.child[i] }).count().exec();
                            if(num != 0)
                            {
                                accounts.push(req.user.child[i]);
                            }
                        }
                    })
                    .then(function (ret) {
                        ob = {account: {$in: accounts}};
                        return TopupLog.paginate(ob, opts);
                    })
                    .then(function (f) {
                        var docs = [];
                        f.docs.forEach(function (fr) {
                            var doc = fr.toObject();
                            doc.account_name = req.user.rwnames[fr.account];
                            doc.parent = list1[fr.account];
                            docs.push(doc);
                        })
                        var o = {};
                        o.count = f.total;
                        o.pages = f.pages;
                        o.page = f.page;
                        o.limit = f.limit;
                        o.docs = docs;
                        res.json(o);
                    })
                    .catch(function (err) {
                        res.status = err.status || 500;
                        console.log(hostname, new Error(err.message));
                        res.json(err.status, err);
                    });
                }
            } else if (req.user.account_type == 'agent') {
                var ob = {account: req.user.main_account}
                TopupLog.paginate(ob, opts)
                .then(function (f) {
                    var docs = [];
                    f.docs.forEach(function (fr) {
                        var doc = fr.toObject();
                        doc.account_name = req.user.rwnames[fr.account];
                        doc.parent = list1[fr.account];
                        docs.push(doc);
                    })
                    var o = {};
                    o.count = f.total;
                    o.pages = f.pages;
                    o.page = f.page;
                    o.limit = f.limit;
                    o.docs = docs;
                    res.json(o);
                })
                .catch(function (err) {
                    res.status = err.status || 500;
                    console.log(hostname, new Error(err.message));
                    res.json(err.status, err);
                });
            }
        })
        
})
router.post('/topup/log/page/:page', function (req, res) {
    list1 = [];
    var ob2 = {};
    if (req.query.fields) {
        var li = req.query.fields.split(',');
        li.forEach((l) => {
            ob2[l] = true;
    })
    }
    res.locals.opts = {page: req.params.page, limit: 100, sort: {time: -1}, select: ob2};
    co(function*() {
        var Li1 = yield Account.find({type: 'agent'}).exec();
        for (var i = 0; i < Li1.length; i++) {
            var r = Li1[i];
            var par = yield Account.findOne({_id: r.parent}).exec();

            list1[r._id] = par.account_name;
        }
    })
    .then(function (xaa) {
            var accounts = [];
            co(function*() {
                for (var i = 0; i < req.user.child.length; i++) {
                    var num = yield TopupLog.find({account: req.user.child[i] }).count().exec();
                    if(num != 0)
                    {
                        accounts.push(req.user.child[i]);
                    }
                }
            })
            .then(function (ret) {
                if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
                    if ('undefined' !== typeof req.body.account) {
                        if (req.body.account == "all") {
                            var ob = {account: {$in: accounts}};
                        } else {
                            if (req.user.child.contains(req.body.account)) {
                                var ob = {account: req.body.account}
                            } else {
                                var ob = {account: req.user.main_account}
                            }
    
                        }
                    } else {
                        var ob = {account: {$in: accounts}};
                    }
                } else if (req.user.account_type == 'agent') {
                    var ob = {account: req.user.main_account}
                }
                console.log(ob);
                if ((req.body.date_from !== '')) {
                    if ('undefined' !== typeof req.body.timezone) {
                        if (req.body.timezone !== '') {
                            var off = offset[req.body.timezone];
                            res.locals.offset = off;
                            console.log('OFF', off)
    
                            if (off < 0) {
                                //var offs = off.replace('-', '')
                                var h = (parseInt(off / 60)) * 1;
                                var m = (off % 60) * 1;
                                var compTZ = String("-" + pad(h) + ":" + pad(m));
                            } else {
                                var h = parseInt(off / 60);
                                var m = off % 60;
                                var compTZ = String("+" + pad(h) + ":" + pad(m));
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
                        req.body.time_from = "2017-01-01T00:00:00Z"
                    }
                    if (req.body.time_to == '') {
                        req.body.time_to = "2017-01-01T23:59:59Z"
                    }
                    if (req.body.date_to == '') {
                        req.body.date_to = new Date().toISOString();
                    }
                    var dfr = req.body.date_from.split("T")[0];
                    var tfr = req.body.time_from.split("T")[1].split("Z")[0]
                    var dto = req.body.date_to.split("T")[0];
                    var tto = req.body.time_to.split("T")[1].split("Z")[0];
                    console.log('TFR', dfr + 'T' + tfr + compTZ)
                    var time_from = new Date(dfr + 'T' + tfr + compTZ);
                    var time_to = new Date(dto + 'T' + tto + compTZ);
                    ob.time = {$lte: time_to, $gte: time_from}
                }
    
    
                if (req.body.target !== '') {
                    ob.target = req.body.target
                }
                if ('undefined' !== req.body.success) {
                    if (req.body.success !== '') {
                        if (req.body.success == 'true') {
                            ob.success = true;
                        } else {
                            ob.success = false;
                        }
                    }
                }
                if ('' !== req.body.customer_reference) {
                    ob.customer_reference = req.body.customer_reference;
                }
                if ('' !== req.body.operator_reference) {
                    ob.operator_reference = req.body.operator_reference;
                }
    
                if ('' !== req.body.api_transactionid) {
                    ob.api_transactionid = req.body.api_transactionid;
                }
    
                if (req.body.code !== '') {
                    ob.code = req.body.code;
                }
                if (req.body.channel !== '') {
                    ob.channel = req.body.channel;
                }
                if (req.body.product_id !== '') {
                    ob.product_id = req.body.product_id;
                }
                if (req.body.country !== '') {
                    ob.country = new RegExp(req.body.country, 'i');
                }
                if (req.body.currency !== '') {
                    ob.topup_currency = req.body.currency;
                }
                if (req.body.operator_name !== '') {
                    ob.operator_name = new RegExp(req.body.operator_name, 'i');
                }
                res.locals.ob = ob;
                return TopupLog.paginate(res.locals.ob, res.locals.opts)
            })
            .then(function (z) {
                // console.log(z)
                var o = {};
                var docs = [];
                z.docs.forEach(function (fr) {
                    var doc = fr.toObject();
                    doc.account_name = req.user.rwnames[fr.account];
                    doc.parent = list1[fr.account];
                    if ('undefined' !== typeof res.locals.offset) {
                        //   console.log('OFFSET IS ', res.locals.offset)
                        doc.time = new DateWithOffset(fr.time, res.locals.offset || 0).toString()
                    }
                    docs.push(doc);
                })
                o.count = z.total;
                o.pages = z.pages;
                o.page = z.page;
                o.limit = z.limit;
                o.docs = docs;
                o.filter = new Buffer(JSON.stringify(req.body)).toString('base64');
                res.json(o);
            })
            .catch(function (err) {
                        res.status = err.status || 500;
                        console.log(hostname, new Error(err.message));
                        res.json(err.status, err);
            });
    })
    .catch(function (err) {
        res.status = err.status || 500;
        console.log(new Error(err.message));
        res.json(err.status, err);
    });
})
router.get('/topup/log/byref/:ref', function (req, res) {
    TopupLog.findOne({account: req.user.main_account, customer_reference: req.params.ref}, {
        request_debug: false,
        response_debug: false,
	vnd_sim : false
    })
        .then(function (tl) {
            if (tl !== null) {
                res.json(tl);
            } else {
                res.sendStatus(404);
            }
        })
})
router.get('/topup/genref', function (req, res) {
    res.json({reference: req.user.main_account + '-' + uuid.v1()})
})
router.get('/topup/log/item/:id', function (req, res) {
    if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
        var ob = {account: {$in: req.user.child}, _id: req.params.id}
    } else if (req.user.account_type == 'agent') {
        var ob = {account: req.user.main_account, _id: req.params.id}
    }
    TopupLog.findOne(ob, {response_debug: false})
        .then(function (r) {
            r.account = req.user.rwnames[r.account];
            res.json(r);
        })
})
router.get('/topup/log/topuplog', function (req, res) {
    req.body = JSON.parse(new Buffer(req.query.filter, 'base64').toString('ascii'));
    list1 = [];
    co(function*() {
        var Li1 = yield Account.find({type: 'agent'}).exec();
        for (var i = 0; i < Li1.length; i++) {
            var r = Li1[i];
            var par = yield Account.findOne({_id: r.parent}).exec();

            list1[r._id] = par.account_name;
        }
    })
        .then(function (xaa) {
            if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
                if (req.body.account == "all") {
                    var ob = {account: {$in: req.user.child}}
                } else {
                    if (req.user.child.contains(req.body.account)) {
                        var ob = {account: req.body.account}
                    } else {
                        var ob = {account: req.user.main_account}
                    }

                }

            } else if (req.user.account_type == 'agent') {
                var ob = {account: req.user.main_account}
            }
            if ((req.body.date_from !== '')) {
                if ('undefined' !== typeof req.body.timezone) {
                    if (req.body.timezone !== '') {
                        var off = offset[req.body.timezone];
                        res.locals.offset = off;
                        console.log('OFF', off)

                        if (off < 0) {
                            //var offs = off.replace('-', '')
                            var h = (parseInt(off / 60)) * 1;
                            var m = (off % 60) * 1;
                            var compTZ = String("-" + pad(h) + ":" + pad(m));
                        } else {
                            var h = parseInt(off / 60);
                            var m = off % 60;
                            var compTZ = String("+" + pad(h) + ":" + pad(m));
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
                    req.body.time_from = "2017-01-01T00:00:00Z"
                }
                if (req.body.time_to == '') {
                    req.body.time_to = "2017-01-01T23:59:59Z"
                }
                if (req.body.date_to == '') {
                    req.body.date_to = new Date().toISOString();
                }
                var dfr = req.body.date_from.split("T")[0];
                var tfr = req.body.time_from.split("T")[1].split("Z")[0]
                var dto = req.body.date_to.split("T")[0];
                var tto = req.body.time_to.split("T")[1].split("Z")[0];
                console.log('TFR', dfr + 'T' + tfr + compTZ)
                var time_from = new Date(dfr + 'T' + tfr + compTZ);
                var time_to = new Date(dto + 'T' + tto + compTZ);
                ob.time = {$lte: time_to, $gte: time_from}
            }


            if (req.body.target !== '') {
                ob.target = req.body.target
            }
            if ('undefined' !== req.body.success) {
                if (req.body.success !== '') {
                    if (req.body.success == 'true') {
                        ob.success = true;
                    } else {
                        ob.success = false;
                    }
                }
            }
            if ('' !== req.body.customer_reference) {
                ob.customer_reference = req.body.customer_reference;
            }
            if ('' !== req.body.operator_reference) {
                ob.operator_reference = req.body.operator_reference;
            }
            if (undefined !== req.body.country) {
                ob.country = req.body.country
            }
            if (req.body.code !== '') {
                ob.code = req.body.code;
            }
            if (req.body.product_id !== '') {
                ob.product_id = req.body.product_id;
            }
            if (req.body.country !== '') {
                ob.country = new RegExp(req.body.country, 'i');
            }
            if (req.body.operator_name !== '') {
                ob.operator_name = new RegExp(req.body.operator_name, 'i');
            }
            var str = TopupLog.find(ob).sort({time: -1}).batchSize(1000000000000).cursor();
            if(req.query.category == 'csv')
            {
                res.writeHead(200, {
                    'Content-Type': 'text/csv',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename=topuplog.csv'
                });
                var st = "Time,Account Name,Parent,Type,Product ID,Successful,Target,Topup Amount,Topup Currency, Paid Amount, Paid Currency, System Reference, Customer Reference, Operator Reference, Country, Operator Name, Response Code, Response Message,Completed In, Channel\n";
                res.write(st);
                    str.on("data", function (d) {
                        
                        var mtime = new DateWithOffset(d.time, res.locals.offset || 0).toString()
                       var str = mtime + ',' + req.user.rwnames[d.account] + ',' + list1[d.account] + ',' + d.type + ',' + d.product_id + ',' + d.success + ',' + d.target + ',' + d.topup_amount + ',' + d.topup_currency + ',' + d.paid_amount + ',' + d.paid_currency + ',' + d.operator_reference + ',' + d.customer_reference + ',' + d.api_transactionid +',' + d.country + ',' + d.operator_name + ',' + d.code + ',' + d.message + ',' + d.completed_in + ',' + d.channel +'\n';
                       res.write(str);
                   })
                   str.on("end", function () {
                       res.end();
                   })
            }else if(req.query.category == 'txt')
            {
                res.writeHead(200, {
                    'Content-Type': 'text',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename=topuplog.txt'
                });
                var st = "Time,Account Name,Parent,Type,Product ID,Successful,Target,Topup Amount,Topup Currency, Paid Amount, Paid Currency, System Reference, Customer Reference, Operator Reference, Country, Operator Name, Response Code, Response Message,Completed In, Channel\n";
                
                res.write(st);
                    str.on("data", function (d) {
                        
                        var mtime = new DateWithOffset(d.time, res.locals.offset || 0).toString()
                        var str = mtime + ',' + req.user.rwnames[d.account] + ',' + list1[d.account] + ',' + d.type + ',' + d.product_id + ',' + d.success + ',' + d.target + ',' + d.topup_amount + ',' + d.topup_currency + ',' + d.paid_amount + ',' + d.paid_currency + ',' + d.operator_reference + ',' + d.customer_reference + ',' + d.api_transactionid +',' + d.country + ',' + d.operator_name + ',' + d.code + ',' + d.message + ',' + d.completed_in + ',' + d.channel +'\n';
                        res.write(str);
                   })
                   str.on("end", function () {
                       res.end();
                   })
            }else if(req.query.category == 'xlsx')
            {
                var styles = {
                    headerDark: {
                      fill: {
                        fgColor: {
                          rgb: 'FF000000'
                        }
                      },
                      font: {
                        color: {
                          rgb: 'FFFFFFFF'
                        },
                        sz: 11,
                        bold: true,
                        underline: true
                      }
                    },
                    cellPink: {
                      fill: {
                        fgColor: {
                          rgb: 'FFFFCCFF'
                        }
                      }
                    },
                    cellGreen: {
                      fill: {
                        fgColor: {
                          rgb: 'FF00FF00'
                        }
                      }
                    },
                    cellTime: {
                        fill: {
                            numFmt :  "dd/mm/yyyy hh:nn:ss",
                            fgColor: {
                                rgb: 'FF000000'
                              }
                        },
                        font: {
                            color: {
                              rgb: 'FFFFFFFF'
                            },
                            sz: 11,
                            bold: true,
                            underline: true
                          }
                    }
                    
                  };
                  var specification = {
                      Time: { // <- the key should match the actual data key
                      displayName: 'Time', // <- Here you specify the column header
                      headerStyle: styles.cellTime,
                      width : '30'
                    },
                    Account_Name: {
                      displayName: 'Account Name',
                      headerStyle: styles.headerDark,
                      width: '20' // <- width in chars (when the number is passed as string)
                    },
                    Parent: {
                      displayName: 'Parent',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Type: {
                      displayName: 'Type',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Product_ID: {
                      displayName: 'Product ID',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Successful: {
                      displayName: 'Successful',
                      headerStyle: styles.headerDark,
                      width: '10' 
                    },
                    Target: {
                      displayName: 'Target',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Topup_Amount: {
                      displayName: 'Topup Amount',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Topup_Currency: {
                      displayName: 'Topup Currency',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Paid_Amount: {
                      displayName: 'Paid Amount',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Paid_Currency: {
                      displayName: 'Paid Currency',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    System_Reference: {
                      displayName: 'System Reference',
                      headerStyle: styles.headerDark,
                      width: '50' 
                    },
                    Customer_Reference: {
                      displayName: 'Customer Reference',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Operator_Reference: {
                      displayName: 'Operator Reference',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Country: {
                      displayName: 'Country',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Operator_Name: {
                      displayName: 'Operator Name',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Response_Code: {
                      displayName: 'Response Code',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Response_Message: {
                      displayName: 'Response Message',
                      headerStyle: styles.headerDark,
                      width: '30' 
                    },
                    Completed_In: {
                      displayName: 'Completed In',
                      headerStyle: styles.headerDark,
                      width: '20' 
                    },
                    Channel: {
                      displayName: 'Channel',
                      headerStyle: styles.headerDark,
                      width: '15' 
                    }
                  }
                  const dataset = [];
                str.on("data", function (d) {
                    var row = {};
                    row.Time = new Date(d.time.getTime() + res.locals.offset * 60 * 1000) ;
                    row.Account_Name = req.user.rwnames[d.account];
                    row.Parent = list1[d.account] ;
                    row.Type = d.type ;
                    row.Product_ID = d.product_id;
                    row.Successful = d.success ;
                    row.Target = d.target ;
                    row.Topup_Amount = d.topup_amount ;
                    row.Topup_Currency = d.topup_currency ;
                    row.Paid_Amount = d.paid_amount ;
                    row.Paid_Currency = d.paid_currency ;
                    row.System_Reference = d.operator_reference ;
                    row.Customer_Reference = d.customer_reference ;
                    row.Operator_Reference = d.api_transactionid ;
                    row.Country = d.country ;
                    row.Operator_Name = d.operator_name ;
                    row.Response_Code = d.code ;
                    row.Response_Message = d.message ;
                    row.Completed_In = d.completed_in ;
                    row.Channel = d.channel;
                    dataset.push(row);
                })
                str.on("end", function () {
                    var report = excel.buildExport(
                        [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                          {
                            name: 'topuplog', // <- Specify sheet name (optional)
                            specification: specification, // <- Report specification
                            data: dataset // <-- Report data
                          }
                        ]
                      );
                    res.attachment('topuplog.xlsx');
                    res.send(report);
                })
           
            }else{

            }
        })

})
router.post('/topup/info', ApplyAcl, function (req, res) {
    return new Promise(function (resolve, reject) {

        function initProcess(msisdn) {
            return new Promise(function (resolve, reject) {
                var temp = {}
                var ms = msisdn.replace(/^0+/, '');
                temp.ms = ms;
                var cselect = [];
                if (ms.substring(0, 1) == '1') {
                    var comp = ms.substring(0, 4)
                    Operator.findOne({country_code: comp}, function (err, data) {
                        if (err) {
                            reject(err)
                        } else {
                            if (data !== null) {
                                resolve(data)
                            } else {
                                Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat2) {
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
                    Operator.findOne({country_code: comp}, function (err, dat) {
                        if (err) {
                            reject(err)
                        } else {
                            if (dat !== null) {
                                resolve(dat)
                            } else {
                                Operator.findOne({country_code: comp.substring(0, 2)}, function (err, dat2) {
                                    if (err) {
                                        reject(err)
                                    } else {
                                        if (dat2 !== null) {
                                            resolve(dat2)
                                        } else {
                                            Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat3) {
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

        function *processNumber(msisdn) {
            var ms = msisdn.replace(/^0+/, '');
            var tmp = {}
            var temp = {}
            var data = yield initProcess(ms);
            // console.log('DATA', data);
            var minl = parseInt(data.min_length);
            var maxl = parseInt(data.max_length);
            if ((ms.length > maxl) || (ms.length < minl)) {
                var err = {};
                err.status = 500;
                err.code = "MSISDN_LENGTH_ERROR";
                err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
                return err;
            }
            if (data.hasLocalOper === true) {
                //w1
                var px = ms.substring(0, parseInt(data.prefixLength));
                var pfx = yield Prefix.findOne({prefix: px}).exec();
                //  console.log('PFX', pfx)
                var d = pfx;
                if (req.acl.type !== null) {
                    if (req.acl.type == 'restrictive') {
                        //block all
                        var canContinue = false;
                        if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.allow.contains(d.iso + ':ALL')) {
                            //allow it check for block on specific operator
                            canContinue = true;
                            if (req.acl.block.contains(d.iso + ':' + d.operatorId)) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                        if (req.acl.block.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                            canContinue = false;
                            if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                                canContinue = true;
                            }
                        }
                    } else {
                        var canContinue = true;
                    }
                } else {
                    var canContinue = true;
                }
                if (!canContinue) {
                    var err = {};
                    err.code = "ENO_ACCESS";
                    err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                    err.status = 403;
                    return err;
                }
                var prov = yield Provider.findOne({provider_code: data.perfProv}).exec();
                console.log('PROV', prov)
                if (prov !== null) {
                    temp.openRangeData = {};
                    temp.openRangeData.min = d.openRangeMin;
                    temp.openRangeData.max = d.openRangeMax;
                    if (!req.user.currencies.contains(prov.currency)) {
                        var r1 = yield Rate.findOne({source: req.user.currency, destination: prov.currency}).exec();
                        if (r1 !== null) {
                            var rate = r1;
                        } else {
                            var r2 = yield Rate.findOne({destination: req.user.currency, source: prov.currency}).exec();
                            if (r2 !== null) {
                                var rate = r2;
                                rate.rate = 1 / rate.rate;
                            } else {
                                //do usd and back
                                var r3 = yield Rate.findOne({destination: req.user.currency, source: 'USD'}).exec();
                                var r4 = yield Rate.findOne({destination: prov.currency, source: 'USD'}).exec();
                                if ((r3 !== null) && (r4 !== null)) {
                                    var rtmp = parseFloat(r4.rate / r3.rate);
                                    var rate = {
                                        source: req.user.currency,
                                        destination: prov.currency,
                                        rate: rtmp
                                    }
                                } else {
                                    var err = {}
                                    err.code = "INCOMPATIBLE_CURRENCY";
                                    err.message = "We do not support conversion between " + req.user.currency + " and " + prov.currency;
                                    err.status = 500
                                    throw err;
                                }
                            }
                        }
                    } else {
                        var rate = {
                            rate: 1,
                            source: prov.currency
                        }
                    }
                    if (rate == null) {
                        console.log('We cannot convert to ' + prov.currency)
                    }
                    var profitMap = yield NumLookup.getProfits(req.user.main_account, d.iso, d.operatorId);
                    console.log(profitMap, rate)
                    var resp = {};
                    resp.opts = {};
                    resp.products = [];
                    resp.opts.hasOpenRange = true;
                    resp.opts.country = data.country;
                    resp.opts.operator = d.operatorName;
                    resp.opts.msisdn = ms;
                    res.locals.txcur = req.user.currency;
                    var line = {};
                    line.product_id = data.perfProv + '-' + d.operatorId + '-OR';
                    line.openRange = true;
                    line.openRangeMin = temp.openRangeData.min;
                    line.openRangeMax = temp.openRangeData.max;
                    line.rate = rate.rate;
                    line.topup_currency = prov.currency;
                    line.currency = rate.source;

                    var agentProfit = (profitMap.agentProfit + 100) / 100;
                    var resProfit = (profitMap.resProfit + 100) / 100;
                    var wholeProfit = (profitMap.wProfit + 100) / 100;
                    //line.rate =    (parseFloat(line.rate) * parentProfit * resProfit).toFixed(2);
                    //line.rate = (line.rate - ((parseFloat(line.rate) * profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * profitMap.resProfit) / 100) - ((parseFloat(line.rate) * profitMap.wProfit) / 100)).toFixed(2)
                    var globals = ['USD', 'GBP', 'EUR']
                    if (!globals.contains(req.user.currency)) {
                        var perc = ((profitMap.wProfit + profitMap.resProfit + profitMap.agentProfit) + 100) / 100;
                        console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                        console.log('PEERC', perc)
                        line.rate = (parseFloat(line.rate) * parseFloat(perc))
                    } else {
                        var percentage = profitMap.wProfit + profitMap.resProfit + profitMap.agentProfit;
                        console.log('PERC', percentage)
                        line.rate = (line.rate - ((parseFloat(line.rate) * percentage) / 100))
                        //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                    }
                    if (req.reseller.permitted_apis.contains(data.perfProv)) {
                        resp.products.push(line);
                    }

                    return resp;
                } else {
                    var err = {}
                    err.code = "EDB_FAILURE"
                    err.message = "Could not find provider"
                    err.status = 500;
                    return err;
                }
            } else {
                //w2
                var number = yield NumLookup.lookup(ms);
                var d = number;
                //console.log('W2/D', d);
                temp.proCountry = d.iso;
                if ((d.trl_id !== null) && d.trl_id !== '') {
                    temp.proOperator = d.trl_id
                } else {
                    temp.proOperator = 'ALL';
                }
                if ((req.acl.type !== null) && ( (d.trl_id !== null) && (d.trl_id !== '')  )) {
                    if (req.acl.type == 'restrictive') {
                        //block all
                        var canContinue = false;
                        if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                            //allow it check for block on specific operator
                            canContinue = true;
                            if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id)) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                        //console.log('DEBUG', d.iso.toUpperCase() + ':' + d.trl_id, d.iso.toUpperCase() + ':ALL');
                        if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.block.contains(d.iso.toUpperCase() + ':ALL')) {
                            // console.log('TRRRRRUUEEEE');
                            canContinue = false;
                            if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                                //    console.log ('OH BUMMER')
                                canContinue = true;
                            }
                        }
                    } else {
                        var canContinue = true;
                    }
                } else {
                    var canContinue = true;
                }
                if (!canContinue) {
                    var err = {};
                    err.code = "ENO_ACCESS";
                    err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                    err.status = 403;
                    return err;
                }
                temp.provInfo = d;
                var myOr = [];
                if ((d.trt_id !== '') && (d.trt_id !== null)) {
                    var o = {
                        operator_id: d.trt_id
                    }
                    myOr.push(o);
                }
                if ((d.trl_id !== '') && (d.trl_id !== null)) {
                    var o = {
                        operator_id: d.trl_id
                    }
                    myOr.push(o);
                }
                var prod = yield Baseprod.find({$or: myOr}).sort({price: 1}).exec();
                console.log('W2/PROD', prod);
                if (prod !== null) {
                    var profitMap = yield NumLookup.getProfits(req.user.main_account, temp.proCountry, temp.proOperator);
                    var respObject = {};
                    respObject.opts = {};
                    respObject.opts.msisdn = ms;
                    respObject.opts.country = d.country.trim();
                    respObject.opts.operator = d.operator_name.trim();
                    respObject.opts.hasOpenRange = false;
                    var txcur = "USD";
                    respObject.products = [];
                    for (var i = 0; i < prod.length; i++) {

                        var line = prod[i];
                        var o = {};
                        if (!req.reseller.permitted_apis.contains(line.apid)) {
                            continue;
                        }
                        o.product_id = line.sku;

                        o.topup_currency = line.topup_currency;
                        if (line.price == '-') {
                            //we have openRange
                            respObject.opts.hasOpenRange = true;
                            o.openRange = true;
                            o.openRangeMin = line.min_denomination;
                            o.openRangeMax = line.max_denomination;
                            o.rate = line.fx_rate;
                            var agentProfit = (profitMap.agentProfit + 100) / 100;
                            var resProfit = (profitMap.resProfit + 100) / 100;
                            var wholeProfit = (profitMap.wProfit + 100) / 100;
                            //line.rate =    (parseFloat(line.rate) * parentProfit * resProfit).toFixed(2);
                            o.rate = (o.rate - ((parseFloat(o.rate) * agentProfit) / 100) - ((parseFloat(o.rate) * profitMap.resProfit) / 100) - ((parseFloat(o.rate) * profitMap.wProfit) / 100)).toFixed(2)
                            if (!req.user.currencies.contains(txcur)) {
                                //need CONVERSION
                                var r1 = yield Rate.findOne({source: req.user.currency, destination: txcur}).exec();
                                if (r1 !== null) {
                                    var rate = r1;
                                } else {
                                    var r2 = yield Rate.findOne({destination: req.user.currency, source: txcur}).exec();
                                    if (r2 !== null) {
                                        var rate = r2;
                                        rate.rate = 1 / rate.rate;
                                    } else {
                                        //do usd and back
                                        var r3 = Rate.findOne({destination: req.user.currency, source: 'USD'}).exec();
                                        var r4 = Rate.findOne({destination: txcur, source: 'USD'}).exec();
                                        if ((r3 !== null) && (r4 !== null)) {
                                            var rtmp = (1 / r3.rate) * r4.rate;
                                            var rate = {
                                                source: req.user.currency,
                                                destination: prov.currency,
                                                rate: rtmp
                                            }
                                        } else {
                                            var err = {}
                                            err.code = "INCOMPATIBLE_CURRENCY";
                                            err.message = "We do not support conversion between " + req.user.currency + " and " + prov.currency;
                                            err.status = 500
                                            throw err;
                                        }
                                    }
                                }
                                o.rate = parseFloat(o.rate * rate.rate).toFixed(2);
                                o.currency = req.user.currency;
                            } else {
                                o.currency = txcur;
                            }
                        } else {
                            //fixed
                            o.denomination = line.min_denomination;
                            o.openRange = false;
                            o.price = line.price;
                            var agentProfit = (profitMap.agentProfit + 100) / 100;
                            var resProfit = (profitMap.resProfit + 100) / 100;
                            var wholeProfit = (profitMap.wProfit + 100) / 100;
                            o.price = (parseFloat(o.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                            if (!req.user.currencies.contains(txcur)) {
                                //need CONVERSION
                                var r1 = yield Rate.findOne({source: req.user.currency, destination: txcur}).exec();
                                if (r1 !== null) {
                                    var rate = r1;
                                } else {
                                    var r2 = yield Rate.findOne({destination: req.user.currency, source: txcur}).exec();
                                    if (r2 !== null) {
                                        var rate = r2;
                                        rate.rate = 1 / rate.rate;
                                    } else {
                                        //do usd and back
                                        var r3 = Rate.findOne({destination: req.user.currency, source: 'USD'}).exec();
                                        var r4 = Rate.findOne({destination: txcur, source: 'USD'}).exec();
                                        if ((r3 !== null) && (r4 !== null)) {
                                            var rtmp = (1 / r3.rate) * r4.rate;
                                            var rate = {
                                                source: req.user.currency,
                                                destination: prov.currency,
                                                rate: rtmp
                                            }
                                        } else {
                                            var err = {}
                                            err.code = "INCOMPATIBLE_CURRENCY";
                                            err.message = "We do not support conversion between " + req.user.currency + " and " + prov.currency;
                                            err.status = 500
                                            throw err;
                                        }
                                    }
                                }
                                o.price = parseFloat(o.price * rate.rate).toFixed(2);
                                o.currency = req.user.currency;
                            } else {
                                o.currency = txcur;
                            }
                        }

                        respObject.products.push(o);
                    }
                    return respObject;
                } else {
                    var err = {}
                    err.code = "EDB_FAILURE"
                    err.message = "Could not get operator info"
                    err.status = 500
                    return err;
                }
            }
        }

        co(function *() {
            if (!req.body.numbers) {
                var err = {};
                err.code = 'EMISSING_REQUIRED';
                err.message = 'You have not supplied required fields!';
                err.status = 418;
                reject(err);
            } else {
                if (req.body.numbers.constructor === Array) {
                    var n = req.body.numbers;
                } else {
                    var n = req.body.numbers.split(',');
                }
                if (n.length > 0) {
                    var rep = n.map(processNumber);
                    var re = yield parallel(rep);
                    resolve(re);
                }
            }
        }).catch(function (err) {
            console.log(err);
            res.status(err.status || 500).send(err);
        })

    })
        .then(function (resp) {
            var r = {};
            r.count = resp.length;
            r.response = resp;
            res.json(r);
        })
        .catch(function (err) {
            console.error(err);
            res.status(err.status || 500).send(err);
        })
})
router.post('/topup/exec', function (req, res) {
    return new Promise(function (resolve, reject) {
        if (req.user.account_type !== 'agent') {
            res.sendStatus(403)
            reject();
        } else {
            //okay
            if (req.body.numbers.constructor === Array) {
                var n = req.body.numbers;
                resolve(n);
            } else {
                var n = req.body.numbers.split(',');
                resolve(n);
            }
        }
    })
        .then(function (numbers) {
            console.log('GOT', numbers);
            if (numbers.length > 0) {
                var BJ = new BatchJob();
                BJ.jobs = [];
                BJ.batchid = uuid.v1();
                BJ.account = req.user.main_account;
                BJ.requested_by = req.user._id;
                BJ.time = new Date();
                BJ.state = 'new';

                numbers.forEach(function (f) {
                    if (f.product_id) {
                        var pa = f.product_id.split('-');
                        if (req.reseller.permitted_apis.contains(pa[0])) {
                            if (pa[2] == 'OR') {
                                if (f.denomination && f.msisdn) {
                                    var o = {
                                        msisdn: f.msisdn,
                                        product_id: f.product_id,
                                        denomination: f.denomination,
                                        send_sms: false,
                                        time: new Date(),
                                        state: 'new'
                                    }
                                    BJ.jobs.push(o);
                                }
                            } else {
                                if (f.msisdn) {
                                    var o = {
                                        msisdn: f.msisdn,
                                        product_id: f.product_id,
                                        send_sms: false,
                                        time: new Date(),
                                        denomination: pa[2],
                                        state: 'new'
                                    }
                                    BJ.jobs.push(o);
                                }
                            }
                        }


                    }
                })
                return BJ.save();
            }

        })
        .then(function (job) {
            if (job !== null) {
                res.status(201).send(job);
            }
        })
        .catch(function (err) {
            console.log(err);
            res.status(err.status || 500).send(err)
        })
})
/*
 .then(function (b) {

 var resp = {};
 resp.jobid = b.jobid;
 resp.sku = b.sku;
 resp.numbers = b.numbers;
 resp.denomination = b.denomination;
 res.status(201).send(resp);

 })
 .catch(function (err) {
 winston.log('error', err);
 res.status(err.status || 500).send(err);
 });
 })
 */
router.get('/topup/batch', function (req, res) {
    BatchJob.find({account: req.user.main_account}).sort({time: -1}).limit(100)
        .then(function (j) {
            var r = {}
            r.count = j.length
            r.jobs = j;
            res.json(r)
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/topup/batch/:batchid', function (req, res) {
    BatchJob.findOne({batchid: req.params.batchid})
        .then(function (job) {
            if (job !== null) {
                res.json(job)
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/dashboard', function (req, res) {
    Account.find({type: 'reseller', _id: {$in: req.user.child}}).count()
        .then(function (rc) {
            res.locals.rc = rc;
            return Account.find({_id: {$in: req.user.child}, type: 'agent'}).count().exec();
        })
        .then(function (ac) {
            res.locals.ac = ac;
            return User.find({main_account: {$in: req.user.child}}).count().exec();
        })
        .then(function (uc) {
            var d = {};
            d.resellers = res.locals.rc;
            d.agents = res.locals.ac;
            d.users = uc;
            res.json(d);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/dashboard_agent/:mode', function (req, res) {
    if (req.params.mode == 'weekly') {
        WeeklyStats.findOne({account: req.user.main_account}).sort({time: -1})
            .then(function (st) {
                res.json(st)
            })
            .catch(function (err) {
                winston.log('error', err);
                res.status(err.status || 500).send(err);
            });
    } else if (req.params.mode == 'daily') {
        DailyStats.findOne({account: req.user.main_account}).sort({time: -1})
            .then(function (st) {
                res.json(st)
            })
            .catch(function (err) {
                winston.log('error', err);
                res.status(err.status || 500).send(err);
            });
    } else if (req.params.mode == 'monthly') {
        MonthlyStats.findOne({account: req.user.main_account}).sort({time: -1})
            .then(function (st) {
                res.json(st)
            })
            .catch(function (err) {
                winston.log('error', err);
                res.status(err.status || 500).send(err);
            });
    }
    else if (req.params.mode == 'yearly') {
        YearlyStats.findOne({account: req.user.main_account}).sort({time: -1})
            .then(function (st) {
                res.json(st)
            })
            .catch(function (err) {
                winston.log('error', err);
                res.status(err.status || 500).send(err);
            });
    }

})
router.get('/users', function (req, res) {
    User.find({main_account: {$in: req.user.rwaccess}})
        .then(function (u) {
            var o = {}
            o.count = u.length;
            o.users = u;
            res.json(o);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/rates', function (req, res) {
    Rate.find({}, {source: true, destination: true, rate: true})
        .then(function (r) {
            res.json(r);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/currencies', function (req, res) {
    Currency.find()
        .then(function (c) {
            res.json(c);
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.get('/operators', function (req, res) {
    Operator.find()
        .then(function (dat) {
            var resp = {};
            resp.count = dat.length;
            resp.operators = dat;
            res.json(resp);
        })
        .catch(function (err) {
            res.status = err.status || 500;
            console.log(new Error(err.message));
            res.json(err.status, err);
        });
})
router.get('/countries', function (req, res) {
    CountryHelper.find()
        .then(function (c) {
            res.json(c)
        })
        .catch(function (err) {

            console.log(new Error(err.message));
            res.status(err.status || 500).send(err);
        });
})
router.get('/countries/:country', function (req, res) {
    ProvHelper.find({iso: req.params.country})
        .then(function (c) {
            res.json(c)
        })
        .catch(function (err) {

            console.log(new Error(err.message));
            res.status(err.status || 500).send(err);
        });
})
/* DAAAAAATAAAA */
router.get('/datatopup/info/:msisdn', ApplyAcl, function (req, res) {
    if (req.user.account_type !== 'agent') {
        var err = {}
        err.code = "ENO_ACCESS"
        err.message = "Sorry, you dont have access to this method"
        err.status = 403;
        throw err;
    }
    console.log('ACL', req.acl)
    return new Promise(function (resolve, reject) {
        var ms = req.params.msisdn.replace(/^0+/, '').replace(/ /g, '');
        res.locals.ms = ms;
        var cselect = [];
        if (ms.substring(0, 1) == '1') {
            var comp = ms.substring(0, 4)
            Operator.findOne({country_code: comp}, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    if (data !== null) {
                        resolve(data)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat2) {
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
            Operator.findOne({country_code: comp}, function (err, dat) {
                if (err) {
                    reject(err)
                } else {
                    if (dat !== null) {
                        resolve(dat)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 2)}, function (err, dat2) {
                            if (err) {
                                reject(err)
                            } else {
                                if (dat2 !== null) {
                                    resolve(dat2)
                                } else {
                                    Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat3) {
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
        .then(function (data) {
            // winston.log('info', 'DATA', data)
            res.locals.cinfo = data;
            var minl = parseInt(data.min_length);
            var maxl = parseInt(data.max_length);
            if ((res.locals.ms.length > maxl) || (res.locals.ms.length < minl)) {
                var err = {};
                err.status = 500;
                err.code = "MSISDN_LENGTH_ERROR";
                err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
                res.status(err.status).send(err);
                throw err;
            }
            if (data.hasLocalOper == true) {
                res.locals.workflow = 'w1';
                console.log('we have local operator', data.perfProv)
                //check if provLookup is local
                if (data.localOperatorLookup == true) {
                    winston.log('info', 'Local Lookup', res.locals.ms)
                    var pfx = res.locals.ms.substring(0, parseInt(data.prefixLength));
                    console.log('pfx', pfx)
                    return Prefix.findOne({prefix: pfx}).exec();
                } else {
                    //operator lookup is via LocNumber
                    winston.log('info', 'oper lookup via TRTO')
                    //return s.getMSISDNInfo(res.locals.ms, 'TRTO')
                    return NumLookup.lookup(res.locals.ms);
                }
            } else {
                //workflow 2
                res.locals.workflow = 'w2';
                console.log('w2')
                return NumLookup.lookup(res.locals.ms);
                //return s.getMSISDNInfo(res.locals.ms, 'TRTO')
            }
        })
        .then(function (d) {
            console.log('DD', d);
            switch (res.locals.workflow) {
                case "w1":
                    res.locals.provInfo = d;
                    res.locals.proCountry = d.iso;
                    res.locals.proOperator = d.operatorId
                    if (req.acl.type !== null) {
                        if (req.acl.type == 'restrictive') {
                            //block all
                            var canContinue = false;
                            if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.allow.contains(d.iso + ':ALL')) {
                                //allow it check for block on specific operator
                                canContinue = true;
                                if (req.acl.block.contains(d.iso + ':' + d.operatorId)) {
                                    canContinue = false;
                                }
                            }
                        } else if (req.acl.type == 'permissive') {
                            var canContinue = true;
                            if (req.acl.block.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                                canContinue = false;
                                if (req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')) {
                                    canContinue = true;
                                }
                            }
                        } else {
                            var canContinue = true;
                        }
                    } else {
                        var canContinue = true;
                    }
                    if (!canContinue) {
                        var err = {};
                        err.code = "ENO_ACCESS";
                        err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                        err.status = 403;
                        throw err;
                    }
                    //get balance and limits
                    return Provider.findOne({provider_code: res.locals.cinfo.perfProv}).exec();
                    break;
                case "w2":
                    res.locals.proCountry = d.iso;
                    if ((d.trl_id !== null) && d.trl_id !== '') {
                        res.locals.proOperator = d.trl_id
                    } else {
                        res.locals.proOperator = 'ALL';
                    }
                    if ((req.acl.type !== null) && ( (d.trl_id !== null) && (d.trl_id !== '')  )) {
                        if (req.acl.type == 'restrictive') {
                            //block all
                            var canContinue = false;
                            if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                                //allow it check for block on specific operator
                                canContinue = true;
                                if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id)) {
                                    canContinue = false;
                                }
                            }
                        } else if (req.acl.type == 'permissive') {
                            var canContinue = true;
                            console.log('DEBUG', d.iso.toUpperCase() + ':' + d.trl_id, d.iso.toUpperCase() + ':ALL');
                            if (req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.block.contains(d.iso.toUpperCase() + ':ALL')) {
                                console.log('TRRRRRUUEEEE');
                                canContinue = false;
                                if (req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL')) {
                                    console.log('OH BUMMER')
                                    canContinue = true;
                                }
                            }
                        } else {
                            var canContinue = true;
                        }
                    } else {
                        var canContinue = true;
                    }
                    if (!canContinue) {
                        var err = {};
                        err.code = "ENO_ACCESS";
                        err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                        err.status = 403;
                        throw err;
                    }
                    res.locals.provInfo = d;
                    var myOr = [];
                    if ((d.trt_id !== '') && (d.trt_id !== null)) {
                        var o = {
                            operator_id: d.trt_id
                        }
                        myOr.push(o);
                    }
                    if ((d.trl_id !== '') && (d.trl_id !== null)) {
                        var o = {
                            operator_id: d.trl_id
                        }
                        myOr.push(o);
                    }
                    return Dataprod.find({$or: myOr}).sort({price: 1}).exec();
                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (t1dd) {
            res.locals.t1dd = t1dd;
            console.log('PRRROOOOO', req.user.main_account, res.locals.proCountry, res.locals.proOperator);
            return NumLookup.getProfits(req.user.main_account, res.locals.proCountry, res.locals.proOperator);
        })
        .then(function (pro) {
            res.locals.profitMap = pro;
            console.log('ProfitMap', pro);
            return res.locals.t1dd;
        })
        .then(function (zxabb) {
            res.locals.zxabb = zxabb;
            if (res.locals.workflow == 'w1') {
                return Dataprod.find({acloperid: res.locals.provInfo.operatorId}).exec();
            } else {
                return zxabb;
            }
        })
        .then(function (xyxx) {
            res.locals.dataprods = xyxx;
            console.log('DATAPRODS', xyxx)
            return res.locals.zxabb;
        })
        .then(function (dd) {
            switch (res.locals.workflow) {
                case "w1":
                    var bal = parseFloat(dd.balance);
                    res.locals.doublerate = false;
                    if (!req.user.currencies.contains(res.locals.provInfo.currency)) {
                        return Rate.findOne({
                            source: req.user.currency,
                            destination: res.locals.provInfo.currency
                        }).exec()
                    } else {
                        var o = {};
                        o.rate = 1;
                        o.source = res.locals.provInfo.currency;
                        return o;
                    }
                    /*
                     if (res.locals.provInfo.hasOpenRange == true) {
                     var dpct = parseFloat(bal) * 0.5;
                     var max = bal - dpct;
                     if (max > parseInt(res.locals.provInfo.openRangeMax)) {
                     var m = parseInt(res.locals.provInfo.openRangeMax);
                     } else {
                     var m = parseInt(max)
                     }
                     res.locals.openRangeData = {};
                     res.locals.openRangeData.min = parseInt(res.locals.provInfo.openRangeMin);
                     res.locals.openRangeData.max = parseInt(m);
                     res.locals.openRangeData.step = res.locals.provInfo.step;


                     }
                     */
                    break;
                case "w2":
                    return dd;

                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (za) {
            if (res.locals.workflow == 'w1') {
                if (za !== null) {
                    res.locals.rate_reverse = false;
                    return za;
                } else {
                    res.locals.rate_reverse = true;
                    return Rate.findOne({source: res.locals.provInfo.currency, destination: req.user.currency}).exec();
                }
            } else {
                return za;
            }
        })
        .then(function (zb) {
            if (res.locals.workflow == 'w1') {
                if (zb !== null) {
                    return zb;
                } else {
                    res.locals.rate_reverse = false;
                    res.locals.doublerate = true;
                    return Rate.findOne({destination: req.user.currency, source: 'USD'}).exec();
                }
            } else {
                return zb;
            }
        })
        .then(function (zx) {
            if (res.locals.workflow == 'w1') {
                if (!res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else if (res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else {
                    if (zx !== null) {
                        res.locals.toUSD = zx;
                        return Rate.findOne({source: 'USD', destination: res.locals.provInfo.currency}).exec()
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                }
            } else {
                return zx;
            }
        })
        .then(function (zx) {
            if (res.locals.workflow == 'w1') {
                if (!res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else if (res.locals.rate_reverse && !res.locals.doublerate) {
                    return zx;
                } else {
                    if (zx !== null) {
                        res.locals.fromUSD = zx;
                        return zx;
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                }
            } else {
                return zx;
            }
        })
        .then(function (f) {
            switch (res.locals.workflow) {
                case "w1":
                    if (f == null) {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY",
                            err.status = 500;
                        err.message = "Sorry, Your wallet currency is not compatible with this destination"
                        throw err;
                    }
                    var resp = {};
                    resp.opts = {};
                    resp.products = [];
                    resp.opts.hasOpenRange = false;
                    resp.opts.country = res.locals.cinfo.country;
                    resp.opts.operator = res.locals.provInfo.operatorName;
                    resp.opts.iso = res.locals.cinfo.iso;
                    resp.opts.canOverride = true;
                    resp.opts.msisdn = res.locals.ms;
                    res.locals.txcur = req.user.currency;
                    res.locals.dataprods.map(function (l, i) {
                        var line = {};
                        line.product_id = l.sku;
                        line.openRange = false;
                        line.topup_currency = res.locals.cinfo.currency;
                        line.currency = f.source;
                        line.rate = f.rate;
                        if (res.locals.rate_reverse) {
                            line.rate = (1 / f.rate)
                        } else if (res.locals.doublerate) {
                            line.rate = res.locals.fromUSD.rate;
                            line.rate = line.rate / res.locals.toUSD.rate;
                            line.currency = req.user.currency;
                        }
                        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                        var globals = ['USD', 'GBP', 'EUR']
                        if (!globals.contains(req.user.currency)) {
                            var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                            console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                            console.log('PEERC', perc)
                            line.rate = (parseFloat(line.rate) * parseFloat(perc))
                        } else {
                            var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                            console.log('PERC', percentage)
                            line.rate = (line.rate - ((parseFloat(line.rate) * percentage) / 100))
                            //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                        }
                        if (l.topup_currency == req.user.currency) {
                            line.price = l.topup_price * line.rate;
                        } else {
                            line.price = l.topup_price / line.rate;
                        }

                        line.denomination = l.topup_price;
                        line.data_amount = l.data_amount;
                        if (req.reseller.permitted_apis.contains(res.locals.cinfo.perfProv)) {
                            resp.products.push(line)
                        }
                    })
                    /*
                     var line = {};
                     line.product_id = res.locals.cinfo.perfProv + '-' + res.locals.provInfo.operatorId + '-OR';
                     line.openRange = true;
                     line.openRangeMin = res.locals.openRangeData.min;
                     line.openRangeMax = res.locals.openRangeData.max;
                     line.rate = f.rate;
                     line.step = f.step;
                     line.topup_currency = res.locals.cinfo.currency;
                     line.currency = f.source;
                     if (res.locals.rate_reverse) {
                     line.rate = (1 / f.rate)
                     } else if (res.locals.doublerate) {
                     line.rate = res.locals.fromUSD.rate;
                     line.rate = line.rate / res.locals.toUSD.rate;
                     line.currency = req.user.currency;
                     }
                     var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                     var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                     var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                     var globals = ['USD', 'GBP', 'EUR']
                     if (!globals.contains(req.user.currency)) {
                     var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                     console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                     console.log('PEERC', perc)
                     line.rate =    (parseFloat(line.rate) * parseFloat(perc))
                     } else {
                     var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                     console.log('PERC', percentage)
                     line.rate = (line.rate - ((parseFloat(line.rate) * percentage) / 100))
                     //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                     }



                     */
                    console.log('RESLOCALS', res.locals)
                    return resp;
                    break;
                case "w2":
                    var winList = f;
                    var respObject = {};
                    respObject.opts = {};
                    respObject.opts.msisdn = res.locals.ms;
                    respObject.opts.country = res.locals.provInfo.country.trim();
                    respObject.opts.operator = res.locals.provInfo.operator_name.trim();
                    respObject.opts.iso = res.locals.provInfo.iso;
                    respObject.opts.canOverride = false;
                    respObject.opts.hasOpenRange = false;
                    res.locals.txcur = "USD";
                    respObject.products = [];
                    winList.map(function (line, i) {
                        var o = {};
                        o.product_id = line.sku;

                        o.topup_currency = line.topup_currency;
                        o.currency = line.currency;
                        if (line.price == '-') {
                            //we have openRange
                            respObject.opts.hasOpenRange = true;
                            o.openRange = true;
                            o.openRangeMin = line.min_denomination;
                            o.openRangeMax = line.max_denomination;
                            o.rate = line.fx_rate;
                            o.step = line.step;
                            var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                            var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                            var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                            var locals = ['USD', 'EUR', 'GBP'];
                            if (!locals.contains(o.currency)) {
                                o.rate = (parseFloat(o.rate) * agentProfit * resProfit * wholeProfit)
                            } else {
                                o.rate = (o.rate - ((parseFloat(o.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.wProfit) / 100))
                            }
                            //

                        } else {
                            //fixed
                            o.denomination = line.min_denomination;
                            o.openRange = false;
                            o.price = line.price;
                            var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                            var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                            var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                            o.price = (parseFloat(o.price) * agentProfit * resProfit * wholeProfit)
                        }
                        if (req.reseller.permitted_apis.contains(o.product_id.split('-')[0])) {
                            respObject.products.push(o);
                        }

                    })

                    // console.log('RESP :', respObject)
                    //res.json(respObject);
                    return respObject;
                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        })
        .then(function (r) {
            res.locals.respObject = r;
            if (res.locals.txcur !== req.user.currency) {
                console.log('CONVERSION NEEDED !!!!!!');
                res.locals.haverate = true;
                return Rate.findOne({source: req.user.currency, destination: res.locals.txcur}).exec();
            } else {
                res.locals.haverate = false;
                return r;
            }
        })
        .then(function (r) {
            if (res.locals.haverate) {
                if (r !== null) {
                    res.locals.rate_reverse = false;
                    return r;
                } else {
                    res.locals.rate_reverse = true;
                    return Rate.findOne({destination: req.user.currency, source: res.locals.txcur}).exec();
                }
            } else {
                return r;
            }
        })
        .then(function (rb) {
            if (res.locals.haverate) {
                if (!res.locals.rate_reverse) {
                    return rb;
                } else {
                    if (rb !== null) {
                        res.locals.rate_reverse = true;
                        return rb;
                    } else {
                        var err = {}
                        err.code = "INCOMPATIBLE_CURRENCY";
                        err.message = "Sorry, you cannot use this currency";
                        throw err;
                    }
                }
            } else {
                return rb;
            }
        })
        .then(function (ra) {
            if (res.locals.haverate) {
                console.log('RARA', ra)
                console.log('HAVERATE', res.locals.haverate)
                //we have rate
                //console.log('RESPOBJECT', res.locals.respObject);
                var resp = {}
                resp.opts = res.locals.respObject.opts;
                resp.products = [];
                res.locals.respObject.products.map(function (line) {
                    if (!req.user.currencies.contains(line.currency)) {
                        var l = {};
                        l.product_id = line.product_id;
                        l.currency = req.user.currency;
                        l.openRange = line.openRange;
                        l.topup_currency = line.topup_currency;
                        l.step = line.step;
                        if (line.openRange) {
                            l.openRangeMin = line.openRangeMin;
                            l.openRangeMax = line.openRangeMax;
                            if (!res.locals.rate_reverse) {
                                l.rate = (parseFloat(line.rate) * parseFloat(ra.rate))
                            } else {
                                l.rate = (parseFloat(line.rate) / parseFloat(ra.rate));
                            }

                            if (!res.locals.rate_reverse) {
                                l.currency = ra.source
                            } else {
                                l.currency = ra.destination
                            }
                        } else {
                            l.denomination = line.denomination;
                            if (!res.locals.rate_reverse) {
                                l.price = (parseFloat(line.price) / parseFloat(ra.rate))
                            } else {
                                l.price = (parseFloat(line.price) * parseFloat(ra.rate))
                            }
                            if (!res.locals.rate_reverse) {
                                l.currency = ra.source
                            } else {
                                l.currency = ra.destination
                            }

                        }
                        console.log('LINE', l)
                        resp.products.push(l);
                    } else {
                        console.log('LINE_NO_CHANGE', line)
                        resp.products.push(line);
                    }

                })
                res.json(resp);
            } else {
                res.json(ra);
            }
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });
})
router.post('/datatopup/exec/:msisdn', ApplyAcl, function (req, res) {
    return new Promise(function (resolve, reject) {
        var ms = req.params.msisdn.replace(/^0+/, '');
        res.locals.ms = ms;
        var cselect = [];
        if (ms.substring(0, 1) == '1') {
            var comp = ms.substring(0, 4)
            Operator.findOne({country_code: comp}, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    if (data !== null) {
                        resolve(data)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat2) {
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
            Operator.findOne({country_code: comp}, function (err, dat) {
                if (err) {
                    reject(err)
                } else {
                    if (dat !== null) {
                        resolve(dat)
                    } else {
                        Operator.findOne({country_code: comp.substring(0, 2)}, function (err, dat2) {
                            if (err) {
                                reject(err)
                            } else {
                                if (dat2 !== null) {
                                    resolve(dat2)
                                } else {
                                    Operator.findOne({country_code: comp.substring(0, 1)}, function (err, dat3) {
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
        .then(function (daas) {
            res.locals.daas = daas;
            res.locals.hasReference = false;
            if ('undefined' !== typeof req.body.customer_reference) {
                if (req.body.customer_reference !== '') {
                    res.locals.hasReference = true;
                    return TopupLog.find({
                        account: req.user.main_account,
                        customer_reference: req.body.customer_reference
                    }).count().exec();

                }
            } else {
                return
            }

        })
        .then(function (cmp) {
            if (res.locals.hasReference == true) {
                if (cmp !== 0) {
                    var err = {};
                    err.status = 500;
                    err.code = 'DUPLICATE_TRANSACTION'
                    err.message = 'Please ensure supplied transaction reference is unique!'
                    throw err;
                } else {
                    return res.locals.daas;
                }
            } else {
                return res.locals.daas;
            }

        })
        .then(function (dat) {
            res.locals.cinfo = dat;
            var minl = parseInt(dat.min_length);
            var maxl = parseInt(dat.max_length);
            if ((res.locals.ms.length > maxl) || (res.locals.ms.length < minl)) {
                var err = {};
                err.status = 500;
                err.code = "MSISDN_LENGTH_ERROR";
                err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
                res.status(err.status).send(err);
                throw err;
            }
            if (req.user.account_type !== 'agent') {
                var err = {};
                err.status = 403;
                err.code = "ENO_ACCESS";
                err.message = "Sorry, you cannot perform this action";
                throw err;
            } else {
                //check for fields
                if (!req.body.product_id || !req.body.denomination) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
                }
                if (!req.reseller.permitted_apis.contains(req.body.product_id.split('-')[1])) {
                    var err = {};
                    err.code = 'ENO_ACCESS';
                    err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                    err.status = 403;
                    throw err;
                }
                var ms = req.params.msisdn.replace(/^0+/, '');
                res.locals.txstart = new Date().getTime()
                res.locals.ms = ms;
                var pArr = req.body.product_id.split('-');
                res.locals.pArr = pArr;
                if (pArr[1].length == 4) {
                    //resolve(Provider.findOne({provider_code : String(pArr[0])}).exec() )
                    console.log(hostname, 'BODY-DEBUG', req.body)
                    return Dataprod.findOne({sku: req.body.product_id});
                } else {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    throw err;
                }

            }
        })
        .then(function (d) {
            if (d == null) {
                var err = {};
                err.code = "INVALID_PRODUCT";
                err.message = "The Product ID is not valid"
                err.status = 500;
                throw err;
            }
            var prod = d;
            prod.acloperId = prod.acloperid;
            //checking ACL
            if ((req.acl.type !== null) && (prod.iso !== null)) {
                if (req.acl.type == 'restrictive') {
                    //block all
                    var canContinue = false;
                    if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                        //allow it check for block on specific operator
                        canContinue = true;
                        if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperId)) {
                            canContinue = false;
                        }
                    }
                } else if (req.acl.type == 'permissive') {
                    var canContinue = true;

                    //console.log('DEBUG', prod.iso.toUpperCase() + ':' + prod.acloperId, prod.iso.toUpperCase() + ':ALL');
                    console.log(hostname, 'PROD', prod.acloperId);
                    if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.block.contains(prod.iso.toUpperCase() + ':ALL')) {
                        canContinue = false;
                        if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                            canContinue = true;
                        }
                    }
                } else {
                    var canContinue = true;
                }
            } else {
                var canContinue = true;
            }
            if (!canContinue) {
                var err = {};
                err.code = "ENO_ACCESS";
                err.message = "Sorry, your ACL forbids operations with this Country or Operator"
                err.status = 403;
                throw err;
            }
            res.locals.prod = prod;
            //get profitMap
            console.log('PRRRRRRRROOOOOO', req.user.main_account, prod.iso, prod.acloperId);
            return NumLookup.getProfits(req.user.main_account, prod.iso, prod.acloperId);
        })
        .then(function (prof) {
            res.locals.profitMap = prof;
            console.log(hostname, 'ProfitMap', res.locals.profitMap);

            console.log(hostname, 'PRODDDD', res.locals.prod);
            //now we have profits, lets check if we can use local balance to make tx
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
                    if (localOps.contains(res.locals.pArr[1])) {
                        var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;

                        var price = (parseFloat(req.body.denomination) * parseFloat(perc));
                    } else {
                        var price = parseFloat(req.body.denomination) / myrate;
                    }
                    var bpr = parseFloat(req.body.denomination) / myrate;
                    var fa = {
                        amount: price,
                        currency: res.locals.prod.topup_currency,
                        msisdn: res.locals.ms,
                        topAmt: req.body.denomination,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = {
                        amount: bpr,
                        currency: res.locals.prod.currency
                    }

                } else {
                    var bpr = parseFloat(req.body.denomination) / myrate
                    var fa = {
                        amount: bpr,
                        currency: res.locals.prod.currency,
                        msisdn: res.locals.ms,
                        topAmt: req.body.denomination,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = null;
                }


            } else {
                var myrate = (res.locals.prod.fx_rate - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.wProfit) / 100))
                //its fixed
                //try to make transaction ?
                if (useLocalCurrency) {
                    var localOps = ['MFIN', 'SSLW', 'ETRX']
                    if (localOps.contains(res.locals.pArr[1])) {
                        console.log('YAAAAY', agentProfit, resProfit, wholeProfit)
                        var price = (parseFloat(res.locals.prod.topup_price) * agentProfit * resProfit * wholeProfit);
                    } else {
                        var price = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit);
                    }

                    var bprice = (parseFloat(res.locals.prod.topup_price) * agentProfit * resProfit * wholeProfit);
                    var fa = {
                        amount: Math.round(price),
                        currency: res.locals.prod.topup_currency,
                        msisdn: res.locals.ms,
                        topAmt: res.locals.prod.topup_price,
                        topCur: res.locals.prod.topup_currency
                    }
                    var ba = {
                        amount: bprice,
                        currency: res.locals.prod.currency
                    }

                } else {
                    var bpr = parseFloat(res.locals.prod.topup_price) / myrate
                    var fa = {
                        amount: bpr,
                        currency: res.locals.prod.currency,
                        msisdn: res.locals.ms,
                        topAmt: res.locals.prod.topup_price,
                        topCur: res.locals.prod.topup_currency
                    }


                    var ba = null;
                }

            }
            if (!req.user.test_mode) {
                console.log(hostname, 'PROD', res.locals.prod, 'FA', fa)
                return Finance.charge(req.user.main_account, fa, ba);
            } else {
                var z = {}
                return z;
            }
        })
        .then(function (sd) {
            if (!req.user.test_mode) {
                if (sd._id !== null) {
                    //we have tx
                    res.locals.txOrig = sd;
                    var tl = new TopupLog();
                    tl.product_id = req.body.product_id;
                    tl.account = req.user.main_account;

                    tl.time = new Date();
                    tl.target = res.locals.ms;
                    if (res.locals.pArr[2] == 'OR') {
                        tl.topup_amount = req.body.denomination;
                    } else {
                        tl.topup_amount = res.locals.prod.topup_price;
                    }

                    tl.topup_currency = res.locals.prod.topup_currency;
                    tl.paid_amount = sd.amount;
                    tl.paid_currency = sd.currency;
                    tl.customer_reference = req.body.customer_reference || null;
                    tl.country = res.locals.prod.country;
                    tl.operator_name = res.locals.prod.name;
                    tl.channel = req.user.channel || 'api';
                    tl.type = 'data';
                    tl.app_host = hostname;
                    tl.client_apireqbody = JSON.stringify(req.body);
                    tl.operator_reference = uuid.v1();
                    tl.test = req.user.test_mode;
                    tl.related_transactions = [];
                    tl.related_transactions.push(sd._id);
                    return tl.save();

                } else {
                    var err = {}
                    err.code = "ETX_FAILED";
                    err.message = "Transaction failed, please try again";
                    err.status = 500;
                }
            } else {
                return true;
            }

        })
        .then(function (tt) {
            if (!req.user.test_mode) {
                if (tt._id !== null) {
                    /*
                     o.msisdn = res.locals.ms;
                     o.denomination = req.body.denomination;
                     o.operatorId = res.locals.provInfo.operatorId;
                     o.reference = ss.operator_reference;
                     */
                    res.locals.tl = tt;
                    console.log(hostname, 'TLL', tt);
                    var o = {
                        msisdn: res.locals.ms,
                        reference: tt.operator_reference,
                        operatorId: res.locals.prod.operator_id,
                        denomination: req.body.denomination,
                        reseller_id: req.reseller._id
                    }
                    //Mobifin Etisalat Patch

                    if (process.env.MOCK_MODE == 'false') {
                        //Nigeria MTN to direct API

                        if ((res.locals.pArr[1] == 'MFIN') && (res.locals.pArr[2] == '5')) {
                            o.pref_api = 'NGMT'
                            var apid = 'NGDX'
                        } else if ((res.locals.pArr[1] == 'MFIN') && (res.locals.pArr[2] == '1')) {
                            o.pref_api = 'NGAT'
                            var apid = 'NGDX'
                        } else if ((res.locals.pArr[1] == 'MFIN') && (res.locals.pArr[2] == '2')) {
                            o.pref_api = 'NGET';
                            var apid = 'NGDX'
                        } else if ((res.locals.pArr[1] == 'MFIN') && (res.locals.pArr[2] == '6')) {
                            o.pref_api = 'NGGL'
                            var apid = 'NGDX'
                        } else {
                            var apid = res.locals.pArr[0]
                        }
                        if (res.locals.prod.use_psku == true) {
                            o.psku = res.locals.prod.psku;
                            o.use_psku = true;
                        } else {
                            o.psku = null;
                            o.use_psku = false;
                        }
                        //var apid = res.locals.pArr[0];

                        return s.topup(apid, o);
                    } else {
                        var ttt = {
                            success: true,
                            resp_debug: 'ttest',
                            req_debug: 'ttest',
                            pin_based: false,
                            responseCode: 'RECHARGE_COMPLETE'
                        }
                        return ttt;
                    }

                    /*

                     */
                } else {
                    var err = {}
                    err.code = "ETX_FAILED";
                    err.message = "Transaction failed, please try again";
                    err.status = 500;
                }
            } else {
                return true;
            }

        })
        .then(function (def) {
            if (!req.user.test_mode) {
                res.locals.def = def;
                if (def.success) {
                    //we have completed this shit

                    return Finance.applyCommission(req.user.main_account, res.locals.tl._id, res.locals.profitMap);
                } else {
                    return Finance.refund(res.locals.tl._id);
                }
            } else {
                var o = {};
                o.status = 201;
                o.message = 'Operation Successful (TEST!!), Recharge created, Reference : ' + uuid.v1();
                o.reference = uuid.v1();
                o.code = 'RECHARGE_COMPLETE'
                o.pin_based = false;
                res.status(o.status).send(o) //TEMP
            }
        })
        .then(function (t) {
            console.log(hostname, 'T', t);
            if (!req.user.test_mode) {
                if (t !== null) {
                    return TopupLog.findOne({_id: t._id}).exec();
                } else {
                    var err = {}
                    err.code = "EDB_FAILURE"
                    err.message = "There seems something wrong with TopupLog update process, please contact support (however transaction was finished successfully)"
                    err.status = 500;
                    throw err;
                }
            }
        })
        .then(function (tf) {
            var def = res.locals.def;
            if (tf !== null) {
                var txfin = new Date().getTime();
                tf.success = res.locals.def.success;
                //2.0.3 - Adding PIN info to topuplog
                tf.api_transactionid = res.locals.def.operator_transactionid

                
                tf.response_debug = res.locals.def.resp_debug;
                tf.request_debug = res.locals.def.req_debug;
                tf.completed_in = txfin - res.locals.txstart;
                tf.pin_based = def.pin_based;
                tf.vnd_sim = def.vnd_sim;
                if (def.pin_based) {
                    tf.pin_option1 = def.pin_option1;
                    tf.pin_option2 = def.pin_option2;
                    tf.pin_option3 = def.pin_option3;
                    tf.pin_code = def.pin_code;
                    tf.pin_serial = def.pin_serial;
                    tf.pin_ivr = def.pin_ivr;
                    tf.pin_validity = def.pin_validity;
                    tf.pin_value = def.pin_value;
                }
                var o = {};
                if (res.locals.def.success === true) {
                    tf.code = "RECHARGE_COMPLETE";
                    tf.message = "Operation Successful";
                    if (def.success === true) {
                        o.status = 201;
                        o.message = 'Operation Successful, Recharge created, Reference : ' + tf.operator_reference
                        o.reference = tf.operator_reference
                        o.code = 'RECHARGE_COMPLETE'
                        //porting patch
                        var ngo = {
                            'NGMT': 'MTN',
                            'NGAT': 'Airtel',
                            'NGET': '9mobile',
                            'NGGL': 'Globacom'
                        }
                        if ('undefined' !== typeof def.ported) {
                            if (def.ported == true) {

                                var op = ngo[def.ported_from] + '-> ' + ngo[def.ported_to];
                                console.log('NUMBER IS PORTED', op)
                                tf.operator_name = op;
                            }
                        }
                        o.paid_amount = tf.paid_amount
                        o.paid_currency = tf.paid_currency
                        o.topup_amount = tf.topup_amount
                        o.topup_currency = tf.topup_currency
                        o.target = tf.target
                        o.product_id = tf.product_id
                        o.time = new Date()
                        o.country = tf.country
                        o.operator_name = tf.operator_name
                        o.completed_in = tf.completed_in
                        o.customer_reference = tf.customer_reference

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
                            o.pin_based = false;
                        }

                    }
                } else {
                    res.locals.eo = {};
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
                            break;
                        case "UNSUPPORTED_DENOMINATION":
                            res.locals.eo.status = 429;
                            res.locals.eo.message = "Denomination is not supported";
                            res.locals.eo.code = def.responseCode;
                            break;
                        case "FRAUD_PREVENTION":
                            res.locals.eo.status = 551;
                            res.locals.eo.message = "Operator Side Fraud Prevention activated, please wait 90 seconds or more to try this transaction again"
                            res.locals.eo.code = def.responseCode;
                            break;
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
                    tf.api_transactionid = res.locals.def.operator_transactionid
                    o.status = res.locals.eo.status;
                    o.code = res.locals.eo.code;
                    o.message = res.locals.eo.message;
                    o.reference = null;
                    o.customer_reference = tf.customer_reference;
                }

                tf.client_apiresponse = JSON.stringify(o);
                res.locals.ooo = o;
                return tf.save();

            } else {
                var err = {}
                err.code = "EDB_FAILURE"
                err.message = "There seems something wrong with TopupLog (id does not match) update process, please contact support (however transaction was finished successfully)"
                err.status = 500;
                throw err;
            }
        })
        .then(function (txx) {
            if (!req.user.test_mode) {
                res.locals.tf = txx;
                if ('undefined' !== typeof req.body.send_sms) {
                    if ((req.body.send_sms === true) && (req.body.sms_text !== '')) {
                        //sms.send(sav.sms_sender, res.locals.ms, req.body.sms_text);
                        if (res.locals.def.success === true) {
                            return Finance.chargeAndSendSms(req.user.main_account, res.locals.ms, req.body.sms_text);
                        } else {
                            return txx;
                        }
                    } else {
                        return txx;
                    }
                } else {
                    return txx;
                }
            }

        })
        .then(function (txb) {
            if (!req.user.test_mode) {
                if ('undefined' !== typeof req.body.send_sms) {
                    if ((req.body.send_sms === true) && (req.body.sms_text !== '')) {
                        console.log(hostname, 'TXB', txb);
                        if (res.locals.def.success === true) {
                            return res.locals.tf;
                        } else {
                            return txb;
                        }

                    } else {
                        return txb;
                    }
                } else {
                    return txb;
                }
            }
        })
        .then(function (ta) {
            var def = res.locals.def;
            var o = res.locals.ooo;
            /*
             var o = {};
             if (def.success === true) {
             o.status = 201;
             o.message = 'Operation Successful, Recharge created, Reference : ' + ta.operator_reference
             o.reference = ta.operator_reference
             o.code = 'RECHARGE_COMPLETE'
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
             } else {
             o.status = res.locals.eo.status;
             o.message = res.locals.eo.message;
             o.reference = null;
             o.code = res.locals.eo.code;
             }
             */
            res.status(o.status).send(o)
        })
        .catch(function (err) {
            winston.log('error', err);
            res.status(err.status || 500).send(err);
        });

})
router.get('/billpay', function (req, res) {
    res.json({
        countries: [
            {
                iso: "NG",
                country: "Nigeria"
            }

        ],
        count: 1
    })
})
router.get('/billpay/country/:iso', function (req, res) {
    if (req.params.iso == 'NG') {
        res.json({
            services: [
                {
                    service_name: "Electricity",
                    service_id: "electricity"
                }
            ],
            count: 1
        })
    } else {
        res.sendStatus(404)
    }
})
router.get('/billpay/country/:iso/:service', function (req, res) {
    co(function*() {
        if (req.user.account_type !== 'agent') {
            var err = {}
            err.code = "ENO_ACCESS"
            err.message = "Sorry, you dont have access to this method"
            err.status = 403;
            throw err;
        }
        if (req.params.iso == 'NG') {
            if (req.params.service == 'electricity') {
                var rs = [];
                var r = yield Elprod.find({iso: req.params.iso}).exec();

                for (var i = 0; i < r.length; i++) {
                    var x = r[i]
                    var xa = x.sku.split('-')[2];
                    if (xa == "OR") {
                        var hasOpenRange = true;
                        var o = {
                            product_id: x.sku,
                            openRange: hasOpenRange,
                            min_denomination: x.min_denomination,
                            max_denomination: x.max_denomination,
                            rate: x.fx_rate,
                            currency: x.topup_currency,
                            topup_currency: x.topup_currency,
                            name: x.name,
                            step: x.step
                        }
                        console.log(req.user.main_account, x.iso, x.acloperid)
                        res.locals.profitMap = yield NumLookup.getProfits(req.user.main_account, x.iso, x.acloperid);
                        console.log('PMAP', res.locals.profitMap)
                        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                        o.rate = x.fx_rate;
                        if (req.user.currencies.contains(x.topup_currency)) {
                            var useLocalCurrency = true;
                        } else {
                            var useLocalCurrency = false;
                        }
                        if (useLocalCurrency == true) {
                            o.rate = 1;
                            var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                            var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                            o.rate = (parseFloat(o.rate) * parseFloat(perc))
                            console.log('PERC', percentage)
                            // o.rate = (o.rate - ((parseFloat(o.rate) * percentage) / 100))
                        } else {
                            //convert rate first
                            var rateToUSD = yield Rate.findOne({source: 'USD', destination: req.user.currency}).exec();
                            o.rate = parseFloat(o.rate) / rateToUSD.rate;
                            o.currency = req.user.currency;
                            var globals = ['USD', 'GBP', 'EUR']
                            if (!globals.contains(req.user.currency)) {
                                var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                                console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                                console.log('PEERC', perc)
                                o.rate = (parseFloat(o.rate) * parseFloat(perc))
                            } else {
                                var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                                console.log('PERC', percentage)
                                o.rate = (o.rate - ((parseFloat(o.rate) * percentage) / 100))
                                //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                            }
                        }
                        /*
                         line.topup_currency = res.locals.cinfo.currency;
                         line.currency = f.source;
                         if (res.locals.rate_reverse) {
                         line.rate = (1 / f.rate)
                         } else if (res.locals.doublerate) {
                         line.rate = res.locals.fromUSD.rate;
                         line.rate = line.rate / res.locals.toUSD.rate;
                         line.currency = req.user.currency;
                         }
                         var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                         var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                         var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                         var globals = ['USD', 'GBP', 'EUR']
                         if (!globals.contains(req.user.currency)) {
                         var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;
                         console.log('PROFDEC', wholeProfit, resProfit, agentProfit)
                         console.log('PEERC', perc)
                         line.rate =    (parseFloat(line.rate) * parseFloat(perc))
                         } else {
                         var percentage = res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit;
                         console.log('PERC', percentage)
                         line.rate = (line.rate - ((parseFloat(line.rate) * percentage) / 100))
                         //line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100))
                         }
                         */


                    } else {
                        var hasOpenRange = false;
                        var o = {
                            product_id: x.sku,
                            openRange: hasOpenRange,
                            denomination: x.min_denomination,
                            price: x.price,
                            currency: x.topup_currency,
                            name: x.name
                        }
                    }
                    rs.push(o);

                }


                var re = {};
                re.count = rs.length;
                re.products = rs;
                res.json(re);

            } else {
                res.sendStatus(404);
            }
        } else {
            res.sendStatus(404)
        }
    })
})
router.post('/billpay/electricity/:meter', ApplyAcl, function (req, res) {
    co(function*() {
        res.locals.txstart = new Date().getTime();
        if ('undefined' !== typeof req.body.customer_reference) {
            if (req.body.customer_reference !== '') {
                res.locals.hasReference = true;
                var eref = yield TopupLog.find({
                    account: req.user.main_account,
                    customer_reference: req.body.customer_reference
                }).count().exec();
                if (eref !== null) {
                    var err = {};
                    err.status = 500;
                    err.code = 'DUPLICATE_TRANSACTION'
                    err.message = 'Please ensure supplied transaction reference is unique!'
                    throw err;

                }
            }
        }
        if (!req.body.product_id || !req.body.denomination) {
            var err = {};
            err.code = 'EMISSING_REQUIRED';
            err.message = 'You have not supplied required fields!';
            err.status = 418;
            throw err;
        }
        if (!req.reseller.permitted_apis.contains(req.body.product_id.split('-')[1])) {
            var err = {};
            err.code = 'ENO_ACCESS';
            err.message = "Sorry, your ACL forbids operations with this Country or Operator"
            err.status = 403;
            throw err;
        }
        /*
         {
         product_id : "BPE-NGIK-OR",
         amount : "100",
         isPrepaid : true,
         customer_reference ?
         email : ""
         }
         */
        //we need to have prod at this point!
        var prod = yield Elprod.findOne({sku: req.body.product_id}).exec();
        res.locals.prod = prod;
        console.log('PRODU', prod)
        var canContinue = true;
        //check ACL apply profit
        if ((req.acl.type !== null) && (prod.iso !== null)) {
            if (req.acl.type == 'restrictive') {
                //block all
                var canContinue = false;
                if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperid) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                    //allow it check for block on specific operator
                    canContinue = true;
                    if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperid)) {
                        canContinue = false;
                    }
                }
            } else if (req.acl.type == 'permissive') {
                var canContinue = true;

                //console.log('DEBUG', prod.iso.toUpperCase() + ':' + prod.acloperId, prod.iso.toUpperCase() + ':ALL');
                console.log(hostname, 'PROD', prod.acloperid);
                if (req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperid) || req.acl.block.contains(prod.iso.toUpperCase() + ':ALL')) {
                    canContinue = false;
                    if (req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperid) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL')) {
                        canContinue = true;
                    }
                }
            } else {
                var canContinue = true;
            }
        } else {
            var canContinue = true;
        }
        if (!canContinue) {
            var err = {};
            err.code = "ENO_ACCESS";
            err.message = "Sorry, your ACL forbids operations with this Country or Operator"
            err.status = 403;
            throw err;
        }
        res.locals.profitMap = yield NumLookup.getProfits(req.user.main_account, prod.iso, prod.acloperid);
        console.log('PMAP', res.locals.profitMap)
        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
        console.log('USER', req.user)
        if (req.user.currencies.contains(res.locals.prod.topup_currency)) {
            //we can use local currency
            var excl = ['GBP', 'EUR', 'USD', 'ZAR', 'UGX']
            if (excl.contains(res.locals.prod.topup_currency)) {
                var useLocalCurrency = false;
            } else {
                var useLocalCurrency = true;
            }
        } else {
            var useLocalCurrency = false;
        }
        res.locals.pArr = prod.sku.split('-');
        var myrate = (parseFloat(res.locals.prod.fx_rate) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(res.locals.prod.fx_rate) * res.locals.profitMap.wProfit) / 100))
        //we have open range
        if (useLocalCurrency) {
            //denom + profit
            var localOps = ['NGIK', 'NGEK']
            if (localOps.contains(res.locals.pArr[1])) {
                var perc = ((res.locals.profitMap.wProfit + res.locals.profitMap.resProfit + res.locals.profitMap.agentProfit) + 100) / 100;

                var price = (parseFloat(req.body.denomination) * parseFloat(perc));
            } else {
                var price = parseFloat(req.body.denomination) / myrate;
            }
            var bpr = parseFloat(req.body.denomination) / myrate;
            var fa = {
                amount: price,
                currency: res.locals.prod.topup_currency,
                msisdn: req.params.meter,
                topAmt: req.body.denomination,
                topCur: res.locals.prod.topup_currency
            }
            var ba = {
                amount: bpr,
                currency: res.locals.prod.currency
            }

        } else {
            var bpr = parseFloat(req.body.denomination) / myrate
            var fa = {
                amount: bpr,
                currency: res.locals.prod.currency,
                msisdn: req.params.meter,
                topAmt: req.body.denomination,
                topCur: res.locals.prod.topup_currency
            }
            var ba = null;
        }

        if (!req.user.test_mode) {
            console.log(hostname, 'PROD', res.locals.prod, 'FA', fa)
            var Ch = yield Finance.charge(req.user.main_account, fa, ba);
            console.log('CH', Ch)
            res.locals.txOrig = Ch;
            var tl = new TopupLog();
            tl.product_id = req.body.product_id;
            tl.account = req.user.main_account;

            tl.time = new Date();
            tl.target = req.params.meter;
            tl.topup_amount = req.body.denomination;
            tl.topup_currency = res.locals.prod.topup_currency;
            tl.paid_amount = Ch.amount;
            tl.paid_currency = Ch.currency;
            tl.customer_reference = req.body.customer_reference || null;
            tl.country = res.locals.prod.country;
            tl.operator_name = res.locals.prod.name;
            tl.channel = req.user.channel || 'api';
            tl.type = 'billpay';
            tl.app_host = hostname;
            tl.client_apireqbody = JSON.stringify(req.body);
            tl.operator_reference = uuid.v1();
            tl.test = req.user.test_mode;
            tl.related_transactions = [];
            tl.related_transactions.push(Ch._id);

            var tl1 = yield tl.save();
            console.log('TL1', tl1)

            var o = {
                prepaid: req.body.prepaid,
                meterNumber: req.params.meter,
                amount: req.body.denomination,
                reseller_id: req.reseller._id
            }
            var def = yield s.topup(prod.apid, o);
            console.log('DEF', def);
            res.locals.def = def;
            if (def.success === true) {
                var fap = yield Finance.applyCommission(req.user.main_account, tl1._id, res.locals.profitMap)
                var tf = yield TopupLog.findOne({_id: tl1._id}).exec();
                var txfin = new Date().getTime();
                tf.success = res.locals.def.success;
                //2.0.3 - Adding PIN info to topuplog
                tf.api_transactionid = res.locals.def.operator_transactionid
                tf.response_debug = res.locals.def.resp_debug;
                tf.request_debug = res.locals.def.req_debug;
                tf.completed_in = txfin - res.locals.txstart;
                tf.pin_based = def.pin_based;
                tf.vnd_sim = def.vnd_sim;
                tf.code = "RECHARGE_COMPLETE";
                tf.message = "Operation Successful";
                tf.related_transactions.push(fap._id);
                if (def.pin_based) {
                    tf.pin_option1 = def.cust_message;
                    tf.pin_code = def.pin_code;
                }
                var txz = yield tf.save();
                var z = {};
                z.status = 201;
                z.message = 'Operation Successful, Recharge created, Reference : ' + tf.operator_reference
                z.reference = tf.operator_reference
                z.code = 'RECHARGE_COMPLETE'
                z.paid_amount = tf.paid_amount
                z.paid_currency = tf.paid_currency
                z.topup_amount = tf.topup_amount
                z.topup_currency = tf.topup_currency
                z.target = tf.target
                z.product_id = tf.product_id
                z.time = new Date()
                z.country = tf.country
                z.operator_name = tf.operator_name
                z.completed_in = tf.completed_in
                z.customer_reference = tf.customer_reference
                z.pin_based = tf.pin_based;
                z.pin_code = tf.pin_code;
                z.pin_option1 = tf.pin_option1;
                res.status(z.status).send(z);

            } else {
                //refund etc
                var txfin = new Date().getTime();
                res.locals.eo = {};
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
                        break;
                    case "UNSUPPORTED_DENOMINATION":
                        res.locals.eo.status = 429;
                        res.locals.eo.message = "Denomination is not supported";
                        res.locals.eo.code = def.responseCode;
                        break;
                    case "FRAUD_PREVENTION":
                        res.locals.eo.status = 551;
                        res.locals.eo.message = "Operator Side Fraud Prevention activated, please wait 90 seconds or more to try this transaction again"
                        res.locals.eo.code = def.responseCode;
                        break;
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
                var rfx = yield Finance.refund(tl1._id);
                var tf = yield TopupLog.findOne({_id: tl1._id}).exec();
                console.log('TL11', tl1, 'TFFF', tf)
                tf.success = res.locals.def.success;

                //2.0.3 - Adding PIN info to topuplog
                tf.api_transactionid = res.locals.def.operator_transactionid
                tf.response_debug = res.locals.def.resp_debug;
                tf.request_debug = res.locals.def.req_debug;
                tf.completed_in = txfin - res.locals.txstart;
                tf.pin_based = def.pin_based;
                tf.vnd_sim = def.vnd_sim;
                tf.code = def.responseCode;
                tf.message = res.locals.eo.message;
                tf.related_transactions.push(rfx._id);
                console.log('TFAILF', tf)
                var o = {};
                o.status = res.locals.eo.status;
                o.code = res.locals.eo.code;
                o.message = res.locals.eo.message;
                o.reference = null;
                o.customer_reference = tf.customer_reference;
                tf.client_apiresponse = JSON.stringify(o);
                var txz = yield tf.save();
                res.status(o.status).send(o);

            }
        } else {
            //test Mode
            //todo
        }

        //create initial topuplog


    })
        .catch(function (err) {
            res.status(err.status || 500).send(err);
        })
})
module.exports = router;

