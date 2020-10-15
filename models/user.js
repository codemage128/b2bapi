/* 
* User Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : user.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var userSchema = new Schema({
   username : {type : String, index : true, required : true},
   password : {type : String, required : true},
   first_name : String,
   last_name : String,
   occupation : String,
   main_account : Schema.Types.ObjectId,
   reseller_id : Schema.Types.ObjectId,
   email : String,
   active : Boolean,
   last_login : {type : Date, default : Date.now},
   last_ip : String,
   skype : String,
   avatar : String,
   access_level : {type : String, enum : ['master', 'financial', 'technical']},
   send_notifications : Boolean,
   limited_pos : Boolean,
   dashboard_enabled : Boolean,
   pos_access : Boolean,
   sms_access : Boolean,
   account_access : Boolean,
   transactions_access : Boolean,
   pins_access : Boolean,
   epins_access : Boolean,
   jobs_access : Boolean,
   price_access : Boolean,
   topuplog_access : Boolean,
   support_access : Boolean,
   balance_access : Boolean
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('User', userSchema);
