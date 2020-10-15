/* 
* prefix Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : prefix.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var prefixSchema = new Schema({
   prefix : {type : String, index : true},
   country : {type : String, index : true},
   iso : {type : String, index : true},
   hasOpenRange : Boolean,
   openRangeMin : String,
   openRangeMax : String,
   currency : String,
   operatorName : String,
   operatorId : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('prefix', prefixSchema);
