/* 
* topuplog Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : topuplog.js
*/ 


var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME );
var Schema = mongoose.Schema;
//Schema

var topuplogSchema = new Schema({
    product_id : {type : String, required : true},
    account : {type : Schema.Types.ObjectId, required : true, index : true},
    time : {type : Date, default : Date.now},
    success : Boolean,
    target : String,
    channel : {type : String, enum : ['web', 'api', 'pinp', 'ivr']},
    type : {type : String, enum : ['topup', 'pin', 'other', 'billpay', 'data']},
    service_type : {type : String, index : true},
    test : Boolean,
    topup_amount : Number,
    topup_currency : String,
  paid_amount : Number,
  paid_currency : String,
  fx_rate : String,
  result : String,
  operator_reference : {type : String, index : true},
  customer_reference : {type : String, index : true},
  api_transactionid : {type : String, index : true},
  vnd_sim : {type : String, index : true},
  app_host : String,
  country : String,
  operator_name : String,
  related_transactions : [],
  description : String,
  send_notification : Boolean,
  notification_sent : Boolean,
  notification_recipient : String,
  response_debug : String,
  request_debug : String,
  client_apireqbody : String,
  client_apiresponse : String,
  completed_in : Number,
  message : String,
  code : String,
  note : String,
  pin_based : Boolean,
  pin_option1 : String,
  pin_option2 : String,
  pin_option3 : String,
  pin_code : String,
  pin_serial : String,
  pin_ivr : String,
  pin_validity : String,
  pin_value : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
topuplogSchema.plugin(mongoosePaginate);

//Return model
module.exports = db.model('topuplog', topuplogSchema);
