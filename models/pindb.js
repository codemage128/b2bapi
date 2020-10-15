/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var mongooseToCsv = require('mongoose-to-csv');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema
var pinTriesSchema = new Schema({
  caller_id : String,
  topup_number : String,
  time : Date,
  api_request : String,
  api_response : String,
  success : Boolean,
  channel : {type : String, enum : ['ivr', 'web']},
  code : String,
}, {minimize : false, timestamps : true})
var pindbSchema = new Schema({
  issued : {type : Date, default : Date.now, required : true, index : true},
  batch : Schema.Types.ObjectId,
  seq : Number,
  session_lock : Boolean,
  session_id : String,
  session_ip : String,
  session_ua : String,
  locked_on : Date,
  valid : Boolean,
  valid_from : Date,
  valid_to : Date,
  serial : String,
  code : String,
  value : String,
  currency : String,
  used : Boolean,
  used_date : Date,
  used_by : Schema.Types.ObjectId,
  channel : {type : String, enum : ['ivr', 'web']},
  tries : [pinTriesSchema],
  related_transaction : Schema.Types.ObjectId
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
/*
pindbSchema.plugin(mongooseToCsv, {
  headers : 'issued batch valid valid_from valid_to serial code value currency'
})
*/
//Return model
module.exports = db.model('pindb', pindbSchema);
