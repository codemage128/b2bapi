var app = {};
var https = require('request');
var md5 = require('md5')
var sha1 = require('sha1');
var pp = require('properties-parser');
var easysoap = require('easysoap')
var soap = require('soap');
var xml2js = require('xml2js')
var util = require('util')
var co = require('co');
var Apicred = require('../models/apicred')
var Setting = require('../models/setting')
var UKBLPrice = require('../models/ukblprice')
var Account = require('../models/account');
var Sms = require('./smpp')
var os = require("os");
var hostname = os.hostname();
var fs = require('fs')

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
Array.prototype.getIndex = function ( needle ) {
   for (i in this) {
      if (this[i] == needle) return i;
   }
   return false;
}
/* NGGL - Nigeria GLO */
function doNGGLAirtimeTopup(creds, obj) {
   
    return new Promise(function (resolve, reject) {
        co(function* () {
            function run(creds, obj, iteration) {
                                if (iteration > 5) {
                console.log(hostname, 'GIVING UP THIS SHIT..... @ ITERATION : ', iteration, obj)
                var re = {};
                    re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'Check Log output'
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            resolve(re)
            } else {
                //boo
                                      var k0 = randomIntFromInterval(10000, 99999);
                var k1 = randomIntFromInterval(10000, 99999);
                var k2 = randomIntFromInterval(10000, 99999);
                var k3 = randomIntFromInterval(10000, 99999);
                var key = String(k0) + String(k1) + String(k2) + String(k3);
               // var num = obj.msisdn.replace(/(^234)/, '0');
               var num = obj.msisdn;
                var pr = {
                    url : creds.link,
                    timeout : 120000,
                   headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : '\"\"'
                    }
                
                }
                if (obj.data == true) {
                    var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ext=\"http://external.interfaces.ers.seamless.com/\">' +
   '<soapenv:Header/>' +
   '<soapenv:Body>' +
      '<ext:requestTopup>' +
         '<context>' +
            '<channel>WSClient</channel>' +
            '<clientComment></clientComment>' +
            '<clientId>ERS</clientId>' +
            '<clientReference>' + key + '</clientReference>' +
            '<clientRequestTimeout>500</clientRequestTimeout>' +
            '<initiatorPrincipalId>' +
               '<id>' + creds.username + '</id>' +
               '<type>RESELLERUSER</type>' +
               '<userId>9900</userId>' +
            '</initiatorPrincipalId>' +
            '<password>' + creds.password + '</password>' +
         '</context>' +
         '<senderPrincipalId>' +
            '<id>' + creds.username + '</id>'  +
            '<type>RESELLERUSER</type>' +
            '<userId>9900</userId>' +
         '</senderPrincipalId>' +
         '<topupPrincipalId>' +
            '<id>' + num + '</id>' +
            '<type>SUBSCRIBERMSISDN</type>' +
            '<userId>?</userId>' +
         '</topupPrincipalId>' +
         '<senderAccountSpecifier>' +
            '<accountId>' + creds.username + '</accountId>' + 
            '<accountTypeId>RESELLER</accountTypeId>' +
         '</senderAccountSpecifier>' +
         '<topupAccountSpecifier>' + 
            '<accountId>' + num + '</accountId>' +
            '<accountTypeId>DATA_BUNDLE</accountTypeId>' +
         '</topupAccountSpecifier>' +
         '<productId>' + obj.psku + '</productId>' +
         '<amount>' +
            '<currency>NGN</currency>' +
            '<value>' + String(parseInt(obj.denomination)) + '</value>' +
         '</amount></ext:requestTopup></soapenv:Body></soapenv:Envelope>'
                } else {
                    var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ext=\"http://external.interfaces.ers.seamless.com/\">' +
   '<soapenv:Header/>' +
   '<soapenv:Body>' +
      '<ext:requestTopup>' +
         '<context>' +
            '<channel>WSClient</channel>' +
            '<clientComment></clientComment>' +
            '<clientId>ERS</clientId>' +
            '<clientReference>' + key + '</clientReference>' +
            '<clientRequestTimeout>500</clientRequestTimeout>' +
            '<initiatorPrincipalId>' +
               '<id>' + creds.username + '</id>' +
               '<type>RESELLERUSER</type>' +
               '<userId>9900</userId>' +
            '</initiatorPrincipalId>' +
            '<password>' + creds.password + '</password>' +
         '</context>' +
         '<senderPrincipalId>' +
            '<id>' + creds.username + '</id>'  +
            '<type>RESELLERUSER</type>' +
            '<userId>9900</userId>' +
         '</senderPrincipalId>' +
         '<topupPrincipalId>' +
            '<id>' + num + '</id>' +
            '<type>SUBSCRIBERMSISDN</type>' +
            '<userId>?</userId>' +
         '</topupPrincipalId>' +
         '<senderAccountSpecifier>' +
            '<accountId>' + creds.username + '</accountId>' + 
            '<accountTypeId>RESELLER</accountTypeId>' +
         '</senderAccountSpecifier>' +
         '<topupAccountSpecifier>' + 
            '<accountId>' + num + '</accountId>' +
            '<accountTypeId>AIRTIME</accountTypeId>' +
         '</topupAccountSpecifier>' +
         '<productId>TOPUP</productId>' +
         '<amount>' +
            '<currency>NGN</currency>' +
            '<value>' + String(parseInt(obj.denomination)) + '</value>' +
         '</amount></ext:requestTopup></soapenv:Body></soapenv:Envelope>'
                }
                
            
                    console.log('REQ', pr, payload)
                    var req = https.post(pr, function (err, res, body) {
                        if (err) {
                           
                         console.log(hostname, 'NGGL_TOPUP', obj.msisdn, 'GLO is DOWN or number ported!!');
                         var re = {};
                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'Network Connection timeout : ' + JSON.stringify(err) 
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.username;
                                            resolve(re);
                      
                        } else {
                            console.log('BODY', res.body)
                                
                               var parser = new xml2js.Parser();
                   parser.parseString(res.body, function (err, d) {
                      
                        console.log(util.inspect(d, false, null));
                      var st = d['soap:Envelope']['soap:Body'][0]['ns2:requestTopupResponse'][0]['return'][0]['resultCode'][0]
                      var txid = d['soap:Envelope']['soap:Body'][0]['ns2:requestTopupResponse'][0]['return'][0]['ersReference'][0]
                      console.log('ST', st)
                 //     var txid = d['env:Envelope']['env:Body'][0]['VendResponse'][0]['TxRefId'][0]
                 
                      if (st == '0') {
                          var re = {};
                                            re.success = true;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "RECHARGE_COMPLETE"
                                            re.operator_transactionid = txid;
                                            re.vnd_sim = creds.username;
                                            resolve(re);
                      } else if ((st == '11') || (st == '41')) {
                          var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(payload)
                                            re.responseCode = "UNSUPPORTED_DENOMINATION"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.username;
                                            resolve(re);
                      } else if ((st == '47') || (st == '38') || (st == '40') || (st == '52') || (st == '901') || (st == '94')) {

                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "MSISDN_INVALID"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.username;
                                            resolve(re);

                      } else {
                          var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.username;
                                            resolve(re);
                      }
                    
                   })
                   
                        }
                    })
                 
                    req.end(payload)

                //baa
            }

        }
        run(creds, obj, 0)
        })
    })
}
/* NGGL - Nigeria GLO */
/* NGET - Nigeria Etisalat */

function doNGETAirtimeTopup(creds, obj) {
    
    return new Promise(function (resolve, reject) {
        co(function* () {
            function run(creds, obj, iteration) {
                                if (iteration > 5) {
                console.log(hostname, 'GIVING UP THIS SHIT..... @ ITERATION : ', iteration, obj)
                var re = {};
                    re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'Check Log output'
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re)
            } else {
                //boo
                                      var k0 = randomIntFromInterval(10000, 99999);
                var k1 = randomIntFromInterval(10000, 99999);
                var k2 = randomIntFromInterval(10000, 99999);
                var k3 = randomIntFromInterval(10000, 99999);
                var key = String(k0) + String(k1) + String(k2) + String(k3);
                var num = obj.msisdn.replace(/(^234)/, '0');
                var pr = {
                    url : creds.link,
                  
                    rejectUnauthorized : false,
                    time : true,
                   headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : '\"http://sdf.cellc.net/process\"'
                    }
                
                }
                if (obj.data == true) {
                     var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:com=\"http://sdf.cellc.net/commonDataModel\">' +
                    '<soapenv:Header/>' +
                    '<soapenv:Body>' + 
                    '<com:SDF_Data>' + 
                    '<com:header>' + 
                        '<com:processTypeID>'  + creds.processTypeID + '</com:processTypeID>' +
                        '<com:externalReference>' + key + '</com:externalReference>'  +
                            '<com:sourceID>' + creds.sourceID + '</com:sourceID>' + 
                            '<com:username>' + creds.username + '</com:username>' + 
                            '<com:password>' + creds.password + '</com:password>' + 
                            '<com:processFlag>1</com:processFlag>' + 
                    '</com:header>' + 
                    '<com:parameters name=\"\">' + 
                    '<com:parameter name=\"RechargeType\">991</com:parameter>' + 
                    '<com:parameter name=\"MSISDN\">' + num + '</com:parameter>' + 
                    '<com:parameter name=\"Amount\">' + parseInt(obj.denomination) * 100 + '</com:parameter>'  +
                    '<com:parameter name=\"Channel_ID\">' + creds.channelID + '</com:parameter>' + 
                    '</com:parameters>' + 
                    '<com:result>' + 
                        '<com:statusCode/>' + 
                        '<com:errorCode/>' + 
                        '<com:errorDescription/>' + 
                    '</com:result>' + 
                    '</com:SDF_Data>' + 
                '</soapenv:Body>' + 
                '</soapenv:Envelope>'
                } else {
                     var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:com=\"http://sdf.cellc.net/commonDataModel\">' +
                    '<soapenv:Header/>' +
                    '<soapenv:Body>' + 
                    '<com:SDF_Data>' + 
                    '<com:header>' + 
                        '<com:processTypeID>'  + creds.processTypeID + '</com:processTypeID>' +
                        '<com:externalReference>' + key + '</com:externalReference>'  +
                            '<com:sourceID>' + creds.sourceID + '</com:sourceID>' + 
                            '<com:username>' + creds.username + '</com:username>' + 
                            '<com:password>' + creds.password + '</com:password>' + 
                            '<com:processFlag>1</com:processFlag>' + 
                    '</com:header>' + 
                    '<com:parameters name=\"\">' + 
                    '<com:parameter name=\"RechargeType\">001</com:parameter>' + 
                    '<com:parameter name=\"MSISDN\">' + num + '</com:parameter>' + 
                    '<com:parameter name=\"Amount\">' + parseInt(obj.denomination) * 100 + '</com:parameter>'  +
                    '<com:parameter name=\"Channel_ID\">' + creds.channelID + '</com:parameter>' + 
                    '</com:parameters>' + 
                    '<com:result>' + 
                        '<com:statusCode/>' + 
                        '<com:errorCode/>' + 
                        '<com:errorDescription/>' + 
                    '</com:result>' + 
                    '</com:SDF_Data>' + 
                '</soapenv:Body>' + 
                '</soapenv:Envelope>'
                }
               
                 
                    console.log(new Date().toISOString(), 'REQUEST', pr, payload)
                    var req = https.post(pr, function (err, res, body) {
                       
                        if (err) {
                            console.log('retrying', err)
                            iteration++
                            run(creds, obj, iteration)
                        } else {
                            console.log('KEY :', key, new Date().toISOString(), 'Request Response Stats', '/// Request started at : ', new Date(res.request.startTime).toISOString(), ' Elapsed Time : ', res.elapsedTime, 'ms /// Starting receiving response at : ', new Date(res.responseStartTime).toISOString())
                            console.log(new Date().toISOString(), 'BODY', res.body, key)
                                
                               var parser = new xml2js.Parser();
                   parser.parseString(res.body, function (err, d) {
                      
                        //console.log(util.inspect(d, false, null));
                        var status = d['soapenv:Envelope']['soapenv:Body'][0]['com:SDF_Data'][0]['com:result'][0]['com:statusCode']
                        var error = d['soapenv:Envelope']['soapenv:Body'][0]['com:SDF_Data'][0]['com:result'][0]['com:errorCode']
                        var txid = d['soapenv:Envelope']['soapenv:Body'][0]['com:SDF_Data'][0]['com:result'][0]['com:instanceId']
                        //console.log('TTTT', util.inspect(tt, false, null));
                        console.log(new Date(), 'Status : ', status, 'Error : ', error, ' TXID : ', txid, 'KEY : ', key);
                        if ( (status == '0') && error == '0' ) {
                            var re = {}
                            re.success = true;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String( payload)
                                            re.responseCode = "RECHARGE_COMPLETE"
                                            re.operator_transactionid = txid;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re);
                        } else if ( ( (status == '2') && (error == '1') ) || ( (status == '2') && (error == '7')  ) || ( (status == '2') && (error == '1204')  ) ) {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(payload)
                                            re.responseCode = "MSISDN_INVALID"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re);
                        } else if ( (status == '2') && (error == '5') ) {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String( payload)
                                            re.responseCode = "MSISDN_BARRED"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re);
                        } else if ( (status == '2') && (error == '8')) {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(payload)
                                            re.responseCode = "UNSUPPORTED_DENOMINATION"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re);
                        }
                         else {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = txid || null;
                                            re.vnd_sim = creds.sourceID;
                                            resolve(re);
                        }

                    
                   })
                   
                        }
                    })
                    console.log(new Date().toISOString(), 'SENDING REQUEST', key)
                    req.end(payload)

                //baa
            }

        }
        run(creds, obj, 0)
        })
    })
}
/* NGET - Nigeria Etisalat */
/* NGAT - Nigeria Airtel */
function doNGATAirtimeTopup(creds, obj) {
    
    return new Promise(function (resolve, reject) {
        co(function* () {
            function run(creds, obj, iteration) {
                                if (iteration > 5) {
                console.log(hostname, 'GIVING UP THIS SHIT..... @ ITERATION : ', iteration, obj)
                var re = {};
                    re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'Check Log output'
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.sourceNumbers[0]
                                            resolve(re)
            } else {
                //boo
                                      var k0 = randomIntFromInterval(10000, 99999);
                var k1 = randomIntFromInterval(10000, 99999);
                var k2 = randomIntFromInterval(10000, 99999);
                var k3 = randomIntFromInterval(10000, 99999);
                var key = String(k0) + String(k1) + String(k2);
                var num = obj.msisdn.replace(/(^234)/, '');
                var authHeader = 'LOGIN=' + creds.username + '&PASSWORD=' + creds.password + '&REQUEST_GATEWAY_CODE=' + creds.reqgwcode + '&REQUEST_GATEWAY_TYPE=' + creds.reqgwtype + '&SERVICE_PORT=' + creds.svcport + '&SERVICE_TYPE=' + creds.svctype 
                var pr = {
                    url : creds.link,
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'Authorization' : authHeader
                    }
                
                }
                 var payload = '<?xml version=\"1.0\"?>' + 
                    '<!DOCTYPE COMMAND PUBLIC \"-//Ocam//DTD XML Command 1.0//EN\" \"xml/command.dtd\">' +
                    '<COMMAND>' + 
                    '<TYPE>EXRCTRFREQ</TYPE>' +
                    '<DATE></DATE>' +
                    '<EXTNWCODE>' + creds.extnwcode + '</EXTNWCODE>' +
                    '<MSISDN>' + creds.sourceNumbers[0] + '</MSISDN>' +
                    '<PIN>' + creds.pin + '</PIN>' +
                   /*
                    '<LOGINID>' + creds.username + '</LOGINID>' +
                    '<PASSWORD>' + creds.password + '</PASSWORD>' +
                    '<EXTCODE>' + creds.extcode + '</EXTCODE>' +
                    */
                    '<LOGINID></LOGINID><PASSWORD></PASSWORD><EXTCODE></EXTCODE>' +
                    '<EXTREFNUM>' + key + '</EXTREFNUM>' +
                    '<MSISDN2>' + num + '</MSISDN2>' +
	                '<AMOUNT>' + parseInt(obj.denomination) + '</AMOUNT>' + 
                    '<LANGUAGE1></LANGUAGE1>' +
                    '<LANGUAGE2></LANGUAGE2>' +
                    '<SELECTOR>1</SELECTOR>' +
                    '</COMMAND>'
                    console.log('REQ', pr, payload)
                    var req = https.post(pr, function (err, res, body) {
                        if (err) {
                            console.log('retrying')
                            iteration++
                            run(creds, obj, iteration)
                        } else {
                               var parser = new xml2js.Parser();
                   parser.parseString(res.body, function (err, d) {
                      
                        //console.log(util.inspect(d, false, null));
                      var st = d['COMMAND']['TXNSTATUS'][0];
                      var ref = d['COMMAND']['EXTREFNUM'][0];
                        var txnid = d['COMMAND']['TXNID'][0];
                        var inv = ['12011', '12012', '17017', '1012'];
                      if (st == '200') {
                        

                        var re = {};
                                            re.success = true;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "RECHARGE_COMPLETE"
                                            re.operator_transactionid = txnid;
                                            re.vnd_sim = creds.sourceNumbers[0]
                                            resolve(re);

                      } else if (inv.contains(st)) {
                        var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "MSISDN_INVALID"
                                            re.operator_transactionid = txnid || null;
                                            re.vnd_sim = creds.sourceNumbers[0]
                                            resolve(re);
                      } else if (st == '2050') {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "FRAUD_PREVENTION"
                                            re.operator_transactionid = txnid || null;
                                            re.vnd_sim = creds.sourceNumbers[0]
                                            resolve(re);
                        } else {
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = txnid || null;
                                            re.vnd_sim = creds.sourceNumbers[0]
                                            resolve(re);
                      }
                   })
                        }
                    })
                    req.end(payload)

                //baa
            }

        }
        run(creds, obj, 0)
        })
    })
}
function doNGATBlCheck(creds) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            console.log('doNGATBlCheck')
                        var key = new Date().getTime();
            var d1 = new Date();
            var d2 = d1.getFullYear() + '-' + parseInt(d1.getMonth()+1) + '-' + d1.getDate()
                var authHeader = 'LOGIN=' + creds.username + '&PASSWORD=' + creds.password + '&REQUEST_GATEWAY_CODE=' + creds.reqgwcode + '&REQUEST_GATEWAY_TYPE=' + creds.reqgwtype + '&SERVICE_PORT=' + creds.svcport + '&SERVICE_TYPE=' + creds.svctype 
                var pr = {
                    url : creds.link,
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'Authorization' : authHeader
                    }
                
                }
                var payload = '<?xml version=\"1.0\"?>' + 
                    '<!DOCTYPE COMMAND PUBLIC \"-//Ocam//DTD XML Command 1.0//EN\" \"xml/command.dtd\">' +
                    '<COMMAND>' + 
                    '<TYPE>EXUSRBALREQ</TYPE>' +
                    '<DATE></DATE>' +
                    '<EXTNWCODE>' + creds.extnwcode + '</EXTNWCODE>' +
                    '<MSISDN>' + creds.sourceNumbers[0] + '</MSISDN>' +
                    '<PIN>' + creds.pin + '</PIN>' +
                   '<LOGINID></LOGINID><PASSWORD></PASSWORD><EXTCODE></EXTCODE>' +
                    '<EXTREFNUM>' + key + '</EXTREFNUM>' +
                    '</COMMAND>'
console.log(hostname, 'NGAT_PAYLOAD', payload, pr)
                    var req = https.post(pr, function (err, res, body) {
                        if (err) {
                            reject(err)
                        }
                        console.log(body);
                        console.log('statusCode', res.statusCode );
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log(hostname, 'Response (NGAT):', buffer ); } );
                   var parser = new xml2js.Parser();
                   parser.parseString(res.body, function (err, d) {
                       if (err) {
                           reject()
                       } 
                        //console.log(util.inspect(d, false, null));
                       var ms = d['COMMAND']['RECORD'][0]['BALANCE'][0]
                       var r = {
                           balance : ms
                       }
                       resolve(r)
                   })
                  /*
                    var parser = new xml2js.Parser();
                     parser.parseString(res.body, function (err, d) {
                        if (err) {
                            reject(err)
                        } else {
                            console.log(util.inspect(d, false, null));
                            if (pre == '000') {
                                var r = {};
                                r.balance = parseInt(bal) / 100;
                                resolve(r)
                            } else {
				//console.log(res);
                                reject();
                            }
                     
                        }
                    });
                    */
                })
                req.end(payload);
                    
        })
    })
}
/* NGAT - Nigeria Airtel */
/* NGMT - Nigeria MTN */
function doMTNNGTopup(creds, obj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
        //some random
        function run(creds, obj, iteration) {
            var useBackup = false;
            if (iteration > 2) {
                useBackup = true;
            }
            if (iteration > 5) {
                console.log(hostname, 'GIVING UP THIS SHIT..... @ ITERATION : ', iteration, obj)
                var re = {};
                    re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'Check Log output'
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re)
            }
            console.log(hostname, 'WE HAVE FUNC CALL / Iteration : ', iteration);
                var en = creds.sourceNumbers.length - 1;
                var orig = randomIntFromInterval(0, en);
                if (obj.data == true ) {
                         var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsd=\"http://hostif.vtm.prism.co.za/xsd\">' +
                   '<soapenv:Header/>' +
                  '<soapenv:Body>' +
                      '<xsd:vend>' +
                         '<xsd:sequence>-1</xsd:sequence>' +
                        '<xsd:origMsisdn>' + creds.sourceNumbers[orig] + '</xsd:origMsisdn>' +
                         '<xsd:destMsisdn>' + obj.msisdn + '</xsd:destMsisdn>' + 
                         '<xsd:amount>' + parseInt(obj.denomination) + '</xsd:amount>' +
                         '<xsd:tariffTypeId>9</xsd:tariffTypeId>' +
                      '</xsd:vend>' +
                   '</soapenv:Body>' +
                    '</soapenv:Envelope>'
                } else {
                     var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsd=\"http://hostif.vtm.prism.co.za/xsd\">' +
                   '<soapenv:Header/>' +
                  '<soapenv:Body>' +
                      '<xsd:vend>' +
                         '<xsd:sequence>-1</xsd:sequence>' +
                        '<xsd:origMsisdn>' + creds.sourceNumbers[orig] + '</xsd:origMsisdn>' +
                         '<xsd:destMsisdn>' + obj.msisdn + '</xsd:destMsisdn>' + 
                         '<xsd:amount>' + parseInt(obj.denomination) + '</xsd:amount>' +
                         '<xsd:tariffTypeId>1</xsd:tariffTypeId>' +
                      '</xsd:vend>' +
                   '</soapenv:Body>' +
                    '</soapenv:Envelope>'
                }
                               
                var auth = "Basic " + new Buffer(creds.username + ":" + creds.password).toString("base64");
                if (useBackup) {
                    var link = creds.backup_link;
                    console.log(hostname, 'USING BACKUP, ITERATION : ', iteration);
                } else {
                    var link = creds.link;
                }
                var pr = {
                    url : link,
                    headers : {
                      //  'Content-Type' : 'text/xml; charset=utf-8'
                        'Authorization' : auth
                    }
                
                }
                var req = https.post(pr, function (err, res, body) {
                    
                    if (err) {
                        console.log(hostname, 'ERR', err)
                        console.log(hostname, 'RETRYING')
                        iteration++;
                        run(creds, obj, iteration);
                        /*
                           var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(err);
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "COMMS_ERROR"
                                            re.operator_transactionid = null;
                                            resolve(re)
                                            */
                    } else {
                         var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                      var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        if (err) {
                            console.log(hostname, 'ERRPARSE', err, res.body);
                            
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(err);
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                           resolve(re);
                                           
                                          /*
                                          console.log(hostname, 'RETRYING')
                        iteration++;
                        run(creds, obj, iteration);
                        */
                        } else {
                            console.log(hostname, 'ITS EXEC', JSON.stringify(util.inspect(d, false, null)))
                            if ('undefined' === typeof d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['statusId']) {
                                var respStatus = 9999;
                            } else {
                                var respStatus = d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['statusId'][0] || '9999';
                            }
                            if ('undefined' === typeof d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['responseCode']) {
                                var respCode = 500;
                            } else {
                                var respCode = d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['responseCode'][0];
                            }
                            if ('undefined' === typeof d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['txRefId']) {
                                var operTX = null;
                               
                            } else {
                                 var operTX = d['soapenv:Envelope']['soapenv:Body'][0]['vendResponse'][0]['txRefId'];
                            }
                            var inv = ['1003', '1004', '1005', '1007', '1100', '1012']
                            if (respCode == '0') {
                                if (respStatus == '0') {
                                console.log(hostname, 'ITS SUCCESSFUL', JSON.stringify(util.inspect(d, false, null)))
                                //success 
                                var re = {};
                                            re.success = true;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "RECHARGE_COMPLETE"
                                            re.operator_transactionid = operTX;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                            }else if (respStatus == '301') {
                                //no balance try another SIM
                                console.log(hostname, 'WE HAVE 301');
                                if (creds.sourceNumbers.length > 1) {
                                    creds.sourceNumbers.splice(orig, 1);
                                    run(creds, obj, iteration);
                                }   else {
                                    var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = operTX;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                                }
                                
                            } else if (inv.contains(respStatus)) { 
                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "MSISDN_INVALID"
                                            re.operator_transactionid = operTX;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                            } else if (respStatus == '310') {
                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "RECHARGE_FAILED"
                                            re.operator_transactionid = operTX;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                            }
                             else {
                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = operTX;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                            }
                            } else {
                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(util.inspect(d, false, null));
                                            re.req_debug = String(JSON.stringify(pr) + "\n" + payload)
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.sourceNumbers[orig]
                                            resolve(re);
                            }
                            
                           // console.log('DADADA', util.inspect(d, false, null));
                        }
                    });
                    }

                })
                    req.end(payload);
                    console.log(hostname, 'NGMT_PAYLOAD', payload, pr)
        }
        run(creds, obj, 0);
    })
    })
}
function doUniversalNGTopup(obj) {
    return new Promise(function (resolve, reject) {

        co(function* () {
            var ported = false;
            obj.apis = ['NGMT', 'NGET', 'NGAT', 'NGGL'];
            function getCreds(apid, obj) {
                return new Promise(function (resolve, reject) {
                    co(function* () {
                         var creds = yield Apicred.findOne({apicode : apid, isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : apid, isSystemWide : true}).exec();
                     }
                     if (creds !== null) {
                         resolve(creds)
                     } else {
                         reject(creds)
                     }
                    })
                })
            }
            function run(apid, obj) {
                co(function* () {
                    var creds = yield getCreds(apid, obj);
                    console.log(creds, obj)
                switch (apid) {
                    case "NGMT":
                        var top = yield doMTNNGTopup(creds, obj);
                        break;
                     case "NGET":
                            var top = yield doNGETAirtimeTopup(creds, obj);
                            break;
                        case "NGAT":
                            var top = yield doNGATAirtimeTopup(creds, obj);
                            break;
                        case "NGGL":
                            var top = yield doNGGLAirtimeTopup(creds, obj);
                            break;
                }
                console.log('TOPPP', top)
                 if (top.responseCode == 'MSISDN_INVALID') {
                        //porting ?
                        ported = true;
                       console.log(hostname, 'Number seems to be ported from : ', obj.pref_api, 'tried :', apid,  obj.msisdn)
                        if (obj.apis.length >= 1) {
                            var i = obj.apis.getIndex();
                            obj.apis.splice(i, 1);
                            run(obj.apis[0], obj);
                        } else {
                            console.log('Nooowheeeere to go', apid, obj)
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = 'ALL OPERATORS EXAUSTED FOR ' + obj.msisdn
                                            re.req_debug = ''
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = null;
                                            resolve(re);
                        }
                     } else {
                         if (ported) {
                            top.ported = true;
                            top.ported_to = apid;
                            top.ported_from = obj.pref_api;
                         } 
                         resolve(top);
                     }
                })
                
            }
            run(obj.pref_api, obj);
        })

    })
}
function doUKBLTopup(creds, obj) {
    return new Promise(function (resolve,reject) {
        co(function* () {
            var entry = yield UKBLPrice.findOne({operator_id : obj.operatorId, denomination : obj.denomination}).exec();
            var acc = yield Account.findOne({_id : obj.reseller_id}).exec();
            var o = {
                username : creds.username,
                password : creds.password,
                api_key : creds.extcode,
                slug : entry.slug,
                card_id : entry.card_id
            }
             var pr = {
                    url : creds.link,
                    headers : {
                        'Content-Type' : 'application/json; charset=utf-8',
                        'Content-Length' : JSON.stringify(o).length
                    }
                
                }
                var buffer = "";
                console.log(pr)
            var req = https.post(pr, function (err, res, body) {
                 if (err) {
                        console.log(hostname, 'ERR', err)
                       // console.log(hostname, 'RETRYING')
                        //iteration++;
                        //run(creds, obj, iteration);
                        
                           var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(err);
                                            re.req_debug = String(JSON.stringify(o))
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.extcode;
                                            resolve(re)
                                            
                    } else {
                         var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
 
                        if (err) {
                            console.log(hostname, 'ERRPARSE', err, res.body);
                            
                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(err);
                                            re.req_debug = String(JSON.stringify(o))
                                            re.responseCode = "NETWORK_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.extcode;
                                           resolve(re);
                                           
                                          /*
                                          console.log(hostname, 'RETRYING')
                        iteration++;
                        run(creds, obj, iteration);
                        */
                        } else {
                       //     console.log(res.body)
                           //successful
                           
                           var ob = JSON.parse(res.body);
                           if (ob.success == true) {
                               //check for sms and send
                               
                               if (acc.send_pin_sms == true) {
                                    ///ok prepare text
                                    var text = 'Congrats! Your PIN is : ' + ob.pin + '\nfor ' + entry.operator_name + ' ' + entry.currency + entry.denomination + ' is available for recharge. Please ' + entry.action
                                    if (entry.operator_id == '1755') {
                                        var sender = 'EEMobile';
                                    } else if (entry.operator_id == '1757') {
                                        var sender = 'VodafonePIN';
                                    } else {
                                        var sender = entry.operator_name.substring(0, 11)
                                    }
                                    Sms.send(sender, obj.msisdn, text);
                               } 
                               //ok
                               var re = {};
                                    re.success = true;
                                    re.pin_based = true;
                                    re.resp_debug = JSON.stringify(ob);
                                    re.req_debug = JSON.stringify(o);
                                    re.responseCode = "RECHARGE_COMPLETE";
                                    re.operator_transactionid = ob.operator_reference;
                                    re.vnd_sim = creds.extcode;
                                re.pin_option1 = ob.card_usage;
                                re.pin_option2 = null;
                                re.pin_option3 = null;
                                re.pin_value = ob.card_price;
                                re.pin_code = ob.pin;
                                re.pin_ivr = null;
                                re.pin_serial = ob.serial_no;
                                re.pin_validity = ob.exp_date;
                                resolve(re);
                           } else {
                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(ob);
                                            re.req_debug = String(JSON.stringify(o))
                                            re.responseCode = "OPERATOR_ERROR"
                                            re.operator_transactionid = null;
                                            re.vnd_sim = creds.extcode;
                                           resolve(re);
                           }
                                        
                    }
                    }})
            req.end(JSON.stringify(o));
        }).catch(function (err) {
            console.log('UXBLA',err)
        })
    })
}
function doTRTONumberLookup(creds, msisdn) {
    console.log('rr')
        return new Promise(function (resolve,reject) {
        co(function* () {
        function run(creds, msisdn) {
              console.log(hostname, 'TRTO_MSINFO ', msisdn);
                var k0 = randomIntFromInterval(10000, 99999);
                var k1 = randomIntFromInterval(10000, 99999);
                var k2 = randomIntFromInterval(10000, 99999);
                var k3 = randomIntFromInterval(10000, 99999);
                var key = String(k0) + String(k1) + String(k2) +  String(k3);
            var url = creds.link + '?login=' + creds.username + '&key=' + key + '&md5=' + md5(creds.username + creds.password + String(key)) + '&action=msisdn_info&destination_msisdn=' + msisdn;
                    var options = {
                        url: url,
                        strictSSL: false,
                        secureProtocol: 'TLSv1_method',
                            ciphers : 'ALL'
                    }
            https(options, function (err, res, body) {

                if (!err && res.statusCode == 200) {
                    var obj = pp.parse(body);
                    console.log(obj);
                    if (obj.error_code == '0') {
                        resolve(obj);
                    } else {
                        resolve(obj);
                    }
                } else {
                    reject(err);
                }
            })
        }
        run(creds,msisdn);
    })
    .catch(function (err) {
        console.log('ETRIN', err)
    })
    })
}
function doTWLONumberLookup(creds,msisdn) {
    return new Promise(function (resolve,reject) {
        co(function* () {
            var twlo = require('twilio')(creds.username, creds.password)
            function run(creds,msisdn) {
                 
                         resolve(twlo.lookups.v1.phoneNumbers(msisdn).fetch({type : 'carrier'}));
            }
                    run(creds,msisdn);   
            })
             .catch(function (err) {
                 console.log(eatt)
                            if (err.status == '404') {
                                resolve(err);
                            } else {
                                resolve(err);
                            }
                        })
    })
}
function doUniversalNumberLookup(msisdn) {
    return new Promise(function (resolve,reject) {
        
        co(function* () {
            var usingBackup = false;
        var masterAPI = yield Setting.findOne({key : 'numberLookup.PrimaryAPI', global : true}).exec();
                var hasBackup = yield Setting.findOne({key : 'numberLookup.hasBackup', global : true}).exec();
                 if (hasBackup.value == 'true') {
                    var backupAPI = yield Setting.findOne({key : 'numberLookup.SecondaryAPI', global : true}).exec();
                } else {
                    var backupAPI = null;
                }
                      //  console.log(masterAPI, hasBackup, backupAPI)
                 function getCredsz(apid) {
                return new Promise(function (resolve, reject) {
                    Apicred.findOne({apicode : apid})
                        .then(function (c) {
                            resolve(c);
                        })

                })
            }
            function run(msisdn) {
                co(function* () { 
                    //  console.log(masterAPI, hasBackup, backupAPI)
                
               
                switch (masterAPI.value) {
                    case "TRTO":
                        var creds = yield getCredsz(masterAPI.value);
                        //try lookup
                        var ans = yield doTRTONumberLookup(creds, msisdn);
                        if (ans.error_code == 0) {
                            ans.lookupProvider = 'TRTO';
                            resolve(ans);
                        } else {
                            //not found
                            //try backup
                           if (backupAPI !== null) {
                               usingBackup = true;
                               var creds = yield getCredsz(backupAPI.value);
                               if (backupAPI.value == 'TWLO') {
                                   var ans = yield doTWLONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TWLO';
                                   resolve(ans);
                               } else if (backupAPI.value == 'TRTO') {
                                   var ans = yield doTRTONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TRTO';
                                   resolve(ans);
                               }
                        } else {
                            var ans = {}
                            ans.lookupProvider = null;
                            resolve(ans)
                        }
                        }
                    break;
                    case "TWLO":
                        var creds = yield getCredsz('TWLO');
                        var ans = yield doTWLONumberLookup(creds,msisdn);
                        ans.lookupProvider = 'TWLO';
                        resolve(ans);
                    break;
                    default:
                    break;
                }
                })
            .catch(function (err) {
                //use backup
                            co(function* () {
                                 function getCredsz(apid) {
                return new Promise(function (resolve, reject) {
                    Apicred.findOne({apicode : apid, isSystemWide : true})
                        .then(function (c) {
                            resolve(c);
                        })

                })
            }
                 var usingBackup = false;
        var masterAPI = yield Setting.findOne({key : 'numberLookup.PrimaryAPI', global : true}).exec();
                var hasBackup = yield Setting.findOne({key : 'numberLookup.hasBackup', global : true}).exec();
                 if (hasBackup.value == 'true') {
                    var backupAPI = yield Setting.findOne({key : 'numberLookup.SecondaryAPI', global : true}).exec();
                } else {
                    var backupAPI = null;
                }
                console.log(masterAPI, hasBackup, backupAPI)
                            if (typeof err.status !== 'undefined') {
                //TWLO could not find , check if its a backup or not
                if (!usingBackup) {
                    if (hasBackup.value == 'true') {
                        //try our backup
                        var creds = yield getCredsz(backupAPI.value);
                        usingBackup = true;
                         if (backupAPI.value == 'TWLO') {
                                   var ans = yield doTWLONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TWLO';
                                   resolve(ans);
                               } else if (backupAPI.value == 'TRTO') {
                                   var ans = yield doTRTONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TRTO';
                                   resolve(ans);
                               }
                    } else {
                        resolve('hjj');
                    }
                } else {
                    var ans = {}
                    ans.lookupProvider = null;
                    resolve(ans);
                }
            } else {
                var ans = {}
                ans.lookupProvider = null;
                resolve(ans);
            }
            })
        .catch(function (err) {
            console.log('EXXYYY',err)
        })
            })
                //ghet settings
              

            }
            run(msisdn)
        })
        .catch(function (err) {
            //console.log('EXX', err, masterAPI, hasBackup, backupAPI)
            console.error(err)
                            
            co(function* () {
                 function getCredsz(apid) {
                return new Promise(function (resolve, reject) {
                    Apicred.findOne({apicode : apid, isSystemWide : true})
                        .then(function (c) {
                            resolve(c);
                        })

                })
            }
                 var usingBackup = false;
        var masterAPI = yield Setting.findOne({key : 'numberLookup.PrimaryAPI', global : true}).exec();
                var hasBackup = yield Setting.findOne({key : 'numberLookup.hasBackup', global : true}).exec();
                 if (hasBackup.value == 'true') {
                    var backupAPI = yield Setting.findOne({key : 'numberLookup.SecondaryAPI', global : true}).exec();
                } else {
                    var backupAPI = null;
                }
                console.log(masterAPI, hasBackup, backupAPI)
                            if (typeof err.status !== 'undefined') {
                //TWLO could not find , check if its a backup or not
                if (!usingBackup) {
                    if (hasBackup.value == 'true') {
                        //try our backup
                        var creds = yield getCredsz(backupAPI.value);
                        usingBackup = true;
                         if (backupAPI.value == 'TWLO') {
                                   var ans = yield doTWLONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TWLO';
                                   resolve(ans);
                               } else if (backupAPI.value == 'TRTO') {
                                   var ans = yield doTRTONumberLookup(creds,msisdn);
                                   ans.lookupProvider = 'TRTO';
                                   resolve(ans);
                               }
                    } else {
                        resolve('hjj');
                    }
                } else {
                    var ans = {}
                    ans.lookupProvider = null;
                    resolve(ans);
                }
            } else {
                var ans = {}
                ans.lookupProvider = null;
                resolve(ans);
            }
            })
        .catch(function (err) {
            console.log('EXXYYY',err)
        })
            //check for TWLO error first

        })
    })
}
app.ping = function (api_id) {
   return new Promise(function (resolve, reject) {
          switch (api_id) {
        
        case "TRTO":
            var key = new Date().getTime();
            var url = process.env.TRTO_URL + '?login=' + process.env.TRTO_LOGIN + '&key=' + key + '&md5=' + md5(process.env.TRTO_LOGIN + process.env.TRTO_TOKEN + String(key)) + '&action=ping';
                                var options = {
                        url: url,
                        strictSSL: false,
                        secureProtocol: 'TLSv1_method',
                            ciphers : 'ALL'
                    }
            https(options, function (err, res, body) {
                if (!err && res.statusCode == 200) {
                    var obj = pp.parse(body);
                    if (obj.error_code == '0' && obj.info_txt == 'pong') {
                        resolve(obj);
                    } else {
                        reject(obj.error_txt);
                    }
                } else {
                    reject(err);
                }
            })
            break;
        case "TRLO":
            console.log('TRLO_PING')
            var key = new Date().getTime();
            var soapHeader = '';
            var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:tem=\"http://tempuri.org/\"> ' +
               ' <soapenv:Header/> ' +
               ' <soapenv:Body>' +
                  '  <tem:Ping/> '+
                '</soapenv:Body>'+
                '</soapenv:Envelope>';
                var pr = {
                    url : 'https://52.76.149.97:9001/API/GloReload.svc/soap',
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : 'http://tempuri.org/IGloTransfer/Ping'
                    }
                
                }
                var buffer = "";
               var req = https.post(pr, function (err, res, body) {
                   if (err) {
                       reject(err)
                   } else {
                               console.log('statusCode', res.statusCode );
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                    var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        if (err) {
                            reject(err)
                        } else {
                            var pre = d['s:Envelope']['s:Body'][0]['PingResponse'][0]['PingResult'][0];
                            if (pre == 1) {
                                resolve(pre)
                            } else {
                                reject();
                            }
                        }
                    });
                   }
            
                                });
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                    });
                   
                    req.end(payload);
           
        break;
        case "ETRX":
         console.log('ETRX_PING')
            var key = new Date().getTime();
            var soapHeader = '';
            soap.createClient(process.env.ETRX_URL, function(err, cl) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        request : {
                        terminalId : process.env.ETRX_USER,
                        action : 'BL',
                        transaction : {
                            pin : process.env.ETRX_PASS,
                            reference : key
                        }
                        }
                        
                    }
            
                    cl.process(args, function (err, res) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            console.log(res)
                            resolve(res);
                        }
                    })
                }
            });
        break;
        case "SSLW":
         console.log('SSLW_PING')
            var key = new Date().getTime();
            var soapHeader = '';
            soap.createClient(process.env.SSLW_URL, function(err, cl) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        client_id : process.env.SSLW_USER
                        }
                        
                    
            
                    cl.GetClientInfo(args, function (err, res) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            console.log(res)
                            resolve(res);
                        }
                    })
                }
            });
        break;
        case "MFIN":
        var key = new Date().getTime();
        var c1 = process.env.MFIN_LOGIN + '|' + String(key) + '|' + process.env.MFIN_PASS;
        var c2 = md5(sha1(c1));
        var payload = '<soapenv:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:res=\"http://arizonaadmin.mobifinng.com/WebService/reseller_iTopUp/reseller_iTopUp.wsdl.php\">' +
   '<soapenv:Header/>'+
   '<soapenv:Body>'+
      '<res:EchoCheck soapenv:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">'+
         '<EchoCheck_Request xsi:type=\"xsd1:EchoCheck_Request\" xmlns:xsd1=\"http://soapinterop.org/xsd\">'+
            '<LoginId xsi:type=\"xsd:string\">' + process.env.MFIN_LOGIN + '</LoginId>'+
            '<Message xsi:type=\"xsd:string\">' + key + '</Message>' +
            '<Checksum xsi:type=\"xsd:string\">' + c2 + '</Checksum>' +
         '</EchoCheck_Request>' +
      '</res:EchoCheck>' +
   '</soapenv:Body>' +
'</soapenv:Envelope>'
                var pr = {
                    url : 'http://arizonaadmin.mobifinng.com/WebService/iTopUp/reseller_itopup.server.php',
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : 'http://arizonaadmin.mobifinng.com/WebService/reseller_iTopUp/reseller_iTopUp.wsdl.php#Reseller_iTopUp_wsdl#EchoCheck'
                    }
                
                }
                var buffer = "";
               var req = https.post(pr, function (err, res, body) {
                   console.log('statusCode', res.statusCode );
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                   
                  
                    var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        if (err) {
                            reject(err)
                        } else {
                            
                            var pre = d['soapenv:Envelope']['soapenv:Body'][0]['ns4:EchoCheckResponse'][0]['EchoCheck_Response'][0]['ResponseCode'][0]['_'];
                            if (pre == 000) {
                                resolve(pre)
                            } else {
                                reject();
                            }
                            
                        }
                    });
                    
                                });
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                    });
                    req.end(payload);
        break;
        default:
            reject(new Error());
    }
   });
 
}
app.getBalance = function (api_id) {
     return new Promise(function (resolve, reject) {
          switch (api_id) {
        
        case "TRTO":
            var key = new Date().getTime();
            var url = process.env.TRTO_URL + '?login=' + process.env.TRTO_LOGIN + '&key=' + key + '&md5=' + md5(process.env.TRTO_LOGIN + process.env.TRTO_TOKEN + String(key)) + '&action=check_wallet';
                                var options = {
                        url: url,
                        strictSSL: false,
                        secureProtocol: 'TLSv1_method',
                            ciphers : 'ALL'
                    }
            https(options, function (err, res, body) {
                if (!err && res.statusCode == 200) {
                    var obj = pp.parse(body);
                    if (obj.error_code == '0') {
                        var r = {};
                        r.balance = obj.balance;
                        resolve(r);
                    } else {
                        reject(obj.error_txt);
                    }
                } else {
                    reject(err);
                }
            })
            break;
        case "TRLO":
                      var key = new Date().getTime();

                var sign = md5(key + process.env.TRLO_LOGIN + process.env.TRLO_KEY);
            var soapHeader = '';
           var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:tem=\"http://tempuri.org/\" xmlns:tran=\"http://schemas.datacontract.org/2004/07/Tranglo20.Business.Processor\" xmlns:tran1=\"http://schemas.datacontract.org/2004/07/Tranglo20.Common.Entity\">'+
            '<soapenv:Header/>'+
            '<soapenv:Body>' +
                '<tem:EWallet_Enquiry>' +
                    '<tem:req>' +
                        '<tran:credential>' +
                        '<tran1:UID>' + process.env.TRLO_LOGIN + '</tran1:UID>' +
                        '<tran1:PWD>' + process.env.TRLO_PASS + '</tran1:PWD>' +
                        '<tran1:Signature>' + sign + '</tran1:Signature>' + 
                        '</tran:credential>' + 
                        '<tran:DealerTransactionId>' + key + '</tran:DealerTransactionId>' + 
                    '</tem:req>' + 
                '</tem:EWallet_Enquiry>' + 
            '</soapenv:Body>' + 
            '</soapenv:Envelope>'
                var pr = {
                    url : 'https://52.76.149.97:9001/API/GloReload.svc/soap',
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : 'http://tempuri.org/IGloTransfer/EWallet_Enquiry'
                    }
                
                }
                var buffer = "";
               var req = https.post(pr, function (err, res, body) {
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                   

                    
                    var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        console.log(util.inspect(d, false, null))
                        console.log('ooo', d['s:Envelope']['s:Body'][0]['EWallet_EnquiryResponse'][0]['EWallet_EnquiryResult'][0]['a:LastBalance'][0]);
                        var ss = d['s:Envelope']['s:Body'][0]['EWallet_EnquiryResponse'][0]['EWallet_EnquiryResult'][0]['a:Status'][0]['b:Code'][0];
                        console.log('sta', ss)
                        if (err) {
                            reject(err)
                        } else {
                            if (ss == '000') {
                                //ok
                                var r = {};
                                r.balance = d['s:Envelope']['s:Body'][0]['EWallet_EnquiryResponse'][0]['EWallet_EnquiryResult'][0]['a:LastBalance'][0];
                                resolve(r)
                            } else {
                                reject();
                            }
                        }
                     
                    });
                    
                                });
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                    });
                    req.end(payload);
            break;
            case "ETRX":
                console.log('ETRX_BAL')
            var key = new Date().getTime();
            var soapHeader = '';
            soap.createClient(process.env.ETRX_URL, function(err, cl) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        request : {
                            terminalId : process.env.ETRX_USER,
                        action : 'BE',
                        transaction : {
                            pin : process.env.ETRX_PASS,
                            reference : key
                        }
                        }
                        
                    }
            
                    cl.process(args, function (err, res) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            console.log(res);
                            var r = {};
                            r.balance = res.response.message;
                            resolve(r);
                        }
                    })
                }
            });
            break;
            case "SSLW":
         console.log('SSLW_BAL')
            var key = new Date().getTime();
            var soapHeader = '';
            soap.createClient(process.env.SSLW_URL, function(err, cl) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        client_id : process.env.SSLW_USER
                        }
                        
                    
            
                    cl.GetBalanceInfo(args, function (err, res) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            console.log(res)
                            var re = {};
                            re.balance = res.stock_balance.available_credit.$value;
                            resolve(re);
                        }
                    })
                }
            });
        break;
        case "MFIN":
            var key = new Date().getTime();
            var d1 = new Date();
            var d2 = d1.getFullYear() + '-' + parseInt(d1.getMonth()+1) + '-' + d1.getDate()
        var c1 = process.env.MFIN_LOGIN + '|' + '|' + process.env.MFIN_PASS;
        var c2 = md5(sha1(c1));
        var payload = '<soapenv:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:res=\"http://arizonaadmin.mobifinng.com/WebService/reseller_iTopUp/reseller_iTopUp.wsdl.php\">' +
   '<soapenv:Header/>'+
   '<soapenv:Body>'+
      '<res:ResellerBalance soapenv:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">' +
         '<ResellerBalance_Request xsi:type=\"xsd1:ResellerBalance_Request\" xmlns:xsd1=\"http://soapinterop.org/xsd\">' +
     '<LoginId xsi:type=\"xsd:string\">' + process.env.MFIN_LOGIN + '</LoginId>' +
        //'<TillDate>' + d2 + '</TillDate>' +
		'<TillDate></TillDate>' +
                    '<Checksum xsi:type=\"xsd:string\">' + c2 + '</Checksum>' +
         '</ResellerBalance_Request>' +
      '</res:ResellerBalance>' +
   '</soapenv:Body>' +
'</soapenv:Envelope>'
                var pr = {
                    url : 'http://arizonaadmin.mobifinng.com/WebService/iTopUp/reseller_itopup.server.php',
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : 'http://arizonaadmin.mobifinng.com/WebService/reseller_iTopUp/reseller_iTopUp.wsdl.php#Reseller_iTopUp_wsdl#ResellerBalance'
                    }
                
                }
		console.log('PAYLOAD_MFIN', payload)
                var buffer = "";
               var req = https.post(pr, function (err, res, body) {
                   console.log('statusCode', res.statusCode );
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                   
                  
                    var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        if (err) {
                            reject(err)
                        } else {
                            //console.log(util.inspect(d, false, null));
                            var pre = d['soapenv:Envelope']['soapenv:Body'][0]['ns4:ResellerBalanceResponse'][0]['ResellerBalance_Response'][0]['ResponseCode'][0]['_'];
                            var bal = d['soapenv:Envelope']['soapenv:Body'][0]['ns4:ResellerBalanceResponse'][0]['ResellerBalance_Response'][0]['CurrentBalance'][0]['_'];
                            if (pre == '000') {
                                var r = {};
                                r.balance = parseInt(bal) / 100;
                                resolve(r)
                            } else {
				//console.log(res);
                                reject();
                            }
                     
                        }
                    });
                    
                                });
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                    });
                    req.end(payload);
        break;
        case "NGAT":
                 co(function* () {
                    console.log(hostname, 'NGAT_BALANCE');
                     var creds = yield Apicred.findOne({apicode : 'NGAT', isSystemWide : true}).exec();
                     console.log(hostname, 'CREDS', creds)
                     var bal = yield doNGATBlCheck(creds);

                     //resolve(top);
               
                })

        break;
        default:
            reject(new Error());
    }
   });
}
app.getMSISDNInfo = function (msisdn, apid) {
    return new Promise(function (resolve, reject) {
        co(function* () {
                    console.log(hostname, 'AUTO_MSISDN', msisdn);
                     var top = yield doUniversalNumberLookup(msisdn);
                     resolve(top);
               
                }).catch(function (err) {
                        console.log('EZZA', err)
                    })
    })
}
    function doTRTOAirtimeTopup(creds,obj) {
        return new Promise(function (resolve,reject) {
            co(function* () {
                function run(creds,obj) {
                      console.log(hostname, 'TRTO_TOPUP', obj.msisdn);
                //var key = obj.reference
                 var k0 = randomIntFromInterval(10000, 99999);
                var k1 = randomIntFromInterval(10000, 99999);
                var k2 = randomIntFromInterval(10000, 99999);
                var k3 = randomIntFromInterval(10000, 99999);
                var key = String(k0) + String(k1) + String(k2) +  String(k3);
		var url = creds.link + '?login=' + creds.username + '&key=' + key + '&md5=' + md5(creds.username + creds.password + String(key)) + '&operatorid=' + obj.operatorId + '&action='+ process.env.TRTO_MODE + '&destination_msisdn=' + obj.msisdn + '&msisdn=' + obj.msisdn + '&product=' + obj.denomination + '&send_sms=no';
                    https(url, function (err, res, body) {
                if (!err && res.statusCode == 200) {
                    var robj = pp.parse(body);
                    console.log(robj);
                    if (robj.error_code == '0') {
                        var r = {};
                        r.success = true;
                        r.resp_debug = JSON.stringify(robj)
                        r.req_debug = String(url);
                        r.operator_transactionid = robj.reference_operator;
                        r.vnd_sim = creds.username;
                        if (typeof robj.pin_based !== undefined) {
                            if (robj.pin_based == 'yes') {
                                r.pin_based = true;
                                r.pin_option1 = robj.pin_option_1;
                                r.pin_option2 = robj.pin_option_2;
                                r.pin_option3 = robj.pin_option_3;
                                r.pin_value = robj.pin_value;
                                r.pin_code = robj.pin_code;
                                r.pin_ivr = robj.pin_ivr;
                                r.pin_serial = robj.pin_serial;
                                r.pin_validity = robj.pin_validity;
                            } else {
                                 r.pin_based = false;
                            }
                        } else {
                            r.pin_based = false;
                        }
                        resolve(r);
                    } else {
                        var r = {};
                        r.success = false;
                        r.pin_based = false;
                        r.resp_debug = JSON.stringify(robj);
                        r.req_debug = String(url);
                        r.operator_transactionid = robj.reference_operator;
                        r.vnd_sim = creds.username;
                        switch (robj.error_code) {
                            case "101":
                                r.responseCode = "MSISDN_INVALID"
                            break;
                            case "204":
                                r.responseCode = "MSISDN_NOT_PREPAID"
                            break;
                            case "301":
                                r.responseCode = "UNSUPPORTED_DENOMINATION"
                            break;
                            case "222":
                                r.responseCode = "MSISDN_BARRED"
                            break;
                            case "214":
                                r.responseCode = "OPERATOR_ERROR"
                            break;
                            case "230":
                                r.responseCode = "MAX_TOPUP_REACHED"
                            break;
                            default:
                                r.responseCode = "XYU"
                            break;
                        }
                        resolve(r)
                    }
                } else {
                    reject(err);
                }
            })
                }
        run(creds,obj);
            })
        })
    }
    function doTRLOAirtimeTopup(creds,obj) {
        return new Promise(function (resolve,reject) {
            co(function* () {
                function run(creds,obj) {
                     console.log(hostname, 'TRLO_TOPUP', obj.msisdn);
                  var k0 = new Date().getTime();
                var k1 = randomIntFromInterval(1000, 9999);
                var k2 = randomIntFromInterval(1000,9999);
                 var key = String(k0) + String(k1) + String(k2);
                 //DealerTransactionID + SourceNo + DestNo + OperatorCode + Denomination + Credentials.UID + Security Key
                 var concat = key + obj.msisdn + obj.msisdn + obj.operatorId + parseFloat(obj.denomination).toFixed(2) + creds.username + creds.extcode;
                var sign = md5(concat);
                console.log('SIGN', concat, sign)
            var soapHeader = '';
           var payload = '<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:tem=\"http://tempuri.org/\" xmlns:tran=\"http://schemas.datacontract.org/2004/07/Tranglo20.Business.Processor\" xmlns:tran1=\"http://schemas.datacontract.org/2004/07/Tranglo20.Common.Entity\">'+
            '<soapenv:Header/>'+
            '<soapenv:Body>' +
                '<tem:Request_ReloadSync>' +
                    '<tem:epinReq>' +
                        '<tran:DealerTransactionId>' + key + '</tran:DealerTransactionId>' + 
                        '<tran:SourceNo>' + obj.msisdn + '</tran:SourceNo>' +
                        '<tran:DestNo>' + obj.msisdn + '</tran:DestNo>' + 
                        '<tran:OperatorCode>' + obj.operatorId + '</tran:OperatorCode>' +
                        '<tran:Denomination>' + parseFloat(obj.denomination).toFixed(2) + '</tran:Denomination>' +
                        '<tran:ByAmount>false</tran:ByAmount>' + 
                        '<tran:Credentials>' +
                        '<tran1:UID>' + creds.username + '</tran1:UID>' +
                        '<tran1:PWD>' + creds.password + '</tran1:PWD>' +
                        '<tran1:Signature>' + sign + '</tran1:Signature>' + 
                        '</tran:Credentials>' + 
                    '</tem:epinReq>' + 
                '</tem:Request_ReloadSync>' + 
            '</soapenv:Body>' + 
            '</soapenv:Envelope>'
                var pr = {
                    url : creds.link,
                    headers : {
                        'Content-Type' : 'text/xml; charset=utf-8',
                        'SOAPAction' : 'http://tempuri.org/IGloTransfer/Request_ReloadSync'
                    }
                
                }
                var buffer = "";
               var req = https.post(pr, function (err, res, body) {
                    if (err) {
                             var re = {};
                        re.success = false;
                        re.req_debug = payload;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                        re.vnd_sim = process.env.TRLO_LOGIN;
                        resolve(re);
                    } else {
                    var buffer = "";
                    res.on( "data", function( data ) { buffer = buffer + data; } );
                    res.on( "end", function( data ) { console.log( buffer ); } );
                    

                    
                    var parser = new xml2js.Parser();
                    parser.parseString(res.body, function (err, d) {
                        console.log(util.inspect(d, false, null))
                        var ss = d['s:Envelope']['s:Body'][0]['Request_ReloadSyncResponse'][0]['Request_ReloadSyncResult'][0]['a:Status'][0]['b:Code'][0];
                        var sa = d['s:Envelope']['s:Body'][0]['Request_ReloadSyncResponse'][0]['Request_ReloadSyncResult'][0]['a:OperatorTransactionID'][0];
                        console.log('sta', ss)
                        if (err) {
                            reject(err)
                        } else {
                            if (ss == '000') {
                                //ok
                                var r = {};
                                r.success = true;
                                r.resp_debug = res.body;
                                r.req_debug = payload;
                                 r.pin_based = false;
                                 r.operator_transactionid = sa;
                                 r.vnd_sim = process.env.TRLO_LOGIN;
                                resolve(r)
                            } else {
                                
                                var r = {};
                                r.success = false;
                                r.resp_debug = res.body;
                                r.req_debug = payload;
                                r.pin_based = false;
                                r.operator_transactionid = JSON.stringify(sa) || null;
                                r.vnd_sim = process.env.TRLO_LOGIN;
                                switch (ss) {
                                    case "930":
                                        r.responseCode = "MSISDN_INVALID";
                                        break;
                                    case "904":
                                        r.responseCode = "UNSUPPORTED_DENOMINATION";
                                        break;
                                    case "932":
                                        r.responseCode = "MSISDN_BARRED";
                                        break;
                                    case "995":
                                         r.responseCode = "FRAUD_PREVENTION";
                                        break;
                                    case "920":
                                         r.responseCode = "UNSUPPORTED_DENOMINATION";
                                        break;
                                    case "935":
                                        r.responseCode = "MSISDN_BARRED";
                                        break;
                                    case "907":
                                        r.responseCode = "UNKOWN_OPERATOR";
                                        break;
                                    default:
                                        r.responseCode = "OPERATOR_ERROR";
                                        break;
                                }
                                console.log('resolving with err :', r)
                                resolve(r)
                            }
                        }
                  
                    });
                    }
                   

                    //boo boo end
                                });
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                    });
                    req.end(payload);
                }
                run(creds,obj)
            })
        })
    }
    function doETRXAirtimeTopup (creds,obj) {
        return new Promise(function (resolve,reject) {
            co(function* () {
                function run(creds,obj) {
                         console.log(hostname, 'ETRX_TOPUP', obj.msisdn)
             var k0 = new Date().getTime();
                var k1 = randomIntFromInterval(1000, 9999);
                var k2 = randomIntFromInterval(1000,9999);
                 var key = String(k0) + String(k1) + String(k2);
            var soapHeader = '';
            soap.createClient(creds.link, function(err, cl) {
                if (err) {
                        var re = {};
                        re.success = false;
                        re.req_debug = '';
                        re.resp_debug =  JSON.stringify(err);
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                        re.vnd_sim = creds.username;
                        resolve(re);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        request : {
                            terminalId : creds.username,
                        action : 'VT',
                        transaction : {
                            pin : creds.password,
                            reference : key,
                            destination : obj.msisdn,
                            lineType : 'VTU',
                            senderName : '',
                            address : '',
                            provider : obj.operatorId,
                            amount : obj.denomination
                        }
                        }
                        
                    }
                    cl.process(args, function (err, res) {
                        if (err) {
                                 var re = {};
                        re.success = false;
                        re.req_debug = JSON.stringify(args);
                        re.resp_debug =  JSON.stringify(args);
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                        re.vnd_sim = creds.username;
                        resolve(re);
                        } else {
                           if (res.response.error == '0') {
                               var r = {};
                               r.success = true;
                               r.resp_debug = String(JSON.stringify(res));
                               r.req_debug = JSON.stringify(args);
                               r.pin_based = false;
                               r.operator_transactionid = res.response.reference;
                               r.vnd_sim = creds.username;
                               resolve(r)
                           } else if (res.response.error == '310') {
                               var r = {};
                               r.success = false;
                               r.resp_debug = String(JSON.stringify(res));
                               r.req_debug = JSON.stringify(args);
                               r.responseCode = "UNSUPPORTED_DENOMINATION"
                               r.pin_based = false;
                               r.operator_transactionid = res.response.reference;
                               r.vnd_sim = creds.username;
                               resolve(r)
                           }
                            else {
                       
                               var r = {};
                               r.success = false;
                               r.resp_debug = String(JSON.stringify(res));
                               r.req_debug = JSON.stringify(args);
                               r.responseCode = "OPERATOR_FAILURE"
                               r.pin_based = false;
                               r.operator_transactionid = res.response.reference;
                               r.vnd_sim = creds.username;
                               resolve(r)
                           }
                        }
                    })
                }
            });
                }
                run(creds,obj);
            })
        })
    }
    function doSSLWAirtimeTopup(creds,obj) {
        return new Promise(function (resolve,reject) {
            function run(creds,obj) {
                 console.log(hostname, 'SSLW_TOPUP', obj.msisdn)
             var k0 = new Date().getTime();
                var k1 = randomIntFromInterval(1000, 9999);
                var k2 = randomIntFromInterval(1000,9999);
                var key = String(k0 + k1 + k2);
            var soapHeader = '';
            soap.createClient(creds.link, function(err, cl) {
                if (err) {
                         var re = {};
                        re.success = false;
                        re.req_debug = '';
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                        re.vnd_sim = creds.username
                        resolve(re);
                } else {
                    cl.addSoapHeader(soapHeader);
                    var args = {
                        client_id : creds.username,
                        msisdn : obj.msisdn
                        }
                        
                    
            
                    cl.VerifyMSISDN(args, function (err, res) {
                        if (err) {
                                 var re = {};
                        re.success = false;
                        re.req_debug = args;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                         re.vnd_sim = creds.username;
                        resolve(re);
                        } else {
                            if (res.result.$value == '1') {
                                var args2 = {
                                    client_id : creds.username,
                                    client_pass : creds.password,
                                    recipient_msisdn : obj.msisdn,
                                    guid : md5(key).substring(0,25),
                                    operator_id : obj.operatorId,
                                    amount : obj.denomination,
                                    connection_type : 'prepaid'
                                }
                                cl.CreateRecharge(args2, function (err, r2) {
                                    if (err) {
                                             var re = {};
                        re.success = false;
                        re.req_debug = args2;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                         re.vnd_sim = creds.username
                        resolve(re);
                                    } else {
                                       console.log(util.inspect(r2, false, null))
                                        if (r2.recharge_response.recharge_status.$value == '100') {
                                            var vrg = r2.recharge_response.vr_guid.$value;
                                            var args3 = {
                                                client_id : creds.username,
                                                client_pass : creds.pasword,
                                                guid : md5(key).substring(0,25),
                                                vr_guid : vrg
                                            }
                                            cl.InitRecharge(args3, function (err, r3) {
                                                if (err) {
                                                         var re = {};
                        re.success = false;
                        re.req_debug = args3;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                         re.vnd_sim = creds.username
                        resolve(re);
                                                } else {
                                                       console.log(util.inspect(r3, false, null))
                                                       if (r3.recharge_response.recharge_status.$value == '900') {
                                                           var re = {};
                                                           re.success = true;
                                                           re.pin_based = false;
                                                           re.resp_debug = JSON.stringify(r3);
                                                           re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                           re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                             re.vnd_sim = creds.username
                                                           resolve(re)
                                                       } else if (r3.recharge_response.recharge_status.$value == '200' || r3.recharge_response.recharge_status.$value == '201' || r3.recharge_response.recharge_status.$value == '202') {
                                                        //try 1
                                                        setTimeout(function() {
                                                            var args4 = {
                                                                 client_id : creds.username,
                                                                client_pass : creds.pasword,
                                                                guid : args3.guid,
                                                                vr_guid : vrg
                                                            }
                                                            cl.QueryRechargeStatus(args4, function (err, ry1) {
                                                                if (err) {
                                                                         var re = {};
                        re.success = false;
                        re.req_debug = args4;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                         re.vnd_sim = creds.username
                        resolve(re);
                                                                } else {
                                                                    var vv1 = ry1.recharge_request.recharge_status.$value;
                                                                    if (vv1 == '200' || vv1 == '201' || vv1 == '202') {
                                                                              setTimeout(function() {
                                                                            cl.QueryRechargeStatus(args4, function (err, ry2) {
                                                                                if (err) {
                                                                                         var re = {};
                        re.success = false;
                        re.req_debug = args4;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                         re.vnd_sim = creds.username
                        resolve(re);
                                                                                } else {
                                                                                    var vv2 = ry2.recharge_request.recharge_status.$value;
                                                                                    if (vv2 == '200' || vv2 == '201' || vv2 == '202') {
                                                                                           setTimeout(function() {
                                                                                            cl.QueryRechargeStatus(args4, function (err, ry3) {
                                                                                                if (err) {
                                                                                                        var re = {};
                        re.success = false;
                        re.req_debug = args4;
                        re.resp_debug = err;
                        re.pin_based = false;
                        re.responseCode = "NETWORK_ERROR";
                          re.vnd_sim = creds.username
                        resolve(re);
                                                                                                } else {
                                                                                                    var vv3 = ry3.recharge_request.recharge_status.$value
                                                                                                    var code = vv3;
                                                                                                      if (code == '900') {
                                                                                                            var re = {};
                                                                                                            re.success = true;
                                                                                                            re.pin_based = false;
                                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3) + "\n" + JSON.stringify(args4))
                                                                                                            re.responseCode = "RECHARGE_COMPLETE"
                                                                                                              re.vnd_sim = creds.username
                                                                                                            re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                                                            resolve(re)
                                                                                                        } else if (code == '304') {
                                                                                                            var re = {};
                                                                                                            re.success = false;
                                                                                                            re.pin_based = false;
                                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                                            re.responseCode = "UNSUPPORTED_DENOMINATION"
                                                                                                             re.vnd_sim = creds.username
                                                                                                            re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                                                            resolve(re)
                                                                                                        } else if ((code == '305') || code == '329') {
                                                                                                            var re = {};
                                                                                                                re.success = false;
                                                                                                                re.pin_based = false;
                                                                                                                re.resp_debug = JSON.stringify(ry2);
                                                                                                                re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                                                re.responseCode = "MSISDN_BARRED"
                                                                                                                 re.vnd_sim = creds.username
                                                                                                                re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                                                resolve(re)
                                                                                                        } else if (code == '303') {
                                                                                                            var re = {};
                                                                                                                re.success = false;
                                                                                                                re.pin_based = false;
                                                                                                                re.resp_debug = JSON.stringify(ry2);
                                                                                                                re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                                                re.responseCode = "MSISDN_NOT_PREPAID"
                                                                                                                  re.vnd_sim = creds.username
                                                                                                                re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                                                resolve(re)
                                                                                                        } else if (code == '302') {
                                                                                                            var re = {};
                                                                                                                re.success = false;
                                                                                                                re.pin_based = false;
                                                                                                                re.resp_debug = JSON.stringify(ry2);
                                                                                                                re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                                                re.responseCode = "MSISDN_INVALID"
                                                                                                                 re.vnd_sim = creds.username
                                                                                                                re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                                        } else {
                                                                                                            var re = {};
                                                                                                                re.success = false;
                                                                                                                re.pin_based = false;
                                                                                                                re.resp_debug = JSON.stringify(ry2);
                                                                                                                re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                                                re.responseCode = "OPERATOR_ERROR"
                                                                                                                  re.vnd_sim = creds.username
                                                                                                                re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                                                resolve(re)
                                                                                                        }
                                                                                                }
                                                                                                
                                                                                            })
                                                                                        }, 10000)
                                                                                    } else {
                                                                                     var code = vv2;
                                                                                    if (code == '900') {
                                                                                        var re = {};
                                                                                        re.success = true;
                                                                                        re.pin_based = false;
                                                                                        re.resp_debug = JSON.stringify(ry2);
                                                                                        re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3) + "\n" + JSON.stringify(args4))
                                                                                        re.responseCode = "RECHARGE_COMPLETE"
                                                                                         re.vnd_sim = creds.username
                                                                                        re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                                        resolve(re)
                                                                                    } else if (code == '304') {
                                                                                        var re = {};
                                                                                        re.success = false;
                                                                                        re.pin_based = false;
                                                                                        re.resp_debug = JSON.stringify(ry2);
                                                                                        re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                        re.responseCode = "UNSUPPORTED_DENOMINATION"
                                                                                         re.vnd_sim = creds.username
                                                                                        re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                                        resolve(re)
                                                                                    } else if ((code == '305') || (code == '329')) {
                                                                                        var re = {};
                                                                                            re.success = false;
                                                                                            re.pin_based = false;
                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                            re.responseCode = "MSISDN_BARRED"
                                                                                            re.vnd_sim = creds.username
                                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                            resolve(re)
                                                                                    } else if (code == '303') {
                                                                                        var re = {};
                                                                                            re.success = false;
                                                                                            re.pin_based = false;
                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                            re.responseCode = "MSISDN_NOT_PREPAID"
                                                                                            re.vnd_sim = creds.username
                                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                            resolve(re)
                                                                                    } else if (code == '302') {
                                                                                        var re = {};
                                                                                            re.success = false;
                                                                                            re.pin_based = false;
                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                            re.responseCode = "MSISDN_INVALID"
                                                                                             re.vnd_sim = creds.username
                                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                            resolve(re)
                                                                                    } else {
                                                                                        var re = {};
                                                                                            re.success = false;
                                                                                            re.pin_based = false;
                                                                                            re.resp_debug = JSON.stringify(ry2);
                                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                                            re.responseCode = "OPERATOR_ERROR"
                                                                                            re.vnd_sim = creds.username
                                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                                            resolve(re)
                                                                                    }
                                                                                    }
                                                                                }
                                                                                
                                                                            })
                                                                        }, 8000)
                                                                        //do some succ stuff
                                                                    } else {
                                                                  // check for code
                                                                    var code = vv1;
                                                                    if (code == '900') {
                                                                        var re = {};
                                                                        re.success = true;
                                                                        re.pin_based = false;
                                                                        re.resp_debug = JSON.stringify(ry1);
                                                                        re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3) + "\n" + JSON.stringify(args4))
                                                                        re.responseCode = "RECHARGE_COMPLETE"
                                                                         re.vnd_sim = creds.username
                                                                        re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                        resolve(re)
                                                                    } else if (code == '304') {
                                                                        var re = {};
                                                                        re.success = false;
                                                                        re.pin_based = false;
                                                                        re.resp_debug = JSON.stringify(ry1);
                                                                        re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                        re.responseCode = "UNSUPPORTED_DENOMINATION"
                                                                         re.vnd_sim = creds.username
                                                                        re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                                        resolve(re)
                                                                    } else if ((code == '305') || (code == '329')) {
                                                                         var re = {};
                                                                            re.success = false;
                                                                            re.pin_based = false;
                                                                            re.resp_debug = JSON.stringify(ry1);
                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                            re.responseCode = "MSISDN_BARRED"
                                                                             re.vnd_sim = creds.username
                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                            resolve(re)
                                                                    } else if (code == '303') {
                                                                        var re = {};
                                                                            re.success = false;
                                                                            re.pin_based = false;
                                                                            re.resp_debug = JSON.stringify(ry1);
                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                            re.responseCode = "MSISDN_NOT_PREPAID"
                                                                            re.vnd_sim = creds.username
                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                            resolve(re)
                                                                    } else if (code == '302') {
                                                                        var re = {};
                                                                            re.success = false;
                                                                            re.pin_based = false;
                                                                            re.resp_debug = JSON.stringify(ry1);
                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                            re.responseCode = "MSISDN_INVALID"
                                                                            re.vnd_sim = creds.username
                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                    } else {
                                                                         var re = {};
                                                                            re.success = false;
                                                                            re.pin_based = false;
                                                                            re.resp_debug = JSON.stringify(ry1);
                                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                                            re.responseCode = "OPERATOR_ERROR"
                                                                             re.vnd_sim = creds.username
                                                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                                                            resolve(re)
                                                                    }

                                                                    }
                                                                }
                                                            })
                                                        }, 2000)
                                                       } else {
                                                           var re = {};
                                                            re.success = false;
                                                            re.pin_based = false;
                                                            re.resp_debug = JSON.stringify(r3);
                                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                                            re.responseCode = "OPERATOR_ERROR"
                                                             re.vnd_sim = creds.username
                                                            re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                                            resolve(re)
                                                       }
                                                }
                                            })

                                        } else if (r2.recharge_response.recharge_status.$value == '304') {
                                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(r2);
                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                            re.responseCode = "UNSUPPORTED_DENOMINATION"
                                             re.vnd_sim = creds.username
                                            re.operator_transactionid = r3.recharge_response.vr_guid.$value;
                                            resolve(re)
                                        } else if (r2.recharge_response.recharge_status.$value == '305') {
                                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(r2);
                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                            re.responseCode = "MSISDN_BARRED"
                                             re.vnd_sim = creds.username
                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                            resolve(re)
                                        } else if (r2.recharge_response.recharge_status.$value == '303') {
                                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(r2);
                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                            re.responseCode = "MSISDN_NOT_PREPAID"
                                             re.vnd_sim = creds.username
                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                            resolve(re)
                                        } else if (r2.recharge_response.recharge_status.$value == '302') {
                                            var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(r2);
                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                            re.responseCode = "MSISDN_INVALID"
                                             re.vnd_sim = creds.username
                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                            resolve(re)
                                        } else {
                                                var re = {};
                                            re.success = false;
                                            re.pin_based = false;
                                            re.resp_debug = JSON.stringify(r2);
                                            re.req_debug = String(JSON.stringify(args) + "\n" + JSON.stringify(args2) + "\n" + JSON.stringify(args3))
                                            re.responseCode = "OPERATOR_ERROR"
                                             re.vnd_sim = creds.username
                                            re.operator_transactionid = r2.recharge_response.vr_guid.$value;
                                            resolve(re)
                                        }
                                            
                                    }
                                })
                            } else {
                                var re = {};
                                re.success = false;
                                re.pin_based = false;
                                re.resp_debug = JSON.stringify(res);
                                re.req_debug = String(JSON.stringify(args))
                                re.responseCode = "MSISDN_INVALID"
                                re.vnd_sim = creds.username
                                resolve(re)
                            }
                          
                        }
                    })
                }
            });
    }
        run(creds,obj);
        })
    }
app.topup = function (api_id, obj) {
    return new Promise(function (resolve, reject) {
        switch (api_id) {
            case "TRTO":
               co(function* () {
                    console.log(hostname, 'TRTO_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'TRTO', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'TRTO', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'TRTO_CREDS', creds)
                     var top = yield doTRTOAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "TRLO":
                co(function* () {
                    console.log(hostname, 'TRLO_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'TRLO', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'TRLO', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'TRLO_CREDS', creds)
                     var top = yield doTRLOAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "ETRX":
             co(function* () {
                    console.log(hostname, 'ETRX_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'ETRX', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'ETRX', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'ETRX_CREDS', creds)
                     var top = yield doETRXAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "SSLW":
                 co(function* () {
                    console.log(hostname, 'SSLW_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'SSLW', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'SSLW', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'SSLW_CREDS', creds)
                     var top = yield doSSLWAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "NGMT":
                co(function* () {
                    console.log(hostname, 'NGMT_TOPUP', obj.msisdn);

                     var creds = yield Apicred.findOne({apicode : 'NGMT', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'NGMT', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'CREDS', creds)
                     var top = yield doMTNNGTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "NGAT":
                co(function* () {
                    console.log(hostname, 'NGAT_TOPUP', obj.msisdn);
                     var creds = yield Apicred.findOne({apicode : 'NGAT', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'NGAT', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'CREDS', creds)
                     var top = yield doNGATAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "NGET":
                co(function* () {
                    console.log(hostname, 'NGET_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'NGET', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'NGET', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'CREDS', creds)
                     var top = yield doNGETAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "NGGL":
                co(function* () {
                    console.log(hostname, 'NGGL_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'NGGL', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'NGGL', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'CREDS', creds)
                     var top = yield doNGGLAirtimeTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            case "NGXX":
                co(function* () {
                    obj.data = false;
                   var top = yield doUniversalNGTopup(obj);
                   console.log('TOPUUUU', top)
                   resolve(top);
                })
            break;
            case "NGDX":
            co(function* () {
                    obj.data = true;
                   var top = yield doUniversalNGTopup(obj);
                   console.log('TOPUUUU', top)
                   resolve(top);
                })
            break;
            case "UKBL":
            co(function* () {
                    console.log(hostname, 'UKBL_TOPUP', obj.msisdn);
                      var creds = yield Apicred.findOne({apicode : 'UKBL', isSystemWide : false, account : obj.reseller_id}).exec();
                     if (creds == null) {
                         var creds = yield Apicred.findOne({apicode : 'UKBL', isSystemWide : true}).exec();
                     }
                     console.log(hostname, 'CREDS', creds)
                     var top = yield doUKBLTopup(creds, obj);
                     console.log(hostname, 'TOPPP', top);
                     resolve(top);
               
                })
            break;
            default:
                reject(new Error('default'))
            break;
        }
    })
}
module.exports = app;
