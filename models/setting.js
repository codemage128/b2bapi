/* 
* setting Schema
* Author : Konstantins Kolcovs
* (c) 2017, OK Media Group LTD.
* File : setting.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var settingSchema = new Schema({
 key : {type : String, index : true},
 value : {type : String, index : true},
 global : Boolean
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('setting', settingSchema);
