/* 
* apiaccount Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : apiaccount.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var apiaccountSchema = new Schema({
   appid : {type : String, index : true, required : true},
   appsecret : {type : String, required : true},
   account : Schema.Types.ObjectId,
   access_level : {type : String, enum : ['ro', 'rw']},
   ip_limit : [],
   created_by : Schema.Types.ObjectId,
   active : Boolean,
   last_login : {type : Date, default : Date.now},
   last_ip : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('apiaccount', apiaccountSchema);
