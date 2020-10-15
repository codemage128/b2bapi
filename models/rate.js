/* 
* rate Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : rate.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var rateSchema = new Schema({
   source : {type : String, index : true, required : true},
   destination : {type : String, index : true},
   rate : Number,
   dynamic : Boolean,
   time : Date
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('rate', rateSchema);
