var express = require('express');
var router = express.Router();
var winston = require('winston');
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
var c = require('../modules/checks')
var ApplyAcl = require('../modules/applyacl')
var Finance = require('../modules/finance')
function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
/* GET home page. */
router.get('/version', function(req, res, next) {
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
	console.log('LOC', res.locals);
	res.render('css', res.locals);
})
router.post('/auth', function (req, res) {
    console.log('boom', req.body);
//if (!req.body || !req.body.username) return res.sendStatus(500);
var myAuth = User.findOne({username : req.body.username, reseller_id : req.reseller._id}).exec();
  myAuth.then(
      
    function (user) {
        console.log('US', user)
      if (user == null)
        res.sendStatus(401);
      var hp = authc(req.body.password);
      if (hp === user.password) {
        var expires = moment().add(2, 'days').valueOf();
            //update user last_login field
            console.log('User ID  :', user._id);
                   User.findOneAndUpdate({_id : user._id}, {$set : {last_login : new Date}}).exec();
                    var token = jwt.encode({
                       iss : user._id,
                        exp : expires
                    }, req.app.settings.jwtTokenSecret);
                    var resObject = {
                        token : token,
                        expires : new Date(expires)
                    };
                    //return object
                    res.json(resObject);
      } else {
        res.sendStatus(401);
      }
    }
  )
  .catch(function (err) {
    console.error(err);
  });
});
router.get('/reauth', function (req, res) {
    User.findOne({_id : req.user._id})
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
                       iss : req.user._id,
                        exp : expires
                    }, req.app.settings.jwtTokenSecret);
                    var resObject = {
                        token : token,
                        expires : new Date(expires)
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
            winston.log('info', respObject);
            res.json(respObject);
  
});

router.get('/transactions/:page', function (req, res) {
    var opts = {page : req.params.page, limit : 100, sort : {time : -1}};
    Transaction.paginate({account : req.user.main_account}, opts)
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
                    winston.log('error', err);
                    res.json(err.status, err);
                    });
})
router.get('/me', function (req, res) {
    Account.findOne({_id : req.user.main_account}, {profit_pct : false, reserved_balance : false})
        .then(function (acc) {
            acc.balance = acc.balance.toFixed(2)
            res.json(acc)
        })
        .catch(function (err) {
            winston.log('error', err)
        })
})
router.post('/tickets', function (req, res) {
    Account.findOne({_id : req.user.main_account})
        .then(function (acc) {
            if ((acc.type == 'reseller') || (acc.type == 'wholesaler')) {
                var tick = new Ticket();
                tick.ticket_id = randomIntFromInterval(100000000, 999999999);
                tick.source = req.body.ticket_source;
                tick.author = req.body.author;
                tick.priority = req.body.priority;
                tick.status = 'new';
                tick.account = req.body.account;
                tick.created = new Date();
                tick.updated = new Date();
                if (req.body.message && req.body.message !== '') {
                    tick.msgcount = 1;
                } else {
                    tick.msgcount = 0;
                }
                tick.subject = req.body.subject;
                tick.support_account = acc._id;
                var rec1 = {
                    time : new Date(),
                    operation : 'creation',
                    author : req.user._id
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
                if (req.body.message && req.body.message !== '') {
                    tick.msgcount = 1;
                } else {
                    tick.msgcount = 0;
                }
                tick.subject = req.body.subject;
                tick.support_account = acc.parent;
                var rec1 = {
                    time : new Date(),
                    operation : 'creation',
                    author : req.user._id
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
                       re.messages.push(tmsg);
                       res.status(200).send(re);
                    }
                })
            } else {
                var re = {};
                       var re = ticket;
                       re.messages = [];
                       res.status(200).send(re);
            }
                     var text = 'Dear customer,\n' +
            '\n' +
            'Thank you for contacting us! This is an automated message to let you know we\'ve received your support request. Feel confident that a member of our team will respond to you as soon as possible. To provide us with more details and updates, please include the ticket ID in the subject\n'+ 'line. Support tickets are handled in the order in which they are received, with the exception of issues impacting service, which are escalated. Issues affecting service must be stated clearly in the Subject line in order to be fixed promptly. To get a faster response, please do not\n'+ 'send the same e-mail twice or to any of our other support email addresses.\n'+
            'Ticket details:\n'+
            '\n'+
            'Ticket ID: [tt #' + res.locals.ticket.ticket_id + ']\n'+
            'Subject: ' + res.locals.ticket.subject + '\n' +
            'Status: open\n' +
            '\n' + 
            'Kind regards,\n'+
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

            var transp = nodemailer.createTransport(sendMailTR({path : '/usr/sbin/sendmail'}));
            var mailOpts = {
                from : '"Support Team" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                to : req.user.username,
                subject : '[tt #' + res.locals.ticket.ticket_id + '] AutoReply: ' + res.locals.ticket.subject,
                text : text
            }
            User.find({main_account : req.reseller._id}, function (err, ub) {
                if (err) {
                    throw err;
                } else {
                    var to = [];
                    ub.map(function (u) {
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
                    var cc = 'info@primeairtime.com';
                    var mailOpts2 = {
                        from : '"PrimeAirtime Platform" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                        to : to,
                        subject : 'New ticket received : [tt #' + res.locals.ticket.ticket_id + '] ' + res.locals.ticket.subject,
                        cc : cc,
                        text : text2
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
        })
        .catch(function (err) {
                    winston.log('error', err);
                    res.status(err.status || 500).send(err);
                    });
})
router.get('/tickets/page/:page', function (req, res) {
    Account.findOne({_id : req.user.main_account})
        .then(function (acc) {
            if (acc.type == 'reseller') {
                var opts = {page : req.params.page, limit : 100, sort : {time : -1}};
                return Ticket.paginate({support_account : acc._id}, opts);
            } else if (acc.type == 'agent') {
                var opts = {page : req.params.page, limit : 100, sort : {time : -1}};
                return Ticket.paginate({account : acc._id, support_account : acc.parent}, opts);
            } else if (acc.type == 'wholesaler') {
                var opts = {page : req.params.page, limit : 100, sort : {time : -1}};
                return Ticket.paginate({support_account : {$in : req.user.child}}, opts);
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
router.get('/tickets/:id', function (req, res) {
    Account.findOne({_id : req.user.main_account})
        .then(function (acc) { 
            console.log('ACC', acc)
            if (acc.type == 'reseller') {
                return Ticket.findOne({_id : req.params.id, support_account : req.user.main_account}).exec();
            } else if (acc.type == 'agent') {
                return Ticket.findOne({_id : req.params.id, account : req.user.main_account}).exec();
            } else if (acc.type == 'wholesaler') {
                return Ticket.findOne({_id : req.params.id, support_account : {$in : req.user.child}}).exec();
            }
        })
        .then(function (t) {
            console.log('T', t)
            if (t !== null) {
                res.locals.ticket = t;
                return TicketMsg.find({ticket : t._id}).exec();
            } else {
                var err = {};
                err.status = 404;
                err.code = "TICKET_NOT_FOUND";
                err.message = "Sorry, we cannot find ticket with this ID";
                throw err;
            }
        })
        .then(function (tm) {
            console.log('TR', res.locals.ticket)
            console.log('TM', tm)
            var resp = {};
            resp.data = res.locals.ticket;
            resp.messages = tm;
            winston.log('info', resp);
            res.json(resp);
        })
})
router.put('/tickets/:id', function (req, res) {
    Account.findOne({_id : req.user.main_account})
        .then(function (acc) {
            if (acc.type == 'reseller') {
                res.locals.mode = 'res';
                return Ticket.findOne({_id : req.params.id, support_account : req.user.main_account}).exec();
            } else if (acc.type == 'agent') {
                res.locals.mode = 'us';
                return Ticket.findOne({_id : req.params.id, account : req.user.main_account}).exec();
            } else if (acc.type == 'wholesaler') {
                res.locals.mode = 'res';
                return Ticket.findOne({_id : req.params.id, support_account : {$in : req.user.child}}).exec();
            }
        })
        .then(function (ticket) {
		var transp = nodemailer.createTransport(sendMailTR({path : '/usr/sbin/sendmail'}));	
		res.locals.ticket = ticket;
            if (res.locals.mode == 'res') {
                 for (var key in req.body) {
                    if ((key == 'message') || (key == 'created') || (key == 'account') || (key == 'msgcount'))
                        continue;
                    ticket[key] = req.body[key];
                }
                if (req.body.message) {
                    var tm = new TicketMsg();
                    tm.ticket = ticket._id;
                    tm.source = 'web';
                    tm.author = req.user._id;
                    tm.message = req.body.message;
                    tm.created = new Date();
                    tm.author_type = 'agent';
                    ticket.msgcount++;
                    tm.save();
			var text = 'Dear customer,\n' +
            '\n' +
        	'A response has been received to your request: \n' +    
	'Ticket details:\n'+
            '\n'+
            'Ticket ID: [tt #' + res.locals.ticket.ticket_id + ']\n'+
            'Subject: ' + res.locals.ticket.subject + '\n' +
            'Status: open\n' +
            '\n' +
		req.body.message + '\n' +
		'\n' +
            'Kind regards,\n'+
             req.reseller.account_name + ' Support Team\n';
			User.find({main_account : res.locals.ticket.account}, function (err, ra) {
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
			var mailOpts = {
                from : '"Support Team" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                to : to,
                subject : '[tt #' + res.locals.ticket.ticket_id + '] An update received to your ticket ',
                text : text
            }
			transp.sendMail(mailOpts, function (err, inf) {
                        if (err) {
                            winston.log('error', err);
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
                    tm.message = req.body.message;
                    tm.created = new Date();
                    tm.author_type = 'requester';
                    ticket.msgcount++;
                    tm.save();
			var text2 = 'Dear Supporter,\n' +
            '\n' +
            'An update has been received to a ticket #' + res.locals.ticket.ticket_id + '.\n' + 
            'Subject :' + res.locals.ticket.subject + '\n' + 
            'Text :' + req.body.message +
            '\n\n\n' + 
            'To view or respond to ticket, please login to the support UI at https://' + req.reseller.whitelabel_opts.portal_url + '\n' +
            '\n' + 
            'Kind Regards,\n' + 
            'Automated Platform Management';
                        User.find({main_account : res.locals.ticket.support_account}, function (err, ra) {
                                if (err) {
                                        throw err;
                                } else {
				var to = [];
                
			ra.forEach(function (uuz) {
				to.push(uuz.username);
			})          
			var cc = 'info@primeairtime.com';
                    var mailOpts2 = {
                        from : '"PrimeAirtime Platform" <support@' + req.reseller.whitelabel_opts.portal_url + '>',
                        to : to,
                        subject : 'An update received to ticket : [tt #' + res.locals.ticket.ticket_id + '] ' + res.locals.ticket.subject,
                        cc : cc,
                        text : text2
                    }
			console.log('OP2', mailOpts2);
			transp.sendMail(mailOpts2, function (err, inf) {
                        if (err) {
                           winston.log('error', err);
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
                    winston.log('error', err);
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
        Account.findOne({_id : req.user.main_account})
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
        var ms = req.params.msisdn.replace(/^0+/, '');
        res.locals.ms = ms;
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
.then(function (data) {
       // winston.log('info', 'DATA', data)
        res.locals.cinfo = data;
        var minl = parseInt(data.min_length);
        var maxl = parseInt(data.max_length);
        if ( (res.locals.ms.length > maxl) || (res.locals.ms.length < minl) ) {
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
                return Prefix.findOne({prefix : pfx}).exec();
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
                        if ( req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.allow.contains(d.iso + ':ALL') ) {
                            //allow it check for block on specific operator 
                            canContinue = true;
                            if ( req.acl.block.contains(d.iso + ':' + d.operatorId) ) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                        if ( req.acl.block.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')  ) {
                            canContinue = false;
                            if (  req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL') ) {
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
                return Provider.findOne({provider_code : res.locals.cinfo.perfProv}).exec();
            break;
            case "w2":
                    res.locals.proCountry = d.iso;
                    if ((d.trl_id !== null) && d.trl_id !== '') {
                        res.locals.proOperator = d.trl_id
                    } else {
                        res.locals.proOperator = 'ALL';
                    }
                    if ((req.acl.type !== null) && ( (d.trl_id !== null) && (d.trl_id !== '')  ) ) {
                    if (req.acl.type == 'restrictive') {
                        //block all 
                        var canContinue = false;
                        if ( req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL') ) {
                            //allow it check for block on specific operator 
                            canContinue = true;
                            if ( req.acl.block.contains(d.iso.toUpperCase()+ ':' + d.trl_id) ) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                        console.log('DEBUG', d.iso.toUpperCase() + ':' + d.trl_id, d.iso.toUpperCase() + ':ALL');
                        if ( req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.block.contains(d.iso.toUpperCase() + ':ALL')  ) {
                            console.log('TRRRRRUUEEEE');
                            canContinue = false;
                            if (  req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL') ) {
                                console.log ('OH BUMMER')
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
                if ( (d.trt_id !== '') && (d.trt_id !== null) ) {
                    var o = {
                        operator_id : d.trt_id
                    }
                    myOr.push(o);
                }
                if ( (d.trl_id !== '') && (d.trl_id !== null) ) {
                    var o = {
                        operator_id : d.trl_id
                    }
                    myOr.push(o);
                }
                return Baseprod.find({$or : myOr}).sort({price : 1}).exec();
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
            res.locals.doublerate = false;
            if (!req.user.currencies.contains(res.locals.provInfo.currency)) {
                return Rate.findOne({source : req.user.currency, destination : res.locals.provInfo.currency}).exec()
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
                return Rate.findOne({source : res.locals.provInfo.currency, destination : req.user.currency}).exec();
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
                return Rate.findOne({destination : req.user.currency, source : 'USD'}).exec();
            }
        }   else {
            return zb;
        }
    })
    .then(function (zx) {
        if (res.locals.workflow == 'w1') {
            if (!res.locals.rate_reverse && !res.locals.doublerate ) {
                return zx;
            } else if (res.locals.rate_reverse && !res.locals.doublerate) {
                return zx;
            } else {
                if (zx !== null) {
                    res.locals.toUSD = zx;
                    return Rate.findOne({source : 'USD', destination : res.locals.provInfo.currency}).exec()
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
            if (!res.locals.rate_reverse && !res.locals.doublerate ) {
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
            resp.opts.msisdn = res.locals.ms;
            res.locals.txcur = req.user.currency;
            var line = {};
            line.product_id = res.locals.cinfo.perfProv + '-' + res.locals.provInfo.operatorId + '-OR';
            line.openRange = true;
            line.openRangeMin = res.locals.openRangeData.min;
            line.openRangeMax = res.locals.openRangeData.max;
            line.rate = f.rate;
            line.topup_currency = res.locals.cinfo.currency;
            line.currency = f.source;
            if (res.locals.rate_reverse) {
                line.rate = (1 / f.rate)
            } else if (res.locals.doublerate) {
                line.rate = res.locals.fromUSD.rate;
                line.rate = line.rate * res.locals.toUSD.rate;
                line.currency = req.user.currency;
            }
                        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                        //line.rate =    (parseFloat(line.rate) * parentProfit * resProfit).toFixed(2);
                        line.rate = (line.rate - ((parseFloat(line.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(line.rate) * res.locals.profitMap.wProfit) / 100)).toFixed(2)
                    
                    resp.products.push(line)
                    return resp;
            break;
            case "w2":
            var winList = f;
            var respObject = {};
                respObject.opts = {};
                respObject.opts.msisdn = res.locals.ms;
                respObject.opts.country = res.locals.provInfo.country.trim();
                respObject.opts.operator = res.locals.provInfo.operator_name.trim();
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
                        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                        //line.rate =    (parseFloat(line.rate) * parentProfit * resProfit).toFixed(2);
                        o.rate = (o.rate - ((parseFloat(o.rate) * res.locals.profitMap.agentProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.resProfit) / 100) - ((parseFloat(o.rate) * res.locals.profitMap.wProfit) / 100)).toFixed(2)
                    } else {
                        //fixed
                        o.denomination = line.min_denomination;
                        o.openRange = false;
                        o.price = line.price;
                        var agentProfit = (res.locals.profitMap.agentProfit + 100) / 100;
                        var resProfit = (res.locals.profitMap.resProfit + 100) / 100;
                        var wholeProfit = (res.locals.profitMap.wProfit + 100) / 100;
                        o.price =    (parseFloat(o.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                    }

                    respObject.products.push(o);
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
            return Rate.findOne({source : req.user.currency, destination : res.locals.txcur}).exec();
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
                return Rate.findOne({destination : req.user.currency, source : res.locals.txcur}).exec();
            }
        } else {
            return r;
        }
    })
    .then(function (rb) {
        if (res.locals.haverate) {
            if (!res.locals.rate_reverse) {
                return r;
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
            //we have rate 
            //console.log('RESPOBJECT', res.locals.respObject);
            var resp = {}
            resp.opts = res.locals.respObject.opts;
            resp.products = [];
            res.locals.respObject.products.map(function (line) {
                if (!req.user.currencies.contains(line.topup_currency)) {
                    var l = {};
                l.product_id = line.product_id;
                l.currency = req.user.currency;
                l.openRange = line.openRange;
                l.topup_currency = line.topup_currency;
                if (line.openRange) {
                    l.openRangeMin = line.openRangeMin;
                    l.openRangeMax = line.openRangeMax;
                    if (!res.locals.rate_reverse) {
                        l.rate = (parseFloat(line.rate) * parseFloat(ra.rate)).toFixed(2);
                    } else {
                        l.rate = (parseFloat(line.rate) / parseFloat(ra.rate)).toFixed(2);
                    }
                    
                    if (!res.locals.rate_reverse) {
                        l.currency = ra.source
                    } else {
                        l.currency = ra.destination
                    }
                } else {
                    l.denomination = line.denomination;
                    if (!res.locals.rate_reverse) {
                        l.price = (parseFloat(line.price) / parseFloat(ra.rate)).toFixed(2);
                    } else {
                        l.price = (parseFloat(line.price) * parseFloat(ra.rate)).toFixed(2);
                    }
                    if (!res.locals.rate_reverse) {
                        l.currency = ra.source
                    } else {
                        l.currency = ra.destination
                    }
                    
                }
                resp.products.push(l);
            } else {
                
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
       if (req.user.account_type !== 'agent') {
        var err = {};
        err.status = 403;
        err.code = "ENO_ACCESS";
        err.message = "Sorry, you cannot perform this action";
        reject(err);
    } else {
        //check for fields
            if (!req.body.product_id || !req.body.denomination) {
                    var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    reject(err);
            }
            var ms = req.params.msisdn.replace(/^0+/, '');
            res.locals.txstart = new Date().getTime()
            res.locals.ms = ms;
           var pArr = req.body.product_id.split('-');
           res.locals.pArr = pArr;
           if (pArr[0].length == 4) {
                //resolve(Provider.findOne({provider_code : String(pArr[0])}).exec() )
                resolve(Baseprod.findOne({sku : req.body.product_id}));
           } else {
               var err = {};
                    err.code = 'EMISSING_REQUIRED';
                    err.message = 'You have not supplied required fields!';
                    err.status = 418;
                    reject(err);
           }
           
    } 
})
.then(function (d) {
   if (d == null) {
       console.log('D IS NULLL');
       var err = {};
       err.code ="INVALID_PRODUCT";
       err.message = "The Product ID is not valid"
       err.status = 500;
       throw err;
   }
   var prod = d;
    //checking ACL
            if ((req.acl.type !== null) && (prod.iso !== null) ) {
                    if (req.acl.type == 'restrictive') {
                        //block all 
                        var canContinue = false;
                        if ( req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL') ) {
                            //allow it check for block on specific operator 
                            canContinue = true;
                            if ( req.acl.block.contains(prod.iso.toUpperCase()+ ':' + prod.acloperId) ) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;

                        //console.log('DEBUG', prod.iso.toUpperCase() + ':' + prod.acloperId, prod.iso.toUpperCase() + ':ALL');
                        console.log('PROD', prod.acloperId);
                        if ( req.acl.block.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.block.contains(prod.iso.toUpperCase() + ':ALL')  ) {
                            console.log('TRRRRRUUEEEE');
                            canContinue = false;
                            if (  req.acl.allow.contains(prod.iso.toUpperCase() + ':' + prod.acloperId) || req.acl.allow.contains(prod.iso.toUpperCase() + ':ALL') ) {
                                console.log ('OH BUMMER')
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
    console.log('ProfitMap', res.locals.profitMap);
    console.log('PROD', res.locals.prod);
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
        
        //we have open range
        if (useLocalCurrency) {
            //denom + profit 
                        
                        var price = (parseFloat(req.body.denomination) * agentProfit * resProfit * wholeProfit).toFixed(2);
                        var bpr = parseFloat(req.body.denomination) / res.locals.prod.fx_rate;
                        var bprr = (parseFloat(bpr) * agentProfit * resProfit * wholeProfit).toFixed(2);
                        var fa = {
                            amount : price,
                            currency : res.locals.prod.topup_currency,
                            msisdn : res.locals.ms,
                            topAmt : req.body.denomination,
                            topCur : res.locals.prod.topup_currency
                        }
                        var ba = {
                            amount : bprr,
                            currency : res.locals.prod.currency
                        }

        } else {
            var bpr = parseFloat(req.body.denomination) / res.locals.prod.fx_rate;
                        var bprr = (parseFloat(bpr) * agentProfit * resProfit * wholeProfit).toFixed(2);
                        var fa = {
                            amount : bprr,
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
            var price = (parseFloat(res.locals.prod.min_denomination) * agentProfit * resProfit * wholeProfit).toFixed(2);
            var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
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
        var bprice = (parseFloat(res.locals.prod.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
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
            return Finance.charge(req.user.main_account, fa, ba);
        } else {
            var z = {

            }
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
                                            tl.country = res.locals.prod.country;
                                            tl.operator_name = res.locals.prod.name;
                                            tl.channel = req.user.channel || 'api';
                                            tl.type = 'topup';
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
            console.log('TLL', tt);
            var o = {
                msisdn : res.locals.ms,
                reference : tt.operator_reference,
                operatorId : res.locals.prod.operator_id,
                denomination : parseInt(req.body.denomination)
            }
            return s.topup(res.locals.pArr[0], o);
           var ttt = {
               success : true,
               resp_debug : 'ttest',
               req_debug : 'ttest',
               pin_based : false,
               responseCode : 'MSISDN_BARRED'
           }
           //return ttt;
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
    console.log('T', t);
    if (!req.user.test_mode) {
        if (t !== null) {
                return TopupLog.findOne({_id : t._id}).exec();
        } else {
            var err= {}
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

        tf.response_debug = res.locals.def.resp_debug;
        tf.request_debug = res.locals.def.req_debug;
        tf.completed_in = txfin - res.locals.txstart;
        var o = {};
        if (res.locals.def.success === true) {
                    tf.code = "RECHARGE_COMPLETE";
                    tf.message = "Operation Successful";
                       if (def.success === true) {
                                                        o.status = 201;
                                                        o.message = 'Operation Successful, Recharge created, Reference : ' + tf.operator_reference
                                                        o.reference = tf.operator_reference
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
                                                case "UNSUPPORTED_DENOMINATION":
                        res.locals.eo.status = 429;
                        res.locals.eo.message = "Denomination is not supported";
                        res.locals.eo.code = def.responseCode;
                        case "OPERATOR_FAILURE":
                        res.locals.eo.status = 503;
                        res.locals.eo.message = 'Operator Error';
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
        }

        tf.client_apiresponse = JSON.stringify(o);
        return tf.save();

    } else {
         var err= {}
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
        if ((req.body.send_sms === true) && (req.body.sms_text !== '') ) {
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
                console.log('TXB', txb);
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
                                                        
                                                        res.status(o.status).send(o)
})
.catch(function (err) {
                    winston.log('error', err);
                    res.status(err.status || 500).send(err);
                    });
    
})
router.get('/topup/log/page/:page', function (req, res) {
    var opts = {page : req.params.page, limit : 100, sort : {time : -1}, select : {response_debug : false, request_debug : false}};
    if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
        var ob = { account : {$in : req.user.child}}
    } else if (req.user.account_type == 'agent') {
        var ob = { account : req.user.main_account }
    }
    TopupLog.paginate(ob, opts)
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
router.get('/topup/log/item/:id', function (req, res) {
    if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
        var ob = { account : {$in : req.user.child}, _id : req.params.id}
    } else if (req.user.account_type == 'agent') {
        var ob = { account : req.user.main_account, _id : req.params.id }
    }
    TopupLog.findOne(ob, {response_debug : false})
        .then(function (r) {
            res.json(r);
        })
})
router.get('/topup/log/topuplog.csv', function (req, res) {
     if ((req.user.account_type == 'reseller') || (req.user.account_type == 'wholesaler')) {
        var ob = { account : {$in : req.user.child}}
    } else if (req.user.account_type == 'agent') {
        var ob = { account : req.user.main_account }
    }
        var str = TopupLog.find(ob).sort({time : -1}).batchSize(10000).cursor();
                res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename=topuplog.csv'
            });
            var st = "Time,Account ID,Type,Product ID,Successful,Target,Topup Amount,Topup Currency, Paid Amount, Paid Currency, Operator Reference, Country, Operator Name, Response Code, Response Message\n";
            res.write(st);
                str.on("data", function (d) {
                   var str = d.time + ',' + d.account + ',' + d.type + ',' + d.product_id + ',' + d.success + ',' + d.target + ',' + d.topup_amount + ',' + d.topup_currency + ',' + d.paid_amount + ',' + d.paid_currency + ',' + d.operator_reference + ',' + d.country + ',' + d.operator_name + ',' + d.code + ',' + d.message + '\n';
                   res.write(str);
               })
               str.on("end", function () {
                   res.end();
               })
})
router.post('/topup/info', ApplyAcl, function (req, res) {
    return new Promise(function (resolve,reject) {

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
        function *processNumber(msisdn) {
                var ms = msisdn.replace(/^0+/, '');
                var tmp = {}
                var temp = {}
                var data = yield initProcess(ms);
               // console.log('DATA', data);
                 var minl = parseInt(data.min_length);
        var maxl = parseInt(data.max_length);
        if ( (ms.length > maxl) || (ms.length < minl) ) {
            var err = {};
            err.status = 500;
            err.code = "MSISDN_LENGTH_ERROR";
            err.message = "Your MSISDN has wrong length, it should be between " + minl + " and " + maxl + " digits.";
            return err;
        }
        if (data.hasLocalOper === true) {
            //w1 
            var px = ms.substring(0, parseInt(data.prefixLength));
            var pfx = yield Prefix.findOne({prefix : px}).exec();
          //  console.log('PFX', pfx)
            var d = pfx;
                    if (req.acl.type !== null) {
                    if (req.acl.type == 'restrictive') {
                        //block all 
                        var canContinue = false;
                        if ( req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.allow.contains(d.iso + ':ALL') ) {
                            //allow it check for block on specific operator 
                            canContinue = true;
                            if ( req.acl.block.contains(d.iso + ':' + d.operatorId) ) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                        if ( req.acl.block.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL')  ) {
                            canContinue = false;
                            if (  req.acl.allow.contains(d.iso + ':' + d.operatorId) || req.acl.block.contains(d.iso + ':ALL') ) {
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
                var prov = yield Provider.findOne({provider_code : data.perfProv}).exec();
                if (prov !== null) {
                    temp.openRangeData = {};
                    temp.openRangeData.min = d.openRangeMin;
                    temp.openRangeData.max = d.openRangeMax;
                    if (!req.user.currencies.contains(prov.currency)) {
                        var r1 = yield Rate.findOne({source : req.user.currency, destination : prov.currency}).exec();
                        if (r1 !== null) {
                            var rate = r1;
                        } else {
                            var r2 = yield Rate.findOne({destination : req.user.currency, source : prov.currency}).exec();
                            if (r2 !== null ) {
                                var rate = r2;
                                rate.rate = 1 / rate.rate;
                            } else {
                                //do usd and back
                                var r3 = yield Rate.findOne({destination : req.user.currency, source : 'USD'}).exec();
                                var r4 = yield Rate.findOne({destination : prov.currency, source : 'USD'}).exec();
                                if ((r3 !== null) && (r4 !== null)) {
                                    var rtmp = parseFloat(r3.rate * r4.rate);
                                    var rate = {
                                        source : req.user.currency,
                                        destination : prov.currency,
                                        rate : rtmp
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
                            rate : 1,
                            source : prov.currency
                        }
                    }
                    if (rate == null) {
                        console.log('We cannot convert to ' + prov.currency)
                    }
                    var profitMap = yield NumLookup.getProfits(req.user.main_account, d.iso, d.operatorId);
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
                        line.rate = (line.rate - ((parseFloat(line.rate) * profitMap.agentProfit) / 100) - ((parseFloat(line.rate) * profitMap.resProfit) / 100) - ((parseFloat(line.rate) * profitMap.wProfit) / 100)).toFixed(2)
                    
                    resp.products.push(line);
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
                    if ((req.acl.type !== null) && ( (d.trl_id !== null) && (d.trl_id !== '')  ) ) {
                    if (req.acl.type == 'restrictive') {
                        //block all 
                        var canContinue = false;
                        if ( req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL') ) {
                            //allow it check for block on specific operator 
                            canContinue = true;
                            if ( req.acl.block.contains(d.iso.toUpperCase()+ ':' + d.trl_id) ) {
                                canContinue = false;
                            }
                        }
                    } else if (req.acl.type == 'permissive') {
                        var canContinue = true;
                       //console.log('DEBUG', d.iso.toUpperCase() + ':' + d.trl_id, d.iso.toUpperCase() + ':ALL');
                        if ( req.acl.block.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.block.contains(d.iso.toUpperCase() + ':ALL')  ) {
                           // console.log('TRRRRRUUEEEE');
                            canContinue = false;
                            if (  req.acl.allow.contains(d.iso.toUpperCase() + ':' + d.trl_id) || req.acl.allow.contains(d.iso.toUpperCase() + ':ALL') ) {
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
                if ( (d.trt_id !== '') && (d.trt_id !== null) ) {
                    var o = {
                        operator_id : d.trt_id
                    }
                    myOr.push(o);
                }
                if ( (d.trl_id !== '') && (d.trl_id !== null) ) {
                    var o = {
                        operator_id : d.trl_id
                    }
                    myOr.push(o);
                }
                var prod = yield Baseprod.find({$or : myOr}).sort({price : 1}).exec();
                //console.log('W2/PROD', prod);
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
                for (var i=0; i < prod.length; i++) {
                    var line = prod[i];
                    var o = {};
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
                                    var r1 = yield Rate.findOne({source : req.user.currency, destination : txcur}).exec();
                        if (r1 !== null) {
                            var rate = r1;
                        } else {
                            var r2 = yield Rate.findOne({destination : req.user.currency, source : txcur}).exec();
                            if (r2 !== null ) {
                                var rate = r2;
                                rate.rate = 1 / rate.rate;
                            } else {
                                //do usd and back
                                var r3 = Rate.findOne({destination : req.user.currency, source : 'USD'}).exec();
                                var r4 = Rate.findOne({destination : txcur, source : 'USD'}).exec();
                                if ((r3 !== null) && (r4 !== null)) {
                                    var rtmp = (1 / r3.rate) * r4.rate;
                                    var rate = {
                                        source : req.user.currency,
                                        destination : prov.currency,
                                        rate : rtmp
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
                        o.price =    (parseFloat(o.price) * agentProfit * resProfit * wholeProfit).toFixed(2);
                        if (!req.user.currencies.contains(txcur)) {
                            //need CONVERSION
                            var r1 = yield Rate.findOne({source : req.user.currency, destination : txcur}).exec();
                        if (r1 !== null) {
                            var rate = r1;
                        } else {
                            var r2 = yield Rate.findOne({destination : req.user.currency, source : txcur}).exec();
                            if (r2 !== null ) {
                                var rate = r2;
                                rate.rate = 1 / rate.rate;
                            } else {
                                //do usd and back
                                var r3 = Rate.findOne({destination : req.user.currency, source : 'USD'}).exec();
                                var r4 = Rate.findOne({destination : txcur, source : 'USD'}).exec();
                                if ((r3 !== null) && (r4 !== null)) {
                                    var rtmp = (1 / r3.rate) * r4.rate;
                                    var rate = {
                                        source : req.user.currency,
                                        destination : prov.currency,
                                        rate : rtmp
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
            if (pa[2] == 'OR') {
                if (f.denomination && f.msisdn) {
                    var o = {
                        msisdn : f.msisdn,
                        product_id : f.product_id,
                        denomination : f.denomination,
                        send_sms : false,
                        time : new Date(),
                        state : 'new'
                    }
                    BJ.jobs.push(o);
                }
            } else {
                if (f.msisdn) {
                    var o = {
                        msisdn : f.msisdn,
                        product_id : f.product_id,
                        send_sms : false,
                        time : new Date(),
                        denomination : pa[2],
                        state : 'new'
                    }
                    BJ.jobs.push(o);
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
    BatchJob.find({account : req.user.main_account}).sort({time : -1}).limit(100)
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
    BatchJob.findOne({batchid : req.params.batchid})
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
    Account.find({type : 'reseller', _id : {$in : req.user.child}}).count()
        .then(function (rc) {
            res.locals.rc = rc;
            return Account.find({_id : {$in : req.user.child}, type : 'agent'}).count().exec();
        })
        .then(function (ac) {
            res.locals.ac = ac;
            return User.find({main_account : {$in : req.user.child}}).count().exec();
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
router.get('/users', function (req, res) {
    User.find({main_account : {$in : req.user.child}})
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
    Rate.find({}, {source : true, destination : true, rate : true})
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
    ProvHelper.find({iso : req.params.country})
        .then(function (c) {
            res.json(c)
        })
        .catch(function (err) {
                    
                    console.log(new Error(err.message));
                    res.status(err.status || 500).send(err);
                    });
})
module.exports = router;
