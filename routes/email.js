var express = require('express');
var router = express.Router();
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
var authc = require('../modules/auth');
var moment = require('moment');
var https = require('https');
var jwt = require('jwt-simple');
var uuid = require('uuid')
var s = require('../modules/soapclient')
var sms = require('../modules/smpp')
var co = require('co');
var async = require('async');
var express = require('express');
var fs = require('fs');
var multiparty = require('multiparty');
var util = require('util');
var nodemailer = require('nodemailer');
var sendMailTR = require('nodemailer-sendmail-transport');
function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
router.post('/', function (req, res) {
    return new Promise(function (resolve, reject) {

   
    console.log('Receiving webhook.');

    /* Respond early to avoid timouting the mailin server. */
    // res.send(200);

    /* Parse the multipart form. The attachments are parsed into fields and can
     * be huge, so set the maxFieldsSize accordingly. */
    var form = new multiparty.Form({
        maxFieldsSize: 70000000
    });

    form.on('progress', function () {
        var start = Date.now();
        var lastDisplayedPercentage = -1;
        return function (bytesReceived, bytesExpected) {
            var elapsed = Date.now() - start;
            var percentage = Math.floor(bytesReceived / bytesExpected * 100);
            if (percentage % 20 === 0 && percentage !== lastDisplayedPercentage) {
                lastDisplayedPercentage = percentage;
                console.log('Form upload progress ' +
                    percentage + '% of ' + bytesExpected / 1000000 + 'Mb. ' + elapsed + 'ms');
            }
        };
    }());

    form.parse(req, function (err, fields) {
      if (err) {
          reject(err);
      } else {
          resolve(JSON.parse(fields.mailinMsg));
      }

})
 })
 .then(function (msg) {
     res.locals.msg = msg;
     console.log(msg);
     var ma = /\[tt #(\d{9})\]/;
     var subj = ma.exec(msg.subject);
     if (subj !== null) {
         var ticket_id = subj[1];
        res.locals.new = false;
        return Ticket.findOne({ticket_id : ticket_id}).exec();
     } else {
         //no match, treat as new ticket
         res.locals.new = true;
         //try to find sender now
         //check to address
         if (msg.to.length == 1) {
             var dom = msg.to[0].address.split('@')[1];
             console.log('DOM', dom);
             return Account.findOne({"whitelabel_opts.portal_url" : dom}).exec();
         } else {
            console.log('unsupported to count') 
         }
     }
 })
 .then(function (ti) {
     console.log('TI', ti);
     if (res.locals.new) {
         if (ti !== null) {
             res.locals.reseller = ti;
             var fromAddr = res.locals.msg.from[0].address;
             return User.findOne({$or : [{username : fromAddr}, {email : fromAddr}]}).exec();
         } else {
             res.sendStatus(200);
             throw new Error();
         }
     } else {
         res.locals.ticket = ti;
         ti.msgcount = ti.msgcount + 1;
         ti.save();
         var fromAddr = res.locals.msg.from[0].address;
             return User.findOne({$or : [{username : fromAddr}, {email : fromAddr}]}).exec();
     }
 })
 .then(function (re) {
     if (res.locals.new) {
        var tick = new Ticket(); 
        tick.support_account = res.locals.reseller._id;
        if (re !== null) {
            tick.account = re.main_account;
            tick.author = re._id;
        } else {
                tick.account = res.locals.reseller._id;
                tick.author = null;
        }
        tick.ticket_id = randomIntFromInterval(100000000, 999999999);
                tick.source = 'email';
                tick.priority = 'low';
                tick.status = 'new';
                tick.created = new Date();
                tick.updated = new Date();
                tick.subject = res.locals.msg.subject;
                tick.msgcount = 1;
                var rec1 = {
                    time : new Date(),
                    operation : 'creation',
                    author : tick.author
                }
                tick.log = [];
                tick.log.push(rec1);
                return tick.save();
     } else {
         var tm = new TicketMsg();
         if (re !== null) {
             tm.author = re._id;
         } else {
             tm.author = null;
         }
          
         tm.ticket = res.locals.ticket._id;
         tm.source = 'email';
         
         tm.email_from = res.locals.msg.from[0].address;
         tm.message = res.locals.msg.text;
        tm.created = new Date();
        tm.author_type = 'requester';
        return tm.save();
     }
 })
 .then(function (t) {
     if (res.locals.new) {
         res.locals.ticket = t;
         var tm = new TicketMsg();
         tm.ticket = t._id;
         tm.source = 'email';
         tm.author = t.author;
         tm.email_from = res.locals.msg.from[0].address;
         tm.message = res.locals.msg.text;
        tm.created = new Date();
        tm.author_type = 'requester';
        return tm.save();
     } else {
        //send notifications;

     }
 })
 .then(function (ttm) {
     if (res.locals.new) {
         //all done 
         //send notifications and reply to initial ticket;
         //initial reply !
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
            res.locals.reseller.account_name + ' Support Team\n';

            var text2 = 'Dear Supporter,\n' +
            '\n' +
            'You have a new ticket #' + res.locals.ticket.ticket_id + '.\n' + 
            'Subject :' + res.locals.msg.subject + '\n' + 
            'Text :' + res.locals.msg.text +
            '\n\n\n' + 
            'To view or respond to ticket, please login to the support UI at https://' + res.locals.reseller.whitelabel_opts.url + '\n' +
            '\n' + 
            'Kind Regards,' + 
            'Automated Platform Management';

            var transp = nodemailer.createTransport(sendMailTR);
            var mailOpts = {
                from : '"Support Team" <support@' + res.locals.reseller.whitelabel_opts.url + '>',
                to : res.locals.msg.from[0].address,
                subject : '[tt #' + res.locals.ticket.ticket_id + '] AutoReply: ' + res.locals.ticket.subject,
                text : text
            }
            User.find({main_account : res.locals.reseller._id}, function (err, ub) {
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
                        from : '"PrimeAirtime Platform" <support@' + res.locals.reseller.whitelabel_opts.url + '>',
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
                            res.sendStatus(200);
                        }
                    })
                }
            })
            var ml = transp.sendMail(mailOpts, function (err, inf) {
                if (err) {
                    console.log(err);
                } else {
                    res.sendStatus(200);
                }
            })
         //initial reply
     } else {
         res.sendStatus(200);
     }
 })
 .catch(function (err) {
     console.log(err);
 })
})
router.head('/', function (req, res) {
    res.sendStatus(200);
})
module.exports = router;