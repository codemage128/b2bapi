/* 
* gloprefix Schema
* Author : Konstantins Kolcovs
* (c) 2017, OK Media Group LTD.
* File : gloprefix.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var gloprefixSchema = new Schema({
    prefix : {type : String, index : true},
 country : {type : String, index : true},
 iso : {type : String, index : true},
 operator_name : {type : String, index : true},
 trt_id : {type : String, index : true},
 trl_id : {type : String, index : true},
 active : Boolean,
 time : Date
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('gloprefix', gloprefixSchema);
