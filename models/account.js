/* 
* Account Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : account.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema
var walletSchema = new Schema({
   wallet_name : {type : String, index : true},
   wallet_id : {type : String, index : {unique : true}},
   currency : {type : String, required : true},
   balance : Number,
   primary : Boolean,
   active : Boolean,
   virtual : Boolean,
   parent_wallet : Schema.Types.ObjectId
    
}, {minimize : false, timestamps : true});
var financialSchema = new Schema({
    type : {type : String, enum : ['paypal', 'bank'], required : true},
    account_name : String,
    bank_name : String,
    sortcode : String,
    swift : String,
    account_number : String,
    account_iban : String,
    bank_address : String,
    bank_country : String,
    primary : Boolean,
    currency : String,
    email : String
});
var auditLogSchema = new Schema({
    time : {type : Date, default : Date.now, required : true},
    author : {type : Schema.Types.ObjectId, required : true},
    type : {type : String, enum : ['change', 'creation', 'deletion', 'state', 'access'], required : true},
    description : String
}, {minimize : false, timestamps : true});
var accountSchema = new Schema({
   account_name : {type : String, index : true, required : true},
   numeric_id : {type : String, index : true, index : {unique : true}},
   tax_id : String,
   reg_id : String,
   legal_type : {type : String, enum : ['individual', 'company'], required : true},
   type : {type : String, enum : ['wholesaler', 'reseller', 'agent', 'system'], required : true},
   address : {
       line1 : String,
       line2 : String,
       city : String,
       county : String,
       postcode : String,
       country : String
   },
   phone : String,
   profit_pct : Number,
   sms_cost : Number,
   sms_sender : String,
   active : Boolean,
   master_contact : Schema.Types.ObjectId,
   manager : Schema.Types.ObjectId,
   parent : Schema.Types.ObjectId,
   test_mode : Boolean,
   email : String,
   ivr_enable : Boolean,
   ivr_did : String,
   ivr_custom_welcome : String,
   wallets : [walletSchema],
   acl : Schema.Types.ObjectId,
   canEditOwnAcl : Boolean,
   profit_map : Schema.Types.ObjectId,
	permitted_apis : [],
    api_credentials : [],
    features_enabled : [],
    epin_enabled : Boolean,
    send_pin_sms : Boolean,
   whitelabel_opts : {
       color1 : String,
       color2 : String,
       color3 : String,
       color4 : String,
       color5 : String,
       color6 : String,
       tlevel : String,
       portal_logo : String,
       portal_url : {type : String, index : {unique : true}},
       showcopy : Boolean,
       portal_name : String,
       ivr_did : String,
       pin_portal_name : String,
       pin_portal_color0 : String,
       pin_portal_color1 : String,
       pin_portal_color2 : String,
       pin_portal_color3 : String,
       pin_portal_color4 : String,
       pin_portal_color5 : String,
       pin_portal_color6 : String,
       pin_portal_color7 : String,
       pin_copyright : String,
       pin_fblink : String,
       pin_twlink : String,
       pin_lilink : String

   },
   audit : {
       last_login : Date,
       last_login_ip : String,
       last_login_by : Schema.Types.ObjectId,
       created : Date,
       updated : Date,
       created_by : Schema.Types.ObjectId,
       last_update_by : Schema.Types.ObjectId,
       log : [auditLogSchema]
   },
   rwaccess : [],
   roaccess : []
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('account', accountSchema);
