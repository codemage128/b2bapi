/* 
* batchjob Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : batchjob.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema
var results = new Schema({
    number : String,
    product_id : String,
    time : Date,
    success : Boolean,
    code : String,
    message : String,
    topuplog : Schema.Types.ObjectId,
    reference : String,
    jobid : Schema.Types.ObjectId,
    operator_name : String,
    country : String,
    pin_based : Boolean,
    pin_option1 : String,
    pin_option2 : String,
    pin_option3 : String,
    pin_code : String,
    pin_serial : String,
    pin_ivr : String,
    pin_validity : String,
    pin_value : String,
    related_transactions : []

}, {minimize : false, timestamps : true});
var jobs = new Schema({
    msisdn : String,
    product_id : String,
    denomination : String,
    send_sms : Boolean,
    sms_text : String,
    time : Date,
    state : {type : String, enum : ['new', 'processing', 'fin']}

}, {minimize : false, timestamps : true});
var batchjobSchema = new Schema({
    batchid : {type : String, required : true, index : true},
    account : {type : Schema.Types.ObjectId, required : true, index : true},
    jobs : [jobs],
    requested_by : Schema.Types.ObjectId,
    time : Date,
    state : {type : String, enum : ['new', 'processing', 'fin']},
    topup_logs : [],
    results : [results],
   completed_at : Date
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('batchjob', batchjobSchema);
